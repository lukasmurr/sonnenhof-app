import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { TuevAppointment, TuevStatus, Vehicle } from '../models';
import { NotificationService } from './notification.service';
import { CouchDbService } from './pouchdb.service';
import { environment } from '../../../environments/environment';

type TuevReminderType = 'three-months-before' | 'one-month-before' | 'on-expiry' | 'one-month-after';

@Injectable({
    providedIn: 'root'
})
export class TuevService implements OnDestroy {
    private readonly sentTuevReminderStorageKey = 'tuev-reminder-mail-sent';
    private vehicles$ = new BehaviorSubject<Vehicle[]>([]);
    private appointments$ = new BehaviorSubject<TuevAppointment[]>([]);
    private tuevStatuses$ = new BehaviorSubject<TuevStatus[]>([]);
    private notificationIntervalId: any;

    constructor(private couchDbService: CouchDbService, private notificationService: NotificationService, private http: HttpClient) {
        this.initializeData();
        this.startNotificationCheck();
    }

    private initializeData(): void {
        // Lade Fahrzeuge und Termine vom CouchDB
        this.couchDbService.watchDocs('vehicle').subscribe(
            (vehicles: any[]) => {
                this.vehicles$.next(vehicles);
                this.checkAndNotifyVehicles(vehicles);
            },
            (err) => console.error('Error loading vehicles:', err)
        );

        this.couchDbService.watchDocs('appointment').subscribe(
            (appointments: any[]) => {
                this.appointments$.next(appointments);
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
            this.checkAndNotifyVehicles(this.vehicles$.value);
            // Dann täglich wiederholen
            this.notificationIntervalId = setInterval(() => {
                this.checkAndNotifyVehicles(this.vehicles$.value);
            }, 24 * 60 * 60 * 1000); // Alle 24 Stunden
        }, timeUntilNextCheck);
    }

    private checkAndNotifyVehicles(vehicles: Vehicle[]): void {
        vehicles.forEach(vehicle => {
            if (!vehicle.nextTuevDate) {
                return;
            }

            const expiryDate = new Date(vehicle.nextTuevDate);
            const todayKey = this.toDateKey(new Date());
            const reminderSchedule: Array<{ type: TuevReminderType; dateKey: string; title: string; body: string; priority: 'normal' | 'high' }> = [
                {
                    type: 'three-months-before',
                    dateKey: this.toDateKey(this.addMonths(expiryDate, -3)),
                    title: '📅 TÜV läuft in 3 Monaten ab',
                    body: `${vehicle.name} (${vehicle.licensePlate}) - TÜV läuft in 3 Monaten ab.`,
                    priority: 'normal'
                },
                {
                    type: 'one-month-before',
                    dateKey: this.toDateKey(this.addMonths(expiryDate, -1)),
                    title: '⚠️ TÜV läuft in 1 Monat ab',
                    body: `${vehicle.name} (${vehicle.licensePlate}) - TÜV läuft in 1 Monat ab.`,
                    priority: 'high'
                },
                {
                    type: 'on-expiry',
                    dateKey: this.toDateKey(expiryDate),
                    title: '🚨 TÜV läuft heute ab',
                    body: `${vehicle.name} (${vehicle.licensePlate}) - TÜV läuft heute ab!`,
                    priority: 'high'
                },
                {
                    type: 'one-month-after',
                    dateKey: this.toDateKey(this.addMonths(expiryDate, 1)),
                    title: '❗ TÜV seit 1 Monat abgelaufen',
                    body: `${vehicle.name} (${vehicle.licensePlate}) - TÜV ist seit 1 Monat abgelaufen.`,
                    priority: 'high'
                }
            ];

            reminderSchedule.forEach(reminder => {
                if (todayKey !== reminder.dateKey) {
                    return;
                }

                this.notificationService.sendNotification({
                    title: reminder.title,
                    body: reminder.body,
                    tag: `tuev-${reminder.type}-${vehicle._id}`,
                    priority: reminder.priority
                });

                if (this.hasReminderBeenSent(vehicle._id, reminder.type, todayKey)) {
                    return;
                }

                this.sendTuevReminderEmail(vehicle, expiryDate, reminder.type)
                    .then(() => this.markReminderAsSent(vehicle._id, reminder.type, todayKey))
                    .catch(error => console.error('Failed to send tuev reminder email', error));
            });
        });
    }

    private async sendTuevReminderEmail(vehicle: Vehicle, expiryDate: Date, reminderType: TuevReminderType): Promise<void> {
        const apiUrl = `${environment.mailApiBaseUrl}/tuev-reminder`;

        await firstValueFrom(this.http.post(apiUrl, {
            vehicleName: vehicle.name,
            licensePlate: vehicle.licensePlate,
            nextTuevDate: expiryDate,
            reminderType
        }));
    }

    private hasReminderBeenSent(vehicleId: string | undefined, reminderType: TuevReminderType, dateKey: string): boolean {
        if (!vehicleId) {
            return false;
        }

        const sentReminders = this.getSentReminders();
        const key = `${vehicleId}|${reminderType}|${dateKey}`;
        return sentReminders[key] === '1';
    }

    private markReminderAsSent(vehicleId: string | undefined, reminderType: TuevReminderType, dateKey: string): void {
        if (!vehicleId) {
            return;
        }

        const sentReminders = this.getSentReminders();
        const key = `${vehicleId}|${reminderType}|${dateKey}`;
        sentReminders[key] = '1';
        localStorage.setItem(this.sentTuevReminderStorageKey, JSON.stringify(sentReminders));
    }

    private getSentReminders(): Record<string, string> {
        try {
            const raw = localStorage.getItem(this.sentTuevReminderStorageKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    private toDateKey(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private addMonths(baseDate: Date, months: number): Date {
        const result = new Date(baseDate);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    // ===== Vehicle Management =====
    public addVehicle(vehicle: Vehicle, file?: File): Promise<any> {
        const doc: any = {
            ...vehicle,
            type: 'vehicle',
            _id: vehicle._id || this.couchDbService.generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (file) {
            return this.compressAndConvertToBase64(file).then(base64 => {
                doc._attachments = {
                    'vehicle-image': {
                        content_type: 'image/jpeg', // Always converting to jpeg
                        data: base64
                    }
                };
                return this.couchDbService.addDoc(doc);
            });
        }

        return this.couchDbService.addDoc(doc);
    }

    public updateVehicle(vehicle: Vehicle, file?: File): Promise<any> {
        const doc: any = {
            ...vehicle,
            type: 'vehicle',
            updatedAt: new Date()
        };

        if (file) {
            return this.compressAndConvertToBase64(file).then(base64 => {
                // Preserve existing attachments if needed, but here we overwrite/set 'vehicle-image'
                // If vehicle has _attachments stub, we need to be careful.
                // Ideally we should merge, but for now let's assume we just set this one.
                // If we provide data, PouchDB updates it.
                doc._attachments = {
                    ...doc._attachments,
                    'vehicle-image': {
                        content_type: 'image/jpeg', // Always converting to jpeg
                        data: base64
                    }
                };
                return this.couchDbService.updateDoc(doc);
            });
        }
        return this.couchDbService.updateDoc(doc);
    }

    private compressAndConvertToBase64(file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event: any) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Convert to PEG with quality setting
                        const dataUrl = canvas.toDataURL('image/jpeg', quality);
                        // Remove data:image/jpeg;base64, prefix
                        const base64 = dataUrl.split(',')[1];
                        resolve(base64);
                    } else {
                        reject(new Error('Canvas context is null'));
                    }
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    }

    public deleteVehicle(vehicleId: string): Promise<any> {
        return this.couchDbService.deleteDoc(vehicleId);
    }

    public getVehicles(): Observable<Vehicle[]> {
        return this.vehicles$.asObservable();
    }

    public renewTuev(vehicle: Vehicle, newDate: Date): Promise<any> {
        const updatedVehicle: Vehicle = {
            ...vehicle,
            lastTuevDate: vehicle.nextTuevDate,
            nextTuevDate: newDate,
            updatedAt: new Date()
        };
        return this.updateVehicle(updatedVehicle);
    }

    // ===== Appointment Management (Legacy / Optional) =====
    public getAppointments(): Observable<TuevAppointment[]> {
        return this.appointments$.asObservable();
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
