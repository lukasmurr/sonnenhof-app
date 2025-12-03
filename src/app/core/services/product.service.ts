import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CouchDbService } from './pouchdb.service';
import { Product } from '../models/product.model';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private readonly TYPE = 'product';

    constructor(private dbService: CouchDbService, private http: HttpClient) {}

    getProducts(): Observable<Product[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Product[]>;
    }

    initializeProducts(): void {
        this.dbService.getAllDocs(this.TYPE).then((products: Product[]) => {
            this.http.get<any[]>('assets/products.json').subscribe(data => {
                const existingPuNumbers = new Set(products.map(p => p.puNumber));

                data.forEach(p => {
                    if (p.puNumber && !existingPuNumbers.has(p.puNumber)) {
                        this.addProduct({
                            puNumber: p.puNumber,
                            name: p.name,
                            unit: p.unit
                        } as any);
                    }
                });
            });
        });
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
