import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { PurchaseProduct, PurchaseProductCategory, Supplier } from '../../../../core/models/purchasing-price.model';
import { PurchasingPriceService } from '../../../../core/services/purchasing-price.service';

export interface PurchaseProductDialogData {
    product?: PurchaseProduct;
}

@Component({
    selector: 'app-purchase-product-dialog',
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule
    ],
    templateUrl: './purchase-product-dialog.html',
    styleUrls: ['./purchase-product-dialog.scss']
})
export class PurchaseProductDialogComponent implements OnInit {
    form: FormGroup;
    suppliers = signal<Supplier[]>([]);
    
    categories: PurchaseProductCategory[] = ['Fleisch', 'Gewürze', 'Verpackung', 'Futtermittel', 'Sonstiges'];
    units: PurchaseProduct['unit'][] = ['dt', 'kg', 'Stück', 'Liter', 'Packung'];

    showNewSupplierForm = signal(false);
    newSupplierForm: FormGroup;

    private purchasingPriceService = inject(PurchasingPriceService);
    private fb = inject(FormBuilder);

    constructor(
        private dialogRef: MatDialogRef<PurchaseProductDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: PurchaseProductDialogData
    ) {
        this.form = this.fb.group({
            name: [data.product?.name || '', Validators.required],
            category: [data.product?.category || 'Fleisch', Validators.required],
            supplierId: [data.product?.supplierId || '', Validators.required],
            unit: [data.product?.unit || 'kg', Validators.required],
            comment: [data.product?.comment || '']
        });

        this.newSupplierForm = this.fb.group({
            name: ['', Validators.required],
            phone: [''],
            email: ['', Validators.email]
        });
    }

    ngOnInit(): void {
        this.purchasingPriceService.getSuppliers().subscribe(suppliers => {
            this.suppliers.set(suppliers);
        });
    }

    toggleNewSupplierForm(): void {
        this.showNewSupplierForm.update(v => !v);
    }

    async saveNewSupplier(): Promise<void> {
        if (this.newSupplierForm.valid) {
            const result = await this.purchasingPriceService.addSupplier(this.newSupplierForm.value);
            if (result.id) {
                this.form.patchValue({ supplierId: result.id });
                this.showNewSupplierForm.set(false);
                this.newSupplierForm.reset();
            }
        }
    }

    save(): void {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        }
    }
}
