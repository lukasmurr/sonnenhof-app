import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { Vacation } from '../../../core/models/vacation.model';
import { VacationService } from '../../../core/services/vacation.service';
import { VacationDialogComponent } from './dialog/vacation-dialog';

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    vacations: Vacation[];
}

@Component({
    selector: 'app-vacation-planning',
    standalone: true,
    imports: [
        CommonModule,
        MatTableModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatTabsModule
    ],
    templateUrl: './vacation-planning.html',
    styleUrls: ['./vacation-planning.scss']
})
export class VacationPlanningComponent implements OnInit {
    displayedColumns: string[] = ['employeeName', 'startDate', 'endDate', 'status', 'actions'];
    dataSource: MatTableDataSource<Vacation>;

    @ViewChild(MatSort) sort!: MatSort;

    // Calendar properties
    currentDate: Date = new Date();
    calendarDays: CalendarDay[] = [];
    weekDays: string[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    allVacations: Vacation[] = [];

    constructor(
        private vacationService: VacationService,
        private dialog: MatDialog
    ) {
        this.dataSource = new MatTableDataSource<Vacation>([]);
    }

    ngOnInit() {
        this.vacationService.getVacations().subscribe(vacations => {
            this.allVacations = vacations;
            this.dataSource.data = vacations;
            this.dataSource.sort = this.sort;
            this.generateCalendar();
        });
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
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            const current = new Date(date);
            current.setHours(0,0,0,0);
            
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

    // ... existing code ...
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
            data: { vacation, preselectedDate }
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
        if (confirm(`Möchten Sie den Urlaub von "${vacation.employeeName}" wirklich löschen?`)) {
            if (vacation._id) {
                this.vacationService.deleteVacation(vacation._id);
            }
        }
    }
}
