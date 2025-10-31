export interface Vehicle {
    _id?: string;
    _rev?: string;
    name: string;
    licensePlate: string;
    vin?: string;
    type: 'car' | 'truck' | 'trailer' | 'tractor' | 'other';
    manufacturer?: string;
    model?: string;
    year?: number;
    mileage?: number;
    nextTuevDate?: Date;
    lastTuevDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
