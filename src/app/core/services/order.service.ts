import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { Market } from '../models/market.model';
import { Order } from '../models/order.model';
import { CouchDbService } from './pouchdb.service';
import { PdfService } from './pdf.service';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private readonly TYPE = 'order';

    constructor(private dbService: CouchDbService, private http: HttpClient, private pdfService: PdfService) { }

    getOrders(): Observable<Order[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Order[]>;
    }

    addOrder(order: Omit<Order, '_id' | '_rev' | 'createdAt' | 'updatedAt'>, market?: Market): Promise<any> {
        const newOrder: Order = {
            ...order,
            type: this.TYPE
        };

        return this.dbService.addDoc(newOrder).then(result => {
            if (result && result.ok) {
                this.sendOrderCreatedEmail(newOrder, market).catch(err => console.error('Failed to send order email', err));
            }

            return result;
        });
    }

    private async sendOrderCreatedEmail(order: Order, market?: Market): Promise<void> {
        const apiUrl = 'http://localhost:3000/api/mail/order-created';
        const pdf = this.pdfService.getOrderPdfBase64(order, market);

        await firstValueFrom(this.http.post(apiUrl, {
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            market: order.market,
            orderDate: order.orderDate,
            items: order.items,
            pdfFileName: pdf.fileName,
            pdfBase64: pdf.base64
        }));
    }

    updateOrder(order: Order): Promise<any> {
        return this.dbService.updateDoc(order);
    }

    deleteOrder(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
