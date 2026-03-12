export interface SupplierPurchaseListItem {
    itemId: string;
    productName: string;
    unit: 'kg' | 'Stück' | 'Liter' | 'Packung';
    targetQuantity: number;
    note?: string;
}

export interface SupplierPurchaseSupplier {
    _id?: string;
    _rev?: string;
    type: 'supplier-purchase-supplier';
    name: string;
    phone?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SupplierPurchaseList {
    _id?: string;
    _rev?: string;
    type: 'supplier-purchase-list';
    supplierId: string;
    supplierName: string;
    items: SupplierPurchaseListItem[];
    createdAt?: string;
    updatedAt?: string;
}
