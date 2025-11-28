import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';
import { OrderDialogComponent } from './dialog/order-dialog';
import { ReportDialogComponent } from './dialog/report-dialog/report-dialog';
import { PdfService } from '../../../core/services/pdf.service';
import moment from 'moment';

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
        MatCardModule
    ],
    templateUrl: './orders.html',
    styleUrls: ['./orders.scss']
})
export class OrdersComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['orderDate', 'customerName', 'market', 'items', 'actions'];
    dataSource: MatTableDataSource<Order>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private orderService: OrderService,
        private dialog: MatDialog,
        private router: Router,
        private pdfService: PdfService
    ) {
        this.dataSource = new MatTableDataSource<Order>([]);
    }

    ngOnInit(): void {
        this.loadOrders();
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

    openOrderDialog(order?: Order): void {
        const dialogRef = this.dialog.open(OrderDialogComponent, {
            width: '95%',
            maxWidth: '800px',
            data: { order }
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
            } else {
                filteredOrders = filteredOrders.filter(o => {
                    const orderDate = moment(o.orderDate);
                    return orderDate.isoWeek() === filter.week && orderDate.year() === filter.year;
                });
            }

            this.pdfService.generateMarketVehicleReport(filteredOrders, filter);

        } else if (filter.type === 'production') {
            filteredOrders = allOrders.filter(o => {
                const orderDate = moment(o.orderDate);
                return orderDate.isoWeek() === filter.week && orderDate.year() === filter.year;
            });

            this.pdfService.generateProductionReport(filteredOrders, filter.week, filter.year);
        }
    }
}
