import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Box, BoxFillSuggestion, Stall } from '../../../../core/models';
import { StallService } from '../../../../core/services/stall.service';

export interface CheckInDialogData {
    stall: Stall;
    preselectedBoxId?: string;
}

export interface CheckInDialogResult {
    boxId: string; // Deprecated, use boxIds when possible
    boxIds: string[];
    count: number;
    batchId: string;
    origin: string;
    notes?: string;
}

@Component({
    selector: 'app-check-in-dialog',
    templateUrl: './check-in-dialog.html',
    styleUrl: './check-in-dialog.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatStepperModule,
        MatChipsModule,
        MatProgressBarModule,
        MatTooltipModule,
        MatSnackBarModule
    ]
})
export class CheckInDialogComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<CheckInDialogComponent>);
    private readonly data = inject<CheckInDialogData>(MAT_DIALOG_DATA);
    private readonly stallService = inject(StallService);
    private readonly fb = inject(FormBuilder);
    private readonly snackBar = inject(MatSnackBar);

    readonly stall = signal(this.data.stall);
    readonly suggestions = signal<BoxFillSuggestion[]>([]);
    readonly selectedBoxIds = signal<string[]>(this.data.preselectedBoxId ? [this.data.preselectedBoxId] : []);

    readonly batchForm = this.fb.group({
        batchId: ['', Validators.required],
        totalCount: [0, [Validators.required, Validators.min(1)]],
        origin: ['', Validators.required],
        notes: ['']
    });

    readonly allBoxes = computed(() => {
        return this.stall().rows.flatMap(r => r.boxes);
    });

    readonly availableBoxes = computed(() => {
        return this.allBoxes().filter(b => b.status === 'empty' || b.currentCount < b.capacity);
    });

    readonly selectedBoxes = computed(() => {
        const ids = this.selectedBoxIds();
        return this.allBoxes().filter(b => ids.includes(b.id));
    });

    readonly totalCapacitySelected = computed(() => {
        return this.selectedBoxes().reduce((sum, box) => sum + (box.capacity - box.currentCount), 0);
    });

    readonly remainingPigs = computed(() => {
        const total = this.batchForm.get('totalCount')?.value ?? 0;
        return total;
    });

    ngOnInit(): void {
        this.loadSuggestions();
        this.generateBatchId();
    }

    private generateBatchId(): void {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.batchForm.patchValue({ batchId: `B${dateStr}-${random}` });
    }

    private loadSuggestions(): void {
        const sug = this.stallService.getAutoFillSuggestions(this.stall().id); 
        this.suggestions.set(sug);
    }

    selectBox(boxId: string): void {
        this.selectedBoxIds.update(ids => {
            if (ids.includes(boxId)) {
                return ids.filter(id => id !== boxId);
            } else {
                return [...ids, boxId];
            }
        });
    }

    isSuggested(boxId: string): boolean {
        return this.suggestions().some(s => s.boxId === boxId);
    }

    getSuggestionReason(boxId: string): string {
        const sug = this.suggestions().find(s => s.boxId === boxId);
        return sug?.reason ?? '';
    }

    getBoxFillLevel(box: Box): number {
        return box.currentCount / box.capacity;
    }

    getBoxFillColor(box: Box): string {
        const level = this.getBoxFillLevel(box);
        if (level === 0) return 'primary';
        if (level < 0.5) return 'primary';
        if (level < 0.8) return 'accent';
        return 'warn';
    }

    async checkIn(): Promise<void> {
        if (this.batchForm.invalid || this.selectedBoxIds().length === 0) return;

        const { batchId, totalCount, origin, notes } = this.batchForm.getRawValue();
        const boxes = this.selectedBoxes();
        
        if (boxes.length === 0) return;

        let pigsToDistribute = totalCount!;
        const boxIdsUsed: string[] = [];
        const allocations: { boxId: string; quantity: number }[] = [];

        try {
            // Calculate allocations first
            for (const box of boxes) {
                if (pigsToDistribute <= 0) break;

                const availableSpace = box.capacity - box.currentCount;
                if (availableSpace <= 0) continue;

                const countForThisBox = Math.min(pigsToDistribute, availableSpace);

                allocations.push({
                    boxId: box.id,
                    quantity: countForThisBox
                });
                
                boxIdsUsed.push(box.id);
                pigsToDistribute -= countForThisBox;
            }

            if (allocations.length === 0) {
                 this.snackBar.open('Keine Kapazität in den ausgewählten Boxen verfügbar.', 'OK', { duration: 3000 });
                 return;
            }

            // Perform single batch update
            await this.stallService.checkInBatch(
                this.stall().id,
                allocations,
                {
                    batchId: batchId!,
                    origin: origin!,
                    notes: notes ?? undefined
                }
            );

            const successMessage = pigsToDistribute > 0 
                ? `Eingestallt in ${boxIdsUsed.length} Boxen. ${pigsToDistribute} Schweine übrig.` 
                : `${totalCount} Schweine erfolgreich eingestallt.`;

            this.snackBar.open(successMessage, 'OK', { duration: 4000 });

            this.dialogRef.close({
                boxId: boxIdsUsed[0], 
                boxIds: boxIdsUsed,
                count: totalCount! - pigsToDistribute,
                batchId: batchId!,
                origin: origin!,
                notes: notes ?? undefined
            } as CheckInDialogResult);
            
        } catch (error) {
            console.error('Check-in failed:', error);
            this.snackBar.open(
                error instanceof Error ? error.message : 'Fehler beim Einstallen',
                'Schließen',
                { duration: 5000, panelClass: ['error-snackbar'] }
            );
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
