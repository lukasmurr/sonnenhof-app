export interface Market {
    _id?: string;
    _rev?: string;
    type: 'market';
    name: string;
    address: string;
    day: string; // e.g., "Montag", "Dienstag"
    startTime: string; // e.g., "08:00"
    endTime: string; // e.g., "13:00"
    car: '5' | '6';
    hasGrillTrailer: boolean;
    createdAt?: string;
    updatedAt?: string;
}
