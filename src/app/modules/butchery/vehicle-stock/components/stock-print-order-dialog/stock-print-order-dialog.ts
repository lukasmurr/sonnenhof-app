import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VehicleStockService } from '../../../../../core/services/vehicle-stock.service';

export interface StockPrintOrderDialogData {
    items: { itemId: string; name: string; unit: string }[];
    printOrderIds?: string[];
}

export interface StockPrintOrderDialogResult {
    saved: boolean;
}

@Component({
    selector: 'app-stock-print-order-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatSnackBarModule
    ],
    templateUrl: './stock-print-order-dialog.html',
    styleUrl: './stock-print-order-dialog.scss'
})
export class StockPrintOrderDialogComponent {
    readonly dialogRef = inject(MatDialogRef<StockPrintOrderDialogComponent, StockPrintOrderDialogResult>);
    readonly data = inject<StockPrintOrderDialogData>(MAT_DIALOG_DATA);

    private _stockService = inject(VehicleStockService);
    private _snackBar = inject(MatSnackBar);

    items = signal<{ itemId: string; name: string; unit: string }[]>([]);

    constructor() {
        const byId = new Map(this.data.items.map(item => [item.itemId, item]));
        const orderedByConfig = (this.data.printOrderIds ?? [])
            .map(id => byId.get(id))
            .filter((item): item is { itemId: string; name: string; unit: string } => !!item);

        const configuredIds = new Set(orderedByConfig.map(item => item.itemId));
        const notConfigured = this.data.items
            .filter(item => !configuredIds.has(item.itemId))
            .sort((a, b) => a.name.localeCompare(b.name));

        this.items.set([...orderedByConfig, ...notConfigured]);
    }

    // Keeps the array order as source of truth for persisted print order.
    moveProduct(oldIndex: number, newIndex: number): void {
        const currentItems = this.items();
        const itemCount = currentItems.length;
        if (itemCount === 0 || oldIndex < 0 || oldIndex >= itemCount) return;

        const boundedNewIndex = Math.max(0, Math.min(newIndex, itemCount - 1));
        if (boundedNewIndex === oldIndex) return;

        const next = [...currentItems];
        const [movedItem] = next.splice(oldIndex, 1);
        if (!movedItem) return;

        next.splice(boundedNewIndex, 0, movedItem);
        this.items.set(next);
    }

    setPositionFromInput(index: number, rawPosition: string | number | null): void {
        const parsedPosition = Number(rawPosition);
        if (!Number.isInteger(parsedPosition)) return;

        this.moveProduct(index, parsedPosition - 1);
    }

    moveBy(index: number, delta: number): void {
        this.moveProduct(index, index + delta);
    }

    async save() {
        try {
            await this._stockService.saveGlobalPrintOrder(this.items().map(item => item.itemId));
            this._snackBar.open('Lagerreihenfolge gespeichert', 'OK', { duration: 2500 });
            this.dialogRef.close({ saved: true });
        } catch (error) {
            this._snackBar.open('Fehler beim Speichern der Lagerreihenfolge', 'OK', { duration: 3000 });
        }
    }

    close() {
        this.dialogRef.close({ saved: false });
    }
}
