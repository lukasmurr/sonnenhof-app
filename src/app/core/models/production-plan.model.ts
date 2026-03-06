export interface ProductionPlanItem {
    productId: string;
    productName: string;
    unit: string;
    targetQuantity: number;
    recipeId?: string;
    recipeName?: string;
}

export interface ProductionPlan {
    _id?: string;
    _rev?: string;
    type: 'production-plan';
    year: number;
    week: number;
    items: ProductionPlanItem[];
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
