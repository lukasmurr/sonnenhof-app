import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
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

@Component({
    selector: 'app-production-plan',
    imports: [
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatPaginatorModule,
        MatSelectModule,
        MatTabsModule,
        MatTableModule,
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

    readonly displayedColumns: string[] = ['week', 'summary', 'details'];
    readonly dataSource = new MatTableDataSource<ProductionPlan>([]);

    readonly plans = signal<ProductionPlan[]>([]);
    readonly products = signal<Product[]>([]);
    readonly recipes = signal<Recipe[]>([]);
    readonly selectedYear = signal<number>(new Date().getFullYear());

    readonly availableYears: number[] = [];
    calendarWeeks: { week: number; plan?: ProductionPlan }[] = [];

    private paginatorRef: MatPaginator | null = null;

    @ViewChild(MatPaginator)
    set paginator(paginator: MatPaginator | undefined) {
        if (!paginator) {
            return;
        }

        this.paginatorRef = paginator;
        this.dataSource.paginator = paginator;
    }

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

    createNewPlan(week: number): void {
        const plan: ProductionPlan = {
            type: 'production-plan',
            year: this.selectedYear(),
            week,
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
                message: `Soll der Produktionsplan fuer KW ${plan.week}/${plan.year} wirklich geloescht werden?`
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
            width: '920px',
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

    trackByPlan(index: number, plan: ProductionPlan): string | number {
        return plan._id ?? `${plan.year}-${plan.week}-${index}`;
    }

    trackByWeek(index: number, weekItem: { week: number }): number {
        return weekItem.week;
    }

    private filterPlans(): void {
        const filtered = this.plans()
            .filter(plan => plan.year === this.selectedYear())
            .sort((a, b) => a.week - b.week);

        this.dataSource.data = filtered;
        this.paginatorRef?.firstPage();

        this.calendarWeeks = [];
        for (let week = 1; week <= 52; week++) {
            this.calendarWeeks.push({
                week,
                plan: filtered.find(plan => plan.week === week)
            });
        }
    }
}
