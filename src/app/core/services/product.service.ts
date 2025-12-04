import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private readonly TYPE = 'product';

    constructor(private dbService: CouchDbService) { }

    getProducts(): Observable<Product[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Product[]>;
    }

    addProduct(product: Omit<Product, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newProduct: Product = {
            ...product,
            type: this.TYPE,
            _id: `product_${product.puNumber}`
        };
        return this.dbService.addDoc(newProduct);
    }

    async updateProduct(product: Product): Promise<any> {
        const targetId = `product_${product.puNumber}`;

        if (product._id && product._id !== targetId) {
            try {
                await this.dbService.getDoc(targetId);
                throw new Error(`Ein Produkt mit der PU-Nummer ${product.puNumber} existiert bereits.`);
            } catch (error: any) {
                if (error.status !== 404 && error.message !== `Ein Produkt mit der PU-Nummer ${product.puNumber} existiert bereits.`) {
                    throw error;
                }
                if (error.message === `Ein Produkt mit der PU-Nummer ${product.puNumber} existiert bereits.`) {
                    throw error;
                }
            }

            await this.dbService.deleteDoc(product._id);

            const newProduct = { ...product, _id: targetId };
            delete newProduct._rev;
            return this.dbService.addDoc(newProduct);
        }

        return this.dbService.updateDoc(product);
    }

    deleteProduct(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    async cleanupDuplicates(): Promise<number> {
        const products = await this.dbService.getAllDocs(this.TYPE);
        const productsByPu: { [key: string]: Product[] } = {};
        let deletedCount = 0;

        // Group by PU Number
        products.forEach((p: Product) => {
            if (!productsByPu[p.puNumber]) {
                productsByPu[p.puNumber] = [];
            }
            productsByPu[p.puNumber].push(p);
        });

        // Find duplicates
        for (const pu in productsByPu) {
            const group = productsByPu[pu];
            if (group.length > 1) {
                // Sort: Prefer ID 'product_PU', then newest updatedAt
                group.sort((a, b) => {
                    const aIsCorrectId = a._id === `product_${a.puNumber}`;
                    const bIsCorrectId = b._id === `product_${b.puNumber}`;

                    if (aIsCorrectId && !bIsCorrectId) return -1;
                    if (!aIsCorrectId && bIsCorrectId) return 1;

                    const dateA = new Date(a.updatedAt || 0).getTime();
                    const dateB = new Date(b.updatedAt || 0).getTime();
                    return dateB - dateA; // Newest first
                });

                // Keep the first one, delete the rest
                const toDelete = group.slice(1);
                for (const p of toDelete) {
                    if (p._id) {
                        await this.dbService.deleteDoc(p._id);
                        deletedCount++;
                    }
                }
            }
        }
        return deletedCount;
    }

    async checkProductExists(puNumber: string): Promise<boolean> {
        try {
            await this.dbService.getDoc(`product_${puNumber}`);
            return true;
        } catch (err: any) {
            if (err.status === 404) {
                return false;
            }
            throw err;
        }
    }
}
