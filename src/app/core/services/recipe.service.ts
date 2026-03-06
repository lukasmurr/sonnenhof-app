import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Recipe } from '../models/recipe.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class RecipeService {
    private readonly TYPE = 'recipe';

    constructor(private dbService: CouchDbService) { }

    getRecipes(): Observable<Recipe[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Recipe[]>;
    }

    addRecipe(recipe: Omit<Recipe, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const baseId = recipe.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const newRecipe: Recipe = {
            ...recipe,
            type: this.TYPE,
            _id: `recipe_${baseId || 'new'}_${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return this.dbService.addDoc(newRecipe);
    }

    updateRecipe(recipe: Recipe): Promise<any> {
        const updatedRecipe: Recipe = {
            ...recipe,
            updatedAt: new Date().toISOString()
        };

        return this.dbService.updateDoc(updatedRecipe);
    }

    deleteRecipe(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
