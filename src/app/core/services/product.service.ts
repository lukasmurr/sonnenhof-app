import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CouchDbService } from './pouchdb.service';
import { Product } from '../models/product.model';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private readonly TYPE = 'product';

    constructor(private dbService: CouchDbService) {}

    getProducts(): Observable<Product[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Product[]>;
    }

    addProduct(product: Omit<Product, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newProduct: Product = {
            ...product,
            type: this.TYPE
        };
        return this.dbService.addDoc(newProduct);
    }

    updateProduct(product: Product): Promise<any> {
        return this.dbService.updateDoc(product);
    }

    deleteProduct(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
