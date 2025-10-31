import { Component, OnInit, OnDestroy, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TuevService } from '../../../core/services/tuev.service';
import { Vehicle, TuevAppointment, TuevStatus } from '../../../core/models';

@Component({
    selector: 'app-tuev',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatTabsModule,
        MatTableModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule,
        MatChipsModule,
        MatSnackBarModule
    ],
    templateUrl: './tuev.html',
    styleUrls: ['./tuev.scss']
})
export class Tuev implements OnInit, OnDestroy {
    @ViewChild('calendar') calendar: any;

    // Data
    vehicles: Vehicle[] = [];
    appointments: TuevAppointment[] = [];
    tuevStatuses: TuevStatus[] = [];
    upcomingAppointments: TuevAppointment[] = [];
    overdueAppointments: TuevAppointment[] = [];

    // Forms
    vehicleForm!: FormGroup;
    appointmentForm!: FormGroup;

    // UI State
    activeTab = 0;
    showVehicleForm = false;
    showAppointmentForm = false;
    editingVehicleId: string | null = null;
    editingAppointmentId: string | null = null;
    selectedVehicleForAppointment: Vehicle | null = null;

    // Tables
    vehicleDisplayColumns = ['name', 'licensePlate', 'type', 'status', 'nextDate', 'actions'];
    appointmentDisplayColumns = ['vehicleName', 'date', 'status', 'inspector', 'passed', 'actions'];
    statusDisplayColumns = ['vehicleName', 'licensePlate', 'status', 'nextDate', 'daysUntil'];

    // Calendar
    currentMonth: Date = new Date();
    calendarDays: any[] = [];
    calendarWeekdaysShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    private destroy$ = new Subject<void>();

    constructor(
        private tuevService: TuevService,
        private formBuilder: FormBuilder,
        private snackBar: MatSnackBar,
        private router: Router
    ) {
        console.log('TÜV Component initialized');
        this.initializeForms();
    }

    ngOnInit(): void {
        this.loadData();
        this.generateCalendarDays();
    }

    private loadData(): void {
        this.tuevService.getVehicles()
            .pipe(takeUntil(this.destroy$))
            .subscribe(vehicles => {
                this.vehicles = vehicles;
            });

        this.tuevService.getAppointments()
            .pipe(takeUntil(this.destroy$))
            .subscribe(appointments => {
                this.appointments = appointments;
                this.generateCalendarDays();
            });

        this.tuevService.getTuevStatuses()
            .pipe(takeUntil(this.destroy$))
            .subscribe(statuses => {
                this.tuevStatuses = statuses;
            });

        this.tuevService.getUpcomingAppointments(30)
            .pipe(takeUntil(this.destroy$))
            .subscribe(upcoming => {
                this.upcomingAppointments = upcoming;
            });

        this.tuevService.getOverdueAppointments()
            .pipe(takeUntil(this.destroy$))
            .subscribe(overdue => {
                this.overdueAppointments = overdue;
            });
    }

    private initializeForms(): void {
        this.vehicleForm = this.formBuilder.group({
            name: ['', Validators.required],
            licensePlate: ['', Validators.required],
            vin: [''],
            type: ['car', Validators.required],
            manufacturer: [''],
            model: [''],
            year: [''],
            mileage: ['']
        });

        this.appointmentForm = this.formBuilder.group({
            vehicleId: ['', Validators.required],
            appointmentDate: ['', Validators.required],
            status: ['pending', Validators.required],
            location: [''],
            inspector: [''],
            notes: [''],
            passedInspection: [false],
            nextAppointmentDate: [''],
            defects: ['']
        });
    }

    // Vehicle Management
    public toggleVehicleForm(vehicle?: Vehicle): void {
        if (vehicle) {
            this.editingVehicleId = vehicle._id || null;
            this.vehicleForm.patchValue(vehicle);
            this.showVehicleForm = true;
        } else {
            this.showVehicleForm = !this.showVehicleForm;
            this.editingVehicleId = null;
            if (!this.showVehicleForm) {
                this.vehicleForm.reset({ type: 'car' });
            }
        }
    }

    public async saveVehicle(): Promise<void> {
        if (this.vehicleForm.invalid) {
            this.snackBar.open('Bitte füllen Sie alle erforderlichen Felder aus', 'Schließen', { duration: 3000 });
            return;
        }

        try {
            const formValue = this.vehicleForm.value;
            if (this.editingVehicleId) {
                const vehicle: Vehicle = {
                    ...formValue,
                    _id: this.editingVehicleId,
                    _rev: this.vehicles.find(v => v._id === this.editingVehicleId)?._rev,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await this.tuevService.updateVehicle(vehicle);
                this.snackBar.open('Fahrzeug aktualisiert', 'Schließen', { duration: 2000 });
            } else {
                const vehicle: Vehicle = {
                    ...formValue,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await this.tuevService.addVehicle(vehicle);
                this.snackBar.open('Fahrzeug hinzugefügt', 'Schließen', { duration: 2000 });
            }
            this.vehicleForm.reset({ type: 'car' });
            this.showVehicleForm = false;
            this.editingVehicleId = null;
        } catch (error) {
            console.error('Error saving vehicle:', error);
            this.snackBar.open('Fehler beim Speichern des Fahrzeugs', 'Schließen', { duration: 3000 });
        }
    }

    public async deleteVehicle(vehicleId: string): Promise<void> {
        if (!confirm('Möchten Sie dieses Fahrzeug wirklich löschen? Alle zugehörigen Termine werden auch gelöscht.')) {
            return;
        }
        try {
            await this.tuevService.deleteVehicle(vehicleId);
            this.snackBar.open('Fahrzeug gelöscht', 'Schließen', { duration: 2000 });
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            this.snackBar.open('Fehler beim Löschen des Fahrzeugs', 'Schließen', { duration: 3000 });
        }
    }

    // Appointment Management
    public toggleAppointmentForm(appointment?: TuevAppointment): void {
        if (appointment) {
            this.editingAppointmentId = appointment._id || null;
            this.appointmentForm.patchValue({
                ...appointment,
                appointmentDate: new Date(appointment.appointmentDate),
                nextAppointmentDate: appointment.nextAppointmentDate ? new Date(appointment.nextAppointmentDate) : null,
                defects: appointment.defects?.join(', ')
            });
            this.showAppointmentForm = true;
        } else {
            this.showAppointmentForm = !this.showAppointmentForm;
            this.editingAppointmentId = null;
            if (!this.showAppointmentForm) {
                this.appointmentForm.reset({ status: 'pending', passedInspection: false });
                this.selectedVehicleForAppointment = null;
            }
        }
    }

    public async saveAppointment(): Promise<void> {
        if (this.appointmentForm.invalid) {
            this.snackBar.open('Bitte füllen Sie alle erforderlichen Felder aus', 'Schließen', { duration: 3000 });
            return;
        }

        try {
            const formValue = this.appointmentForm.value;
            const vehicle = this.vehicles.find(v => v._id === formValue.vehicleId);

            if (!vehicle) {
                this.snackBar.open('Fahrzeug nicht gefunden', 'Schließen', { duration: 3000 });
                return;
            }

            const appointment: TuevAppointment = {
                ...formValue,
                vehicleName: vehicle.name,
                appointmentDate: new Date(formValue.appointmentDate),
                nextAppointmentDate: formValue.nextAppointmentDate ? new Date(formValue.nextAppointmentDate) : undefined,
                defects: formValue.defects ? formValue.defects.split(',').map((d: string) => d.trim()) : [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            if (this.editingAppointmentId) {
                appointment._id = this.editingAppointmentId;
                appointment._rev = this.appointments.find(a => a._id === this.editingAppointmentId)?._rev;
                await this.tuevService.updateAppointment(appointment);
                this.snackBar.open('Termin aktualisiert', 'Schließen', { duration: 2000 });
            } else {
                await this.tuevService.addAppointment(appointment);
                this.snackBar.open('Termin hinzugefügt', 'Schließen', { duration: 2000 });
            }

            this.appointmentForm.reset({ status: 'pending', passedInspection: false });
            this.showAppointmentForm = false;
            this.editingAppointmentId = null;
            this.selectedVehicleForAppointment = null;
        } catch (error) {
            console.error('Error saving appointment:', error);
            this.snackBar.open('Fehler beim Speichern des Termins', 'Schließen', { duration: 3000 });
        }
    }

    public async deleteAppointment(appointmentId: string): Promise<void> {
        if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) {
            return;
        }
        try {
            await this.tuevService.deleteAppointment(appointmentId);
            this.snackBar.open('Termin gelöscht', 'Schließen', { duration: 2000 });
        } catch (error) {
            console.error('Error deleting appointment:', error);
            this.snackBar.open('Fehler beim Löschen des Termins', 'Schließen', { duration: 3000 });
        }
    }

    // Calendar
    private updateCalendarEvents(): void {
        // Calendar wird generiert durch generateCalendarDays()
    }

    private onCalendarDateSelected(date: Date): void {
        this.appointmentForm.patchValue({
            appointmentDate: date
        });
        this.toggleAppointmentForm();
    }

    private onCalendarEventClicked(appointmentId: string): void {
        const appointment = this.appointments.find(a => a._id === appointmentId);
        if (appointment) {
            this.toggleAppointmentForm(appointment);
        }
    }

    public generateCalendarDays(): void {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        this.calendarDays = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            this.calendarDays.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const appointmentsForDay = this.appointments.filter(a => {
                const appDate = new Date(a.appointmentDate);
                return appDate.toDateString() === date.toDateString();
            });
            
            this.calendarDays.push({
                date,
                day,
                appointments: appointmentsForDay
            });
        }
    }

    public previousMonth(): void {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
        this.generateCalendarDays();
    }

    public nextMonth(): void {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
        this.generateCalendarDays();
    }

    public selectDateForAppointment(date: Date): void {
        this.appointmentForm.patchValue({
            appointmentDate: date
        });
        this.toggleAppointmentForm();
    }

    private getStatusColor(status: string): string {
        switch (status) {
            case 'completed':
                return '#4CAF50';
            case 'failed':
                return '#f44336';
            case 'pending':
                return '#FFC107';
            case 'rescheduled':
                return '#2196F3';
            case 'cancelled':
                return '#9E9E9E';
            default:
                return '#757575';
        }
    }

    // UI Helpers
    public getStatusBadgeClass(status: string): string {
        return `status-badge status-${status}`;
    }

    public getTuevStatusClass(status: string): string {
        return `tuev-status status-${status}`;
    }

    public getTuevStatusForVehicle(vehicleId: string): string {
        return this.tuevStatuses.find(s => s.vehicleId === vehicleId)?.currentStatus || 'unknown';
    }

    public getNextInspectionDateForVehicle(vehicleId: string): Date | undefined {
        return this.tuevStatuses.find(s => s.vehicleId === vehicleId)?.nextInspectionDate;
    }

    public selectVehicleForAppointment(vehicle: Vehicle): void {
        this.selectedVehicleForAppointment = vehicle;
        this.appointmentForm.patchValue({ vehicleId: vehicle._id });
        this.toggleAppointmentForm();
    }

    public goBack(): void {
        this.router.navigate(['/office']);
    }

    public cancel(): void {
        this.showVehicleForm = false;
        this.showAppointmentForm = false;
        this.editingVehicleId = null;
        this.editingAppointmentId = null;
        this.selectedVehicleForAppointment = null;
        this.vehicleForm.reset({ type: 'car' });
        this.appointmentForm.reset({ status: 'pending', passedInspection: false });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
