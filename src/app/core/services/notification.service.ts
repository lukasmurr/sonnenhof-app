import { Injectable } from '@angular/core';

export interface NotificationConfig {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  priority?: 'low' | 'normal' | 'high';
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationQueue: Map<string, any> = new Map();

    constructor() {
        this.requestPermission();
    }

    requestPermission(): void {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    console.log('Notification permission:', permission);
                });
            }
        }
    }

    sendNotification(config: NotificationConfig): void {
        if (Notification.permission !== 'granted') {
            return;
        }

        const notification = new Notification(config.title, {
            icon: config.icon || '/assets/favicon.ico',
            badge: config.badge || '/assets/favicon.ico',
            tag: config.tag || 'notification',
            body: config.body || '',
            requireInteraction: config.priority === 'high'
        });

        // Auto-close nach 5 Sekunden (es sei denn, es ist wichtig)
        if (config.priority !== 'high') {
            setTimeout(() => notification.close(), 5000);
        }

        // Benutzer-Interaktion
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }

    /**
     * Geplante Benachrichtigung - wird zu bestimmten Zeiten gesendet
     */
    scheduleNotification(config: NotificationConfig, delayMs: number, id: string): void {
        // Alte Zeitpläne löschen
        if (this.notificationQueue.has(id)) {
            clearTimeout(this.notificationQueue.get(id));
        }

        const timeout = setTimeout(() => {
            this.sendNotification(config);
            this.notificationQueue.delete(id);
        }, delayMs);

        this.notificationQueue.set(id, timeout);
    }

    /**
     * Wiederholte Benachrichtigungen
     */
    scheduleRecurringNotification(
        config: NotificationConfig,
        intervalMs: number,
        maxTimes: number,
        id: string
    ): void {
        let count = 0;

        const interval = setInterval(() => {
            this.sendNotification(config);
            count++;

            if (count >= maxTimes) {
                clearInterval(interval);
                this.notificationQueue.delete(id);
            }
        }, intervalMs);

        this.notificationQueue.set(id, interval as any);
    }

    /**
     * Benachrichtigung stornieren
     */
    cancelScheduled(id: string): void {
        if (this.notificationQueue.has(id)) {
            clearTimeout(this.notificationQueue.get(id));
            this.notificationQueue.delete(id);
        }
    }

    /**
     * Alle geplanten Benachrichtigungen stornieren
     */
    cancelAll(): void {
        this.notificationQueue.forEach(timeout => clearTimeout(timeout));
        this.notificationQueue.clear();
    }

    /**
     * Berechne Zeit bis zu einem Datum
     */
    getTimeUntil(futureDate: Date): { days: number; ms: number } {
        const now = new Date();
        const diff = futureDate.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { days, ms: diff };
    }

    /**
     * Überprüfe ob eine Benachrichtigung heute gesendet werden sollte
     */
    shouldNotifyToday(appointmentDate: Date, daysUntil: number): boolean {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const appointment = new Date(appointmentDate);
        const appointmentDay = new Date(appointment.getFullYear(), appointment.getMonth(), appointment.getDate());
        
        // Berechne den Tag, an dem die Benachrichtigung sein sollte
        const notificationDay = new Date(appointmentDay.getTime() - daysUntil * 24 * 60 * 60 * 1000);
        
        return today.getTime() === notificationDay.getTime();
    }
}