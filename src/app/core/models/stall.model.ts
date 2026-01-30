// ============================================
// Stall (Stable) Management Domain Models
// ============================================

export type StallType = 'pre-fattening' | 'finishing';
export type BoxStatus = 'active' | 'empty' | 'needs-cleaning' | 'occupied' | 'maintenance';
export type BoxMarkerType = 'tail-biters' | 'sick' | 'cannibalism' | 'quarantine' | 'health' | 'treatment' | 'attention' | 'custom';
export type LogEventType = 'check-in' | 'transfer-out' | 'transfer-in' | 'death' | 'slaughter' | 'marker-added' | 'marker-removed' | 'status-changed' | 'transfer';
export type DeathReason = 'hernia' | 'illness' | 'injury' | 'unknown' | 'other';

/**
 * Represents a marker/flag on a box
 */
export interface BoxMarker {
    id: string;
    type: BoxMarkerType;
    description: string;
    createdAt: Date | string;
    createdBy?: string;
}

/**
 * Represents a stable/stall building
 */
export interface Stall {
    _id: string;
    _rev?: string;
    type: 'stall';
    id: string;
    name: string;
    stallType: StallType;
    rows: StallRow[];
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Represents a row/section within a stable
 */
export interface StallRow {
    id: string;
    name: string;
    position: 'left' | 'middle-left' | 'middle-right' | 'right' | 'center';
    boxes: Box[];
}

/**
 * Represents a single box/pen within a row
 */
export interface Box {
    id: string;
    stallId: string;
    rowId: string;
    name: string;
    capacity: number;
    currentCount: number;
    isLargeBox: boolean;
    status: BoxStatus;
    markers: BoxMarker[];
    currentBatch: PigBatch | null;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Represents a batch/group of pigs
 */
export interface PigBatch {
    id: string;
    batchId: string;
    boxId: string;
    quantity: number;
    arrivalDate: string;
    checkInDate: string;
    origin?: string;
    initialWeight?: number;
    currentWeight?: number;
    sourceStallId?: string;
    sourceBoxId?: string;
    notes?: string;
}

/**
 * Represents a log entry for tracking movements and events
 */
export interface StallLog {
    _id?: string;
    _rev?: string;
    id: string;
    type: 'stall-log';
    eventType: LogEventType;
    timestamp: string | Date;
    stallId: string;
    boxId: string;
    batchId?: string;
    count?: number;
    quantity?: number;
    weight?: number;
    
    // For transfers
    targetStallId?: string;
    targetBoxId?: string;
    
    // For deaths
    deathReason?: DeathReason;
    deathReasonDetail?: string;
    
    // For markers
    marker?: BoxMarkerType;
    
    // For status changes
    previousStatus?: BoxStatus;
    newStatus?: BoxStatus;
    
    // Metadata
    notes?: string;
    userId?: string;
    createdAt?: string;
}

/**
 * Configuration for initializing stalls
 */
export interface StallConfiguration {
    id: string;
    name: string;
    stallType: StallType;
    rows: {
        name: string;
        position: StallRow['position'];
        boxCount: number;
        hasLargeBox?: boolean;
        largeBoxPosition?: 'start' | 'end';
    }[];
}

/**
 * Dashboard statistics
 */
export interface StallStats {
    totalPigs: number;
    totalCapacity: number;
    totalBoxes: number;
    occupiedBoxes: number;
    emptyBoxes: number;
    occupancyRate: number;
    pigsByStall: { stallId: string; stallName: string; count: number }[];
    sickCount: number;
    quarantineCount: number;
    averageDaysInSystem: number;
    averageFatteningDays: number;
    boxesWithMarkers: number;
    monthlyThroughput: number;
    yearlyThroughput: number;
    mortalityRate: number;
    deathsThisMonth: number;
    slaughtersThisMonth: number;
}

/**
 * Box fill suggestion for auto-fill algorithm
 */
export interface BoxFillSuggestion {
    boxId: string;
    boxName: string;
    box: Box;
    suggestedCount: number;
    suggestedQuantity: number;
    fillLevel: 'empty' | 'partial' | 'optimal' | 'full';
    reason: string;
}

/**
 * Slaughter suggestion for slaughter algorithm
 */
export interface SlaughterSuggestion {
    boxId: string;
    box: Box;
    batch: PigBatch;
    daysInSystem: number;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedWeight?: number;
}

/**
 * NFC Tag data structure
 */
export interface NfcTagData {
    stallId: string;
    boxId: string;
    timestamp?: string;
}

/**
 * Transfer mode state
 */
export interface TransferState {
    isActive: boolean;
    sourceStallId: string | null;
    sourceBoxId: string | null;
    sourceBatch: PigBatch | null;
    quantityToTransfer: number;
}

// ============================================
// Stall Configurations (Hard-coded layouts)
// ============================================

export const STALL_CONFIGURATIONS: StallConfiguration[] = [
    {
        id: 'stall-1',
        name: 'Alter Stall (Vormast)',
        stallType: 'pre-fattening',
        rows: [
            { name: 'Links', position: 'left', boxCount: 18 },
            { name: 'Rechts', position: 'right', boxCount: 17 }
        ]
    },
    {
        id: 'stall-2',
        name: 'Neuer Stall (Endmast)',
        stallType: 'finishing',
        rows: [
            { name: 'Links', position: 'left', boxCount: 19 },
            { name: 'Mitte-Links', position: 'middle-left', boxCount: 18 },
            { name: 'Mitte-Rechts', position: 'middle-right', boxCount: 18 },
            { name: 'Rechts', position: 'right', boxCount: 19 }
        ]
    },
    {
        id: 'stall-3',
        name: 'Oberer Stall (Endmast)',
        stallType: 'finishing',
        rows: [
            { name: 'Reihe 1', position: 'center', boxCount: 5, hasLargeBox: true, largeBoxPosition: 'end' }
        ]
    }
];

export const DEFAULT_BOX_CAPACITY = 7;
export const OPTIMAL_FILL_STEPS = [7, 14, 21];
