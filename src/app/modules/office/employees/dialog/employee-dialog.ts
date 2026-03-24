
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Employee } from '../../../../core/models/employee.model';

export interface EmployeeDialogData {
    employee?: Employee;
}

@Component({
    selector: 'app-employee-dialog',
    standalone: true,
    imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
],
    templateUrl: './employee-dialog.html',
    styleUrls: ['./employee-dialog.scss']
})
export class EmployeeDialogComponent {
    form: FormGroup;
    readonly weekdayOptions = [
        { value: 1, label: 'Montag' },
        { value: 2, label: 'Dienstag' },
        { value: 3, label: 'Mittwoch' },
        { value: 4, label: 'Donnerstag' },
        { value: 5, label: 'Freitag' },
        { value: 6, label: 'Samstag' }
    ];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<EmployeeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EmployeeDialogData
    ) {
        this.form = this.fb.group({
            name: [data.employee?.name || '', Validators.required],
            birthDate: [data.employee?.birthDate ? new Date(data.employee.birthDate) : '', Validators.required],
            vacationDays: [data.employee?.vacationDays || 30, [Validators.required, Validators.min(0)]],
            workingDays: [data.employee?.workingDays?.length ? data.employee.workingDays : [1, 2, 3, 4, 5], [Validators.required, Validators.minLength(1)]],
            landline: [data.employee?.landline || ''],
            mobile: [data.employee?.mobile || ''],
            email: [data.employee?.email || '', [Validators.required, Validators.email]]
        });
    }

    save() {
        if (this.form.valid) {
            const formValue = this.form.value;
            const rawWorkingDays: unknown[] = Array.isArray(formValue.workingDays) ? formValue.workingDays : [];
            const normalizedWorkingDays = rawWorkingDays
                .map((day: unknown): number => Number(day))
                .filter((day: number): boolean => Number.isInteger(day) && day >= 1 && day <= 6)
                .filter((day: number, index: number, arr: number[]): boolean => arr.indexOf(day) === index)
                .sort((a: number, b: number): number => a - b);

            const effectiveWorkingDays = normalizedWorkingDays.length ? normalizedWorkingDays : [1, 2, 3, 4, 5];

            const employeeData = {
                ...formValue,
                birthDate: formValue.birthDate.toISOString(),
                workingDays: effectiveWorkingDays
            };
            this.dialogRef.close(employeeData);
        }
    }
}
