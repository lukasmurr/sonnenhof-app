import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { Market } from '../../../../../core/models/market.model';
import { Offer } from '../../../../../core/models/offer.model';
import { Product } from '../../../../../core/models/product.model';
import { StockTarget, VehicleStockConfig } from '../../../../../core/models/vehicle-stock.model';
import { MarketService } from '../../../../../core/services/market.service';
import { OfferService } from '../../../../../core/services/offer.service';
import { ProductService } from '../../../../../core/services/product.service';
import { VehicleStockService } from '../../../../../core/services/vehicle-stock.service';
import { ProductSelectComponent } from '../../../orders/dialog/product-select/product-select';

@Component({
    selector: 'app-stock-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
        MatCardModule,
        MatTableModule,
        ProductSelectComponent
    ],
    templateUrl: './stock-management.html',
    styleUrls: ['./stock-management.scss']
})
export class StockManagementComponent implements OnInit {
    private _marketService = inject(MarketService);
    private _stockService = inject(VehicleStockService);
    private _productService = inject(ProductService);
    private _offerService = inject(OfferService);
    private _snackBar = inject(MatSnackBar);

    markets = signal<Market[]>([]);
    products = signal<Product[]>([]);
    offers = signal<Offer[]>([]);

    displayedColumns: string[] = ['name', 'unit', 'target', 'actions'];

    // Config Tab
    selectedConfigMarketId = signal<string | null>(null);
    configItems = signal<any[]>([]); // { id, name, type, target, unit }

    // Add Item State
    selectedProductToAdd = signal<Product | null>(null);
    newTargetQuantity = signal<number>(0);
    newTargetUnit = signal<string>('');
    availableUnits = ['Stück', 'Stange', 'Paar'];

    ngOnInit() {
        this._marketService.getMarkets().subscribe(m => this.markets.set(m));
        this._productService.getProducts().subscribe(p => this.products.set(p));
        this._offerService.getOffers().subscribe(o => this.offers.set(o));
    }

    // Config Logic
    async onConfigMarketChange(marketId: string) {
        this.selectedConfigMarketId.set(marketId);
        const config = await this._stockService.getConfigByMarket(marketId);

        const items: any[] = [];
        if (config && config.targets) {
            for (const t of config.targets) {
                let name = 'Unbekannt';
                if (t.itemType === 'product') {
                    const p = this.products().find(p => p._id === t.itemId);
                    if (p) name = p.name;
                }
                items.push({ id: t.itemId, name, type: t.itemType, target: t.targetQuantity, unit: t.unit || '' });
            }
        }
        this.configItems.set(items);
    }

    addConfigItem() {
        const product = this.selectedProductToAdd();
        const target = this.newTargetQuantity();
        const unit = this.newTargetUnit();

        if (!product || !product._id || target <= 0 || !unit) return;

        // Check if already exists
        const currentItems = this.configItems();
        if (currentItems.find(i => i.id === product._id)) {
            this._snackBar.open('Produkt bereits in der Liste', 'OK', { duration: 3000 });
            return;
        }

        const newItem = {
            id: product._id,
            name: product.name,
            type: 'product',
            target: target,
            unit: unit
        };

        this.configItems.set([...currentItems, newItem]);

        // Reset inputs
        this.selectedProductToAdd.set(null);
        this.newTargetQuantity.set(0);
        this.newTargetUnit.set('');
    }

    removeConfigItem(itemId: string) {
        this.configItems.set(this.configItems().filter(i => i.id !== itemId));
    }

    moveConfigItemUp(index: number) {
        if (index <= 0) return;

        const items = [...this.configItems()];
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        this.configItems.set(items);
    }

    moveConfigItemDown(index: number) {
        const items = [...this.configItems()];
        if (index < 0 || index >= items.length - 1) return;

        [items[index], items[index + 1]] = [items[index + 1], items[index]];
        this.configItems.set(items);
    }

    async saveConfig() {
        const marketId = this.selectedConfigMarketId();
        if (!marketId) return;

        const targets: StockTarget[] = this.configItems()
            .map(i => ({
                itemId: i.id,
                itemType: i.type,
                targetQuantity: i.target,
                unit: i.unit
            }));

        const existing = await this._stockService.getConfigByMarket(marketId);
        const config: VehicleStockConfig = {
            ...existing,
            type: 'vehicle-stock-config',
            marketId,
            targets
        };

        try {
            await this._stockService.saveConfig(config);
            this._snackBar.open('Konfiguration gespeichert', 'OK', { duration: 3000 });
        } catch (e) {
            this._snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
        }
    }
}
