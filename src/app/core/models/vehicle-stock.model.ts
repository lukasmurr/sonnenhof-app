export interface StockItem {
    itemId: string; // Product ID or Offer ID
    itemType: 'product' | 'offer';
    name: string;
    quantity: number;
    unit: string;
    targetQuantity?: number;
    adjustedPreparationQuantity?: number;
}

export interface VehicleStock {
    _id?: string;
    _rev?: string;
    type: 'vehicle-stock';
    date: string; // ISO Date string YYYY-MM-DD
    marketId: string;
    marketName: string;
    items: StockItem[];
    status: 'draft' | 'submitted' | 'approved';
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface StockTarget {
    itemId: string;
    itemType: 'product' | 'offer';
    targetQuantity: number;
    unit?: string;
}

export interface VehicleStockConfig {
    _id?: string;
    _rev?: string;
    type: 'vehicle-stock-config';
    marketId: string;
    targets: StockTarget[];
    preparationPrintOrder?: string[]; // Ordered list of item IDs for PDF print sequence
}
