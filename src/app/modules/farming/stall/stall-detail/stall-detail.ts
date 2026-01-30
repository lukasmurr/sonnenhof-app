import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Box, Stall, StallRow, BoxMarker, BoxMarkerType, PigBatch } from '../../../../core/models/stall.model';
import { StallService } from '../../../../core/services/stall.service';
import { NfcService } from '../../../../core/services/nfc.service';
import { BoxDetailDialogComponent } from '../box-detail-dialog/box-detail-dialog';
import { CheckInDialogComponent } from '../check-in-dialog/check-in-dialog';
import { SlaughterDialogComponent } from '../slaughter-dialog/slaughter-dialog';
import { ConfirmationDialogComponent } from '../../../../core/components/confirmation-dialog/confirmation-dialog';

@Component({
    selector: 'app-stall-detail',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatDialogModule,
        MatMenuModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatChipsModule,
        MatProgressBarModule,
        MatBadgeModule
    ],
    templateUrl: './stall-detail.html',
    styleUrls: ['./stall-detail.scss']
})
export class StallDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private stallService = inject(StallService);
    private nfcService = inject(NfcService);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    stallId = signal<string | null>(null);
    stall = signal<Stall | null>(null);

    isTransferMode = computed(() => this.stallService.isTransferMode());
    currentTransfer = computed(() => this.stallService.currentTransfer());
    nfcSupported = computed(() => this.nfcService.isSupported());
    nfcScanning = computed(() => this.nfcService.isScanning());

    slaughterSuggestionIds = signal<string[]>([]);

    constructor() {
        // Subscribe to NFC tag scans for transfer mode
        this.nfcService.onTagScanned.subscribe(tagData => {
            if (this.isTransferMode() && tagData.stallId === this.stallId()) {
                this.handleTransferTarget(tagData.boxId);
            }
        });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        this.stallId.set(id);
        
        if (id) {
            this.loadStall(id);
        }
    }

    private loadStall(id: string): void {
        const stall = this.stallService.getStall(id);
        if (stall) {
            this.stall.set(stall);
            
            // Get slaughter suggestions for finishing stalls
            if (stall.stallType === 'finishing') {
                this.loadSlaughterSuggestions(id);
            }
        }
    }

    private loadSlaughterSuggestions(stallId: string): void {
        const suggestions = this.stallService.getSlaughterSuggestions(stallId);
        const ids = suggestions.filter(s => s.priority === 'high').map(s => s.box.id);
        this.slaughterSuggestionIds.set(ids);
    }

    goBack(): void {
        if (this.isTransferMode()) {
            this.stallService.cancelTransfer();
            this.snackBar.open('Transfer abgebrochen', 'OK', { duration: 2000 });
        }
        this.router.navigate(['/farming/stall']);
    }

    // ============================================
    // Box Actions
    // ============================================

    openBoxDetail(box: Box): void {
        if (this.isTransferMode()) {
            this.handleTransferTarget(box.id);
            return;
        }

        const dialogRef = this.dialog.open(BoxDetailDialogComponent, {
            width: '600px',
            maxWidth: '95vw',
            data: { stallId: this.stallId(), box }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.reload) {
                this.loadStall(this.stallId()!);
            }
        });
    }

    openCheckInDialog(box: Box, event: Event): void {
        event.stopPropagation();
        
        if (!this.stall() || this.stall()!.stallType !== 'pre-fattening') {
            this.snackBar.open('Einstallen nur in Vormast möglich', 'OK', { duration: 3000 });
            return;
        }

        const dialogRef = this.dialog.open(CheckInDialogComponent, {
            width: '600px',
            maxWidth: '95vw',
            data: { stall: this.stall(), preselectedBoxId: box.id }
        });

        // Force a refresh of the stall data after check-in, as it modifies the stall document
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Wait a moment for DB write to complete propagation
                setTimeout(() => {
                    this.loadStall(this.stallId()!);
                }, 100);
            }
        });
    }

    startTransfer(box: Box, event: Event): void {
        event.stopPropagation();
        
        if (!box.currentBatch || box.currentBatch.quantity === 0) {
            this.snackBar.open('Keine Schweine zum Umstallen', 'OK', { duration: 2000 });
            return;
        }

        this.stallService.startTransfer(this.stallId()!, box.id, box.currentBatch);
        
        // Try to start NFC scanning
        if (this.nfcSupported()) {
            this.nfcService.startScanning();
        }

        this.snackBar.open('Wähle Zielbox oder scanne NFC-Tag', 'Abbrechen', { duration: 10000 })
            .onAction()
            .subscribe(() => this.cancelTransfer());
    }

    private handleTransferTarget(targetBoxId: string): void {
        const stall = this.stall();
        if (!stall) return;

        const targetBox = this.findBox(stall, targetBoxId);
        if (!targetBox) {
            this.snackBar.open('Zielbox nicht gefunden', 'OK', { duration: 2000 });
            return;
        }

        if (targetBox.currentBatch && targetBox.currentBatch.quantity > 0) {
            this.snackBar.open('Zielbox ist bereits belegt', 'OK', { duration: 2000 });
            return;
        }

        if (targetBoxId === this.currentTransfer().sourceBoxId) {
            this.cancelTransfer();
            return;
        }

        this.stallService.completeTransfer(this.stallId()!, targetBoxId)
            .then(() => {
                this.loadStall(this.stallId()!);
                this.snackBar.open('Transfer erfolgreich', 'OK', { duration: 2000 });
            })
            .catch(err => {
                this.snackBar.open(err.message || 'Transfer fehlgeschlagen', 'OK', { duration: 3000 });
            });
    }

    cancelTransfer(): void {
        this.stallService.cancelTransfer();
        this.nfcService.stopScanning();
        this.snackBar.open('Transfer abgebrochen', 'OK', { duration: 2000 });
    }

    openSlaughterDialog(box: Box, event: Event): void {
        event.stopPropagation();
        
        if (!box.currentBatch || box.currentBatch.quantity === 0) {
            this.snackBar.open('Keine Schweine zum Schlachten', 'OK', { duration: 2000 });
            return;
        }

        const dialogRef = this.dialog.open(SlaughterDialogComponent, {
            width: '400px',
            data: { stallId: this.stallId(), box }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.success) {
                this.loadStall(this.stallId()!);
                this.snackBar.open(`${result.quantity} Schweine geschlachtet`, 'OK', { duration: 2000 });
            }
        });
    }

    // ============================================
    // Helper Methods
    // ============================================

    private findBox(stall: Stall, boxId: string): Box | null {
        for (const row of stall.rows) {
            const box = row.boxes.find(b => b.id === boxId);
            if (box) return box;
        }
        return null;
    }

    getBoxFillPercentage(box: Box): number {
        if (!box.currentBatch || box.isLargeBox) return 0;
        return (box.currentBatch.quantity / box.capacity) * 100;
    }

    getBoxColorClass(box: Box): string {
        if (this.isTransferMode()) {
            const transfer = this.currentTransfer();
            if (transfer.sourceBoxId === box.id) return 'transfer-source';
            if (!box.currentBatch || box.currentBatch.quantity === 0) return 'transfer-target';
            return 'transfer-disabled';
        }

        if (box.status === 'needs-cleaning') return 'needs-cleaning';
        if (!box.currentBatch || box.currentBatch.quantity === 0) return 'empty';
        
        const fill = this.getBoxFillPercentage(box);
        if (fill >= 100) return 'full';
        if (fill >= 66) return 'high';
        if (fill >= 33) return 'medium';
        return 'low';
    }

    isSlaughterRecommended(box: Box): boolean {
        return this.slaughterSuggestionIds().includes(box.id);
    }

    hasMarkers(box: Box): boolean {
        return box.markers.length > 0;
    }

    getMarkerIcon(marker: BoxMarker): string {
        const icons: Record<BoxMarkerType, string> = {
            'sick': 'healing',
            'tail-biters': 'warning',
            'cannibalism': 'dangerous',
            'quarantine': 'coronavirus',
            'health': 'favorite',
            'treatment': 'medication',
            'attention': 'priority_high',
            'custom': 'info'
        };
        return icons[marker.type] || 'info';
    }

    getMarkerLabel(marker: BoxMarker): string {
        const labels: Record<BoxMarkerType, string> = {
            'sick': 'Krank',
            'tail-biters': 'Schwanzbeißer',
            'cannibalism': 'Kannibalismus',
            'quarantine': 'Quarantäne',
            'health': 'Gesundheit',
            'treatment': 'Behandlung',
            'attention': 'Achtung',
            'custom': 'Sonstige'
        };
        return labels[marker.type] || marker.type;
    }

    getDaysInStall(batch: PigBatch | null): number {
        if (!batch) return 0;
        const checkIn = new Date(batch.checkInDate);
        const now = new Date();
        return Math.ceil((now.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }

    getPigIcons(quantity: number): number[] {
        const count = Math.min(quantity, 21);
        return Array(count).fill(0);
    }

    // Helper for Math in template
    readonly Math = Math;
}
