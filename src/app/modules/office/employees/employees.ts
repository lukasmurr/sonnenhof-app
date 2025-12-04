import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Employee } from '../../../core/models/employee.model';
import { EmployeeService } from '../../../core/services/employee.service';
import { EmployeeDialogComponent } from './dialog/employee-dialog';

@Component({
    selector: 'app-employees',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatCardModule
    ],
    templateUrl: './employees.html',
    styleUrls: ['./employees.scss']
})
export class EmployeesComponent implements OnInit {
    displayedColumns: string[] = ['name', 'birthDate', 'contact', 'actions'];
    dataSource: MatTableDataSource<Employee>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private employeeService: EmployeeService,
        private dialog: MatDialog,
        private router: Router
    ) {
        this.dataSource = new MatTableDataSource<Employee>([]);
    }

    ngOnInit() {
        this.employeeService.getEmployees().subscribe(employees => {
            this.dataSource.data = employees;
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
        });
    }

    goBack(): void {
        this.router.navigate(['/office']);
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
    }

    openEmployeeDialog(employee?: Employee) {
        const dialogRef = this.dialog.open(EmployeeDialogComponent, {
            data: { employee }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (employee) {
                    this.employeeService.updateEmployee({
                        ...employee,
                        ...result
                    });
                } else {
                    this.employeeService.addEmployee(result);
                }
            }
        });
    }

    deleteEmployee(employee: Employee) {
        if (confirm(`Möchten Sie den Mitarbeiter "${employee.name}" wirklich löschen?`)) {
            if (employee._id) {
                this.employeeService.deleteEmployee(employee._id);
            }
        }
    }
}
