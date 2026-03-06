import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProductionPlan } from '../models/production-plan.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class ProductionPlanService {
    private readonly TYPE = 'production-plan';

    constructor(private dbService: CouchDbService) { }

    getProductionPlans(): Observable<ProductionPlan[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<ProductionPlan[]>;
    }

    getProductionPlansByYear(year: number): Observable<ProductionPlan[]> {
        return this.getProductionPlans().pipe(
            map(plans => plans.filter(plan => plan.year === year))
        );
    }

    addProductionPlan(plan: Omit<ProductionPlan, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newPlan: ProductionPlan = {
            ...plan,
            type: this.TYPE,
            _id: `production_plan_${plan.year}_${plan.week}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return this.dbService.addDoc(newPlan);
    }

    updateProductionPlan(plan: ProductionPlan): Promise<any> {
        const updatedPlan: ProductionPlan = {
            ...plan,
            updatedAt: new Date().toISOString()
        };

        return this.dbService.updateDoc(updatedPlan);
    }

    deleteProductionPlan(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
