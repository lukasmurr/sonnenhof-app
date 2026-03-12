import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ConfirmationDialogComponent } from '../../../core/components/confirmation-dialog/confirmation-dialog';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Product } from '../../../core/models/product.model';
import { ProductionPlan, ProductionPlanItem } from '../../../core/models/production-plan.model';
import { Recipe } from '../../../core/models/recipe.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';
import { ProductionPlanService } from '../../../core/services/production-plan.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { ProductionPlanDialogComponent } from './dialog/production-plan-dialog';
import { ProductionPlanDetailDialogComponent } from './dialog/production-plan-detail-dialog';

interface BusinessDay {
    date: string;
    label: string;
    shortDateLabel: string;
    plan?: ProductionPlan;
}

interface WeekGroup {
    week: number;
    weekYear: number;
    weekLabel: string;
    key: string;
    rangeLabel: string;
    rangeShortLabel: string;
    days: BusinessDay[];
}

@Component({
    selector: 'app-production-plan',
    imports: [
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatSelectModule,
        HasPermissionDirective
    ],
    templateUrl: './production-plan.html',
    styleUrls: ['./production-plan.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductionPlanComponent implements OnInit {
    private readonly planService = inject(ProductionPlanService);
    private readonly productService = inject(ProductService);
    private readonly recipeService = inject(RecipeService);
    private readonly dialog = inject(MatDialog);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    readonly plans = signal<ProductionPlan[]>([]);
    readonly products = signal<Product[]>([]);
    readonly recipes = signal<Recipe[]>([]);
    readonly selectedYear = signal<number>(new Date().getFullYear());
    readonly activeWeekKey = signal<string | null>(null);

    readonly availableYears: number[] = [];
    weekGroups: WeekGroup[] = [];

    constructor() {
        const currentYear = new Date().getFullYear();
        this.availableYears = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    }

    ngOnInit(): void {
        combineLatest([
            this.planService.getProductionPlans(),
            this.productService.getProducts(),
            this.recipeService.getRecipes()
        ]).subscribe(([plans, products, recipes]) => {
            this.plans.set(plans);
            this.products.set(products);
            this.recipes.set(recipes);
            this.filterPlans();
        });
    }

    goBack(): void {
        this.router.navigate(['/butchery']);
    }

    onYearChange(): void {
        this.filterPlans();
    }

    createNewPlan(date: string): void {
        const plan: ProductionPlan = {
            type: 'production-plan',
            date,
            items: []
        };

        this.openPlanDialog(plan);
    }

    openPlanDialog(plan?: ProductionPlan): void {
        const dialogRef = this.dialog.open(ProductionPlanDialogComponent, {
            width: 'min(980px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                plan,
                products: this.products(),
                recipes: this.recipes()
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }

            if (plan?._id) {
                void this.planService.updateProductionPlan({
                    ...plan,
                    ...result
                });
                return;
            }

            void this.planService.addProductionPlan(result);
        });
    }

    deletePlan(plan: ProductionPlan): void {
        if (!plan._id) {
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: 'Produktionsplan loeschen',
                message: `Soll der Produktionsplan fuer ${this.getPlanDateLabel(plan)} wirklich geloescht werden?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }

            void this.planService.deleteProductionPlan(plan._id!);
        });
    }

    openPlanDetails(plan: ProductionPlan): void {
        const dialogRef = this.dialog.open(ProductionPlanDetailDialogComponent, {
            width: 'min(920px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                plan,
                recipes: this.recipes(),
                canEdit: this.authService.hasPermission('production-plan.update'),
                canDelete: this.authService.hasPermission('production-plan.delete')
            }
        });

        dialogRef.afterClosed().subscribe(action => {
            if (action === 'edit') {
                this.openPlanDialog(plan);
                return;
            }

            if (action === 'delete') {
                this.deletePlan(plan);
            }
        });
    }

    trackByBusinessDay(index: number, day: { date: string }): string {
        return day.date;
    }

    trackByWeekGroup(index: number, group: { week: number; weekYear: number }): string {
        return `${group.weekYear}-${group.week}`;
    }

    getWeekKey(group: { week: number; weekYear: number }): string {
        return `${group.weekYear}-${group.week}`;
    }

    activeWeekGroup(): WeekGroup | null {
        const key = this.activeWeekKey();
        if (!key) {
            return null;
        }

        return this.weekGroups.find(group => group.key === key) ?? null;
    }

    canGoToPreviousWeek(): boolean {
        const activeIndex = this.getActiveWeekIndex();
        return activeIndex > 0;
    }

    canGoToNextWeek(): boolean {
        const activeIndex = this.getActiveWeekIndex();
        return activeIndex >= 0 && activeIndex < this.weekGroups.length - 1;
    }

    goToPreviousWeek(): void {
        const activeIndex = this.getActiveWeekIndex();
        if (activeIndex <= 0) {
            return;
        }

        this.activeWeekKey.set(this.weekGroups[activeIndex - 1]?.key ?? null);
    }

    goToNextWeek(): void {
        const activeIndex = this.getActiveWeekIndex();
        if (activeIndex < 0 || activeIndex >= this.weekGroups.length - 1) {
            return;
        }

        this.activeWeekKey.set(this.weekGroups[activeIndex + 1]?.key ?? null);
    }

    jumpToWeek(weekKey: string): void {
        const exists = this.weekGroups.some(group => group.key === weekKey);
        if (!exists) {
            return;
        }

        this.activeWeekKey.set(weekKey);
    }

    getActiveWeekTitle(): string {
        const group = this.activeWeekGroup();
        if (!group) {
            return 'Keine Kalenderwoche verfuegbar';
        }

        return `KW ${group.week} (${group.rangeLabel})`;
    }

    getPrimaryProductName(plan: ProductionPlan): string {
        const firstItem = plan.items[0];
        return firstItem?.productName ?? 'Unbekanntes Produkt';
    }

    formatTotalTargetQuantity(plan: ProductionPlan): string {
        const total = plan.items.reduce((sum, item) => sum + (item.targetQuantity ?? 0), 0);
        return total.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    getPlanDateLabel(plan: ProductionPlan): string {
        const date = this.getPlanDateForSort(plan);
        if (date) {
            return new Intl.DateTimeFormat('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date(`${date}T00:00:00`));
        }

        if (plan.week && plan.year) {
            return `KW ${plan.week}/${plan.year}`;
        }

        return 'unbekanntes Datum';
    }

    private filterPlans(): void {
        const filtered = this.plans()
            .filter(plan => this.getPlanYear(plan) === this.selectedYear())
            .sort((a, b) => {
                const dateA = this.getPlanDateForSort(a);
                const dateB = this.getPlanDateForSort(b);

                if (dateA && dateB) {
                    return dateA.localeCompare(dateB);
                }

                if (dateA) {
                    return -1;
                }

                if (dateB) {
                    return 1;
                }

                return (a.week ?? 0) - (b.week ?? 0);
            });

        const plansByDate = new Map<string, ProductionPlan>();
        for (const plan of filtered) {
            const date = this.getPlanDateForSort(plan);
            if (date && !plansByDate.has(date)) {
                plansByDate.set(date, plan);
            }
        }

        const businessDays = this.getBusinessDaysForYear(this.selectedYear()).map(date => ({
            date,
            label: new Intl.DateTimeFormat('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date(`${date}T00:00:00`)),
            shortDateLabel: new Intl.DateTimeFormat('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date(`${date}T00:00:00`)),
            plan: plansByDate.get(date)
        } as BusinessDay));

        this.weekGroups = this.groupBusinessDaysByWeek(businessDays);
        this.setInitialActiveWeek();
    }

    private getPlanYear(plan: ProductionPlan): number | undefined {
        const date = this.getPlanDateForSort(plan);
        if (date) {
            return new Date(`${date}T00:00:00`).getFullYear();
        }

        return plan.year;
    }

    private getPlanDateForSort(plan: ProductionPlan): string | null {
        if (plan.date) {
            return plan.date;
        }

        if (!plan.year || !plan.week) {
            return null;
        }

        const jan4 = new Date(Date.UTC(plan.year, 0, 4));
        const jan4Day = jan4.getUTCDay() || 7;
        const firstMonday = new Date(jan4);
        firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

        const mondayOfWeek = new Date(firstMonday);
        mondayOfWeek.setUTCDate(firstMonday.getUTCDate() + ((plan.week - 1) * 7));

        return mondayOfWeek.toISOString().slice(0, 10);
    }

    private getBusinessDaysForYear(year: number): string[] {
        const days: string[] = [];
        const cursor = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year, 11, 31));

        while (cursor <= end) {
            const weekDay = cursor.getUTCDay();
            if (weekDay >= 1 && weekDay <= 5) {
                days.push(cursor.toISOString().slice(0, 10));
            }

            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return days;
    }

    private groupBusinessDaysByWeek(days: BusinessDay[]): WeekGroup[] {
        const grouped = new Map<string, {
            week: number;
            weekYear: number;
            weekLabel: string;
            key: string;
            days: BusinessDay[];
        }>();

        for (const day of days) {
            const iso = this.getIsoWeekInfo(day.date);
            const key = `${iso.weekYear}-${iso.week}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    week: iso.week,
                    weekYear: iso.weekYear,
                    weekLabel: `KW ${iso.week}`,
                    key,
                    days: []
                });
            }

            grouped.get(key)!.days.push(day);
        }

        const sorted = Array.from(grouped.values()).sort((a, b) => {
            if (a.weekYear !== b.weekYear) {
                return a.weekYear - b.weekYear;
            }

            return a.week - b.week;
        });

        return sorted.map(group => {
            const startDate = group.days[0]?.date;
            const endDate = group.days[group.days.length - 1]?.date;

            const rangeLabel = startDate && endDate
                ? `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`
                : '-';
            const rangeShortLabel = startDate && endDate
                ? `${this.formatDate(startDate, false)} - ${this.formatDate(endDate, false)}`
                : '-';

            return {
                ...group,
                rangeLabel,
                rangeShortLabel
            };
        });
    }

    private getIsoWeekInfo(dateValue: string): { week: number; weekYear: number } {
        const date = new Date(`${dateValue}T00:00:00Z`);
        const weekDate = new Date(date);
        const day = weekDate.getUTCDay() || 7;
        weekDate.setUTCDate(weekDate.getUTCDate() + 4 - day);

        const weekYear = weekDate.getUTCFullYear();
        const yearStart = new Date(Date.UTC(weekYear, 0, 1));
        const week = Math.ceil((((weekDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

        return { week, weekYear };
    }

    private setInitialActiveWeek(): void {
        if (this.weekGroups.length === 0) {
            this.activeWeekKey.set(null);
            return;
        }

        const previousKey = this.activeWeekKey();
        if (previousKey && this.weekGroups.some(group => group.key === previousKey)) {
            this.activeWeekKey.set(previousKey);
            return;
        }

        const currentIso = this.getIsoWeekInfo(new Date().toISOString().slice(0, 10));

        let activeIndex = this.weekGroups.findIndex(group =>
            group.week === currentIso.week && group.weekYear === currentIso.weekYear
        );

        if (activeIndex < 0) {
            activeIndex = this.weekGroups.findIndex(group => group.days.some(day => !!day.plan));
        }

        if (activeIndex < 0) {
            activeIndex = 0;
        }

        this.activeWeekKey.set(this.weekGroups[activeIndex]?.key ?? null);
    }

    private getActiveWeekIndex(): number {
        const key = this.activeWeekKey();
        if (!key) {
            return -1;
        }

        return this.weekGroups.findIndex(group => group.key === key);
    }

    private formatDate(dateValue: string, withYear = true): string {
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            ...(withYear ? { year: 'numeric' } : {})
        }).format(new Date(`${dateValue}T00:00:00`));
    }
}
