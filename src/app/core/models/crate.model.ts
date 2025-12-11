export interface CrateHistoryEntry {
    date: string;
    change: number;
    action: 'borrow' | 'return';
}

export interface CrateRecord {
    _id?: string;
    _rev?: string;
    type: 'crate-record';
    customerName: string;
    count: number;
    lastUpdated: string;
    history?: CrateHistoryEntry[];
}
