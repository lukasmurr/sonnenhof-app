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
            map(plans => plans.filter(plan => this.getPlanYear(plan) === year))
        );
    }

    addProductionPlan(plan: Omit<ProductionPlan, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const planDate = this.getPlanDate(plan);

        const newPlan: ProductionPlan = {
            ...plan,
            date: planDate,
            type: this.TYPE,
            _id: `production_plan_${planDate}`,
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

    private getPlanYear(plan: ProductionPlan): number | undefined {
        if (plan.date) {
            return new Date(`${plan.date}T00:00:00`).getFullYear();
        }

        return plan.year;
    }

    private getPlanDate(plan: Omit<ProductionPlan, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): string {
        if (plan.date) {
            return plan.date;
        }

        if (plan.year && plan.week) {
            const jan4 = new Date(Date.UTC(plan.year, 0, 4));
            const jan4Day = jan4.getUTCDay() || 7;
            const firstMonday = new Date(jan4);
            firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

            const targetDate = new Date(firstMonday);
            targetDate.setUTCDate(firstMonday.getUTCDate() + ((plan.week - 1) * 7));

            return targetDate.toISOString().slice(0, 10);
        }

        return new Date().toISOString().slice(0, 10);
    }
}
