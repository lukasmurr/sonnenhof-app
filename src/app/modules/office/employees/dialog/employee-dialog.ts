import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Employee } from '../../../../core/models/employee.model';

export interface EmployeeDialogData {
    employee?: Employee;
}

@Component({
    selector: 'app-employee-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './employee-dialog.html',
    styles: [`
        .employee-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 400px;
            padding-top: 1rem;
        }
        mat-form-field {
            width: 100%;
        }
    `]
})
export class EmployeeDialogComponent {
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<EmployeeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EmployeeDialogData
    ) {
        this.form = this.fb.group({
            name: [data.employee?.name || '', Validators.required],
            birthDate: [data.employee?.birthDate ? new Date(data.employee.birthDate) : '', Validators.required],
            landline: [data.employee?.landline || ''],
            mobile: [data.employee?.mobile || ''],
            email: [data.employee?.email || '', [Validators.email]]
        });
    }

    save() {
        if (this.form.valid) {
            const formValue = this.form.value;
            const employeeData = {
                ...formValue,
                birthDate: formValue.birthDate.toISOString()
            };
            this.dialogRef.close(employeeData);
        }
    }
}
