import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { Order, OrderItem } from '../../../../core/models/order.model';
import { Product } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { Market } from '../../../../core/models/market.model';
import { MarketService } from '../../../../core/services/market.service';

export interface OrderDialogData {
    order?: Order;
}

@Component({
    selector: 'app-order-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatDividerModule,
        MatIconModule
    ],
    templateUrl: './order-dialog.html',
    styles: [`
        .order-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding-top: 1rem;
        }
        mat-form-field {
            width: 100%;
        }
        .form-row {
            display: flex;
            gap: 1rem;
        }
        .item-row {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background: #f5f5f5;
            border-radius: 4px;
        }
        .item-col-large {
            flex: 2;
        }
        .item-col-small {
            flex: 1;
        }
        .item-actions {
            margin-top: 8px;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
        }

        :host-context(.dark-theme) .item-row {
            background: #424242;
        }
        
        @media (max-width: 600px) {
            .form-row {
                flex-direction: column;
                gap: 0;
            }
            .item-row {
                flex-direction: column;
                gap: 0;
            }
            .item-col-large, .item-col-small {
                width: 100%;
                flex: none;
            }
            .item-actions {
                align-self: flex-end;
                margin-top: 0;
            }
        }
    `]
})
export class OrderDialogComponent implements OnInit {
    form: FormGroup;
    products: Product[] = [];
    markets: Market[] = [];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<OrderDialogComponent>,
        private productService: ProductService,
        private marketService: MarketService,
        @Inject(MAT_DIALOG_DATA) public data: OrderDialogData
    ) {
        this.form = this.fb.group({
            customerName: [data.order?.customerName || '', Validators.required],
            customerEmail: [data.order?.customerEmail || '', [Validators.email]],
            customerPhone: [data.order?.customerPhone || ''],
            market: [data.order?.market || '', Validators.required],
            orderDate: [data.order?.orderDate ? new Date(data.order.orderDate) : new Date(), Validators.required],
            items: this.fb.array([])
        });

        if (data.order?.items) {
            data.order.items.forEach(item => this.addItem(item));
        } else {
            this.addItem(); // Add one empty item by default
        }
    }

    get items(): FormArray {
        return this.form.get('items') as FormArray;
    }

    ngOnInit() {
        this.marketService.getMarkets().subscribe(markets => {
            this.markets = markets;
        });

        this.productService.getProducts().subscribe(products => {
            this.products = products;
            
            // If editing, patch the items with correct product objects
            if (this.data.order && this.data.order.items) {
                // Clear existing items first (from constructor)
                this.items.clear();
                
                this.data.order.items.forEach(item => {
                    const selectedProduct = this.products.find(p => p._id === item.productId);
                    const itemGroup = this.fb.group({
                        product: [selectedProduct || null, Validators.required],
                        quantity: [item.quantity, [Validators.required, Validators.min(0.01)]],
                        notes: [item.notes || '']
                    });
                    this.items.push(itemGroup);
                });
            }
        });
    }

    createItem(item?: OrderItem): FormGroup {
        const selectedProduct = item ? this.products.find(p => p._id === item.productId) : null;
        
        return this.fb.group({
            product: [selectedProduct || null, Validators.required],
            quantity: [item?.quantity || '', [Validators.required, Validators.min(0.01)]],
            notes: [item?.notes || '']
        });
    }

    addItem(item?: OrderItem): void {
        const itemGroup = this.fb.group({
            product: [null, Validators.required],
            quantity: [item?.quantity || '', [Validators.required, Validators.min(0.01)]],
            notes: [item?.notes || '']
        });

        if (item) {
            // We need to wait for products to load to set the product object correctly
            // Or we can just set the value if we had the product list already.
            // Since products are loaded async, we might need a better strategy if we want to pre-fill correctly on edit.
            // For now, let's assume products are loaded fast or we handle it in ngOnInit.
            // Actually, let's just store the item data and patch it when products arrive if needed, 
            // but here we are in constructor/addItem.
            
            // Better approach for edit:
            // The form control expects a Product object.
            // We only have productId in OrderItem.
            // We'll handle this by patching the form array in ngOnInit after products load.
        }
        
        this.items.push(itemGroup);
    }

    removeItem(index: number): void {
        this.items.removeAt(index);
    }

    compareProducts(p1: Product, p2: Product): boolean {
        return p1 && p2 ? p1._id === p2._id : p1 === p2;
    }

    getUnit(index: number): string {
        const product = this.items.at(index).get('product')?.value as Product;
        return product ? product.unit : '';
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.form.valid) {
            const formValue = this.form.value;
            
            const items: OrderItem[] = formValue.items.map((item: any) => {
                const product = item.product as Product;
                return {
                    productId: product._id,
                    productName: product.name,
                    unit: product.unit,
                    quantity: item.quantity,
                    notes: item.notes
                };
            });

            const result: Partial<Order> = {
                customerName: formValue.customerName,
                customerEmail: formValue.customerEmail,
                customerPhone: formValue.customerPhone,
                market: formValue.market,
                orderDate: formValue.orderDate.toISOString(),
                items: items
            };
            
            this.dialogRef.close(result);
        }
    }
}
