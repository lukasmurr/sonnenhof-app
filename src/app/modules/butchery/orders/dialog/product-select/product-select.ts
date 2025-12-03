import { Component, Input, OnInit, OnDestroy, forwardRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Observable, Subject, of } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { Product } from '../../../../../core/models/product.model';

@Component({
    selector: 'app-product-select',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatInputModule,
        MatFormFieldModule
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ProductSelectComponent),
            multi: true
        }
    ],
    templateUrl: './product-select.html',
    styles: [`
        mat-form-field {
            width: 100%;
        }
    `]
})
export class ProductSelectComponent implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
    @Input() products: Product[] = [];
    
    searchControl = new FormControl<string | Product>('');
    filteredProducts$: Observable<Product[]> = of([]);
    
    private _destroy$ = new Subject<void>();
    private _onChange: (value: Product | null) => void = () => {};
    private _onTouched: () => void = () => {};

    ngOnInit() {
        this.filteredProducts$ = this.searchControl.valueChanges.pipe(
            startWith(''),
            map(value => {
                const name = typeof value === 'string' ? value : value?.name;
                return name ? this._filter(name as string) : this.products.slice();
            })
        );

        this.searchControl.valueChanges.pipe(
            takeUntil(this._destroy$)
        ).subscribe(value => {
            if (typeof value !== 'string' && value !== null) {
                this._onChange(value);
            } else if (value === '') {
                this._onChange(null);
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['products']) {
            // Trigger filter update if products change
            this.searchControl.updateValueAndValidity({ emitEvent: true });
        }
    }

    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
    }

    displayFn(product: Product): string {
        return product && product.name ? `${product.name} (${product.puNumber})` : '';
    }

    private _filter(name: string): Product[] {
        const filterValue = name.toLowerCase();
        return this.products.filter(product => 
            product.name.toLowerCase().includes(filterValue) || 
            product.puNumber.toLowerCase().includes(filterValue)
        );
    }

    // ControlValueAccessor implementation
    writeValue(value: Product | null): void {
        this.searchControl.setValue(value);
    }

    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this._onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.searchControl.disable();
        } else {
            this.searchControl.enable();
        }
    }
    
    onBlur() {
        this._onTouched();
        // If the value is a string (user typed but didn't select), clear it or handle it
        // For now, if it's a string, it means no valid product selected
        const value = this.searchControl.value;
        if (typeof value === 'string' && value !== '') {
             // Optional: try to find exact match or clear
             // For strict selection, we might want to clear if not selected
             // But let's leave it for now, the form validation (required) in parent will handle null
             // Wait, if I type "Wiener" and don't select, value is "Wiener". 
             // _onChange is not called with a Product.
             // So the parent form control value remains what it was (or null).
             // But the input shows "Wiener".
             // Ideally we should clear the input if no valid selection is made.
             
             const match = this.products.find(p => p.name === value);
             if (match) {
                 this.searchControl.setValue(match);
                 this._onChange(match);
             } else {
                 // Reset to null if invalid text
                 this.searchControl.setValue(null);
                 this._onChange(null);
             }
        }
    }
}
