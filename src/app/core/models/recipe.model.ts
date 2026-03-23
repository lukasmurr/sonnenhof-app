export interface RecipePosition {
    ingredientName: string;
    percentage: number;
    unit: string;
    note?: string;
    // Legacy fields kept optional to support older persisted recipe docs.
    quantity?: number;
}

export interface RecipeCalculationBase {
    label: string;
    amount: number;
    unit: string;
}

export interface Recipe {
    _id?: string;
    _rev?: string;
    type: 'recipe';
    name: string;
    productId: string;
    productName: string;
    description?: string;
    baseAmount: number;
    baseUnit: string;
    calculationBases?: RecipeCalculationBase[];
    positions: RecipePosition[];
    createdAt?: string;
    updatedAt?: string;
}
