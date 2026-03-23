import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Recipe, RecipeCalculationBase, RecipePosition } from '../../../../../core/models/recipe.model';

type CalculatedRecipePosition = RecipePosition & {
    calculatedQuantity: number;
};

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
    readonly data = inject(MAT_DIALOG_DATA) as { recipe: Recipe; initialAmount?: number; title?: string };
    readonly calculationBases: RecipeCalculationBase[] = this.resolveCalculationBases();
    readonly calculationInputs = signal<number[]>(this.createInitialInputs());

    readonly totalBaseAmount = computed(() => {
        const targetBaseUnit = this.data.recipe.baseUnit.trim().toLowerCase();
        const inputs = this.calculationInputs();

        return this.calculationBases.reduce((sum, base, index) => {
            const count = inputs[index] ?? 0;
            if (count <= 0) {
                return sum;
            }

            const converted = this.convertUnit(count * base.amount, base.unit, targetBaseUnit);
            return sum + converted;
        }, 0);
    });

    readonly scaleFactor = computed(() => {
        const baseAmount = this.data.recipe.baseAmount;
        if (baseAmount <= 0) {
            return 0;
        }

        return this.totalBaseAmount() / baseAmount;
    });

    readonly calculatedPositions = computed(() => {
        const targetAmount = this.totalBaseAmount();
        if (targetAmount <= 0) {
            return [] as CalculatedRecipePosition[];
        }

        return this.data.recipe.positions.map(position => ({
            ...position,
            percentage: this.resolvePercentage(position),
            calculatedQuantity: this.roundValue((targetAmount * this.resolvePercentage(position)) / 100)
        }));
    });

    constructor() { }

    onCalculationAmountInput(index: number, value: string): void {
        const parsed = Number(value);
        this.calculationInputs.update(previous => {
            const next = [...previous];
            next[index] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
            return next;
        });
    }

    getCalculationAmount(index: number): number {
        return this.calculationInputs()[index] ?? 0;
    }

    private roundValue(value: number): number {
        return Math.round((value + Number.EPSILON) * 1000) / 1000;
    }

    private resolvePercentage(position: RecipePosition): number {
        if (typeof position.percentage === 'number') {
            return position.percentage;
        }

        return position.quantity ?? 0;
    }

    private resolveCalculationBases(): RecipeCalculationBase[] {
        const existing = this.data.recipe.calculationBases;
        if (existing?.length) {
            return existing;
        }

        return [
            {
                label: this.data.recipe.baseUnit,
                amount: 1,
                unit: this.data.recipe.baseUnit
            }
        ];
    }

    private createInitialInputs(): number[] {
        const initialInputs = this.calculationBases.map(() => 0);
        if (this.calculationBases.length > 0) {
            initialInputs[0] = this.data.initialAmount ?? this.data.recipe.baseAmount;
        }

        return initialInputs;
    }

    private convertUnit(value: number, fromUnit: string, toUnit: string): number {
        const normalizedFrom = fromUnit.trim().toLowerCase();
        const normalizedTo = toUnit.trim().toLowerCase();

        if (!normalizedFrom || !normalizedTo) {
            return 0;
        }

        if (normalizedFrom === normalizedTo) {
            return value;
        }

        const massToGram: Record<string, number> = {
            g: 1,
            gram: 1,
            gramm: 1,
            kg: 1000,
            kilogramm: 1000,
            mg: 0.001,
            t: 1000000,
            tonne: 1000000
        };

        const fromFactor = massToGram[normalizedFrom];
        const toFactor = massToGram[normalizedTo];
        if (fromFactor && toFactor) {
            return (value * fromFactor) / toFactor;
        }

        return 0;
    }
}
