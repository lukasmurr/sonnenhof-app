import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Market } from '../../../core/models/market.model';
import { AuthService } from '../../../core/services/auth.service';
import { MarketService } from '../../../core/services/market.service';
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
        MatTooltipModule,
        MatCardModule,
        HasPermissionDirective
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
        private router: Router,
        private authService: AuthService
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
        if (market) {
            if (!this.authService.hasPermission('market.update')) return;
        } else {
            if (!this.authService.hasPermission('market.create')) return;
        }

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
        if (!this.authService.hasPermission('market.delete')) return;

        if (confirm(`Möchten Sie den Markt "${market.name}" wirklich löschen?`)) {
            if (market._id) {
                this.marketService.deleteMarket(market._id);
            }
        }
    }
}
