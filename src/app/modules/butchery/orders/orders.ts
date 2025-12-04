import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import moment from 'moment';
import { Market } from '../../../core/models/market.model';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';
import { MarketService } from '../../../core/services/market.service';
import { OrderService } from '../../../core/services/order.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ProductService } from '../../../core/services/product.service';
import { OrderDialogComponent } from './dialog/order-dialog';
import { ReportDialogComponent } from './dialog/report-dialog/report-dialog';

@Component({
    selector: 'app-orders',
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
        MatFormFieldModule,
        MatInputModule
    ],
    templateUrl: './orders.html',
    styleUrls: ['./orders.scss']
})
export class OrdersComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['orderDate', 'customerName', 'market', 'items', 'actions'];
    dataSource: MatTableDataSource<Order>;
    markets: Market[] = [];
    products: Product[] = [];

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private orderService: OrderService,
        private marketService: MarketService,
        private productService: ProductService,
        private dialog: MatDialog,
        private router: Router,
        private pdfService: PdfService
    ) {
        this.dataSource = new MatTableDataSource<Order>([]);
    }

    ngOnInit(): void {
        this.loadOrders();
        this.loadMarkets();
        this.loadProducts();

        this.dataSource.filterPredicate = (data: Order, filter: string) => {
            const searchStr = filter.toLowerCase();
            const customerMatch = data.customerName?.toLowerCase().includes(searchStr) || false;
            const marketMatch = data.market?.toLowerCase().includes(searchStr) || false;
            const itemsMatch = data.items?.some(item =>
                item.productName?.toLowerCase().includes(searchStr) ||
                (item.notes && item.notes.toLowerCase().includes(searchStr))
            ) || false;

            return customerMatch || marketMatch || itemsMatch;
        };
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    goBack(): void {
        this.router.navigate(['/butchery']);
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    loadOrders() {
        this.orderService.getOrders().subscribe(orders => {
            this.dataSource.data = orders;
        });
    }

    loadMarkets() {
        this.marketService.getMarkets().subscribe(markets => {
            this.markets = markets;
        });
    }

    loadProducts() {
        this.productService.getProducts().subscribe(products => {
            this.products = products;
        });
    }

    openOrderDialog(order?: Order, isReorder: boolean = false): void {
        const dialogRef = this.dialog.open(OrderDialogComponent, {
            width: '95%',
            maxWidth: '800px',
            data: { order, isReorder }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (order) {
                    // Update
                    const updatedOrder: Order = {
                        ...order,
                        ...result
                    };
                    this.orderService.updateOrder(updatedOrder);
                } else {
                    // Create
                    this.orderService.addOrder(result);
                }
            }
        });
    }

    deleteOrder(order: Order): void {
        if (confirm(`Möchten Sie die Bestellung von "${order.customerName}" wirklich löschen?`)) {
            if (order._id) {
                this.orderService.deleteOrder(order._id);
            }
        }
    }

    markAsPrepared(order: Order): void {
        const orderNumber = prompt('Bitte geben Sie eine Bestellnummer ein:');
        if (orderNumber) {
            // Check for uniqueness
            const exists = this.dataSource.data.some(o => o.orderNumber === orderNumber && o._id !== order._id);
            if (exists) {
                alert('Diese Bestellnummer existiert bereits. Bitte wählen Sie eine andere.');
                return;
            }

            const updatedOrder: Order = {
                ...order,
                orderNumber: orderNumber,
                status: 'prepared'
            };
            this.orderService.updateOrder(updatedOrder);
        }
    }

    openReportDialog(): void {
        const dialogRef = this.dialog.open(ReportDialogComponent, {
            width: '400px'
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.generateReport(result);
            }
        });
    }

    generateReport(filter: any) {
        const allOrders = this.dataSource.data;
        let filteredOrders = [];

        if (filter.type === 'market') {
            filteredOrders = allOrders.filter(o => o.market === filter.market);

            if (filter.dateType === 'day') {
                const date = moment(filter.date).format('YYYY-MM-DD');
                filteredOrders = filteredOrders.filter(o => moment(o.orderDate).format('YYYY-MM-DD') === date);
            } else if (filter.dateType === 'range') {
                const start = moment(filter.startDate).startOf('day');
                const end = moment(filter.endDate).endOf('day');
                filteredOrders = filteredOrders.filter(o => {
                    const orderDate = moment(o.orderDate);
                    return orderDate.isBetween(start, end, undefined, '[]');
                });
            } else {
                filteredOrders = filteredOrders.filter(o => {
                    const orderDate = moment(o.orderDate);
                    return orderDate.isoWeek() === filter.week && orderDate.year() === filter.year;
                });
            }

            this.pdfService.generateMarketVehicleReport(filteredOrders, filter, this.products);

        } else if (filter.type === 'production') {
            filteredOrders = allOrders;

            if (filter.dateType === 'day') {
                const date = moment(filter.date).format('YYYY-MM-DD');
                filteredOrders = filteredOrders.filter(o => moment(o.orderDate).format('YYYY-MM-DD') === date);
            } else if (filter.dateType === 'range') {
                const start = moment(filter.startDate).startOf('day');
                const end = moment(filter.endDate).endOf('day');
                filteredOrders = filteredOrders.filter(o => {
                    const orderDate = moment(o.orderDate);
                    return orderDate.isBetween(start, end, undefined, '[]');
                });
            } else {
                filteredOrders = filteredOrders.filter(o => {
                    const orderDate = moment(o.orderDate);
                    return orderDate.isoWeek() === filter.week && orderDate.year() === filter.year;
                });
            }

            this.pdfService.generateProductionReport(filteredOrders, filter, this.products);
        }
    }

    printOrder(order: Order): void {
        const market = this.markets.find(m => m.name === order.market);
        this.pdfService.generateOrderPdf(order, market);
    }

    printFilteredOrders() {
        const filteredOrders = this.dataSource.filteredData;
        if (filteredOrders.length > 0) {
            this.pdfService.generateFilteredOrdersReport(filteredOrders);
        }
    }
}
