import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Recipe, RecipePosition } from '../../../../../core/models/recipe.model';

type RecipePositionFormGroup = FormGroup<{
    ingredientName: FormControl<string>;
    quantity: FormControl<number | null>;
    unit: FormControl<string>;
}>;

type RecipeFormGroup = FormGroup<{
    name: FormControl<string>;
    description: FormControl<string>;
    baseAmount: FormControl<number | null>;
    baseUnit: FormControl<string>;
    positions: FormArray<RecipePositionFormGroup>;
}>;

@Component({
    selector: 'app-recipe-editor-dialog',
    imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule
    ],
    templateUrl: './recipe-editor-dialog.html',
    styleUrls: ['./recipe-editor-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipeEditorDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<RecipeEditorDialogComponent>);
    readonly data = (inject(MAT_DIALOG_DATA, { optional: true }) as { recipe?: Recipe } | null) ?? {};

    readonly form: RecipeFormGroup = this.fb.group({
        name: this.fb.nonNullable.control(this.data.recipe?.name ?? '', [Validators.required, Validators.minLength(2)]),
        description: this.fb.nonNullable.control(this.data.recipe?.description ?? ''),
        baseAmount: this.fb.control<number | null>(this.data.recipe?.baseAmount ?? 1, [Validators.required, Validators.min(0.001)]),
        baseUnit: this.fb.nonNullable.control(this.data.recipe?.baseUnit ?? 'kg', [Validators.required]),
        positions: this.fb.array<RecipePositionFormGroup>([])
    });

    constructor() {
        if (this.data.recipe?.positions?.length) {
            for (const position of this.data.recipe.positions) {
                this.positions.push(this.createPositionFormGroup(position));
            }
        } else {
            this.addPosition();
        }
    }

    get positions(): FormArray<RecipePositionFormGroup> {
        return this.form.controls.positions;
    }

    addPosition(): void {
        this.positions.push(this.createPositionFormGroup());
    }

    removePosition(index: number): void {
        if (this.positions.length <= 1) {
            return;
        }

        this.positions.removeAt(index);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const cleanedPositions = this.positions.controls
            .map(positionGroup => {
                const raw = positionGroup.getRawValue();
                return {
                    ingredientName: raw.ingredientName.trim(),
                    quantity: raw.quantity ?? 0,
                    unit: raw.unit.trim()
                };
            })
            .filter(position => position.ingredientName.length > 0 && position.quantity > 0 && position.unit.length > 0);

        if (cleanedPositions.length === 0) {
            this.positions.markAllAsTouched();
            return;
        }

        const formValue = this.form.getRawValue();
        this.dialogRef.close({
            name: formValue.name.trim(),
            description: formValue.description.trim() || undefined,
            baseAmount: formValue.baseAmount ?? 1,
            baseUnit: formValue.baseUnit.trim(),
            positions: cleanedPositions
        } as Omit<Recipe, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>);
    }

    private createPositionFormGroup(position?: RecipePosition): RecipePositionFormGroup {
        return this.fb.group({
            ingredientName: this.fb.nonNullable.control(position?.ingredientName ?? '', [Validators.required]),
            quantity: this.fb.control<number | null>(position?.quantity ?? null, [Validators.required, Validators.min(0.001)]),
            unit: this.fb.nonNullable.control(position?.unit ?? '', [Validators.required])
        });
    }
}
