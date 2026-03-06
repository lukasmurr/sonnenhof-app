export interface RecipePosition {
    ingredientName: string;
    quantity: number;
    unit: string;
}

export interface Recipe {
    _id?: string;
    _rev?: string;
    type: 'recipe';
    name: string;
    description?: string;
    baseAmount: number;
    baseUnit: string;
    positions: RecipePosition[];
    createdAt?: string;
    updatedAt?: string;
}
