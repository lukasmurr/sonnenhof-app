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
        const productsByKey: { [key: string]: Product[] } = {};
        let deletedCount = 0;

        // Group by PU Number and Name
        products.forEach((p: Product) => {
            const key = `${p.puNumber}_${p.name}`;
            if (!productsByKey[key]) {
                productsByKey[key] = [];
            }
            productsByKey[key].push(p);
        });

        // Find duplicates
        for (const key in productsByKey) {
            const group = productsByKey[key];
            if (group.length > 1) {
                // Sort: Prefer 'Kg', then ID 'product_PU', then newest updatedAt
                group.sort((a, b) => {
                    // 1. Prefer 'Kg' over 'Stück'
                    if (a.unit === 'Kg' && b.unit !== 'Kg') return -1;
                    if (a.unit !== 'Kg' && b.unit === 'Kg') return 1;

                    // 2. Prefer ID 'product_PU'
                    const aIsCorrectId = a._id === `product_${a.puNumber}`;
                    const bIsCorrectId = b._id === `product_${b.puNumber}`;

                    if (aIsCorrectId && !bIsCorrectId) return -1;
                    if (!aIsCorrectId && bIsCorrectId) return 1;

                    // 3. Newest updatedAt
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
