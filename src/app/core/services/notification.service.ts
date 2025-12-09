import { Injectable } from '@angular/core';
import { NotificationConfig } from '../models/notification.model';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationQueue: Map<string, any> = new Map();

    constructor() {
        this.requestPermission();
    }

    public requestPermission(): void {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    console.log('Notification permission:', permission);
                });
            }
        }
    }

    public sendNotification(config: NotificationConfig): void {
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

    public getTimeUntil(futureDate: Date): { days: number; ms: number } {
        const now = new Date();
        const diff = futureDate.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { days, ms: diff };
    }
}