import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SupplierPurchaseList, SupplierPurchaseSupplier } from '../../../../../core/models/supplier-purchase.model';
import { PdfService } from '../../../../../core/services/pdf.service';

type ChecklistItemFormGroup = FormGroup<{
    productName: FormControl<string>;
    unit: FormControl<'kg' | 'Stück' | 'Liter' | 'Packung'>;
    targetQuantity: FormControl<number>;
    orderedQuantity: FormControl<number>;
    note: FormControl<string>;
    done: FormControl<boolean>;
}>;

@Component({
    selector: 'app-supplier-purchase-checklist-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        ReactiveFormsModule
    ],
    templateUrl: './supplier-purchase-checklist-dialog.html',
    styleUrls: ['./supplier-purchase-checklist-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierPurchaseChecklistDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<SupplierPurchaseChecklistDialogComponent>);
    private readonly pdfService = inject(PdfService);

    readonly data = inject(MAT_DIALOG_DATA) as {
        supplier: SupplierPurchaseSupplier;
        list: SupplierPurchaseList;
    };

    readonly currentIndex = signal(0);

    readonly form = this.fb.group({
        items: this.fb.array<ChecklistItemFormGroup>([])
    });

    readonly doneCount = computed(() => this.items.controls.filter(control => control.controls.done.value).length);

    constructor() {
        for (const item of this.data.list.items) {
            this.items.push(this.fb.group({
                productName: this.fb.nonNullable.control(item.productName),
                unit: this.fb.nonNullable.control(item.unit),
                targetQuantity: this.fb.nonNullable.control(item.targetQuantity),
                orderedQuantity: this.fb.nonNullable.control(item.targetQuantity, [Validators.min(0)]),
                note: this.fb.nonNullable.control(item.note ?? ''),
                done: this.fb.nonNullable.control(false)
            }));
        }
    }

    get items(): FormArray<ChecklistItemFormGroup> {
        return this.form.controls.items;
    }

    currentItem(): ChecklistItemFormGroup | null {
        const index = this.currentIndex();
        return this.items.at(index) ?? null;
    }

    isLastStep(): boolean {
        return this.currentIndex() >= this.items.length - 1;
    }

    prev(): void {
        this.currentIndex.update(value => Math.max(0, value - 1));
    }

    next(): void {
        this.markCurrentDone();
        this.currentIndex.update(value => Math.min(this.items.length - 1, value + 1));
    }

    exportPdf(): void {
        this.markCurrentDone();

        const items = this.items.getRawValue().map(item => ({
            productName: item.productName,
            quantity: item.orderedQuantity,
            unit: item.unit,
            note: item.note,
            completed: item.done
        }));

        this.pdfService.generateSupplierPurchaseListPdf(
            {
                name: this.data.supplier.name,
                phone: this.data.supplier.phone,
                email: this.data.supplier.email
            },
            this.data.list.listName,
            items
        );
        this.dialogRef.close();
    }

    private markCurrentDone(): void {
        const item = this.currentItem();
        if (item && !item.controls.done.value) {
            item.controls.done.setValue(true);
        }
    }
}
