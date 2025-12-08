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
import { VacationService } from '../../../../core/services/vacation.service';

export interface VacationDialogData {
    vacation?: Vacation;
    preselectedDate?: Date;
    canSeeAll?: boolean;
    currentEmployeeId?: string;
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
    allVacations: Vacation[] = [];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<VacationDialogComponent>,
        private employeeService: EmployeeService,
        private vacationService: VacationService,
        @Inject(MAT_DIALOG_DATA) public data: VacationDialogData
    ) {
        const initialEmployeeId = data.vacation?.employeeId || 
                                 (!data.canSeeAll && data.currentEmployeeId ? data.currentEmployeeId : '');

        this.form = this.fb.group({
            employeeId: [{ value: initialEmployeeId, disabled: !data.canSeeAll }, Validators.required],
            leaveType: [data.vacation?.leaveType || 'vacation', Validators.required],
            startDate: [data.vacation?.startDate ? new Date(data.vacation.startDate) : (data.preselectedDate || ''), Validators.required],
            endDate: [data.vacation?.endDate ? new Date(data.vacation.endDate) : (data.preselectedDate || ''), Validators.required],
            notes: [data.vacation?.notes || '']
        });
    }

    ngOnInit() {
        this.employeeService.getEmployees().subscribe(employees => {
            this.employees = employees;
        });
        this.vacationService.getVacations().subscribe(vacations => {
            this.allVacations = vacations;
        });
    }

    save() {
        if (this.form.valid) {
            const formValue = this.form.getRawValue(); // Use getRawValue to include disabled fields
            const selectedEmployee = this.employees.find(e => e._id === formValue.employeeId);
            
            // Ensure dates are Date objects
            const startDate = new Date(formValue.startDate);
            const endDate = new Date(formValue.endDate);

            if (formValue.leaveType === 'vacation' && selectedEmployee) {
                const totalVacationDays = selectedEmployee.vacationDays || 0;
                const year = startDate.getFullYear();
                
                const usedDays = this.calculateUsedVacationDays(selectedEmployee._id!, year, this.data.vacation?._id);
                const newDays = this.calculateWorkingDays(startDate, endDate);

                if (usedDays + newDays > totalVacationDays) {
                    alert(`Der Mitarbeiter hat nur ${totalVacationDays} Urlaubstage. Bereits verplant: ${usedDays}. Neuer Urlaub: ${newDays}. Gesamt: ${usedDays + newDays}`);
                    return;
                }
            }

            const vacationData = {
                ...formValue,
                employeeName: selectedEmployee?.name || 'Unbekannt',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                status: this.data.canSeeAll ? 'approved' : 'pending'
            };
            this.dialogRef.close(vacationData);
        }
    }

    calculateUsedVacationDays(employeeId: string, year: number, excludeVacationId?: string): number {
        return this.allVacations
            .filter(v => v.employeeId === employeeId && 
                         v.leaveType === 'vacation' && 
                         v._id !== excludeVacationId &&
                         new Date(v.startDate).getFullYear() === year)
            .reduce((acc, v) => acc + this.calculateWorkingDays(new Date(v.startDate), new Date(v.endDate)), 0);
    }

    calculateWorkingDays(startDate: Date, endDate: Date): number {
        let count = 0;
        const curDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (curDate <= end) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
            curDate.setDate(curDate.getDate() + 1);
        }
        return count;
    }
}
