import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { ProductDialogComponent } from './dialog/product-dialog';

@Component({
    selector: 'app-products',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatCardModule
    ],
    templateUrl: './products.html',
    styleUrls: ['./products.scss']
})
export class ProductsComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['puNumber', 'name', 'unit', 'actions'];
    dataSource: MatTableDataSource<Product>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private productService: ProductService,
        private dialog: MatDialog,
        private router: Router
    ) {
        this.dataSource = new MatTableDataSource<Product>([]);
    }

    ngOnInit(): void {
        this.loadProducts();
    }

    goBack(): void {
        this.router.navigate(['/butchery']);
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadProducts() {
        this.productService.getProducts().subscribe(products => {
            this.dataSource.data = products;
        });
    }

    openProductDialog(product?: Product): void {
        const dialogRef = this.dialog.open(ProductDialogComponent, {
            width: '400px',
            data: { product }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (product) {
                    // Update
                    const updatedProduct: Product = {
                        ...product,
                        ...result
                    };
                    this.productService.updateProduct(updatedProduct);
                } else {
                    // Create
                    this.productService.addProduct(result);
                }
            }
        });
    }

    deleteProduct(product: Product): void {
        if (confirm(`Möchten Sie das Produkt "${product.name}" wirklich löschen?`)) {
            if (product._id) {
                this.productService.deleteProduct(product._id);
            }
        }
    }
}
