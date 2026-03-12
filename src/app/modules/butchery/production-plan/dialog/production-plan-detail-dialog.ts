import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ProductionPlan, ProductionPlanItem } from '../../../../core/models/production-plan.model';
import { Recipe } from '../../../../core/models/recipe.model';
import { PdfService } from '../../../../core/services/pdf.service';
import { RecipeCalculatorDialogComponent } from '../../recipes/dialog/recipe-calculator-dialog/recipe-calculator-dialog';

type DetailDialogAction = 'edit' | 'delete' | 'close';

@Component({
    selector: 'app-production-plan-detail-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './production-plan-detail-dialog.html',
    styleUrls: ['./production-plan-detail-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductionPlanDetailDialogComponent {
    private readonly dialog = inject(MatDialog);
    private readonly dialogRef = inject(MatDialogRef<ProductionPlanDetailDialogComponent, DetailDialogAction>);
    private readonly pdfService = inject(PdfService);
    readonly data = inject(MAT_DIALOG_DATA) as {
        plan: ProductionPlan;
        recipes: Recipe[];
        canEdit: boolean;
        canDelete: boolean;
    };

    getPlanTitle(): string {
        if (this.data.plan.date) {
            return `Produktionsplan ${new Intl.DateTimeFormat('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date(`${this.data.plan.date}T00:00:00`))}`;
        }

        if (this.data.plan.week && this.data.plan.year) {
            return `Produktionsplan KW ${this.data.plan.week}/${this.data.plan.year}`;
        }

        return 'Produktionsplan';
    }

    openRecipeForItem(item: ProductionPlanItem): void {
        if (!item.recipeId) {
            return;
        }

        const recipe = this.data.recipes.find(r => r._id === item.recipeId);
        if (!recipe) {
            return;
        }

        this.dialog.open(RecipeCalculatorDialogComponent, {
            width: '860px',
            data: {
                recipe,
                initialAmount: item.targetQuantity,
                title: `${recipe.name} fuer ${item.productName}`
            }
        });
    }

    closeWith(action: DetailDialogAction): void {
        this.dialogRef.close(action);
    }

    exportPdf(): void {
        this.pdfService.generateProductionPlanPdf(this.data.plan);
    }
}
