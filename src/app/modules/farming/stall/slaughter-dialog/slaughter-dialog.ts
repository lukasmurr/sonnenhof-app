import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Box, SlaughterSuggestion, Stall } from '../../../../core/models';
import { StallService } from '../../../../core/services/stall.service';

export interface SlaughterDialogData {
    stall: Stall;
}

export interface SlaughterDialogResult {
    boxes: { boxId: string; count: number }[];
    totalCount: number;
    notes?: string;
}

interface BoxSelection {
    box: Box;
    selected: boolean;
    count: number;
    daysInSystem: number;
    isSuggested: boolean;
    suggestion?: SlaughterSuggestion;
}

@Component({
    selector: 'app-slaughter-dialog',
    templateUrl: './slaughter-dialog.html',
    styleUrl: './slaughter-dialog.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatChipsModule,
        MatTooltipModule,
        MatDividerModule
    ]
})
export class SlaughterDialogComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<SlaughterDialogComponent>);
    private readonly data = inject<SlaughterDialogData>(MAT_DIALOG_DATA);
    private readonly stallService = inject(StallService);
    private readonly fb = inject(FormBuilder);

    readonly stall = signal(this.data.stall);
    readonly boxSelections = signal<BoxSelection[]>([]);
    readonly suggestions = signal<SlaughterSuggestion[]>([]);

    readonly notesControl = this.fb.control('');

    readonly selectedBoxes = computed(() => {
        return this.boxSelections().filter(bs => bs.selected);
    });

    readonly totalSelectedCount = computed(() => {
        return this.selectedBoxes().reduce((sum, bs) => sum + bs.count, 0);
    });

    readonly hasSelection = computed(() => {
        return this.selectedBoxes().length > 0;
    });

    ngOnInit(): void {
        this.loadSuggestions();
    }

    private loadSuggestions(): void {
        const sug = this.stallService.getSlaughterSuggestions(this.stall().id);
        this.suggestions.set(sug);
        this.initializeBoxSelections();
    }

    private initializeBoxSelections(): void {
        const allBoxes = this.stall().rows.flatMap(r => r.boxes);
        const occupiedBoxes = allBoxes.filter(b => b.currentCount > 0 && b.currentBatch);
        const now = new Date();

        const selections = occupiedBoxes.map(box => {
            const arrivalDate = new Date(box.currentBatch!.arrivalDate);
            const daysInSystem = Math.floor((now.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
            const suggestion = this.suggestions().find(s => s.boxId === box.id);

            return {
                box,
                selected: false,
                count: box.currentCount,
                daysInSystem,
                isSuggested: !!suggestion,
                suggestion
            };
        });

        // Sort: suggested first, then by days in system (descending)
        selections.sort((a, b) => {
            if (a.isSuggested && !b.isSuggested) return -1;
            if (!a.isSuggested && b.isSuggested) return 1;
            return b.daysInSystem - a.daysInSystem;
        });

        this.boxSelections.set(selections);
    }

    toggleSelection(index: number): void {
        this.boxSelections.update(selections => {
            const updated = [...selections];
            updated[index] = {
                ...updated[index],
                selected: !updated[index].selected
            };
            return updated;
        });
    }

    updateCount(index: number, count: number): void {
        this.boxSelections.update(selections => {
            const updated = [...selections];
            const max = updated[index].box.currentCount;
            updated[index] = {
                ...updated[index],
                count: Math.max(1, Math.min(count, max))
            };
            return updated;
        });
    }

    selectAllSuggested(): void {
        this.boxSelections.update(selections => {
            return selections.map(s => ({
                ...s,
                selected: s.isSuggested
            }));
        });
    }

    selectAll(): void {
        this.boxSelections.update(selections => {
            return selections.map(s => ({
                ...s,
                selected: true
            }));
        });
    }

    clearSelection(): void {
        this.boxSelections.update(selections => {
            return selections.map(s => ({
                ...s,
                selected: false
            }));
        });
    }

    getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
        const colors = {
            high: '#e53935',
            medium: '#fb8c00',
            low: '#43a047'
        };
        return colors[priority];
    }

    getPriorityLabel(priority: 'high' | 'medium' | 'low'): string {
        const labels = {
            high: 'Hoch',
            medium: 'Mittel',
            low: 'Niedrig'
        };
        return labels[priority];
    }

    async confirmSlaughter(): Promise<void> {
        if (!this.hasSelection()) return;

        const selected = this.selectedBoxes();
        const boxes = selected.map(bs => ({
            boxId: bs.box.id,
            count: bs.count
        }));

        // Perform slaughter for each selected box
        for (const bs of selected) {
            await this.stallService.slaughterPigs(
                this.stall().id,
                bs.box.id,
                bs.count
            );
        }

        this.dialogRef.close({
            boxes,
            totalCount: this.totalSelectedCount(),
            notes: this.notesControl.value ?? undefined
        } as SlaughterDialogResult);
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
