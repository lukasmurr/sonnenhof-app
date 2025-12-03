import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatRadioModule } from '@angular/material/radio';
import { MarketService } from '../../../../../core/services/market.service';
import { Market } from '../../../../../core/models/market.model';
import { ProductService } from '../../../../../core/services/product.service';
import { Product } from '../../../../../core/models/product.model';
import moment from 'moment';

@Component({
  selector: 'app-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatRadioModule
  ],
  templateUrl: './report-dialog.html',
  styleUrls: ['./report-dialog.scss']
})
export class ReportDialogComponent implements OnInit {
  reportForm: FormGroup;
  markets: Market[] = [];
  products: Product[] = [];
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
      product: [''],
      dateType: ['week'], // 'day', 'week', 'range'
      date: [new Date()],
      startDate: [new Date()],
      endDate: [new Date()],
      week: [moment().isoWeek()],
      year: [moment().year()]
    });
  }

  ngOnInit() {
    this.marketService.getMarkets().subscribe(markets => {
      this.markets = markets;
    });

    this.productService.getProducts().subscribe(products => {
      this.products = products.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Update validators based on type
    this.reportForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'market') {
        this.reportForm.get('market')?.setValidators(Validators.required);
      } else {
        this.reportForm.get('market')?.clearValidators();
      }
      this.reportForm.get('market')?.updateValueAndValidity();
    });
  }

  generate() {
    if (this.reportForm.valid) {
      this.dialogRef.close(this.reportForm.value);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
