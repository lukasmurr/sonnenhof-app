
import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import * as _moment from 'moment';
import { default as _rollupMoment, Moment } from 'moment';
import { CUSTOM_DATE_PROVIDERS } from '../../../../../core/config/date-formats';
import { Vehicle } from '../../../../../core/models';

const moment = _rollupMoment || _moment;

@Component({
    selector: 'app-vehicle-dialog',
    standalone: true,
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule
],
    providers: [CUSTOM_DATE_PROVIDERS],
    templateUrl: './vehicle-dialog.html',
    styleUrls: ['./vehicle-dialog.scss']
})
export class VehicleDialog implements OnInit {
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<VehicleDialog>,
        @Inject(MAT_DIALOG_DATA) public data: { vehicle?: Vehicle }
    ) {
        this.form = this.fb.group({
            _id: [null],
            licensePlate: ['', [Validators.required, this.licensePlateValidator]],
            name: ['', Validators.required],
            vehicleType: ['car', Validators.required],
            nextTuevDate: [null, Validators.required]
        });
    }

    ngOnInit() {
        if (this.data.vehicle) {
            const vehicleData: any = { ...this.data.vehicle };

            // Handle legacy data mapping
            if (!vehicleData.vehicleType && vehicleData.type) {
                vehicleData.vehicleType = vehicleData.type;
            }

            if (vehicleData.nextTuevDate) {
                vehicleData.nextTuevDate = moment(vehicleData.nextTuevDate);
            }
            this.form.patchValue(vehicleData);
        }
    }

    save() {
        if (this.form.valid) {
            const formValue = this.form.value;
            if (formValue.nextTuevDate && moment.isMoment(formValue.nextTuevDate)) {
                formValue.nextTuevDate = formValue.nextTuevDate.toDate();
            }
            this.dialogRef.close(formValue);
        }
    }

    formatLicensePlate() {
        let value = this.form.get('licensePlate')?.value;
        if (!value) return;

        // Remove all non-alphanumeric characters
        value = value.replace(/[^a-zA-Z0-9äöüÄÖÜ]/g, '').toUpperCase();

        // Try to format if it looks like a license plate
        // Simple heuristic: 1-3 letters (City) + 1-2 letters + 1-4 numbers
        // Example: DONLM320 -> DON-LM-320

        // Regex to split parts: ^([A-ZÄÖÜ]{1,3})([A-Z]{1,2})([0-9]{1,4})$
        const match = value.match(/^([A-ZÄÖÜ]{1,3})([A-Z]{1,2})([0-9]{1,4})$/);

        if (match) {
            const formatted = `${match[1]}-${match[2]}-${match[3]}`;
            this.form.get('licensePlate')?.setValue(formatted);
        }
    }

    onLicensePlateInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.toUpperCase();
        input.setSelectionRange(start, end);
        this.form.get('licensePlate')?.setValue(input.value, { emitEvent: false });
    }

    licensePlateValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        if (!value) return null;

        // Regex for format: CITY-LETTERS-NUMBERS
        // City: 1-3 letters (including umlauts)
        // Letters: 1-2 letters (A-Z only)
        // Numbers: 1-4 digits (1-9999)

        const regex = /^[A-ZÄÖÜ]{1,3}-[A-Z]{1,2}-[1-9][0-9]{0,3}$/;

        if (!regex.test(value)) {
            return { invalidFormat: true };
        }

        return null;
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
