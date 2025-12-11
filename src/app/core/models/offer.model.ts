export interface OfferItem {
    productId: string;
    productName: string;
    puNumber: string;
    price?: number;
    soldQuantity?: number;
}

export interface Offer {
    _id?: string;
    _rev?: string;
    type: 'offer';
    year: number;
    week: number;
    items: OfferItem[];
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
