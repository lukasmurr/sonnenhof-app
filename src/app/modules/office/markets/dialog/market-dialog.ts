import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
    styles: [`
        .market-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 350px;
            padding-top: 1rem;
        }
        mat-form-field {
            width: 100%;
        }
    `]
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
