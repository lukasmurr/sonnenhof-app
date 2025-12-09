import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Market } from '../../../../core/models/market.model';

export interface MarketDialogData {
    market?: Market;
}

@Component({
    selector: 'app-market-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule
    ],
    templateUrl: './market-dialog.html',
    styleUrls: ['./market-dialog.scss']
})
export class MarketDialogComponent {
    form: FormGroup;
    days: string[] = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<MarketDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: MarketDialogData
    ) {
        this.form = this.fb.group({
            name: [data.market?.name || '', Validators.required],
            address: [data.market?.address || '', Validators.required],
            day: [data.market?.day || '', Validators.required],
            startTime: [data.market?.startTime || '', Validators.required],
            endTime: [data.market?.endTime || '', Validators.required],
            car: [data.market?.car || ''],
            hasGrillTrailer: [data.market?.hasGrillTrailer || false]
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.form.valid) {
            this.dialogRef.close(this.form.value);
        }
    }
}
