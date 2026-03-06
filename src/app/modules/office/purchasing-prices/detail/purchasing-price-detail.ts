import { Component, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { PurchaseProduct, PriceEntry, Supplier } from '../../../../core/models/purchasing-price.model';
import { PurchasingPriceService } from '../../../../core/services/purchasing-price.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmationDialogComponent } from '../../../../core/components/confirmation-dialog/confirmation-dialog';
import { combineLatest } from 'rxjs';

@Component({
    selector: 'app-purchasing-price-detail',
    providers: [provideNativeDateAdapter()],
    imports: [
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        ReactiveFormsModule,
        HasPermissionDirective,
        DatePipe
    ],
    templateUrl: './purchasing-price-detail.html',
    styleUrls: ['./purchasing-price-detail.scss']
})
export class PurchasingPriceDetailComponent implements OnInit {
    displayedColumns: string[] = ['date', 'price', 'quantity', 'actions'];
    dataSource: MatTableDataSource<PriceEntry>;

    product = signal<PurchaseProduct | null>(null);
    supplier = signal<Supplier | null>(null);
    priceEntries = signal<PriceEntry[]>([]);
    pageSize = signal(10);
    pageIndex = signal(0);

    mobilePagedEntries = computed(() => {
        const start = this.pageIndex() * this.pageSize();
        const end = start + this.pageSize();
        return this.priceEntries().slice(start, end);
    });
    
    latestPrice = computed(() => {
        const entries = this.priceEntries();
        return entries.length > 0 ? entries[0].price : null;
    });

    averagePrice = computed(() => {
        const entries = this.priceEntries();
        if (entries.length === 0) return null;
        const sum = entries.reduce((acc, e) => acc + e.price, 0);
        return Math.round((sum / entries.length) * 100) / 100;
    });

    priceChange = computed(() => {
        const entries = this.priceEntries();
        if (entries.length < 2) return null;
        const latest = entries[0].price;
        const previous = entries[1].price;
        const change = latest - previous;
        const percentage = previous !== 0 ? (change / previous) * 100 : 0;
        return {
            change: Math.round(change * 100) / 100,
            percentage: Math.round(percentage * 100) / 100
        };
    });

    // Chart data
    chartData = computed(() => {
        const entries = this.priceEntries().slice().reverse(); // Oldest first for chart
        if (entries.length === 0) return { points: [], maxPrice: 0, minPrice: 0 };
        
        const prices = entries.map(e => e.price);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const range = maxPrice - minPrice || 1;
        
        const points = entries.map((entry, index) => {
            const x = entries.length > 1 ? (index / (entries.length - 1)) * 100 : 50;
            const y = 100 - ((entry.price - minPrice) / range) * 80 - 10; // 10-90% of height
            return { x, y, price: entry.price, date: entry.date };
        });
        
        return { points, maxPrice, minPrice };
    });

    priceForm: FormGroup;
    productId: string | null = null;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private purchasingPriceService = inject(PurchasingPriceService);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);
    private fb = inject(FormBuilder);

    constructor() {
        this.dataSource = new MatTableDataSource<PriceEntry>([]);
        
        this.priceForm = this.fb.group({
            price: ['', [Validators.required, Validators.min(0.01)]],
            quantity: ['', [Validators.required, Validators.min(0.01)]],
            date: [new Date(), Validators.required]
        });
    }

    ngOnInit() {
        this.productId = this.route.snapshot.paramMap.get('id');
        
        if (this.productId) {
            this.loadProductData();
        }
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
    }

    loadProductData(): void {
        if (!this.productId) return;

        combineLatest([
            this.purchasingPriceService.getPurchaseProducts(),
            this.purchasingPriceService.getSuppliers(),
            this.purchasingPriceService.getPriceEntriesForProduct(this.productId)
        ]).subscribe(([products, suppliers, entries]) => {
            const product = products.find(p => p._id === this.productId);
            if (product) {
                this.product.set(product);
                const supplier = suppliers.find(s => s._id === product.supplierId);
                this.supplier.set(supplier || null);
            }
            
            this.priceEntries.set(entries);
            this.dataSource.data = entries;
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            this.pageIndex.set(0);
            this.paginator?.firstPage();
        });
    }

    onPageChange(event: PageEvent): void {
        this.pageSize.set(event.pageSize);
        this.pageIndex.set(event.pageIndex);
    }

    goBack(): void {
        this.router.navigate(['/office/purchasing-prices']);
    }

    addPriceEntry(): void {
        if (this.priceForm.valid && this.productId) {
            const formValue = this.priceForm.value;
            const entry = {
                productId: this.productId,
                price: parseFloat(formValue.price),
                quantity: parseFloat(formValue.quantity),
                date: formValue.date.toISOString()
            };
            
            this.purchasingPriceService.addPriceEntry(entry).then(() => {
                this.priceForm.patchValue({
                    price: '',
                    quantity: '',
                    date: new Date()
                });
            });
        }
    }

    deletePriceEntry(entry: PriceEntry): void {
        if (!this.authService.hasPermission('purchasing-price.delete')) return;

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: 'Preiseintrag löschen',
                message: `Möchten Sie den Preiseintrag vom ${new Date(entry.date).toLocaleDateString('de-DE')} wirklich löschen?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && entry._id) {
                this.purchasingPriceService.deletePriceEntry(entry._id);
            }
        });
    }

    getChartPath(): string {
        const data = this.chartData();
        if (data.points.length === 0) return '';
        
        return data.points.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');
    }

    formatCurrency(value: number | null): string {
        if (value === null) return '-';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }
}
