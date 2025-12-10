
import { Component, Inject } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, from, map, of } from 'rxjs';
import { Product } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product.service';

@Component({
    selector: 'app-product-dialog',
    standalone: true,
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
],
    templateUrl: './product-dialog.html',
    styleUrls: ['./product-dialog.scss']
})
export class ProductDialogComponent {
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<ProductDialogComponent>,
        private productService: ProductService,
        @Inject(MAT_DIALOG_DATA) public data: { product?: Product }
    ) {
        this.form = this.fb.group({
            puNumber: [
                data.product?.puNumber || '',
                [Validators.required],
                [this.puNumberValidator()]
            ],
            name: [data.product?.name || '', Validators.required],
            unit: [data.product?.unit || 'Stück', Validators.required]
        });
    }

    puNumberValidator(): AsyncValidatorFn {
        return (control: AbstractControl): Observable<ValidationErrors | null> => {
            if (!control.value) {
                return of(null);
            }
            // If we are editing and the PU number hasn't changed, it's valid
            if (this.data.product && this.data.product.puNumber === control.value) {
                return of(null);
            }

            return from(this.productService.checkProductExists(control.value)).pipe(
                map(exists => exists ? { puNumberExists: true } : null)
            );
        };
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
