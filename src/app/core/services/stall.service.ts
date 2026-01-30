import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, from, map, combineLatest, BehaviorSubject } from 'rxjs';
import {
    Box, PigBatch, Stall, StallLog, StallRow, StallStats,
    BoxFillSuggestion, SlaughterSuggestion, TransferState,
    BoxStatus, BoxMarker, BoxMarkerType, DeathReason, LogEventType,
    STALL_CONFIGURATIONS, DEFAULT_BOX_CAPACITY, OPTIMAL_FILL_STEPS
} from '../models/stall.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class StallService {
    private dbService = inject(CouchDbService);

    // Transfer mode state
    private transferState = signal<TransferState>({
        isActive: false,
        sourceStallId: null,
        sourceBoxId: null,
        sourceBatch: null,
        quantityToTransfer: 0
    });

    public isTransferMode = computed(() => this.transferState().isActive);
    public currentTransfer = computed(() => this.transferState());

    constructor() {
        this.initializeStalls();
    }

    // ============================================
    // Initialization
    // ============================================

    private async initializeStalls(): Promise<void> {
        const existingStalls = await this.dbService.getAllDocs('stall');
        
        if (existingStalls.length === 0) {
            for (const config of STALL_CONFIGURATIONS) {
                const stall = this.createStallFromConfig(config);
                await this.dbService.addDoc(stall);
            }
        }
    }

    private createStallFromConfig(config: typeof STALL_CONFIGURATIONS[0]): Stall {
        const rows: StallRow[] = config.rows.map((rowConfig, rowIndex) => {
            const boxes: Box[] = [];
            const boxCount = rowConfig.hasLargeBox ? rowConfig.boxCount : rowConfig.boxCount;

            for (let i = 0; i < boxCount; i++) {
                const boxId = `${config.id}-${rowConfig.position}-${i + 1}`;
                boxes.push({
                    id: boxId,
                    stallId: config.id,
                    rowId: `${config.id}-row-${rowIndex}`,
                    name: `Box ${i + 1}`,
                    capacity: DEFAULT_BOX_CAPACITY,
                    currentCount: 0,
                    isLargeBox: false,
                    status: 'empty',
                    markers: [],
                    currentBatch: null
                });
            }

            // Add large box if configured
            if (rowConfig.hasLargeBox) {
                const largeBoxId = `${config.id}-${rowConfig.position}-large`;
                const largeBox: Box = {
                    id: largeBoxId,
                    stallId: config.id,
                    rowId: `${config.id}-row-${rowIndex}`,
                    name: 'Große Box',
                    capacity: 999, // No limit
                    currentCount: 0,
                    isLargeBox: true,
                    status: 'empty',
                    markers: [],
                    currentBatch: null
                };

                if (rowConfig.largeBoxPosition === 'start') {
                    boxes.unshift(largeBox);
                } else {
                    boxes.push(largeBox);
                }
            }

            return {
                id: `${config.id}-row-${rowIndex}`,
                name: rowConfig.name,
                position: rowConfig.position,
                boxes
            };
        });

        return {
            _id: config.id,
            id: config.id,
            type: 'stall',
            name: config.name,
            stallType: config.stallType,
            rows
        };
    }

    // ============================================
    // CRUD Operations
    // ============================================

    getStalls(): Observable<Stall[]> {
        return this.dbService.watchDocs('stall') as Observable<Stall[]>;
    }

    getAllStalls(): Stall[] {
        // Synchronous version using cached data - for components that need immediate access
        // In a real app, this would be a signal or computed from a cached state
        return STALL_CONFIGURATIONS.map(config => this.createStallFromConfig(config));
    }

    getStall(id: string): Stall | null {
        // Synchronous version for immediate access
        const config = STALL_CONFIGURATIONS.find(c => c.id === id);
        return config ? this.createStallFromConfig(config) : null;
    }

    getStallAsync(id: string): Observable<Stall> {
        return from(this.dbService.getDoc(id));
    }

    getStallSync(id: string): Promise<Stall> {
        return this.dbService.getDoc(id);
    }

    private async updateStall(stall: Stall): Promise<any> {
        stall.updatedAt = new Date().toISOString();
        return this.dbService.updateDoc(stall);
    }

    // ============================================
    // Box Operations
    // ============================================

    getBox(stallId: string, boxId: string): Observable<Box | null> {
        return this.getStallAsync(stallId).pipe(
            map(stall => {
                for (const row of stall.rows) {
                    const box = row.boxes.find(b => b.id === boxId);
                    if (box) return box;
                }
                return null;
            })
        );
    }

    async updateBox(stallId: string, updatedBox: Box): Promise<void> {
        const stall = await this.getStallSync(stallId);
        
        for (const row of stall.rows) {
            const boxIndex = row.boxes.findIndex(b => b.id === updatedBox.id);
            if (boxIndex >= 0) {
                row.boxes[boxIndex] = { ...updatedBox, updatedAt: new Date().toISOString() };
                break;
            }
        }
        
        await this.updateStall(stall);
    }

    async updateBoxStatus(stallId: string, boxId: string, status: BoxStatus): Promise<void> {
        const stall = await this.getStallSync(stallId);
        const box = this.findBox(stall, boxId);
        
        if (box) {
            const previousStatus = box.status;
            box.status = status;
            box.updatedAt = new Date().toISOString();
            
            await this.updateStall(stall);
            await this.logEvent({
                eventType: 'status-changed',
                stallId,
                boxId,
                previousStatus,
                newStatus: status
            });
        }
    }

    async toggleMarker(stallId: string, boxId: string, markerType: BoxMarkerType): Promise<void> {
        const stall = await this.getStallSync(stallId);
        const box = this.findBox(stall, boxId);
        
        if (box) {
            const existingIndex = box.markers.findIndex(m => m.type === markerType);
            
            if (existingIndex >= 0) {
                box.markers.splice(existingIndex, 1);
                await this.logEvent({
                    eventType: 'marker-removed',
                    stallId,
                    boxId,
                    marker: markerType
                });
            } else {
                const newMarker: BoxMarker = {
                    id: crypto.randomUUID(),
                    type: markerType,
                    description: '',
                    createdAt: new Date().toISOString(),
                    createdBy: ''
                };
                box.markers.push(newMarker);
                await this.logEvent({
                    eventType: 'marker-added',
                    stallId,
                    boxId,
                    marker: markerType
                });
            }
            
            box.updatedAt = new Date().toISOString();
            await this.updateStall(stall);
        }
    }

    async addMarker(stallId: string, boxId: string, marker: BoxMarker): Promise<void> {
        const stall = await this.getStallSync(stallId);
        const box = this.findBox(stall, boxId);
        
        if (box) {
            box.markers.push(marker);
            box.updatedAt = new Date().toISOString();
            await this.updateStall(stall);
            
            await this.logEvent({
                eventType: 'marker-added',
                stallId,
                boxId,
                marker: marker.type
            });
        }
    }

    async removeMarker(stallId: string, boxId: string, markerId: string): Promise<void> {
        const stall = await this.getStallSync(stallId);
        const box = this.findBox(stall, boxId);
        
        if (box) {
            const markerIndex = box.markers.findIndex(m => m.id === markerId);
            if (markerIndex >= 0) {
                const marker = box.markers[markerIndex];
                box.markers.splice(markerIndex, 1);
                box.updatedAt = new Date().toISOString();
                await this.updateStall(stall);
                
                await this.logEvent({
                    eventType: 'marker-removed',
                    stallId,
                    boxId,
                    marker: marker.type
                });
            }
        }
    }

    private findBox(stall: Stall, boxId: string): Box | null {
        if (!stall || !stall.rows) return null;
        for (const row of stall.rows) {
            if (row.boxes) {
                const box = row.boxes.find(b => b.id === boxId);
                if (box) return box;
            }
        }
        return null;
    }

    private async ensureStallDataIntegrity(stall: Stall): Promise<void> {
        if (!stall.stallType || !stall.rows) {
            const config = STALL_CONFIGURATIONS.find(c => c.id === stall.id || c.id === stall._id);
            if (config) {
                if (!stall.stallType) stall.stallType = config.stallType;
                
                // If rows are missing, reconstruct them from config
                if (!stall.rows) {
                    const freshStall = this.createStallFromConfig(config);
                    stall.rows = freshStall.rows;
                }
                
                const result = await this.updateStall(stall);
                if (result && result.rev) {
                    stall._rev = result.rev; // Update revision to avoid conflict
                }
            }
        }
    }

    // ============================================
    // Pig Batch Operations
    // ============================================

    /**
     * Einstallen einer Gruppe von Schweinen auf mehrere Boxen (Batch-Operation)
     * Dies verhindert Race-Conditions durch einmaliges Laden und Speichern des Stalls.
     */
    async checkInBatch(stallId: string, allocations: { boxId: string; quantity: number }[], batchData: { batchId: string; origin: string; notes?: string }): Promise<void> {
        const stall = await this.getStallSync(stallId);
        
        // Ensure legacy data is patched before proceeding
        await this.ensureStallDataIntegrity(stall);

        // Validate: Only pre-fattening stalls accept new pigs
        if (stall.stallType !== 'pre-fattening') {
            throw new Error('Neue Schweine können nur in den Vormaststall eingestallt werden.');
        }

        const eventsToLog: any[] = [];
        const now = new Date().toISOString();

        for (const alloc of allocations) {
            const box = this.findBox(stall, alloc.boxId);
            if (!box) {
                console.warn(`Box ${alloc.boxId} nicht gefunden, überspringe.`);
                continue;
            }

            // Check if box is already occupied (legacy checks might be needed, but assume UI did its job mostly)
            // However, for safety:
            if (box.currentBatch && box.currentBatch.quantity > 0) {
                 // If the box is already occupied by *another* batch, we skip or throw? 
                 // The user said "if I check in twice it shows occupied". 
                 // We should probably throw if ANY box is occupied to be safe, OR just skip that one. 
                 // Let's throw to prevent partial states which confuse users.
                 throw new Error(`Box ${box.name || alloc.boxId} ist bereits belegt!`);
            }

             if (!box.isLargeBox && alloc.quantity > box.capacity) {
                throw new Error(`Box ${box.name || alloc.boxId}: Kapazität überschritten.`);
            }

            const batch: PigBatch = {
                id: batchData.batchId,
                batchId: batchData.batchId,
                boxId: alloc.boxId,
                quantity: alloc.quantity,
                arrivalDate: now,
                checkInDate: now,
                origin: batchData.origin,
                notes: batchData.notes
            };

            box.currentBatch = batch;
            box.currentCount = alloc.quantity;
            box.status = 'active';
            box.updatedAt = now;

            eventsToLog.push({
                eventType: 'check-in',
                stallId,
                boxId: alloc.boxId,
                batchId: batchData.batchId,
                count: alloc.quantity,
                quantity: alloc.quantity
            });
        }

        // Single atomic update for the stall
        await this.updateStall(stall);

        // Log events individually
        for (const event of eventsToLog) {
            await this.logEvent(event);
        }
    }

    async checkInPigs(
        stallId: string, 
        boxId: string, 
        quantity: number, 
        batchId?: string,
        origin?: string,
        weight?: number, 
        notes?: string
    ): Promise<void> {
        const stall = await this.getStallSync(stallId);
        
        // Ensure legacy data is patched before proceeding
        await this.ensureStallDataIntegrity(stall);

        // Validate: Only pre-fattening stalls accept new pigs
        if (stall.stallType !== 'pre-fattening') {
            throw new Error('Neue Schweine können nur in den Vormaststall eingestallt werden');
        }

        const box = this.findBox(stall, boxId);
        if (!box) throw new Error('Box nicht gefunden');
        
        if (box.currentBatch && box.currentBatch.quantity > 0) {
            throw new Error('Box ist bereits belegt');
        }

        if (!box.isLargeBox && quantity > box.capacity) {
            throw new Error(`Maximale Kapazität ist ${box.capacity}`);
        }

        const batch: PigBatch = {
            id: batchId || `batch-${Date.now()}`,
            batchId: batchId || `batch-${Date.now()}`,
            boxId,
            quantity,
            arrivalDate: new Date().toISOString(),
            checkInDate: new Date().toISOString(),
            origin,
            initialWeight: weight,
            currentWeight: weight,
            notes
        };

        box.currentBatch = batch;
        box.currentCount = quantity;
        box.status = 'active';
        box.updatedAt = new Date().toISOString();

        await this.updateStall(stall);
        await this.logEvent({
            eventType: 'check-in',
            stallId,
            boxId,
            batchId: batch.id,
            count: quantity,
            quantity,
            weight
        });
    }

    async transferPigs(
        sourceStallId: string,
        sourceBoxId: string,
        targetStallId: string,
        targetBoxId: string,
        quantity?: number
    ): Promise<void> {
        const sourceStall = await this.getStallSync(sourceStallId);
        await this.ensureStallDataIntegrity(sourceStall);
        
        const sourceBox = this.findBox(sourceStall, sourceBoxId);
        
        if (!sourceBox?.currentBatch) {
            throw new Error('Keine Schweine zum Umstallen');
        }

        const transferQuantity = quantity || sourceBox.currentBatch.quantity;

        // Get target stall (might be the same)
        const targetStall = sourceStallId === targetStallId 
            ? sourceStall 
            : await this.getStallSync(targetStallId);
            
        if (sourceStallId !== targetStallId) {
            await this.ensureStallDataIntegrity(targetStall);
        }
        const targetBox = this.findBox(targetStall, targetBoxId);
        
        if (!targetBox) throw new Error('Zielbox nicht gefunden');
        
        if (targetBox.currentBatch && targetBox.currentBatch.quantity > 0) {
            throw new Error('Zielbox ist bereits belegt');
        }

        if (!targetBox.isLargeBox && transferQuantity > targetBox.capacity) {
            throw new Error(`Zielbox hat nur Kapazität für ${targetBox.capacity} Schweine`);
        }

        // Create new batch in target
        const newBatch: PigBatch = {
            id: `batch-${Date.now()}`,
            batchId: sourceBox.currentBatch.batchId || `batch-${Date.now()}`,
            boxId: targetBoxId,
            quantity: transferQuantity,
            arrivalDate: sourceBox.currentBatch.arrivalDate || sourceBox.currentBatch.checkInDate,
            checkInDate: new Date().toISOString(), // Transfer date as new check-in
            initialWeight: sourceBox.currentBatch.initialWeight,
            currentWeight: sourceBox.currentBatch.currentWeight,
            origin: sourceBox.currentBatch.origin,
            sourceStallId,
            sourceBoxId,
            notes: sourceBox.currentBatch.notes
        };

        targetBox.currentBatch = newBatch;
        targetBox.currentCount = transferQuantity;
        targetBox.status = 'active';
        targetBox.updatedAt = new Date().toISOString();

        // Update or clear source
        if (transferQuantity >= sourceBox.currentBatch.quantity) {
            sourceBox.currentBatch = null;
            sourceBox.currentCount = 0;
            sourceBox.status = 'needs-cleaning';
        } else {
            sourceBox.currentBatch.quantity -= transferQuantity;
            sourceBox.currentCount -= transferQuantity;
        }
        sourceBox.updatedAt = new Date().toISOString();

        // Save both stalls
        await this.updateStall(sourceStall);
        if (sourceStallId !== targetStallId) {
            await this.updateStall(targetStall);
        }

        // Log events
        await this.logEvent({
            eventType: 'transfer-out',
            stallId: sourceStallId,
            boxId: sourceBoxId,
            targetStallId,
            targetBoxId,
            quantity: transferQuantity
        });

        await this.logEvent({
            eventType: 'transfer-in',
            stallId: targetStallId,
            boxId: targetBoxId,
            batchId: newBatch.id,
            quantity: transferQuantity
        });

        // Reset transfer mode
        this.cancelTransfer();
    }

    async slaughterPigs(stallId: string, boxId: string, quantity: number, avgWeight?: number): Promise<void> {
        const stall = await this.getStallSync(stallId);
        const box = this.findBox(stall, boxId);
        
        if (!box?.currentBatch) {
            throw new Error('Keine Schweine zum Schlachten');
        }

        const slaughterQuantity = Math.min(quantity, box.currentBatch.quantity);

        await this.logEvent({
            eventType: 'slaughter',
            stallId,
            boxId,
            batchId: box.currentBatch.id,
            quantity: slaughterQuantity,
            weight: avgWeight
        });

        if (slaughterQuantity >= box.currentBatch.quantity) {
            box.currentBatch = null;
            box.status = 'needs-cleaning';
        } else {
            box.currentBatch.quantity -= slaughterQuantity;
        }
        box.updatedAt = new Date().toISOString();

        await this.updateStall(stall);
    }

    async removePig(stallId: string, boxId: string, reason: DeathReason, reasonDetail?: string): Promise<void> {
        const stall = await this.getStallSync(stallId);
        const box = this.findBox(stall, boxId);
        
        if (!box?.currentBatch || box.currentBatch.quantity === 0) {
            throw new Error('Keine Schweine vorhanden');
        }

        box.currentBatch.quantity--;

        await this.logEvent({
            eventType: 'death',
            stallId,
            boxId,
            batchId: box.currentBatch.id,
            quantity: 1,
            deathReason: reason,
            deathReasonDetail: reasonDetail
        });

        if (box.currentBatch.quantity === 0) {
            box.currentBatch = null;
            box.status = 'needs-cleaning';
        }
        box.updatedAt = new Date().toISOString();

        await this.updateStall(stall);
    }

    // ============================================
    // Transfer Mode
    // ============================================

    startTransfer(stallId: string, boxId: string, batch: PigBatch, quantity?: number): void {
        this.transferState.set({
            isActive: true,
            sourceStallId: stallId,
            sourceBoxId: boxId,
            sourceBatch: batch,
            quantityToTransfer: quantity || batch.quantity
        });
    }

    cancelTransfer(): void {
        this.transferState.set({
            isActive: false,
            sourceStallId: null,
            sourceBoxId: null,
            sourceBatch: null,
            quantityToTransfer: 0
        });
    }

    async completeTransfer(targetStallId: string, targetBoxId: string): Promise<void> {
        const transfer = this.transferState();
        if (!transfer.isActive || !transfer.sourceStallId || !transfer.sourceBoxId) {
            throw new Error('Kein aktiver Transfer');
        }

        await this.transferPigs(
            transfer.sourceStallId,
            transfer.sourceBoxId,
            targetStallId,
            targetBoxId,
            transfer.quantityToTransfer
        );
    }

    // ============================================
    // Smart Algorithms
    // ============================================

    getAutoFillSuggestions(stallId: string): BoxFillSuggestion[] {
        const stall = this.getStall(stallId);
        
        if (!stall) return [];

        const emptyBoxes: Box[] = [];
        for (const row of stall.rows) {
            for (const box of row.boxes) {
                if (!box.currentBatch && box.status !== 'needs-cleaning' && !box.isLargeBox) {
                    emptyBoxes.push(box);
                }
            }
        }

        // Sort by row position (left first, then right)
        emptyBoxes.sort((a, b) => a.id.localeCompare(b.id));

        const suggestions: BoxFillSuggestion[] = [];

        for (const box of emptyBoxes) {
            // Suggest optimal fill quantity
            const suggestedQty = box.capacity;
            
            suggestions.push({
                boxId: box.id,
                boxName: box.name,
                box,
                suggestedCount: suggestedQty,
                suggestedQuantity: suggestedQty,
                fillLevel: 'full',
                reason: `Box ${box.name} ist leer und bereit für ${suggestedQty} Schweine`
            });
        }

        return suggestions;
    }

    async getAutoFillSuggestionsForQuantity(quantity: number): Promise<BoxFillSuggestion[]> {
        const stalls = await this.dbService.getAllDocs('stall') as Stall[];
        const prefatteningStall = stalls.find(s => s.stallType === 'pre-fattening');
        
        if (!prefatteningStall) return [];

        const emptyBoxes: Box[] = [];
        for (const row of prefatteningStall.rows) {
            for (const box of row.boxes) {
                if (!box.currentBatch && box.status !== 'needs-cleaning' && !box.isLargeBox) {
                    emptyBoxes.push(box);
                }
            }
        }

        // Sort by row position (left first, then right)
        emptyBoxes.sort((a, b) => a.id.localeCompare(b.id));

        const suggestions: BoxFillSuggestion[] = [];
        let remaining = quantity;

        for (const box of emptyBoxes) {
            if (remaining <= 0) break;

            let suggestedQty: number;
            
            if (remaining >= box.capacity) {
                suggestedQty = box.capacity;
            } else {
                // Try to fill in optimal steps
                const optimalStep = OPTIMAL_FILL_STEPS.find(s => s >= remaining) || remaining;
                suggestedQty = Math.min(optimalStep, remaining);
            }

            suggestions.push({
                boxId: box.id,
                boxName: box.name,
                box,
                suggestedCount: suggestedQty,
                suggestedQuantity: suggestedQty,
                fillLevel: this.getFillLevel(suggestedQty, box.capacity),
                reason: `Empfohlen: ${suggestedQty} Schweine für Box ${box.name}`
            });

            remaining -= suggestedQty;
        }

        return suggestions;
    }

    private getFillLevel(quantity: number, capacity: number): BoxFillSuggestion['fillLevel'] {
        const ratio = quantity / capacity;
        if (ratio === 0) return 'empty';
        if (ratio < 0.5) return 'partial';
        if (ratio >= 1) return 'full';
        return 'optimal';
    }

    getSlaughterSuggestions(stallId: string): SlaughterSuggestion[] {
        const stall = this.getStall(stallId);
        
        if (!stall) return [];

        const allBatches: { box: Box; batch: PigBatch; daysInSystem: number }[] = [];

        for (const row of stall.rows) {
            for (const box of row.boxes) {
                if (box.currentBatch && box.currentBatch.quantity > 0) {
                    const daysInSystem = this.calculateDaysInSystem(box.currentBatch.checkInDate);
                    allBatches.push({
                        box,
                        batch: box.currentBatch,
                        daysInSystem
                    });
                }
            }
        }

        // Sort by days in system (oldest first)
        allBatches.sort((a, b) => b.daysInSystem - a.daysInSystem);

        const suggestions: SlaughterSuggestion[] = [];

        for (const item of allBatches) {
            const priority = this.getSlaughterPriority(item.daysInSystem);
            
            suggestions.push({
                boxId: item.box.id,
                box: item.box,
                batch: item.batch,
                daysInSystem: item.daysInSystem,
                priority,
                reason: this.getSlaughterReason(item.daysInSystem, priority),
                estimatedWeight: item.batch.currentWeight
            });
        }

        return suggestions;
    }

    async getSlaughterSuggestionsForQuantity(requiredQuantity: number): Promise<SlaughterSuggestion[]> {
        const stalls = await this.dbService.getAllDocs('stall') as Stall[];
        const finishingStalls = stalls.filter(s => s.stallType === 'finishing');
        
        const allBatches: { box: Box; batch: PigBatch; daysInSystem: number }[] = [];

        for (const stall of finishingStalls) {
            for (const row of stall.rows) {
                for (const box of row.boxes) {
                    if (box.currentBatch && box.currentBatch.quantity > 0) {
                        const daysInSystem = this.calculateDaysInSystem(box.currentBatch.checkInDate);
                        allBatches.push({
                            box,
                            batch: box.currentBatch,
                            daysInSystem
                        });
                    }
                }
            }
        }

        // Sort by days in system (oldest first)
        allBatches.sort((a, b) => b.daysInSystem - a.daysInSystem);

        const suggestions: SlaughterSuggestion[] = [];
        let remaining = requiredQuantity;

        for (const item of allBatches) {
            if (remaining <= 0) break;

            const priority = this.getSlaughterPriority(item.daysInSystem);
            
            suggestions.push({
                boxId: item.box.id,
                box: item.box,
                batch: item.batch,
                daysInSystem: item.daysInSystem,
                priority,
                reason: this.getSlaughterReason(item.daysInSystem, priority),
                estimatedWeight: item.batch.currentWeight
            });

            remaining -= item.batch.quantity;
        }

        return suggestions;
    }

    private getSlaughterReason(days: number, priority: SlaughterSuggestion['priority']): string {
        if (priority === 'high') {
            return `${days} Tage im System - Dringend zur Schlachtung empfohlen`;
        } else if (priority === 'medium') {
            return `${days} Tage im System - Baldige Schlachtung empfohlen`;
        }
        return `${days} Tage im System`;
    }

    private calculateDaysInSystem(checkInDate: string): number {
        const checkIn = new Date(checkInDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - checkIn.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    private getSlaughterPriority(days: number): SlaughterSuggestion['priority'] {
        if (days > 120) return 'high';
        if (days > 90) return 'medium';
        return 'low';
    }

    // ============================================
    // Logging & History
    // ============================================

    private async logEvent(event: Partial<StallLog>): Promise<void> {
        const log: StallLog = {
            type: 'stall-log',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            ...event
        } as StallLog;

        await this.dbService.addDoc(log);
    }

    getLogs(stallId?: string, boxId?: string, limit = 50): Observable<StallLog[]> {
        return (this.dbService.watchDocs('stall-log') as Observable<StallLog[]>).pipe(
            map(logs => {
                let filtered = logs;
                if (stallId) filtered = filtered.filter(l => l.stallId === stallId);
                if (boxId) filtered = filtered.filter(l => l.boxId === boxId);
                return filtered
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, limit);
            })
        );
    }

    // ============================================
    // Statistics
    // ============================================

    private getEmptyStats(): StallStats {
        return {
            totalPigs: 0,
            totalCapacity: 0,
            occupancyRate: 0,
            totalBoxes: 0,
            occupiedBoxes: 0,
            emptyBoxes: 0,
            averageDaysInSystem: 0,
            boxesWithMarkers: 0,
            pigsByStall: [],
            sickCount: 0,
            quarantineCount: 0,
            averageFatteningDays: 0,
            monthlyThroughput: 0,
            yearlyThroughput: 0,
            mortalityRate: 0,
            deathsThisMonth: 0,
            slaughtersThisMonth: 0
        };
    }

    getStallStats(stallId: string): StallStats {
        const stall = this.getStall(stallId);
        
        if (!stall) {
            return this.getEmptyStats();
        }
        
        let totalPigs = 0;
        let totalCapacity = 0;
        let sickCount = 0;
        let quarantineCount = 0;
        let totalBoxes = 0;
        let occupiedBoxes = 0;
        let emptyBoxes = 0;
        let boxesWithMarkers = 0;
        let totalDaysInSystem = 0;
        let batchCount = 0;

        for (const row of stall.rows) {
            for (const box of row.boxes) {
                totalBoxes++;
                if (!box.isLargeBox) totalCapacity += box.capacity;
                
                if (box.currentBatch) {
                    totalPigs += box.currentBatch.quantity;
                    occupiedBoxes++;
                    
                    // Calculate days in system
                    const daysInSystem = this.calculateDaysInSystem(box.currentBatch.checkInDate);
                    totalDaysInSystem += daysInSystem;
                    batchCount++;
                } else {
                    emptyBoxes++;
                }
                
                if (box.markers.length > 0) boxesWithMarkers++;
                if (box.markers.some(m => m.type === 'sick')) sickCount += box.currentBatch?.quantity || 0;
                if (box.markers.some(m => m.type === 'quarantine')) quarantineCount += box.currentBatch?.quantity || 0;
            }
        }

        const averageDaysInSystem = batchCount > 0 ? Math.round(totalDaysInSystem / batchCount) : 0;

        return {
            totalPigs,
            totalCapacity,
            occupancyRate: totalCapacity > 0 ? (totalPigs / totalCapacity) * 100 : 0,
            totalBoxes,
            occupiedBoxes,
            emptyBoxes,
            averageDaysInSystem,
            boxesWithMarkers,
            pigsByStall: [{
                stallId: stall._id,
                stallName: stall.name,
                count: totalPigs
            }],
            sickCount,
            quarantineCount,
            averageFatteningDays: averageDaysInSystem,
            monthlyThroughput: 0, // Would need logs query
            yearlyThroughput: 0,
            mortalityRate: 0,
            deathsThisMonth: 0,
            slaughtersThisMonth: 0
        };
    }

    async getStats(): Promise<StallStats> {
        const stalls = await this.dbService.getAllDocs('stall') as Stall[];
        const logs = await this.dbService.getAllDocs('stall-log') as StallLog[];

        let totalPigs = 0;
        let totalCapacity = 0;
        let sickCount = 0;
        let quarantineCount = 0;
        let totalBoxes = 0;
        let occupiedBoxes = 0;
        let emptyBoxes = 0;
        let boxesWithMarkers = 0;
        let totalDaysInSystem = 0;
        let batchCount = 0;
        const pigsByStall: StallStats['pigsByStall'] = [];

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        for (const stall of stalls) {
            let stallPigCount = 0;
            
            for (const row of stall.rows) {
                for (const box of row.boxes) {
                    totalBoxes++;
                    if (!box.isLargeBox) totalCapacity += box.capacity;
                    
                    if (box.currentBatch) {
                        totalPigs += box.currentBatch.quantity;
                        stallPigCount += box.currentBatch.quantity;
                        occupiedBoxes++;
                        
                        const daysInSystem = this.calculateDaysInSystem(box.currentBatch.checkInDate);
                        totalDaysInSystem += daysInSystem;
                        batchCount++;
                    } else {
                        emptyBoxes++;
                    }
                    
                    if (box.markers.length > 0) boxesWithMarkers++;
                    if (box.markers.some(m => m.type === 'sick')) sickCount += box.currentBatch?.quantity || 0;
                    if (box.markers.some(m => m.type === 'quarantine')) quarantineCount += box.currentBatch?.quantity || 0;
                }
            }
            
            pigsByStall.push({
                stallId: stall._id,
                stallName: stall.name,
                count: stallPigCount
            });
        }

        // Calculate throughput
        const slaughterLogs = logs.filter(l => l.eventType === 'slaughter');
        const monthlySlaughters = slaughterLogs.filter(l => new Date(l.timestamp) >= startOfMonth);
        const yearlySlaughters = slaughterLogs.filter(l => new Date(l.timestamp) >= startOfYear);
        
        const monthlyThroughput = monthlySlaughters.reduce((sum, l) => sum + (l.count || 0), 0);
        const yearlyThroughput = yearlySlaughters.reduce((sum, l) => sum + (l.count || 0), 0);

        // Calculate deaths
        const deathLogs = logs.filter(l => l.eventType === 'death');
        const deathsThisMonth = deathLogs.filter(l => new Date(l.timestamp) >= startOfMonth).length;

        // Calculate average fattening duration
        const averageDaysInSystem = batchCount > 0 ? Math.round(totalDaysInSystem / batchCount) : 0;

        // Mortality rate
        const totalDeaths = deathLogs.length;
        const totalCheckIns = logs.filter(l => l.eventType === 'check-in').reduce((sum, l) => sum + (l.count || 0), 0);
        const mortalityRate = totalCheckIns > 0 ? (totalDeaths / totalCheckIns) * 100 : 0;

        return {
            totalPigs,
            totalCapacity,
            occupancyRate: totalCapacity > 0 ? (totalPigs / totalCapacity) * 100 : 0,
            totalBoxes,
            occupiedBoxes,
            emptyBoxes,
            averageDaysInSystem,
            boxesWithMarkers,
            pigsByStall,
            sickCount,
            quarantineCount,
            averageFatteningDays: averageDaysInSystem,
            monthlyThroughput,
            yearlyThroughput,
            mortalityRate: Math.round(mortalityRate * 100) / 100,
            deathsThisMonth,
            slaughtersThisMonth: monthlyThroughput
        };
    }
}
