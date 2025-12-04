import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TuevAppointment, TuevStatus, Vehicle } from '../models';
import { NotificationService } from './notification.service';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class TuevService implements OnDestroy {
    private vehicles$ = new BehaviorSubject<Vehicle[]>([]);
    private appointments$ = new BehaviorSubject<TuevAppointment[]>([]);
    private tuevStatuses$ = new BehaviorSubject<TuevStatus[]>([]);
    private notificationIntervalId: any;

    constructor(private couchDbService: CouchDbService, private notificationService: NotificationService) {
        console.log('TÜV Service initialized');
        this.initializeData();
        this.startNotificationCheck();
    }

    private initializeData(): void {
        // Lade Fahrzeuge und Termine vom CouchDB
        this.couchDbService.watchDocs('vehicle').subscribe(
            (vehicles: any[]) => {
                this.vehicles$.next(vehicles);
                this.updateTuevStatuses();
            },
            (err) => console.error('Error loading vehicles:', err)
        );

        this.couchDbService.watchDocs('appointment').subscribe(
            (appointments: any[]) => {
                this.appointments$.next(appointments);
                this.updateTuevStatuses();
                this.checkAndNotifyAppointments(appointments);
            },
            (err) => console.error('Error loading appointments:', err)
        );
    }

    /**
     * Starte tägliche Benachrichtigungsprüfung (um 08:00 Uhr morgens)
     */
    private startNotificationCheck(): void {
        // Prüfe alle 24 Stunden um 08:00 Uhr
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        const timeUntilNextCheck = tomorrow.getTime() - now.getTime();

        // Erste Prüfung planen
        setTimeout(() => {
            this.checkAndNotifyAppointments(this.appointments$.value);
            // Dann täglich wiederholen
            this.notificationIntervalId = setInterval(() => {
                this.checkAndNotifyAppointments(this.appointments$.value);
            }, 24 * 60 * 60 * 1000); // Alle 24 Stunden
        }, timeUntilNextCheck);
    }

    /**
     * Prüfe Termine und sende Benachrichtigungen
     * - 1 Monat (30 Tage) vorher
     * - 1 Woche (7 Tage) vorher
     * - Täglich ab 3 Tage vorher
     */
    private checkAndNotifyAppointments(appointments: TuevAppointment[]): void {
        appointments.forEach(appointment => {
            if (appointment.status !== 'pending') {
                return; // Nur offene Termine
            }

            const appointmentDate = new Date(appointment.appointmentDate);
            const { days } = this.notificationService.getTimeUntil(appointmentDate);

            const vehicleName = appointment.vehicleName || 'Fahrzeug';

            // 30 Tage vorher - einmalig
            if (days === 30) {
                this.notificationService.sendNotification({
                    title: '📅 TÜV Termin in einem Monat',
                    body: `${vehicleName} benötigt TÜV-Untersuchung in 30 Tagen`,
                    tag: `tuev-30d-${appointment._id}`,
                    priority: 'normal'
                });
            }

            // 7 Tage vorher - einmalig
            if (days === 7) {
                this.notificationService.sendNotification({
                    title: '⚠️ TÜV Termin in einer Woche',
                    body: `${vehicleName} benötigt TÜV-Untersuchung in 7 Tagen`,
                    tag: `tuev-7d-${appointment._id}`,
                    priority: 'high'
                });
            }

            // 3 Tage vorher bis zum Tag selbst - täglich
            if (days <= 3 && days >= 0) {
                const dayText = days === 0 ? 'Heute' : `in ${days} Tag${days === 1 ? '' : 'en'}`;
                this.notificationService.sendNotification({
                    title: '🚨 TÜV Termin ' + dayText,
                    body: `${vehicleName} - TÜV-Untersuchung ${dayText} fällig!`,
                    tag: `tuev-urgent-${appointment._id}`,
                    priority: 'high'
                });
            }

            // Überfällig
            if (days < 0) {
                this.notificationService.sendNotification({
                    title: '❌ TÜV ÜBERFÄLLIG',
                    body: `${vehicleName} - TÜV-Untersuchung ist ${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'e'} überfällig!`,
                    tag: `tuev-overdue-${appointment._id}`,
                    priority: 'high'
                });
            }
        });
    }

    // ===== Vehicle Management =====
    public addVehicle(vehicle: Vehicle): Promise<any> {
        const doc = {
            ...vehicle,
            type: 'vehicle',
            _id: vehicle._id || this.couchDbService.generateId()
        };
        return this.couchDbService.addDoc(doc);
    }

    public updateVehicle(vehicle: Vehicle): Promise<any> {
        const doc = {
            ...vehicle,
            type: 'vehicle'
        };
        return this.couchDbService.updateDoc(doc);
    }

    public deleteVehicle(vehicleId: string): Promise<any> {
        // Lösche auch zugehörige Termine
        const appointments = this.appointments$.value;
        const relatedAppointments = appointments.filter(a => a.vehicleId === vehicleId);

        const deleteAppointmentsPromise = Promise.all(
            relatedAppointments.map(a => this.couchDbService.deleteDoc(a._id || ''))
        );

        return deleteAppointmentsPromise.then(() => {
            return this.couchDbService.deleteDoc(vehicleId);
        });
    }

    public getVehicles(): Observable<Vehicle[]> {
        return this.vehicles$.asObservable();
    }

    // ===== Appointment Management =====
    public addAppointment(appointment: TuevAppointment): Promise<any> {
        const doc = {
            ...appointment,
            type: 'appointment',
            _id: appointment._id || this.couchDbService.generateId()
        };
        return this.couchDbService.addDoc(doc);
    }

    public updateAppointment(appointment: TuevAppointment): Promise<any> {
        const doc = {
            ...appointment,
            type: 'appointment'
        };
        return this.couchDbService.updateDoc(doc);
    }

    public deleteAppointment(appointmentId: string): Promise<any> {
        return this.couchDbService.deleteDoc(appointmentId);
    }

    public getAppointments(): Observable<TuevAppointment[]> {
        return this.appointments$.asObservable();
    }

    public getAppointmentsByVehicle(vehicleId: string): Observable<TuevAppointment[]> {
        return this.appointments$.pipe(
            map(appointments => appointments.filter(a => a.vehicleId === vehicleId))
        );
    }

    // ===== TÜV Status Management =====
    public getTuevStatuses(): Observable<TuevStatus[]> {
        return this.tuevStatuses$.asObservable();
    }

    public getUpcomingAppointments(daysAhead: number = 30): Observable<TuevAppointment[]> {
        return this.appointments$.pipe(
            map(appointments => {
                const now = new Date();
                const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

                return appointments.filter(a => {
                    const appointmentDate = new Date(a.appointmentDate);
                    return appointmentDate >= now && appointmentDate <= futureDate;
                }).sort((a, b) => {
                    return new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
                });
            })
        );
    }

    public getOverdueAppointments(): Observable<TuevAppointment[]> {
        return this.appointments$.pipe(
            map(appointments => {
                const now = new Date();
                return appointments.filter(a => {
                    if (a.status === 'completed' || a.status === 'cancelled') {
                        return false;
                    }
                    const appointmentDate = new Date(a.appointmentDate);
                    return appointmentDate < now;
                });
            })
        );
    }

    private updateTuevStatuses(): void {
        const vehicles = this.vehicles$.value;
        const appointments = this.appointments$.value;

        const statuses: TuevStatus[] = vehicles.map(vehicle => {
            const vehicleAppointments = appointments.filter(a => a.vehicleId === vehicle._id);

            // Get the latest appointment
            const lastAppointment = vehicleAppointments
                .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
                .find(a => a.status === 'completed');

            // Get the next appointment
            const nextAppointment = vehicleAppointments
                .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
                .find(a => a.status === 'pending');

            const now = new Date();
            let currentStatus: 'valid' | 'expiring-soon' | 'expired' | 'unknown' = 'unknown';
            let daysUntilExpiry: number | undefined;

            if (nextAppointment) {
                const nextDate = new Date(nextAppointment.appointmentDate);
                const timeDiff = nextDate.getTime() - now.getTime();
                daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (daysUntilExpiry < 0) {
                    currentStatus = 'expired';
                } else if (daysUntilExpiry <= 30) {
                    currentStatus = 'expiring-soon';
                } else {
                    currentStatus = 'valid';
                }
            } else if (lastAppointment && lastAppointment.nextAppointmentDate) {
                const nextDate = new Date(lastAppointment.nextAppointmentDate);
                const timeDiff = nextDate.getTime() - now.getTime();
                daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (daysUntilExpiry < 0) {
                    currentStatus = 'expired';
                } else if (daysUntilExpiry <= 30) {
                    currentStatus = 'expiring-soon';
                } else {
                    currentStatus = 'valid';
                }
            }

            return {
                vehicleId: vehicle._id || '',
                vehicleName: vehicle.name,
                licensePlate: vehicle.licensePlate,
                currentStatus,
                lastInspectionDate: lastAppointment?.appointmentDate,
                nextInspectionDate: nextAppointment?.appointmentDate || lastAppointment?.nextAppointmentDate,
                daysUntilExpiry,
                lastAppointmentId: lastAppointment?._id,
                isOverdue: currentStatus === 'expired'
            };
        });

        this.tuevStatuses$.next(statuses);
    }

    public refreshData(): Promise<void> {
        // Keine Mock-Daten mehr notwendig, CouchDB aktualisiert live
        return Promise.resolve();
    }

    /**
     * Cleanup beim Destroy des Services
     */
    ngOnDestroy(): void {
        if (this.notificationIntervalId) {
            clearInterval(this.notificationIntervalId);
        }
    }
}
