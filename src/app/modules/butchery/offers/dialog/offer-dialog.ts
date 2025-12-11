import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
        ReactiveFormsModule,
        AsyncPipe
    ],
    templateUrl: './offer-dialog.html',
    styleUrls: ['./offer-dialog.scss']
})
export class OfferDialogComponent implements OnInit {
    form: FormGroup;
    products: Product[] = [];
    filteredProducts1!: Observable<Product[]>;
    filteredProducts2!: Observable<Product[]>;
    
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
            product1: [data.offer?.items[0]?.productName || '', Validators.required],
            price1: [data.offer?.items[0]?.price || ''],
            sold1: [data.offer?.items[0]?.soldQuantity || 0],
            product2: [data.offer?.items[1]?.productName || '', Validators.required],
            price2: [data.offer?.items[1]?.price || ''],
            sold2: [data.offer?.items[1]?.soldQuantity || 0],
            notes: [data.offer?.notes || '']
        });
    }

    ngOnInit() {
        this.productService.getProducts().subscribe(products => {
            this.products = products;
            this.setupFilters();
            this.checkConflicts(); // Check initially if editing
        });

        this.form.valueChanges.subscribe(() => {
            this.checkConflicts();
        });
    }

    setupFilters() {
        this.filteredProducts1 = this.form.get('product1')!.valueChanges.pipe(
            startWith(this.data.offer?.items[0]?.productName || ''),
            map(value => this._filter(value || ''))
        );
        this.filteredProducts2 = this.form.get('product2')!.valueChanges.pipe(
            startWith(this.data.offer?.items[1]?.productName || ''),
            map(value => this._filter(value || ''))
        );
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
        const name1 = this.form.get('product1')?.value;
        const name2 = this.form.get('product2')?.value;

        if (!year || !week) return;

        const checkProduct = (name: string, index: number) => {
            if (!name) return;
            const product = this.products.find(p => p.name === name);
            if (!product) return;

            const lastOffer = this.offerService.getLastOfferDate(product._id!, this.data.allOffers, year, week);
            
            if (lastOffer) {
                const diffWeeks = (year - lastOffer.year) * 52 + (week - lastOffer.week);
                this.lastOfferInfos.push(`Produkt ${index} war zuletzt in KW ${lastOffer.week}/${lastOffer.year} im Angebot.`);
                
                if (diffWeeks < 4) { // Warning if less than 4 weeks
                    this.warnings.push(`Warnung: Produkt ${index} (${name}) war erst vor ${diffWeeks} Wochen im Angebot!`);
                }
            }
        };

        checkProduct(name1, 1);
        checkProduct(name2, 2);

        if (name1 && name2 && name1 === name2) {
            this.warnings.push('Warnung: Gleiches Produkt zweimal ausgewählt!');
        }
    }

    save() {
        if (this.form.valid) {
            const formVal = this.form.value;
            
            const p1 = this.products.find(p => p.name === formVal.product1);
            const p2 = this.products.find(p => p.name === formVal.product2);

            if (!p1 || !p2) {
                alert('Bitte gültige Produkte aus der Liste auswählen.');
                return;
            }

            const items: OfferItem[] = [
                {
                    productId: p1._id!,
                    productName: p1.name,
                    puNumber: p1.puNumber,
                    price: formVal.price1,
                    soldQuantity: formVal.sold1
                },
                {
                    productId: p2._id!,
                    productName: p2.name,
                    puNumber: p2.puNumber,
                    price: formVal.price2,
                    soldQuantity: formVal.sold2
                }
            ];

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
