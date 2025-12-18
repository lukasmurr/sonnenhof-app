import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { CalendarDay } from '../../../core/models/calendar-day.model';
import { Vacation } from '../../../core/models/vacation.model';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { VacationService } from '../../../core/services/vacation.service';
import { VacationDialogComponent } from './dialog/vacation-dialog';
import { ConfirmationDialogComponent } from '../../../core/components/confirmation-dialog/confirmation-dialog';

@Component({
    selector: 'app-vacation-planning',
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
        MatTabsModule,
        MatCardModule,
        HasPermissionDirective
    ],
    templateUrl: './vacation-planning.html',
    styleUrls: ['./vacation-planning.scss']
})
export class VacationPlanningComponent implements OnInit {
    displayedColumns: string[] = ['employeeName', 'leaveType', 'startDate', 'endDate', 'status', 'actions'];
    dataSource: MatTableDataSource<Vacation>;

    pendingDisplayedColumns: string[] = ['employeeName', 'leaveType', 'startDate', 'endDate', 'notes', 'actions'];
    pendingDataSource: MatTableDataSource<Vacation>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    @ViewChild('pendingPaginator') pendingPaginator!: MatPaginator;
    @ViewChild('pendingSort') pendingSort!: MatSort;

    // Calendar properties
    currentDate: Date = new Date();
    calendarDays: CalendarDay[] = [];
    weekDays: string[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    allVacations: Vacation[] = [];

    // Permission properties
    canCreateForOthers: boolean = false; // can create vacation entries for other employees
    canApprove: boolean = false; // can approve/reject other employees' requests
    currentEmployeeId: string | null = null;
    pendingVacations: Vacation[] = [];

    constructor(
        private vacationService: VacationService,
        private dialog: MatDialog,
        private router: Router,
        private authService: AuthService,
        private employeeService: EmployeeService
    ) {
        this.dataSource = new MatTableDataSource<Vacation>([]);
        this.pendingDataSource = new MatTableDataSource<Vacation>([]);
    }

    ngOnInit() {
        this.checkPermissionsAndLoad();
    }

    async checkPermissionsAndLoad() {
        this.canCreateForOthers = this.authService.hasPermission('vacation.create_others');
        this.canApprove = this.authService.hasPermission('vacation.update_others');

        if (!this.canCreateForOthers && !this.canApprove) {
            const userEmail = this.authService.getCurrentUser();
            if (userEmail) {
                const employees = await firstValueFrom(this.employeeService.getEmployees());
                const employee = employees?.find(e => e.email?.toLowerCase() === userEmail.toLowerCase());
                if (employee) {
                    this.currentEmployeeId = employee._id || null;
                }
            }
        }

        this.loadVacations();
    }

    loadVacations() {
        this.vacationService.getVacations().subscribe(vacations => {
            if (this.canApprove) {
                this.allVacations = vacations;
                this.pendingVacations = vacations.filter(v => v.status === 'pending');
            } else if (this.currentEmployeeId) {
                this.allVacations = vacations.filter(v => v.employeeId === this.currentEmployeeId);
                this.pendingVacations = [];
            } else {
                this.allVacations = [];
                this.pendingVacations = [];
            }

            this.dataSource.data = this.allVacations;
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;

            this.pendingDataSource.data = this.pendingVacations;
            this.pendingDataSource.paginator = this.pendingPaginator;
            this.pendingDataSource.sort = this.pendingSort;

            this.generateCalendar();
        });
    }

    approveVacation(vacation: Vacation) {
        this.vacationService.updateVacation({
            ...vacation,
            status: 'approved'
        });
    }

    rejectVacation(vacation: Vacation) {
        this.vacationService.updateVacation({
            ...vacation,
            status: 'rejected'
        });
    }

    goBack(): void {
        this.router.navigate(['/office']);
    }

    // Calendar Methods
    generateCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Adjust for Monday start (0 = Sunday, 1 = Monday, ...)
        let startDayOfWeek = firstDayOfMonth.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Convert to 0=Mon, 6=Sun

        const days: CalendarDay[] = [];

        // Previous month days
        for (let i = startDayOfWeek; i > 0; i--) {
            const date = new Date(year, month, 1 - i);
            days.push(this.createCalendarDay(date, false));
        }

        // Current month days
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push(this.createCalendarDay(date, true));
        }

        // Next month days to fill grid (up to 42 days for 6 rows)
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push(this.createCalendarDay(date, false));
        }

        this.calendarDays = days;
    }

    createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        const vacations = this.allVacations.filter(v => {
            const start = new Date(v.startDate);
            const end = new Date(v.endDate);
            // Reset times for comparison
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const current = new Date(date);
            current.setHours(0, 0, 0, 0);

            return current >= start && current <= end;
        });

        return { date, isCurrentMonth, isToday, vacations };
    }

    prevMonth() {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
        this.generateCalendar();
    }

    nextMonth() {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
        this.generateCalendar();
    }

    onDayClick(day: CalendarDay) {
        this.openVacationDialog(undefined, day.date);
    }

    onVacationClick(event: Event, vacation: Vacation) {
        event.stopPropagation();
        this.openVacationDialog(vacation);
    }

    getLeaveTypeLabel(type: string): string {
        switch (type) {
            case 'vacation': return 'Urlaub';
            case 'paid_leave': return 'Freistellung (bezahlt)';
            case 'unpaid_leave': return 'Freistellung (unbezahlt)';
            case 'sick_with_certificate': return 'Krank (mit Attest)';
            case 'sick_without_certificate': return 'Krank (ohne Attest)';
            default: return 'Urlaub';
        }
    }

    getEventClass(vacation: Vacation): string {
        if (vacation.leaveType === 'paid_leave') return 'paid-leave';
        if (vacation.leaveType === 'unpaid_leave') return 'unpaid-leave';
        if (vacation.leaveType === 'sick_with_certificate' || vacation.leaveType === 'sick_without_certificate') return 'sick-leave';
        return vacation.status;
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'approved': return '#66bb6a'; // Green
            case 'pending': return '#ffa726'; // Orange
            case 'rejected': return '#ef5350'; // Red
            default: return '#bdbdbd';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'approved': return 'Genehmigt';
            case 'pending': return 'Ausstehend';
            case 'rejected': return 'Abgelehnt';
            default: return status;
        }
    }

    openVacationDialog(vacation?: Vacation, preselectedDate?: Date) {
        const dialogRef = this.dialog.open(VacationDialogComponent, {
            data: {
                vacation,
                preselectedDate,
                canCreateForOthers: this.canCreateForOthers,
                canApprove: this.canApprove,
                currentEmployeeId: this.currentEmployeeId
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (vacation) {
                    this.vacationService.updateVacation({
                        ...vacation,
                        ...result
                    });
                } else {
                    this.vacationService.addVacation(result);
                }
            }
        });
    }

    deleteVacation(vacation: Vacation) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                title: 'Urlaub löschen',
                message: `Möchten Sie den Urlaub von "${vacation.employeeName}" wirklich löschen?`
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && vacation._id) {
                this.vacationService.deleteVacation(vacation._id);
            }
        });
    }
}
