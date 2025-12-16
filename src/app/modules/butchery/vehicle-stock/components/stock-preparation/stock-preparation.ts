import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { VehicleStock } from '../../../../../core/models/vehicle-stock.model';
import { MarketService } from '../../../../../core/services/market.service';
import { PdfService } from '../../../../../core/services/pdf.service';
import { VehicleStockService } from '../../../../../core/services/vehicle-stock.service';
import { StockAdjustmentDialogComponent } from '../stock-adjustment-dialog/stock-adjustment-dialog';
import { HasPermissionDirective } from "src/app/core/directives/has-permission.directive";

interface MarketPrepGroup {
    marketId: string;
    marketName: string;
    stock?: VehicleStock;
    items: { name: string, totalTarget: number, totalPrep: number, unit: string, itemId: string }[];
}

@Component({
    selector: 'app-stock-preparation',
    standalone: true,
    imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    HasPermissionDirective
],
    templateUrl: './stock-preparation.html',
    styleUrls: ['./stock-preparation.scss']
})
export class StockPreparationComponent implements OnInit {
    private _stockService = inject(VehicleStockService);
    private _pdfService = inject(PdfService);
    private _marketService = inject(MarketService);
    private _dialog = inject(MatDialog);

    selectedDate = signal<Date>(new Date());
    showAllPositions = signal<boolean>(false);

    private marketGroups = signal<MarketPrepGroup[]>([]);

    filteredMarketGroups = computed(() => {
        const showAll = this.showAllPositions();
        return this.marketGroups().map(group => ({
            ...group,
            items: group.items.filter(item => showAll || item.totalPrep > 0)
        })).filter(group => group.items.length > 0);
    });

    displayedColumns: string[] = ['name', 'totalTarget', 'totalPrep'];

    ngOnInit() {
        // Default to today (Report Date)
        this.selectedDate.set(new Date());
        this.loadPrepList();
    }

    onDateChange(date: Date) {
        this.selectedDate.set(date);
        this.loadPrepList();
    }

    async loadPrepList() {
        const date = this.selectedDate();
        const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const [allStocks, allMarkets] = await Promise.all([
            firstValueFrom(this._stockService.getStocks()),
            firstValueFrom(this._marketService.getMarkets())
        ]);

        const stocks = allStocks.filter(s => s.date === dateStr);

        // Group stocks by marketId
        const stocksByMarket = new Map<string, typeof stocks>();
        for (const stock of stocks) {
            const existing = stocksByMarket.get(stock.marketId) || [];
            existing.push(stock);
            stocksByMarket.set(stock.marketId, existing);
        }

        const groups: MarketPrepGroup[] = [];

        for (const [marketId, marketStocks] of stocksByMarket.entries()) {
            const market = allMarkets.find(m => m._id === marketId);
            const marketName = market ? market.name : 'Unbekannter Markt';
            const config = await this._stockService.getConfigByMarket(marketId);

            const itemMap = new Map<string, { name: string, totalTarget: number, totalPrep: number, unit: string, itemId: string }>();

            for (const stock of marketStocks) {
                for (const item of stock.items) {
                    const target = item.targetQuantity || config?.targets.find(t => t.itemId === item.itemId)?.targetQuantity || 0;
                    const reported = item.quantity;
                    const calculated = Math.max(0, target - reported);
                    const finalPrep = item.adjustedPreparationQuantity !== undefined ? item.adjustedPreparationQuantity : calculated;

                    const key = item.itemId || item.name;
                    const existing = itemMap.get(key);
                    if (existing) {
                        existing.totalTarget += target;
                        existing.totalPrep += finalPrep;
                    } else {
                        itemMap.set(key, { name: item.name, totalTarget: target, totalPrep: finalPrep, unit: item.unit, itemId: item.itemId });
                    }
                }
            }

            const sortedItems = Array.from(itemMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            groups.push({
                marketId,
                marketName,
                stock: marketStocks[0],
                items: sortedItems
            });
        }

        // Sort groups by market name
        groups.sort((a, b) => a.marketName.localeCompare(b.marketName));
        this.marketGroups.set(groups);
    }

    generatePdf(group: MarketPrepGroup) {
        // Filter items based on current view settings (showAllPositions)
        const showAll = this.showAllPositions();
        const itemsToPrint = group.items.filter(item => showAll || item.totalPrep > 0);

        this._pdfService.generateStockPreparationReport(itemsToPrint, this.selectedDate(), group.marketName);
    }

    async adjustReport(group: MarketPrepGroup) {
        if (!group.stock) return;

        const config = await this._stockService.getConfigByMarket(group.marketId);
        const calculatedPreps = new Map<string, number>();

        for (const item of group.stock.items) {
            const target = item.targetQuantity || config?.targets.find(t => t.itemId === item.itemId)?.targetQuantity || 0;
            const reported = item.quantity;
            const calculated = Math.max(0, target - reported);
            calculatedPreps.set(item.itemId, calculated);
        }

        const dialogRef = this._dialog.open(StockAdjustmentDialogComponent, {
            width: '900px',
            data: { stock: JSON.parse(JSON.stringify(group.stock)), calculatedPreps } // Pass copy to avoid direct mutation
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && group.stock) {
                // result is the updated items array
                group.stock.items = result;
                await this._stockService.updateStock(group.stock);
                this.loadPrepList(); // Reload to refresh the view
            }
        });
    }
}
