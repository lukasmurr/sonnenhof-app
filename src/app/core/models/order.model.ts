export interface OrderItem {
    productId: string;
    productName: string;
    unit: 'Stück' | 'Kg';
    quantity: number;
    notes?: string;
}

export interface Order {
    _id?: string;
    _rev?: string;
    type: 'order';
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    market: string;
    orderDate: string;
    items: OrderItem[];
    createdAt?: string;
    updatedAt?: string;
}
