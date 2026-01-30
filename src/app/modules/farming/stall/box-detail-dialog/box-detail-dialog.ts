import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Box, BoxMarker, BoxMarkerType, BoxStatus, LogEventType, StallLog } from '../../../../core/models';
import { StallService } from '../../../../core/services/stall.service';

export interface BoxDetailDialogData {
    stallId: string;
    box: Box;
    logs?: StallLog[];
}

@Component({
    selector: 'app-box-detail-dialog',
    templateUrl: './box-detail-dialog.html',
    styleUrl: './box-detail-dialog.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        MatListModule,
        MatProgressBarModule
    ]
})
export class BoxDetailDialogComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<BoxDetailDialogComponent>);
    private readonly data = inject<BoxDetailDialogData>(MAT_DIALOG_DATA);
    private readonly stallService = inject(StallService);
    private readonly fb = inject(FormBuilder);

    readonly box = signal(this.data.box);
    readonly logs = signal<StallLog[]>(this.data.logs ?? []);
    readonly stallId = this.data.stallId;

    ngOnInit() {
        if (!this.data.logs) {
            this.loadLogs();
        }
    }

    private loadLogs() {
        this.stallService.getLogs(this.stallId, this.box().id).subscribe(logs => {
            this.logs.set(logs);
        });
    }

    readonly markerForm = this.fb.group({
        type: ['health' as BoxMarkerType, Validators.required],
        description: ['', Validators.required]
    });

    readonly removePigForm = this.fb.group({
        count: [1, [Validators.required, Validators.min(1)]],
        reason: ['death' as 'death' | 'transfer', Validators.required]
    });

    readonly fillLevel = computed(() => {
        const b = this.box();
        return b.currentCount / b.capacity;
    });

    readonly fillColor = computed(() => {
        const level = this.fillLevel();
        if (level === 0) return 'primary';
        if (level < 0.5) return 'primary';
        if (level < 0.8) return 'accent';
        return 'warn';
    });

    readonly daysInSystem = computed(() => {
        const batch = this.box().currentBatch;
        if (!batch) return null;
        const now = new Date();
        const arrival = new Date(batch.arrivalDate || batch.checkInDate);
        return Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    });

    readonly markerTypes: { value: BoxMarkerType; label: string; icon: string }[] = [
        { value: 'health', label: 'Gesundheit', icon: 'medical_services' },
        { value: 'treatment', label: 'Behandlung', icon: 'vaccines' },
        { value: 'attention', label: 'Aufmerksamkeit', icon: 'warning' },
        { value: 'sick', label: 'Krank', icon: 'sick' },
        { value: 'quarantine', label: 'Quarantäne', icon: 'shield' },
        { value: 'tail-biters', label: 'Schwanzbeißer', icon: 'warning_amber' },
        { value: 'cannibalism', label: 'Kannibalismus', icon: 'dangerous' },
        { value: 'custom', label: 'Sonstiges', icon: 'flag' }
    ];

    getMarkerIcon(type: BoxMarkerType): string {
        const marker = this.markerTypes.find(m => m.value === type);
        return marker?.icon ?? 'flag';
    }

    getMarkerLabel(type: BoxMarkerType): string {
        const marker = this.markerTypes.find(m => m.value === type);
        return marker?.label ?? type;
    }

    getStatusLabel(status: BoxStatus): string {
        const labels: Record<BoxStatus, string> = {
            'empty': 'Leer',
            'active': 'Aktiv',
            'occupied': 'Belegt',
            'needs-cleaning': 'Reinigung nötig',
            'maintenance': 'Wartung'
        };
        return labels[status];
    }

    getLogIcon(eventType: LogEventType): string {
        const icons: Record<LogEventType, string> = {
            'check-in': 'login',
            'transfer': 'swap_horiz',
            'transfer-in': 'arrow_forward',
            'transfer-out': 'arrow_back',
            'slaughter': 'content_cut',
            'death': 'sentiment_very_dissatisfied',
            'marker-added': 'add_circle',
            'marker-removed': 'remove_circle',
            'status-changed': 'sync'
        };
        return icons[eventType] ?? 'info';
    }

    getLogLabel(eventType: LogEventType): string {
        const labels: Record<LogEventType, string> = {
            'check-in': 'Einstallen',
            'transfer': 'Umstallen',
            'transfer-in': 'Transfer rein',
            'transfer-out': 'Transfer raus',
            'slaughter': 'Schlachtung',
            'death': 'Abgang',
            'marker-added': 'Markierung hinzugefügt',
            'marker-removed': 'Markierung entfernt',
            'status-changed': 'Status geändert'
        };
        return labels[eventType] ?? eventType;
    }

    formatDate(date: Date | string): string {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async addMarker(): Promise<void> {
        if (this.markerForm.invalid) return;

        const { type, description } = this.markerForm.getRawValue();
        const marker: BoxMarker = {
            id: crypto.randomUUID(),
            type: type!,
            description: description!,
            createdAt: new Date(),
            createdBy: 'current-user' // TODO: Get from auth service
        };

        const updatedBox: Box = {
            ...this.box(),
            markers: [...this.box().markers, marker]
        };

        await this.stallService.updateBox(this.stallId, updatedBox);
        this.box.set(updatedBox);
        this.markerForm.reset({ type: 'health', description: '' });
    }

    async removeMarker(markerId: string): Promise<void> {
        const updatedBox: Box = {
            ...this.box(),
            markers: this.box().markers.filter(m => m.id !== markerId)
        };

        await this.stallService.updateBox(this.stallId, updatedBox);
        this.box.set(updatedBox);
    }

    async removePigs(): Promise<void> {
        if (this.removePigForm.invalid) return;
        
        const { count, reason } = this.removePigForm.getRawValue();
        
        if (reason === 'death') {
            // Remove pigs one by one (removePig removes 1 at a time)
            for (let i = 0; i < count!; i++) {
                await this.stallService.removePig(this.stallId, this.box().id, 'unknown');
            }
        }
        
        // Refresh box data
        const updatedStall = this.stallService.getStall(this.stallId);
        if (updatedStall) {
            const updatedBox = updatedStall.rows
                .flatMap((r: { boxes: Box[] }) => r.boxes)
                .find((b: Box) => b.id === this.box().id);
            if (updatedBox) {
                this.box.set(updatedBox);
            }
        }
        
        this.removePigForm.reset({ count: 1, reason: 'death' });
    }

    startTransfer(): void {
        this.dialogRef.close({ action: 'transfer', box: this.box() });
    }

    close(): void {
        this.dialogRef.close();
    }
}
