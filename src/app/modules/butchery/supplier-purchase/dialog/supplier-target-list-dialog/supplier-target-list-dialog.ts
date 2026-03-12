import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { SupplierPurchaseList, SupplierPurchaseListItem, SupplierPurchaseSupplier } from '../../../../../core/models/supplier-purchase.model';

type ListItemFormGroup = FormGroup<{
    itemId: FormControl<string>;
    productName: FormControl<string>;
    unit: FormControl<'kg' | 'Stück' | 'Liter' | 'Packung'>;
    targetQuantity: FormControl<number | null>;
    note: FormControl<string>;
}>;

@Component({
    selector: 'app-supplier-target-list-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        ReactiveFormsModule
    ],
    templateUrl: './supplier-target-list-dialog.html',
    styleUrls: ['./supplier-target-list-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierTargetListDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<SupplierTargetListDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as {
        supplier: SupplierPurchaseSupplier;
        existingList?: SupplierPurchaseList;
    };

    readonly form = this.fb.group({
        listName: this.fb.nonNullable.control(this.data.existingList?.listName ?? '', [Validators.required]),
        items: this.fb.array<ListItemFormGroup>([])
    });

    readonly units: Array<'kg' | 'Stück' | 'Liter' | 'Packung' | 'Gebinde'> = ['kg', 'Stück', 'Liter', 'Packung', 'Gebinde'];

    constructor() {
        const existingItems = this.data.existingList?.items ?? [];

        if (existingItems.length > 0) {
            for (const existing of existingItems) {
                this.items.push(this.createItemGroup(existing));
            }
        } else {
            this.addItem();
        }
    }

    get items(): FormArray<ListItemFormGroup> {
        return this.form.controls.items;
    }

    addItem(): void {
        this.items.push(this.createItemGroup());
    }

    removeItem(index: number): void {
        if (this.items.length <= 1) {
            return;
        }

        this.items.removeAt(index);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const rawItems = this.items.getRawValue();
        const items: SupplierPurchaseListItem[] = rawItems
            .filter(item => item.productName.trim().length > 0)
            .map(item => ({
                itemId: item.itemId,
                productName: item.productName.trim(),
                unit: item.unit,
                targetQuantity: item.targetQuantity ?? 0,
                note: item.note.trim() || undefined
            }))
            .filter(item => item.targetQuantity > 0 || !!item.note);

        this.dialogRef.close({
            listName: this.form.controls.listName.value.trim(),
            items
        });
    }

    private createItemGroup(item?: SupplierPurchaseListItem): ListItemFormGroup {
        return this.fb.group({
            itemId: this.fb.nonNullable.control(item?.itemId ?? this.createItemId()),
            productName: this.fb.nonNullable.control(item?.productName ?? '', [Validators.required]),
            unit: this.fb.nonNullable.control(item?.unit ?? 'kg'),
            targetQuantity: this.fb.control<number | null>(item?.targetQuantity ?? null, [Validators.min(0)]),
            note: this.fb.nonNullable.control(item?.note ?? '')
        });
    }

    private createItemId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
}
