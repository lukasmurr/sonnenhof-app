import { Component, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PurchaseProduct } from '../../../core/models/purchasing-price.model';
import { PurchasingPriceService } from '../../../core/services/purchasing-price.service';
import { AuthService } from '../../../core/services/auth.service';
import { PurchaseProductDialogComponent } from './dialog/purchase-product-dialog';
import { ConfirmationDialogComponent } from '../../../core/components/confirmation-dialog/confirmation-dialog';

@Component({
    selector: 'app-purchasing-prices',
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
        MatChipsModule,
        HasPermissionDirective
    ],
    templateUrl: './purchasing-prices.html',
    styleUrls: ['./purchasing-prices.scss']
})
export class PurchasingPricesComponent implements OnInit {
    displayedColumns: string[] = ['name', 'category', 'supplier', 'unit', 'actions'];
    dataSource: MatTableDataSource<PurchaseProduct>;

    products = signal<PurchaseProduct[]>([]);
    searchFilter = signal<string>('');

    filteredProducts = computed(() => {
        const filter = this.searchFilter().toLowerCase();
        if (!filter) return this.products();
        return this.products().filter(p =>
            p.name.toLowerCase().includes(filter) ||
            p.category.toLowerCase().includes(filter) ||
            (p.supplierName?.toLowerCase().includes(filter))
        );
    });

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private purchasingPriceService = inject(PurchasingPriceService);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private authService = inject(AuthService);

    constructor() {
        this.dataSource = new MatTableDataSource<PurchaseProduct>([]);
    }

    ngOnInit() {
        this.purchasingPriceService.getPurchaseProductsWithSupplier().subscribe(products => {
            this.products.set(products);
            this.dataSource.data = products;
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        });
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
    }

    goBack(): void {
        this.router.navigate(['/office']);
    }

    applyFilter(event: Event): void {
        const filterValue = (event.target as HTMLInputElement).value;
        this.searchFilter.set(filterValue);
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    openProductDialog(product?: PurchaseProduct): void {
        if (product) {
            if (!this.authService.hasPermission('purchasing-price.update')) return;
        } else {
            if (!this.authService.hasPermission('purchasing-price.create')) return;
        }

        const dialogRef = this.dialog.open(PurchaseProductDialogComponent, {
            width: 'min(560px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: { product }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (product) {
                    this.purchasingPriceService.updatePurchaseProduct({
                        ...product,
                        ...result
                    });
                } else {
                    this.purchasingPriceService.addPurchaseProduct(result);
                }
            }
        });
    }

    deleteProduct(product: PurchaseProduct): void {
        if (!this.authService.hasPermission('purchasing-price.delete')) return;

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: 'Produkt löschen',
                message: `Möchten Sie das Produkt "${product.name}" wirklich löschen? Alle zugehörigen Preiseinträge werden ebenfalls gelöscht.`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && product._id) {
                this.purchasingPriceService.deletePurchaseProduct(product._id);
            }
        });
    }

    viewProductDetail(product: PurchaseProduct): void {
        this.router.navigate(['/office/purchasing-prices', product._id]);
    }

    getCategoryColor(category: string): string {
        const colors: Record<string, string> = {
            'Fleisch': 'primary',
            'Gewürze': 'accent',
            'Verpackung': 'warn',
            'Sonstiges': ''
        };
        return colors[category] || '';
    }
}
