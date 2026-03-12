import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, map, startWith } from 'rxjs';
import { Product } from '../../../../core/models/product.model';
import { ProductionPlan, ProductionPlanItem } from '../../../../core/models/production-plan.model';
import { Recipe } from '../../../../core/models/recipe.model';

type PlanItemFormGroup = FormGroup<{
    product: FormControl<Product | string | null>;
    targetQuantity: FormControl<number | null>;
    recipeId: FormControl<string>;
}>;

type PlanFormGroup = FormGroup<{
    date: FormControl<string>;
    notes: FormControl<string>;
    items: FormArray<PlanItemFormGroup>;
}>;

@Component({
    selector: 'app-production-plan-dialog',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatAutocompleteModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        ReactiveFormsModule,
        AsyncPipe
    ],
    templateUrl: './production-plan-dialog.html',
    styleUrls: ['./production-plan-dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductionPlanDialogComponent {
    private readonly fb = inject(FormBuilder);
    private readonly dialogRef = inject(MatDialogRef<ProductionPlanDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as {
        plan?: ProductionPlan;
        products: Product[];
        recipes: Recipe[];
    };
    readonly filteredProducts$: Array<Observable<Product[]>> = [];
    private readonly weekdayValidator: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null => {
        const value = control.value;
        if (!value) {
            return null;
        }

        const weekDay = new Date(`${value}T00:00:00`).getDay();
        return weekDay >= 1 && weekDay <= 5 ? null : { weekday: true };
    };

    readonly form: PlanFormGroup = this.fb.group({
        date: this.fb.nonNullable.control(this.getInitialDate(), [Validators.required, this.weekdayValidator]),
        notes: this.fb.nonNullable.control(this.data.plan?.notes ?? ''),
        items: this.fb.array<PlanItemFormGroup>([])
    });

    constructor() {
        if (this.data.plan?.items?.length) {
            for (const [index, item] of this.data.plan.items.entries()) {
                this.items.push(this.createItemGroup(item));
                this.setupProductFilter(index);
            }
        } else {
            this.addItem();
        }
    }

    get items(): FormArray<PlanItemFormGroup> {
        return this.form.controls.items;
    }

    addItem(): void {
        this.items.push(this.createItemGroup());
        this.setupProductFilter(this.items.length - 1);
    }

    onProductSelectionChange(index: number, selectedProduct: Product | null): void {
        if (!selectedProduct?._id) {
            return;
        }

        const itemGroup = this.items.at(index);
        if (!itemGroup) {
            return;
        }

        const suggestedRecipeId = this.getSuggestedRecipeIdForProduct(selectedProduct._id);
        if (!suggestedRecipeId) return;

        const currentRecipeId = itemGroup.controls.recipeId.value;
        if (!currentRecipeId) {
            itemGroup.controls.recipeId.setValue(suggestedRecipeId);
        }
    }

    removeItem(index: number): void {
        if (this.items.length <= 1) {
            return;
        }

        this.items.removeAt(index);
        this.filteredProducts$.splice(index, 1);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const formValue = this.form.getRawValue();
        const items: ProductionPlanItem[] = [];

        for (const row of formValue.items) {
            const product = typeof row.product === 'string' ? null : row.product;
            if (!product || !row.targetQuantity || row.targetQuantity <= 0) {
                continue;
            }

            const recipe = this.data.recipes.find(r => r._id === row.recipeId);

            items.push({
                productId: product._id ?? '',
                productName: product.name,
                unit: product.unit,
                targetQuantity: row.targetQuantity,
                recipeId: recipe?._id,
                recipeName: recipe?.name
            });
        }

        if (items.length === 0) {
            this.items.markAllAsTouched();
            return;
        }

        this.dialogRef.close({
            date: formValue.date,
            notes: formValue.notes.trim() || undefined,
            items
        } as Omit<ProductionPlan, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>);
    }

    private createItemGroup(item?: ProductionPlanItem): PlanItemFormGroup {
        const product = item?.productId ? this.data.products.find(p => p._id === item.productId) ?? null : null;
        const group = this.fb.group({
            product: this.fb.control<Product | string | null>(product, [Validators.required]),
            targetQuantity: this.fb.control<number | null>(item?.targetQuantity ?? null, [Validators.required, Validators.min(0.001)]),
            recipeId: this.fb.nonNullable.control(item?.recipeId ?? '')
        });

        // Existing plans keep explicit recipe choice; when empty, suggest recipe mapped to selected product.
        if (!item?.recipeId && product?._id) {
            const suggestedRecipeId = this.getSuggestedRecipeIdForProduct(product._id);
            if (suggestedRecipeId) {
                group.controls.recipeId.setValue(suggestedRecipeId);
            }
        }

        return group;
    }

    private setupProductFilter(index: number): void {
        const group = this.items.at(index);
        if (!group) {
            return;
        }

        const control = group.controls.product;
        this.filteredProducts$[index] = control.valueChanges.pipe(
            startWith(control.value),
            map(value => {
                const filterText = typeof value === 'string' ? value : (value?.name ?? value?.puNumber ?? '');
                return this.filterProducts(filterText);
            })
        );
    }

    displayProduct(product: Product | null): string {
        if (!product) {
            return '';
        }

        return `${product.name} (${product.puNumber})`;
    }

    private filterProducts(searchValue: string): Product[] {
        const normalized = searchValue.trim().toLowerCase();
        if (!normalized) {
            return this.data.products;
        }

        return this.data.products.filter(product =>
            product.name.toLowerCase().includes(normalized) ||
            product.puNumber.toLowerCase().includes(normalized)
        );
    }

    private getSuggestedRecipeIdForProduct(productId: string): string | null {
        const recipe = this.data.recipes.find(r => r.productId === productId && !!r._id);
        return recipe?._id ?? null;
    }

    private getInitialDate(): string {
        if (this.data.plan?.date) {
            return this.data.plan.date;
        }

        if (this.data.plan?.year && this.data.plan?.week) {
            return this.getDateFromYearWeek(this.data.plan.year, this.data.plan.week);
        }

        return this.getNextBusinessDay(new Date()).toISOString().slice(0, 10);
    }

    private getDateFromYearWeek(year: number, week: number): string {
        const jan4 = new Date(Date.UTC(year, 0, 4));
        const jan4Day = jan4.getUTCDay() || 7;
        const firstMonday = new Date(jan4);
        firstMonday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

        const mondayOfWeek = new Date(firstMonday);
        mondayOfWeek.setUTCDate(firstMonday.getUTCDate() + ((week - 1) * 7));

        return mondayOfWeek.toISOString().slice(0, 10);
    }

    private getNextBusinessDay(date: Date): Date {
        const candidate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

        while (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
            candidate.setUTCDate(candidate.getUTCDate() + 1);
        }

        return candidate;
    }
}
