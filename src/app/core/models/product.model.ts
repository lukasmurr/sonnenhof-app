export interface Product {
    _id?: string;
    _rev?: string;
    type: 'product';
    puNumber: string;
    name: string;
    unit: 'Stück' | 'Kg';
    stockUnit?: string;
    createdAt?: string;
    updatedAt?: string;
}
