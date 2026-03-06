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
        .mobile-list-view { display: none; }
        .mobile-cards-grid { display: grid; gap: 10px; }
        .mobile-item-card {
            border: 1px solid rgba(63, 81, 181, 0.15);
            border-radius: 12px;
            padding: 10px 12px;
            background: #fafbff;
        }
        .mobile-item-card h3 { margin: 0 0 6px; font-size: 0.95rem; }
        .mobile-item-card p { margin: 0 0 2px; font-size: 0.9rem; }

        :host-context(.dark-theme) .mobile-item-card {
            background: #4a4a4a;
            border-color: rgba(144, 164, 255, 0.35);
            color: #eceff1;
        }

        @media (max-width: 768px) {
            .desktop-table-view { display: none; }
            .mobile-list-view { display: block; }
            .small-input { width: 100%; }
        }
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
