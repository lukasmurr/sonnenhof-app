import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { MarketService } from '../../../core/services/market.service';
import { Market } from '../../../core/models/market.model';
import { MarketDialogComponent } from './dialog/market-dialog';

@Component({
    selector: 'app-markets',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule
    ],
    templateUrl: './markets.html',
    styleUrls: ['./markets.scss']
})
export class MarketsComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['name', 'address', 'day', 'time', 'car', 'hasGrillTrailer', 'actions'];
    dataSource: MatTableDataSource<Market>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private marketService: MarketService,
        private dialog: MatDialog,
        private router: Router
    ) {
        this.dataSource = new MatTableDataSource<Market>([]);
    }

    ngOnInit(): void {
        this.loadMarkets();
    }

    goBack(): void {
        this.router.navigate(['/office']);
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadMarkets() {
        this.marketService.getMarkets().subscribe(markets => {
            this.dataSource.data = markets;
        });
    }

    openMarketDialog(market?: Market): void {
        const dialogRef = this.dialog.open(MarketDialogComponent, {
            width: '500px',
            data: { market }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (market) {
                    // Update
                    const updatedMarket: Market = {
                        ...market,
                        ...result
                    };
                    this.marketService.updateMarket(updatedMarket);
                } else {
                    // Create
                    this.marketService.addMarket(result);
                }
            }
        });
    }

    deleteMarket(market: Market): void {
        if (confirm(`Möchten Sie den Markt "${market.name}" wirklich löschen?`)) {
            if (market._id) {
                this.marketService.deleteMarket(market._id);
            }
        }
    }
}
