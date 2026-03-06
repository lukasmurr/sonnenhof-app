import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Recipe, RecipePosition } from '../../../../../core/models/recipe.model';

@Component({
    selector: 'app-recipe-calculator-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        DecimalPipe
    ],
    templateUrl: './recipe-calculator-dialog.html',
    styleUrls: ['./recipe-calculator-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeCalculatorDialogComponent {
    readonly data = inject(MAT_DIALOG_DATA) as { recipe: Recipe };
    readonly calculationAmount = signal<number>(this.data.recipe.baseAmount);

    readonly scaleFactor = computed(() => {
        const baseAmount = this.data.recipe.baseAmount;
        if (baseAmount <= 0) {
            return 0;
        }

        return this.calculationAmount() / baseAmount;
    });

    readonly calculatedPositions = computed(() => {
        const factor = this.scaleFactor();
        if (factor <= 0) {
            return [] as RecipePosition[];
        }

        return this.data.recipe.positions.map(position => ({
            ...position,
            quantity: this.roundValue(position.quantity * factor)
        }));
    });

    constructor() { }

    onCalculationAmountInput(value: string): void {
        const parsed = Number(value);
        this.calculationAmount.set(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    }

    private roundValue(value: number): number {
        return Math.round((value + Number.EPSILON) * 1000) / 1000;
    }
}
