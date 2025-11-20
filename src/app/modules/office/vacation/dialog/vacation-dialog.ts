import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Vacation } from '../../../../core/models/vacation.model';
import { Employee } from '../../../../core/models/employee.model';
import { EmployeeService } from '../../../../core/services/employee.service';

export interface VacationDialogData {
    vacation?: Vacation;
    preselectedDate?: Date;
}

@Component({
    selector: 'app-vacation-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './vacation-dialog.html',
    styles: [`
        .vacation-form {
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
export class VacationDialogComponent implements OnInit {
    form: FormGroup;
    employees: Employee[] = [];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<VacationDialogComponent>,
        private employeeService: EmployeeService,
        @Inject(MAT_DIALOG_DATA) public data: VacationDialogData
    ) {
        this.form = this.fb.group({
            employeeId: [data.vacation?.employeeId || '', Validators.required],
            startDate: [data.vacation?.startDate ? new Date(data.vacation.startDate) : (data.preselectedDate || ''), Validators.required],
            endDate: [data.vacation?.endDate ? new Date(data.vacation.endDate) : (data.preselectedDate || ''), Validators.required],
            status: [data.vacation?.status || 'pending', Validators.required],
            notes: [data.vacation?.notes || '']
        });
    }

    ngOnInit() {
        this.employeeService.getEmployees().subscribe(employees => {
            this.employees = employees;
        });
    }

    save() {
        if (this.form.valid) {
            const formValue = this.form.value;
            const selectedEmployee = this.employees.find(e => e._id === formValue.employeeId);
            
            const vacationData = {
                ...formValue,
                employeeName: selectedEmployee?.name || 'Unbekannt',
                startDate: formValue.startDate.toISOString(),
                endDate: formValue.endDate.toISOString()
            };
            this.dialogRef.close(vacationData);
        }
    }
}
