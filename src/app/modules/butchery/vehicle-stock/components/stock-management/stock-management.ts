import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialogRef } from '@angular/material/dialog';
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

interface ImportedStockTarget {
    Artikel?: string;
    Einheit?: string;
    Anzahl?: number;
    itemId?: string;
    id?: string;
    itemType?: 'product' | 'offer';
    type?: 'product' | 'offer';
    name?: string;
    targetQuantity?: number;
    target?: number;
    unit?: string;
}

interface StockConfigImportPayload {
    Sollliste?: ImportedStockTarget[];
    targets?: ImportedStockTarget[];
    items?: ImportedStockTarget[];
}

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
    private _dialogRef = inject(MatDialogRef<StockManagementComponent, boolean>, { optional: true });

    readonly isDialog = !!this._dialogRef;

    markets = signal<Market[]>([]);
    products = signal<Product[]>([]);
    offers = signal<Offer[]>([]);

    displayedColumns: string[] = ['name', 'unit', 'target', 'actions'];

    // Config Tab
    selectedConfigMarketId = signal<string | null>(null);
    selectedCopySourceMarketId = signal<string | null>(null);
    configItems = signal<any[]>([]); // { id, name, type, target, unit }

    availableCopySourceMarkets = computed(() => {
        const targetId = this.selectedConfigMarketId();
        return this.markets().filter(m => m._id && m._id !== targetId);
    });

    // Add Item State
    selectedProductToAdd = signal<Product | null>(null);
    newTargetQuantity = signal<number>(0);
    newTargetUnit = signal<string>('');
    availableUnits = ['5 P. VA', '5 St. VA', 'Stück', 'Stange', 'Paar'];

    ngOnInit() {
        this._marketService.getMarkets().subscribe(m => this.markets.set(m));
        this._productService.getProducts().subscribe(p => this.products.set(p));
        this._offerService.getOffers().subscribe(o => this.offers.set(o));
    }

    // Config Logic
    async onConfigMarketChange(marketId: string) {
        this.selectedConfigMarketId.set(marketId);
        this.selectedCopySourceMarketId.set(null);
        const config = await this._stockService.getConfigByMarket(marketId);

        const items: any[] = [];
        if (config && config.targets) {
            for (const t of config.targets) {
                const name = this.getItemName(t.itemType, t.itemId);
                items.push({ id: t.itemId, name, type: t.itemType, target: t.targetQuantity, unit: t.unit || '' });
            }
        }
        this.configItems.set(items);
    }

    async copyConfigFromMarket(sourceMarketId: string | null) {
        const targetMarketId = this.selectedConfigMarketId();
        if (!sourceMarketId || !targetMarketId) return;

        if (sourceMarketId === targetMarketId) {
            this._snackBar.open('Quell- und Zielmarkt dürfen nicht identisch sein', 'OK', { duration: 3000 });
            return;
        }

        const sourceConfig = await this._stockService.getConfigByMarket(sourceMarketId);
        if (!sourceConfig || !sourceConfig.targets?.length) {
            this._snackBar.open('Im Quellmarkt ist keine Sollliste vorhanden', 'OK', { duration: 3000 });
            return;
        }

        const copiedItems = sourceConfig.targets.map(target => ({
            id: target.itemId,
            name: this.getItemName(target.itemType, target.itemId),
            type: target.itemType,
            target: target.targetQuantity,
            unit: target.unit || ''
        }));

        this.configItems.set(copiedItems);

        this._snackBar.open('Sollliste kopiert. Bitte speichern, um zu übernehmen.', 'OK', { duration: 3500 });
    }

    async onJsonFileSelected(event: Event) {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as StockConfigImportPayload | ImportedStockTarget[];
            const rawItems = Array.isArray(parsed)
                ? parsed
                : (parsed.Sollliste ?? parsed.targets ?? parsed.items ?? []);

            if (!Array.isArray(rawItems) || rawItems.length === 0) {
                this._snackBar.open('Keine gültigen Einträge in der JSON-Datei gefunden', 'OK', { duration: 3500 });
                return;
            }

            const importedItems: { id: string; name: string; type: 'product' | 'offer'; target: number; unit: string }[] = [];
            const seen = new Set<string>();

            for (const entry of rawItems) {
                const resolvedType = entry.itemType ?? entry.type ?? 'product';
                if (resolvedType !== 'product' && resolvedType !== 'offer') continue;

                const resolvedId = this.resolveImportItemId(entry, resolvedType);
                if (!resolvedId || seen.has(resolvedId)) continue;

                const resolvedTarget = Number(entry.Anzahl ?? entry.targetQuantity ?? entry.target ?? 0);
                if (!Number.isFinite(resolvedTarget) || resolvedTarget <= 0) continue;

                const resolvedName = this.getItemName(resolvedType, resolvedId);
                const resolvedUnit = entry.Einheit ?? entry.unit ?? this.getDefaultUnitForType(resolvedType, resolvedId);

                importedItems.push({
                    id: resolvedId,
                    name: resolvedName,
                    type: resolvedType,
                    target: resolvedTarget,
                    unit: resolvedUnit
                });
                seen.add(resolvedId);
            }

            if (importedItems.length === 0) {
                this._snackBar.open('JSON konnte nicht importiert werden: Bitte Struktur prüfen', 'OK', { duration: 4000 });
                return;
            }

            this.configItems.set(importedItems);
            this._snackBar.open(`${importedItems.length} Positionen aus JSON importiert`, 'OK', { duration: 3500 });
        } catch {
            this._snackBar.open('Ungültige JSON-Datei', 'OK', { duration: 3500 });
        } finally {
            if (input) {
                input.value = '';
            }
        }
    }

    private resolveImportItemId(entry: ImportedStockTarget, itemType: 'product' | 'offer'): string | null {
        const directId = (entry.itemId ?? entry.id)?.trim();
        if (directId) return directId;

        const name = (entry.Artikel ?? entry.name)?.trim();
        if (!name) return null;

        if (itemType === 'product') {
            const product = this.products().find(p => p.name.toLowerCase() === name.toLowerCase());
            return product?._id ?? null;
        }

        const offer = this.offers().find(o => `Angebot KW${o.week}`.toLowerCase() === name.toLowerCase());
        return offer?._id ?? null;
    }

    private getDefaultUnitForType(itemType: 'product' | 'offer', itemId: string): string {
        if (itemType === 'offer') return 'Stk';

        const product = this.products().find(p => p._id === itemId);
        return product?.stockUnit || product?.unit || 'Stück';
    }

    private getItemName(itemType: 'product' | 'offer', itemId: string): string {
        if (itemType === 'product') {
            const product = this.products().find(p => p._id === itemId);
            return product?.name ?? 'Unbekannt';
        }

        const offer = this.offers().find(o => o._id === itemId);
        return offer ? `Angebot KW${offer.week}` : 'Unbekannt';
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

    async saveConfig(): Promise<boolean> {
        const marketId = this.selectedConfigMarketId();
        if (!marketId) return false;

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
            return true;
        } catch (e) {
            this._snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
            return false;
        }
    }

    async saveAndClose() {
        const didSave = await this.saveConfig();
        if (didSave) {
            this._dialogRef?.close(true);
        }
    }

    closeDialog() {
        this._dialogRef?.close(false);
    }
}
