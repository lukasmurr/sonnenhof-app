export interface Supplier {
    _id?: string;
    _rev?: string;
    type: 'supplier';
    name: string;
    phone?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type PurchaseProductCategory = 'Fleisch' | 'Gewürze' | 'Verpackung' | 'Sonstiges';

export interface PurchaseProduct {
    _id?: string;
    _rev?: string;
    type: 'purchase-product';
    name: string;
    category: PurchaseProductCategory;
    supplierId: string;
    supplierName?: string;
    unit: 'kg' | 'Stück' | 'Liter' | 'Packung';
    comment?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PriceEntry {
    _id?: string;
    _rev?: string;
    type: 'price-entry';
    productId: string;
    price: number;
    quantity: number;
    date: string;
    createdAt?: string;
    updatedAt?: string;
}
