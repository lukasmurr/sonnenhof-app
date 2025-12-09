export interface NotificationConfig {
    title: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    priority?: 'low' | 'normal' | 'high';
}
