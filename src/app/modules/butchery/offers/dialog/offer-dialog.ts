import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { Observable, map, startWith } from 'rxjs';
import { Offer, OfferItem } from '../../../../core/models/offer.model';
import { Product } from '../../../../core/models/product.model';
import { OfferService } from '../../../../core/services/offer.service';
import { ProductService } from '../../../../core/services/product.service';

@Component({
    selector: 'app-offer-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatIconModule,
        ReactiveFormsModule,
        AsyncPipe
    ],
    templateUrl: './offer-dialog.html',
    styleUrls: ['./offer-dialog.scss']
})
export class OfferDialogComponent implements OnInit {
    form: FormGroup;
    products: Product[] = [];
    filteredProducts: Observable<Product[]>[] = [];
    
    warnings: string[] = [];
    lastOfferInfos: string[] = [];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<OfferDialogComponent>,
        private productService: ProductService,
        private offerService: OfferService,
        @Inject(MAT_DIALOG_DATA) public data: { offer?: Offer, allOffers: Offer[] }
    ) {
        const currentYear = new Date().getFullYear();
        // Simple week calculation or default to next week
        const currentWeek = this.getWeekNumber(new Date()) + 1;

        this.form = this.fb.group({
            year: [data.offer?.year || currentYear, [Validators.required]],
            week: [data.offer?.week || currentWeek, [Validators.required, Validators.min(1), Validators.max(53)]],
            items: this.fb.array([]),
            notes: [data.offer?.notes || '']
        });

        this.initializeItems();
    }

    get items(): FormArray {
        return this.form.get('items') as FormArray;
    }

    initializeItems() {
        if (this.data.offer && this.data.offer.items && this.data.offer.items.length > 0) {
            this.data.offer.items.forEach(item => this.addItem(item));
        } else {
            // Default case: 2 items
            this.addItem();
            this.addItem();
        }
    }

    addItem(item?: OfferItem) {
        const itemGroup = this.fb.group({
            productName: [item?.productName || '', Validators.required],
            price: [item?.price || ''],
            soldQuantity: [item?.soldQuantity || 0]
        });

        this.items.push(itemGroup);
        this.setupFilter(this.items.length - 1);
    }

    removeItem(index: number) {
        this.items.removeAt(index);
        this.filteredProducts.splice(index, 1);
        this.checkConflicts();
    }

    ngOnInit() {
        this.productService.getProducts().subscribe(products => {
            this.products = products;
            // Re-setup filters because products are now loaded
            this.items.controls.forEach((_, index) => this.setupFilter(index));
            this.checkConflicts(); // Check initially if editing
        });

        this.form.valueChanges.subscribe(() => {
            this.checkConflicts();
        });
    }

    setupFilter(index: number) {
        const control = this.items.at(index).get('productName');
        if (control) {
             const filtered = control.valueChanges.pipe(
                startWith(control.value || ''),
                map(value => this._filter(value || ''))
            );
            
            if (this.filteredProducts[index]) {
                this.filteredProducts[index] = filtered;
            } else {
                this.filteredProducts.push(filtered);
            }
        }
    }

    private _filter(value: string): Product[] {
        const filterValue = value.toLowerCase();
        return this.products.filter(product => 
            product.name.toLowerCase().includes(filterValue) || 
            (product.puNumber && product.puNumber.toLowerCase().includes(filterValue))
        );
    }

    checkConflicts() {
        this.warnings = [];
        this.lastOfferInfos = [];
        
        const year = this.form.get('year')?.value;
        const week = this.form.get('week')?.value;
        
        if (!year || !week) return;

        const productNames: string[] = [];

        this.items.controls.forEach((control, index) => {
            const name = control.get('productName')?.value;
            if (name) {
                productNames.push(name);
                const product = this.products.find(p => p.name === name);
                if (product) {
                    const lastOffer = this.offerService.getLastOfferDate(product._id!, this.data.allOffers, year, week);
                    if (lastOffer) {
                        const diffWeeks = (year - lastOffer.year) * 52 + (week - lastOffer.week);
                        this.lastOfferInfos.push(`Produkt ${index + 1} war zuletzt in KW ${lastOffer.week}/${lastOffer.year} im Angebot.`);
                        
                        if (diffWeeks < 4) { // Warning if less than 4 weeks
                            this.warnings.push(`Warnung: Produkt ${index + 1} (${name}) war erst vor ${diffWeeks} Wochen im Angebot!`);
                        }
                    }
                }
            }
        });

        // Check for duplicates
        const uniqueNames = new Set(productNames);
        if (uniqueNames.size !== productNames.length) {
            this.warnings.push('Warnung: Gleiches Produkt mehrfach ausgewählt!');
        }
    }

    save() {
        if (this.form.valid) {
            const formVal = this.form.value;
            const items: OfferItem[] = [];

            for (const itemVal of formVal.items) {
                const product = this.products.find(p => p.name === itemVal.productName);
                if (!product) {
                    alert(`Produkt "${itemVal.productName}" nicht gefunden.`);
                    return;
                }
                items.push({
                    productId: product._id!,
                    productName: product.name,
                    puNumber: product.puNumber,
                    price: itemVal.price,
                    soldQuantity: itemVal.soldQuantity
                });
            }

            const result: any = {
                year: formVal.year,
                week: formVal.week,
                items: items,
                notes: formVal.notes
            };

            this.dialogRef.close(result);
        }
    }

    // Helper for ISO week number
    getWeekNumber(d: Date): number {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }
}
