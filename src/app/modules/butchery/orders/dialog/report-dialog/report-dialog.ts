
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatAutocompleteSelectedEvent, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import moment from 'moment';
import { Market } from '../../../../../core/models/market.model';
import { Product } from '../../../../../core/models/product.model';
import { MarketService } from '../../../../../core/services/market.service';
import { ProductService } from '../../../../../core/services/product.service';

@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatRadioModule,
    MatIconModule,
    MatAutocompleteModule,
    MatChipsModule
],
  templateUrl: './report-dialog.html',
  styleUrls: ['./report-dialog.scss']
})
export class ReportDialogComponent implements OnInit {
  reportForm: FormGroup;
  markets: Market[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];
  productSearch = new FormControl('');
  selectedProducts: Product[] = [];
  separatorKeysCodes: number[] = [ENTER, COMMA];

  @ViewChild('productInput') productInput!: ElementRef<HTMLInputElement>;

  reportTypes = [
    { value: 'market', label: 'Markt/Fahrzeug Bericht' },
    { value: 'production', label: 'Produktionsbericht' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ReportDialogComponent>,
    private marketService: MarketService,
    private productService: ProductService
  ) {
    this.reportForm = this.fb.group({
      type: ['market', Validators.required],
      market: [''],
      product: [[]],
      dateType: ['week'], // 'day', 'week', 'range'
      date: [new Date()],
      startDate: [new Date()],
      endDate: [new Date()],
      week: [moment().isoWeek()],
      year: [moment().year()],
      sortBy: ['customer'] // 'abc' or 'puNumber'
    });
  }

  ngOnInit() {
    this.marketService.getMarkets().subscribe(markets => {
      this.markets = markets;
    });

    this.productService.getProducts().subscribe(products => {
      this.products = products.sort((a, b) => a.name.localeCompare(b.name));
      this.filteredProducts = this.products;
    });

    this.productSearch.valueChanges.subscribe(value => {
      const filterValue = (typeof value === 'string' ? value : '').toLowerCase();
      this.filteredProducts = this.products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(filterValue) || 
          (product.puNumber && product.puNumber.toLowerCase().includes(filterValue));
        const notSelected = !this.selectedProducts.find(p => p.name === product.name);
        return matchesSearch && notSelected;
      });
    });

    // Update validators based on type
    this.reportForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'market') {
        this.reportForm.get('market')?.setValidators(Validators.required);
        this.reportForm.patchValue({ sortBy: 'customer' });
      } else {
        this.reportForm.get('market')?.clearValidators();
        this.reportForm.patchValue({ sortBy: 'abc' });
      }
      this.reportForm.get('market')?.updateValueAndValidity();
    });
  }

  generate() {
    if (this.reportForm.valid) {
      const formValue = this.reportForm.value;
      // Map selected products to names for the report generation logic
      formValue.product = this.selectedProducts.map(p => p.name);
      this.dialogRef.close(formValue);
    }
  }

  close() {
    this.dialogRef.close();
  }

  remove(product: Product): void {
    const index = this.selectedProducts.indexOf(product);

    if (index >= 0) {
      this.selectedProducts.splice(index, 1);
      this.productSearch.setValue(this.productSearch.value); // Trigger filter update
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const product = event.option.value;
    if (product) {
      this.selectedProducts.push(product);
      this.productInput.nativeElement.value = '';
      this.productSearch.setValue(null);
    }
  }
}
