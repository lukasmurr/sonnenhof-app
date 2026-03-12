import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SupplierPurchaseSupplier } from '../../../../../core/models/supplier-purchase.model';

interface SupplierCreateDialogData {
    supplier?: SupplierPurchaseSupplier;
}

@Component({
    selector: 'app-supplier-create-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule
    ],
    templateUrl: './supplier-create-dialog.html',
    styleUrls: ['./supplier-create-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierCreateDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<SupplierCreateDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as SupplierCreateDialogData | null;

    readonly isEditMode = !!this.data?.supplier;
    readonly dialogTitle = this.isEditMode ? 'Lieferant bearbeiten' : 'Lieferant anlegen';

    readonly form = this.fb.group({
        name: this.fb.nonNullable.control(this.data?.supplier?.name ?? '', [Validators.required]),
        phone: this.fb.nonNullable.control(this.data?.supplier?.phone ?? ''),
        email: this.fb.nonNullable.control(this.data?.supplier?.email ?? '', [Validators.email])
    });

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        this.dialogRef.close({
            name: raw.name.trim(),
            phone: raw.phone.trim() || undefined,
            email: raw.email.trim() || undefined
        });
    }
}
