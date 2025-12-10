
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Market } from '../../../../core/models/market.model';
import { Order, OrderItem } from '../../../../core/models/order.model';
import { Product } from '../../../../core/models/product.model';
import { MarketService } from '../../../../core/services/market.service';
import { ProductService } from '../../../../core/services/product.service';
import { atLeastOneContactValidator } from '../../../../core/validators/at-least-one-contact.validator';
import { ProductSelectComponent } from './product-select/product-select';

export interface OrderDialogData {
    order?: Order;
    isReorder?: boolean;
}

@Component({
    selector: 'app-order-dialog',
    standalone: true,
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    MatIconModule,
    ProductSelectComponent
],
    templateUrl: './order-dialog.html',
    styleUrls: ['./order-dialog.scss']
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
            status: [data.order?.status || 'open'],
            orderNumber: [data.order?.orderNumber || ''],
            items: this.fb.array([])
        }, { validators: atLeastOneContactValidator('customerEmail', 'customerPhone') });

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
        if (this.data.isReorder) {
            this.form.get('customerName')?.disable();
            this.form.get('customerEmail')?.disable();
            this.form.get('customerPhone')?.disable();
            this.form.get('market')?.disable();
            this.form.get('orderDate')?.disable();
        }

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

                if (this.data.isReorder) {
                    this.addItem();
                }
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
        return product ? product.unit : 'Menge';
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    resetStatus(): void {
        this.form.patchValue({
            status: 'open',
            orderNumber: null
        });
        this.form.markAsDirty();
    }

    onSave(): void {
        if (this.form.valid) {
            const formValue = this.form.getRawValue();

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
                items: items,
                status: formValue.status,
                orderNumber: formValue.status === 'open' ? undefined : formValue.orderNumber
            };

            this.dialogRef.close(result);
        }
    }
}
