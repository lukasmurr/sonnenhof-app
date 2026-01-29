import { Injectable, signal, computed } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { Supplier, PurchaseProduct, PriceEntry } from '../models/purchasing-price.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class PurchasingPriceService {
    private readonly SUPPLIER_TYPE = 'supplier';
    private readonly PRODUCT_TYPE = 'purchase-product';
    private readonly PRICE_ENTRY_TYPE = 'price-entry';

    constructor(private dbService: CouchDbService) { }

    // ========== Suppliers ==========

    getSuppliers(): Observable<Supplier[]> {
        return this.dbService.watchDocs(this.SUPPLIER_TYPE) as Observable<Supplier[]>;
    }

    addSupplier(supplier: Omit<Supplier, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newSupplier: Supplier = {
            ...supplier,
            type: this.SUPPLIER_TYPE,
            _id: `supplier_${Date.now()}`
        };
        return this.dbService.addDoc(newSupplier);
    }

    updateSupplier(supplier: Supplier): Promise<any> {
        return this.dbService.updateDoc(supplier);
    }

    deleteSupplier(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    // ========== Purchase Products ==========

    getPurchaseProducts(): Observable<PurchaseProduct[]> {
        return this.dbService.watchDocs(this.PRODUCT_TYPE) as Observable<PurchaseProduct[]>;
    }

    getPurchaseProductsWithSupplier(): Observable<PurchaseProduct[]> {
        return combineLatest([
            this.getPurchaseProducts(),
            this.getSuppliers()
        ]).pipe(
            map(([products, suppliers]) => {
                return products.map(product => {
                    const supplier = suppliers.find(s => s._id === product.supplierId);
                    return {
                        ...product,
                        supplierName: supplier?.name || 'Unbekannt'
                    };
                });
            })
        );
    }

    addPurchaseProduct(product: Omit<PurchaseProduct, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newProduct: PurchaseProduct = {
            ...product,
            type: this.PRODUCT_TYPE,
            _id: `purchase-product_${Date.now()}`
        };
        return this.dbService.addDoc(newProduct);
    }

    updatePurchaseProduct(product: PurchaseProduct): Promise<any> {
        return this.dbService.updateDoc(product);
    }

    deletePurchaseProduct(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    // ========== Price Entries ==========

    getPriceEntries(): Observable<PriceEntry[]> {
        return this.dbService.watchDocs(this.PRICE_ENTRY_TYPE) as Observable<PriceEntry[]>;
    }

    getPriceEntriesForProduct(productId: string): Observable<PriceEntry[]> {
        return this.getPriceEntries().pipe(
            map(entries => entries
                .filter(e => e.productId === productId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            )
        );
    }

    addPriceEntry(entry: Omit<PriceEntry, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newEntry: PriceEntry = {
            ...entry,
            type: this.PRICE_ENTRY_TYPE,
            _id: `price-entry_${Date.now()}`
        };
        return this.dbService.addDoc(newEntry);
    }

    updatePriceEntry(entry: PriceEntry): Promise<any> {
        return this.dbService.updateDoc(entry);
    }

    deletePriceEntry(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    // ========== Statistics ==========

    getLatestPrice(productId: string): Observable<number | null> {
        return this.getPriceEntriesForProduct(productId).pipe(
            map(entries => entries.length > 0 ? entries[0].price : null)
        );
    }

    getAveragePrice(productId: string): Observable<number | null> {
        return this.getPriceEntriesForProduct(productId).pipe(
            map(entries => {
                if (entries.length === 0) return null;
                const sum = entries.reduce((acc, e) => acc + e.price, 0);
                return Math.round((sum / entries.length) * 100) / 100;
            })
        );
    }

    getPriceChange(productId: string): Observable<{ change: number; percentage: number } | null> {
        return this.getPriceEntriesForProduct(productId).pipe(
            map(entries => {
                if (entries.length < 2) return null;
                const latest = entries[0].price;
                const previous = entries[1].price;
                const change = latest - previous;
                const percentage = previous !== 0 ? (change / previous) * 100 : 0;
                return {
                    change: Math.round(change * 100) / 100,
                    percentage: Math.round(percentage * 100) / 100
                };
            })
        );
    }
}
