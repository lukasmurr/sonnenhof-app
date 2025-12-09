import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import * as _moment from 'moment';
import { default as _rollupMoment, Moment } from 'moment';
import { CUSTOM_DATE_PROVIDERS } from '../../../../../core/config/date-formats';
import { Vehicle } from '../../../../../core/models';

const moment = _rollupMoment || _moment;

export interface RenewDialogData {
    vehicle: Vehicle;
}

@Component({
    selector: 'app-renew-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatMomentDateModule
    ],
    providers: [CUSTOM_DATE_PROVIDERS],
    templateUrl: './renew-dialog.html',
    styles: [`
        .full-width {
            width: 100%;
        }
        mat-dialog-content {
            min-width: 300px;
            padding-top: 1rem;
        }
    `]
})
export class RenewDialog implements OnInit {
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<RenewDialog>,
        @Inject(MAT_DIALOG_DATA) public data: RenewDialogData
    ) {
        this.form = this.fb.group({
            nextTuevDate: [null, Validators.required]
        });
    }

    ngOnInit() {
        this.suggestDate();
    }

    suggestDate() {
        const today = moment();
        let yearsToAdd = 1;

        // Handle legacy data where property might be 'type' instead of 'vehicleType'
        const vehicle = this.data.vehicle as any;
        const type = vehicle.vehicleType || vehicle.type;

        if (type === 'car' || type === 'trailer' || type === 'tractor') {
            yearsToAdd = 2;
        }

        const suggestedDate = today.add(yearsToAdd, 'years');
        this.form.patchValue({ nextTuevDate: suggestedDate });
    }

    save() {
        if (this.form.valid) {
            const momentDate = this.form.value.nextTuevDate;
            const date = momentDate ? momentDate.toDate() : null;
            this.dialogRef.close(date);
        }
    }

    chosenYearHandler(normalizedYear: Moment) {
        const ctrlValue = this.form.get('nextTuevDate')?.value || moment();
        ctrlValue.year(normalizedYear.year());
        this.form.get('nextTuevDate')?.setValue(ctrlValue);
    }

    chosenMonthHandler(normalizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
        const ctrlValue = this.form.get('nextTuevDate')?.value || moment();
        ctrlValue.month(normalizedMonth.month());
        ctrlValue.year(normalizedMonth.year());
        this.form.get('nextTuevDate')?.setValue(ctrlValue);
        datepicker.close();
    }
}
