import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';
import { Vehicle, TuevAppointment, TuevStatus } from '../models';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class TuevService {
    private vehicles$ = new BehaviorSubject<Vehicle[]>([]);
    private appointments$ = new BehaviorSubject<TuevAppointment[]>([]);
    private tuevStatuses$ = new BehaviorSubject<TuevStatus[]>([]);

    constructor(private couchDbService: CouchDbService) {
        console.log('TÜV Service initialized');
        this.initializeData();
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
            },
            (err) => console.error('Error loading appointments:', err)
        );
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
}
