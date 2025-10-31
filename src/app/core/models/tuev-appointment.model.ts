export interface TuevAppointment {
    _id?: string;
    _rev?: string;
    vehicleId: string;
    vehicleName: string;
    appointmentDate: Date;
    status: 'pending' | 'completed' | 'failed' | 'rescheduled' | 'cancelled';
    location?: string;
    inspector?: string;
    notes?: string;
    passedInspection?: boolean;
    nextAppointmentDate?: Date;
    defects?: string[];
    createdAt: Date;
    updatedAt: Date;
}
