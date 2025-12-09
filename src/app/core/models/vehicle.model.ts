export interface Vehicle {
    _id?: string;
    _rev?: string;
    name: string;
    licensePlate: string;
    vehicleType: 'car' | 'truck' | 'trailer' | 'tractor' | 'other';
    nextTuevDate?: Date;
    lastTuevDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
