import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
        MatIconModule,
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

    moveUp(index: number) {
        if (index <= 0) return;

        const next = [...this.items()];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        this.items.set(next);
    }

    moveDown(index: number) {
        const next = [...this.items()];
        if (index < 0 || index >= next.length - 1) return;

        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        this.items.set(next);
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
