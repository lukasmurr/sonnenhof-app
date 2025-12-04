import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    @ViewChild(MatAutocompleteTrigger) trigger!: MatAutocompleteTrigger;

    searchControl = new FormControl<string | Product>('');
    filteredProducts$: Observable<Product[]> = of([]);

    private _destroy$ = new Subject<void>();
    private _onChange: (value: Product | null) => void = () => { };
    private _onTouched: () => void = () => { };

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
        if (!this.trigger.panelOpen) {
            this.validateSelection();
        }
    }

    onPanelClosed() {
        this.validateSelection();
    }

    private validateSelection() {
        const value = this.searchControl.value;
        if (typeof value === 'string' && value !== '') {
            const match = this.products.find(p => p.name === value);
            if (match) {
                this.searchControl.setValue(match);
                this._onChange(match);
            } else {
                this.searchControl.setValue(null);
                this._onChange(null);
            }
        }
    }
}
