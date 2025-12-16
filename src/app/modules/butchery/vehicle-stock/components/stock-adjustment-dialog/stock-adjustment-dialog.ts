import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { VehicleStock } from '../../../../../core/models/vehicle-stock.model';

export interface StockAdjustmentDialogData {
    stock: VehicleStock;
    calculatedPreps: Map<string, number>; // itemId -> calculated prep
}

@Component({
    selector: 'app-stock-adjustment-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatTableModule
    ],
    templateUrl: './stock-adjustment-dialog.html',
    styles: [`
        .full-width-table { width: 100%; }
        .small-input { width: 80px; }
    `]
})
export class StockAdjustmentDialogComponent {
    readonly dialogRef = inject(MatDialogRef<StockAdjustmentDialogComponent>);
    readonly data = inject<StockAdjustmentDialogData>(MAT_DIALOG_DATA);

    displayedColumns: string[] = ['name', 'target', 'reported', 'calculated', 'adjusted'];

    items = this.data.stock.items.map(item => ({
        ...item,
        calculatedPrep: this.data.calculatedPreps.get(item.itemId) || 0
    }));

    save() {
        // Update the original stock items with the adjusted values
        const updatedItems = this.data.stock.items.map(item => {
            const adjustedItem = this.items.find(i => i.itemId === item.itemId);
            return {
                ...item,
                adjustedPreparationQuantity: adjustedItem?.adjustedPreparationQuantity
            };
        });

        this.dialogRef.close(updatedItems);
    }

    cancel() {
        this.dialogRef.close();
    }
}
