import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';
import { OrderDialogComponent } from './dialog/order-dialog';

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
        MatTooltipModule
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
        private dialog: MatDialog
    ) {
        this.dataSource = new MatTableDataSource<Order>([]);
    }

    ngOnInit(): void {
        this.loadOrders();
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
            width: '400px',
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
}
