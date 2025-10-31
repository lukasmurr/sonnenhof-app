export interface TuevStatus {
    vehicleId: string;
    vehicleName: string;
    licensePlate: string;
    currentStatus: 'valid' | 'expiring-soon' | 'expired' | 'unknown';
    lastInspectionDate?: Date;
    nextInspectionDate?: Date;
    daysUntilExpiry?: number;
    lastAppointmentId?: string;
    isOverdue: boolean;
}
