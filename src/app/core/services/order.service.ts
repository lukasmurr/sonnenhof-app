import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Order } from '../models/order.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private readonly TYPE = 'order';

    constructor(private dbService: CouchDbService) { }

    getOrders(): Observable<Order[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Order[]>;
    }

    addOrder(order: Omit<Order, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newOrder: Order = {
            ...order,
            type: this.TYPE
        };
        return this.dbService.addDoc(newOrder);
    }

    updateOrder(order: Order): Promise<any> {
        return this.dbService.updateDoc(order);
    }

    deleteOrder(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
