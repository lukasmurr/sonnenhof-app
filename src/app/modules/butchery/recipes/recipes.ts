import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { ConfirmationDialogComponent } from '../../../core/components/confirmation-dialog/confirmation-dialog';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Product } from '../../../core/models/product.model';
import { Recipe } from '../../../core/models/recipe.model';
import { ProductService } from '../../../core/services/product.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { RecipeCalculatorDialogComponent } from './dialog/recipe-calculator-dialog/recipe-calculator-dialog';
import { RecipeEditorDialogComponent } from './dialog/recipe-editor-dialog/recipe-editor-dialog';


@Component({
    selector: 'app-recipes',
    imports: [
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTableModule,
        MatPaginatorModule,
        HasPermissionDirective
    ],
    templateUrl: './recipes.html',
    styleUrls: ['./recipes.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesComponent implements OnInit {
    private readonly recipeService = inject(RecipeService);
    private readonly productService = inject(ProductService);
    private readonly dialog = inject(MatDialog);
    private readonly router = inject(Router);

    readonly displayedColumns: string[] = ['name', 'base', 'positions', 'actions'];
    readonly recipes = signal<Recipe[]>([]);
    readonly products = signal<Product[]>([]);
    readonly dataSource = new MatTableDataSource<Recipe>([]);

    private paginatorRef: MatPaginator | null = null;

    @ViewChild(MatPaginator)
    set paginator(paginator: MatPaginator | undefined) {
        if (!paginator) {
            return;
        }

        this.paginatorRef = paginator;
        this.dataSource.paginator = paginator;
    }

    ngOnInit(): void {
        this.productService.getProducts().subscribe(products => {
            this.products.set([...products].sort((a, b) => a.name.localeCompare(b.name, 'de')));
        });

        this.recipeService.getRecipes().subscribe(recipes => {
            const sortedRecipes = [...recipes].sort((a, b) => a.name.localeCompare(b.name, 'de'));
            this.recipes.set(sortedRecipes);
            this.dataSource.data = sortedRecipes;
            this.paginatorRef?.firstPage();
        });
    }

    goBack(): void {
        this.router.navigate(['/butchery']);
    }

    openCreateDialog(): void {
        const dialogRef = this.dialog.open(RecipeEditorDialogComponent, {
            width: 'min(900px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                products: this.products()
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }

            void this.recipeService.addRecipe(result);
        });
    }

    openEditDialog(recipe: Recipe): void {
        const dialogRef = this.dialog.open(RecipeEditorDialogComponent, {
            width: 'min(900px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                recipe,
                products: this.products()
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result || !recipe._id) {
                return;
            }

            void this.recipeService.updateRecipe({
                ...recipe,
                ...result
            });
        });
    }

    openCalculatorDialog(recipe: Recipe): void {
        this.dialog.open(RecipeCalculatorDialogComponent, {
            width: '860px',
            data: { recipe }
        });
    }

    deleteRecipe(recipe: Recipe): void {
        if (!recipe._id) {
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: 'Rezept loeschen',
                message: `Soll das Rezept \"${recipe.name}\" wirklich geloescht werden?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }

            void this.recipeService.deleteRecipe(recipe._id!);
        });
    }
}
