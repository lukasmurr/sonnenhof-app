import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { SupplierPurchaseList, SupplierPurchaseListItem, SupplierPurchaseSupplier } from '../models/supplier-purchase.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class SupplierPurchaseService {
    private readonly SUPPLIER_TYPE = 'supplier-purchase-supplier';
    private readonly LIST_TYPE = 'supplier-purchase-list';

    constructor(private dbService: CouchDbService) { }

    getSuppliers(): Observable<SupplierPurchaseSupplier[]> {
        return this.dbService.watchDocs(this.SUPPLIER_TYPE) as Observable<SupplierPurchaseSupplier[]>;
    }

    addSupplier(supplier: Omit<SupplierPurchaseSupplier, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newSupplier: SupplierPurchaseSupplier = {
            ...supplier,
            type: this.SUPPLIER_TYPE,
            _id: `supplier-purchase-supplier_${Date.now()}`
        };
        return this.dbService.addDoc(newSupplier);
    }

    async updateSupplier(supplier: SupplierPurchaseSupplier): Promise<void> {
        if (!supplier._id) {
            throw new Error('Supplier id is required for update.');
        }

        const existingSupplier = await this.dbService.getDoc(supplier._id) as SupplierPurchaseSupplier;
        await this.dbService.updateDoc({
            ...existingSupplier,
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email
        });

        const lists = await firstValueFrom(this.getLists());
        const supplierLists = lists.filter(list => list.supplierId === supplier._id && !!list._id);

        for (const list of supplierLists) {
            if (list.supplierName !== supplier.name) {
                await this.dbService.updateDoc({
                    ...list,
                    supplierName: supplier.name
                });
            }
        }
    }

    async deleteSupplier(supplierId: string): Promise<void> {
        const lists = await firstValueFrom(this.getLists());
        const supplierLists = lists.filter(list => list.supplierId === supplierId && !!list._id);

        for (const list of supplierLists) {
            await this.deleteListById(list._id as string);
        }

        try {
            await this.dbService.deleteDoc(supplierId);
        } catch (error: unknown) {
            const pouchError = error as { status?: number };
            if (pouchError.status !== 404) {
                throw error;
            }
        }
    }

    getLists(): Observable<SupplierPurchaseList[]> {
        return this.dbService.watchDocs(this.LIST_TYPE) as Observable<SupplierPurchaseList[]>;
    }

    async saveList(
        supplierId: string,
        supplierName: string,
        listName: string,
        items: SupplierPurchaseListItem[],
        listId?: string
    ): Promise<void> {
        if (listId) {
            const existing = await this.dbService.getDoc(listId) as SupplierPurchaseList;
            await this.dbService.updateDoc({
                ...existing,
                supplierName,
                listName,
                items
            });
            return;
        }

        const list: SupplierPurchaseList = {
            _id: this.createListId(supplierId),
            type: this.LIST_TYPE,
            supplierId,
            supplierName,
            listName,
            items
        };
        await this.dbService.addDoc(list);
    }

    async deleteListById(listId: string): Promise<void> {
        try {
            await this.dbService.deleteDoc(listId);
        } catch (error: unknown) {
            const pouchError = error as { status?: number };
            if (pouchError.status !== 404) {
                throw error;
            }
        }
    }

    async deleteList(listId: string): Promise<void> {
        await this.deleteListById(listId);
    }

    private createListId(supplierId: string): string {
        return `supplier-purchase-list_${supplierId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}
