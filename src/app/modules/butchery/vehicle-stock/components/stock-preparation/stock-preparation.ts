import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { VehicleStock } from '../../../../../core/models/vehicle-stock.model';
import { MarketService } from '../../../../../core/services/market.service';
import { PdfService } from '../../../../../core/services/pdf.service';
import { VehicleStockService } from '../../../../../core/services/vehicle-stock.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { StockAdjustmentDialogComponent, StockAdjustmentDialogResult } from '../stock-adjustment-dialog/stock-adjustment-dialog';
import { HasPermissionDirective } from "src/app/core/directives/has-permission.directive";
import { ConfirmationDialogComponent } from '../../../../../core/components/confirmation-dialog/confirmation-dialog';
import { StockReportingComponent } from '../stock-reporting/stock-reporting';
import { StockManagementComponent } from '../stock-management/stock-management';
import { StockPrintOrderDialogComponent, StockPrintOrderDialogResult } from '../stock-print-order-dialog/stock-print-order-dialog';

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
    MatSelectModule,
    MatCardModule,
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
    private _authService = inject(AuthService);

    selectedDate = signal<Date>(new Date());
    isArchiveView = signal<boolean>(false);
    selectedYear = signal<number>(new Date().getFullYear());
    availableYears = signal<number[]>([]);

    private marketGroups = signal<MarketPrepGroup[]>([]);
    private globalPrintOrderIds = signal<string[]>([]);
    private _autoReportingDialogOpened = false;

    filteredMarketGroups = computed(() => this.marketGroups());

    displayedColumns: string[] = ['name', 'totalTarget', 'totalPrep'];

    private getDialogConfig(desktopWidth: string): MatDialogConfig {
        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

        if (isMobile) {
            return {
                width: '100vw',
                maxWidth: '100vw',
                height: '100dvh',
                maxHeight: '100dvh',
                panelClass: ['vehicle-stock-dialog', 'vehicle-stock-dialog-mobile'],
                disableClose: true,
                autoFocus: false,
                restoreFocus: false
            };
        }

        return {
            width: desktopWidth,
            maxWidth: '98vw',
            height: '94vh',
            maxHeight: '94vh',
            panelClass: ['vehicle-stock-dialog'],
            disableClose: true,
            autoFocus: false,
            restoreFocus: false
        };
    }

    openReportingDialog() {
        const dialogRef = this._dialog.open(StockReportingComponent, this.getDialogConfig('1200px'));

        dialogRef.afterClosed().subscribe((wasSaved?: boolean) => {
            if (wasSaved) {
                this.loadPrepList();
            }
        });
    }

    openManagementDialog() {
        this._dialog.open(StockManagementComponent, this.getDialogConfig('1100px'));
    }

    openPrintOrderDialog() {
        const uniqueItems = new Map<string, { itemId: string; name: string; unit: string }>();
        for (const group of this.marketGroups()) {
            for (const item of group.items) {
                if (!uniqueItems.has(item.itemId)) {
                    uniqueItems.set(item.itemId, { itemId: item.itemId, name: item.name, unit: item.unit });
                }
            }
        }

        const dialogRef = this._dialog.open(StockPrintOrderDialogComponent, {
            ...this.getDialogConfig('860px'),
            data: {
                printOrderIds: this.globalPrintOrderIds(),
                items: Array.from(uniqueItems.values()).sort((a, b) => a.name.localeCompare(b.name))
            }
        });

        dialogRef.afterClosed().subscribe((result?: StockPrintOrderDialogResult) => {
            if (result?.saved) {
                this.loadPrepList();
            }
        });
    }

    private sortItemsByPrintOrder<T extends { itemId: string; name: string }>(items: T[], printOrderIds: string[]): T[] {
        const orderMap = new Map(printOrderIds.map((itemId, index) => [itemId, index]));

        return [...items].sort((a, b) => {
            const rankA = orderMap.get(a.itemId);
            const rankB = orderMap.get(b.itemId);

            if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
            if (rankA !== undefined) return -1;
            if (rankB !== undefined) return 1;

            return a.name.localeCompare(b.name);
        });
    }

    ngOnInit() {
        // Default view always shows only today's reports.
        this.selectedDate.set(new Date());
        this.loadPrepList();

        // Verkaufsauto accounts should land directly in the reporting flow.
        if (this.shouldAutoOpenReportingDialog()) {
            setTimeout(() => {
                if (this._autoReportingDialogOpened) return;
                this._autoReportingDialogOpened = true;
                this.openReportingDialog();
            });
        }
    }

    private shouldAutoOpenReportingDialog(): boolean {
        const email = this._authService.getCurrentUser();
        if (!email) return false;

        return /^auto\d+@/i.test(email);
    }

    onDateChange(date: Date | null) {
        if (!this.isArchiveView() || !date) return;
        this.selectedDate.set(date);
        this.loadPrepList();
    }

    onArchiveToggle() {
        this.isArchiveView.update(v => !v);
        if (!this.isArchiveView()) {
            this.selectedDate.set(new Date());
        }
        this.loadPrepList();
    }

    onArchiveYearChange(year: number) {
        this.selectedYear.set(year);
        this.loadPrepList();
    }

    private toLocalIsoDate(date: Date): string {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    async loadPrepList() {
        const todayStr = this.toLocalIsoDate(new Date());
        let dateStr = this.toLocalIsoDate(this.selectedDate());
        const archiveView = this.isArchiveView();

        const [allStocks, allMarkets] = await Promise.all([
            firstValueFrom(this._stockService.getStocks()),
            firstValueFrom(this._marketService.getMarkets())
        ]);

        const globalPrintOrderConfig = await this._stockService.getGlobalPrintOrderConfig();
        const printOrderIds = globalPrintOrderConfig?.orderItemIds ?? [];
        this.globalPrintOrderIds.set(printOrderIds);

        const archivedStocks = allStocks.filter(s => s.date < todayStr);
        const years = Array.from(new Set(archivedStocks.map(s => Number(s.date.slice(0, 4))))).sort((a, b) => b - a);
        this.availableYears.set(years);

        if (archiveView) {
            if (!years.includes(this.selectedYear())) {
                this.selectedYear.set(years[0] ?? new Date().getFullYear());
            }

            const yearPrefix = `${this.selectedYear()}-`;
            const datesInYear = Array.from(new Set(
                archivedStocks
                    .filter(s => s.date.startsWith(yearPrefix))
                    .map(s => s.date)
            )).sort((a, b) => b.localeCompare(a));

            if (datesInYear.length > 0 && !datesInYear.includes(dateStr)) {
                dateStr = datesInYear[0];
                this.selectedDate.set(new Date(`${dateStr}T00:00:00`));
            }
        } else {
            dateStr = todayStr;
            this.selectedDate.set(new Date());
        }

        const stocks = allStocks.filter(s => {
            if (archiveView) {
                return s.date === dateStr && s.date < todayStr;
            }

            return s.date === todayStr;
        });

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

            const sortedItems = this.sortItemsByPrintOrder(Array.from(itemMap.values()), printOrderIds);
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
        const sortedForPdf = this.sortItemsByPrintOrder(group.items, this.globalPrintOrderIds());
        this._pdfService.generateStockPreparationReport(sortedForPdf, this.selectedDate(), group.marketName);
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
            disableClose: true,
            data: { stock: JSON.parse(JSON.stringify(group.stock)), calculatedPreps } // Pass copy to avoid direct mutation
        });

        dialogRef.afterClosed().subscribe(async (result?: StockAdjustmentDialogResult) => {
            if (!result || !group.stock) return;

            if (result.action === 'save') {
                group.stock.items = result.items;
                await this._stockService.updateStock(group.stock);
                this.loadPrepList();
                return;
            }

            const confirmRef = this._dialog.open(ConfirmationDialogComponent, {
                data: {
                    title: 'Bericht löschen',
                    message: `Möchten Sie den Bericht für "${group.marketName}" am ${group.stock.date} wirklich löschen?`
                }
            });

            confirmRef.afterClosed().subscribe(async confirmed => {
                if (!confirmed || !group.stock?._id) return;

                await this._stockService.deleteStock(group.stock._id);
                this.loadPrepList();
            });
        });
    }
}
