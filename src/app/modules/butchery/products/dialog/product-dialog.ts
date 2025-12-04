import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Product } from '../../../../core/models/product.model';

export interface ProductDialogData {
    product?: Product;
}

@Component({
    selector: 'app-product-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ],
    templateUrl: './product-dialog.html',
    styles: [`
        .product-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 300px;
            padding-top: 1rem;
        }
        mat-form-field {
            width: 100%;
        }
    `]
})
export class ProductDialogComponent {
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<ProductDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ProductDialogData
    ) {
        this.form = this.fb.group({
            puNumber: [data.product?.puNumber || '', Validators.required],
            name: [data.product?.name || '', Validators.required],
            unit: [data.product?.unit || 'Stück', Validators.required]
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        }
    }
}
