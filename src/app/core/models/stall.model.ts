export interface Pig {
    id: string;
    birthDate: string; // ISO date string
    entryDate: string; // ISO date string
    boxId: string;
}

export interface Box {
    id: string;
    stallId: string;
    name: string; // e.g., "Box 1"
    capacity: number;
    pigs: Pig[];
}

export interface Stall {
    _id: string;
    _rev?: string;
    type: 'stall';
    name: string; // e.g., "Stall 1"
    boxes: Box[];
}
