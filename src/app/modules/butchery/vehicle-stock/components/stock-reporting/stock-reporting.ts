import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { Market } from '../../../../../core/models/market.model';
import { Offer } from '../../../../../core/models/offer.model';
import { Product } from '../../../../../core/models/product.model';
import { StockItem, VehicleStock } from '../../../../../core/models/vehicle-stock.model';
import { MarketService } from '../../../../../core/services/market.service';
import { OfferService } from '../../../../../core/services/offer.service';
import { ProductService } from '../../../../../core/services/product.service';
import { VehicleStockService } from '../../../../../core/services/vehicle-stock.service';

@Component({
    selector: 'app-stock-reporting',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatStepperModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatListModule,
        MatIconModule,
        MatSnackBarModule,
        MatCardModule
    ],
    templateUrl: './stock-reporting.html',
    styleUrls: ['./stock-reporting.scss']
})
export class StockReportingComponent implements OnInit, AfterViewInit {
    @ViewChild('stepper') private stepper?: MatStepper;

    private _formBuilder = inject(FormBuilder);
    private _marketService = inject(MarketService);
    private _stockService = inject(VehicleStockService);
    private _productService = inject(ProductService);
    private _offerService = inject(OfferService);
    private _authService = inject(AuthService);
    private _snackBar = inject(MatSnackBar);

    markets = signal<Market[]>([]);
    products = signal<Product[]>([]);
    offers = signal<Offer[]>([]);

    private _autoSkipTried = false;

    firstFormGroup = this._formBuilder.group({
        market: ['', Validators.required],
        date: [new Date(), Validators.required]
    });

    stockFormArray = this._formBuilder.array<FormGroup>([]);

    ngOnInit() {
        this._marketService.getMarkets().subscribe(m => {
            this.markets.set(m);
            this.tryAutoSkipFirstStep(m);
        });

        this._productService.getProducts().subscribe(p => this.products.set(p));
        this._offerService.getOffers().subscribe(o => this.offers.set(o));
    }

    ngAfterViewInit() {
        // In case markets are already loaded before the stepper is ready
        this.tryAutoSkipFirstStep(this.markets());
    }

    private tryAutoSkipFirstStep(markets: Market[]) {
        if (this._autoSkipTried || !markets?.length) return;

        const email = this._authService.getCurrentUser();
        if (!email) return;

        const match = email.match(/^auto(\d+)@/i);
        if (!match) return;

        const car = match[1];
        const market = markets.find(m => m.car === car) ?? markets[0];
        if (!market?._id) return;

        this.firstFormGroup.patchValue({ market: market._id });

        // Auto-advance the stepper once the first step is valid.
        // We use a microtask to avoid ExpressionChanged errors.
        Promise.resolve().then(async () => {
            await this.onStep1Next();
            this.stepper?.next();
        });

        this._autoSkipTried = true;
    }

    async onStep1Next() {
        const marketId = this.firstFormGroup.get('market')?.value;
        if (!marketId) return;

        const config = await this._stockService.getConfigByMarket(marketId);

        this.stockFormArray.clear();

        let itemsToLoad: { id: string, name: string, type: 'product' | 'offer', unit: string }[] = [];

        if (config && config.targets.length > 0) {
            config.targets.forEach(t => {
                if (t.itemType === 'product') {
                    const p = this.products().find(p => p._id === t.itemId);
                    if (p) itemsToLoad.push({ id: p._id!, name: p.name, type: 'product', unit: p.stockUnit || p.unit });
                } else {
                    const o = this.offers().find(o => o._id === t.itemId);
                    if (o) itemsToLoad.push({ id: o._id!, name: `Angebot KW${o.week}`, type: 'offer', unit: 'Stk' });
                }
            });
        } else {
            this.products().forEach(p => {
                itemsToLoad.push({ id: p._id!, name: p.name, type: 'product', unit: p.stockUnit || p.unit });
            });
        }

        itemsToLoad.forEach(item => {
            this.stockFormArray.push(this._formBuilder.group({
                itemId: [item.id],
                itemType: [item.type],
                name: [item.name],
                quantity: [0, [Validators.required, Validators.min(0)]],
                unit: [item.unit]
            }));
        });
    }

    async submit() {
        if (this.firstFormGroup.invalid || this.stockFormArray.invalid) return;

        const marketId = this.firstFormGroup.get('market')?.value;
        const date = this.firstFormGroup.get('date')?.value;
        const market = this.markets().find(m => m._id === marketId);

        const dateObj = new Date(date!);
        const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));

        const stock: VehicleStock = {
            type: 'vehicle-stock',
            date: localDate.toISOString().split('T')[0],
            marketId: marketId!,
            marketName: market?.name || 'Unknown',
            items: this.stockFormArray.value as StockItem[],
            status: 'submitted'
        };

        try {
            const existing = await this._stockService.getStockByDateAndMarket(stock.date, stock.marketId);
            if (existing) {
                stock._id = existing._id;
                stock._rev = existing._rev;
                await this._stockService.updateStock(stock);
            } else {
                await this._stockService.addStock(stock);
            }
            this._snackBar.open('Bestand erfolgreich gespeichert', 'OK', { duration: 3000 });
        } catch (e) {
            console.error(e);
            this._snackBar.open('Fehler beim Speichern', 'OK', { duration: 3000 });
        }
    }
}
