import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { Stall, StallStats } from '../../../../core/models/stall.model';
import { StallService } from '../../../../core/services/stall.service';

interface StallWithStats {
    stall: Stall;
    stats: StallStats;
    slaughterCount: number;
    fillSuggestionCount: number;
}

@Component({
    selector: 'app-stall-overview',
    imports: [
        RouterModule,
        MatCardModule, 
        MatIconModule, 
        MatButtonModule,
        MatProgressBarModule,
        MatChipsModule,
        MatTooltipModule
    ],
    templateUrl: './stall-overview.html',
    styleUrls: ['./stall-overview.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StallOverviewComponent implements OnInit {
    private readonly stallService = inject(StallService);
    private readonly router = inject(Router);

    readonly stallsWithStats = signal<StallWithStats[]>([]);

    readonly totalPigs = computed(() => {
        return this.stallsWithStats().reduce((sum, s) => sum + s.stats.totalPigs, 0);
    });

    readonly totalCapacity = computed(() => {
        return this.stallsWithStats().reduce((sum, s) => sum + s.stats.totalCapacity, 0);
    });

    ngOnInit(): void {
        this.loadStalls();
    }

    private loadStalls(): void {
        const stalls = this.stallService.getAllStalls();
        const stallsWithStats: StallWithStats[] = stalls.map(stall => ({
            stall,
            stats: this.stallService.getStallStats(stall.id),
            slaughterCount: this.stallService.getSlaughterSuggestions(stall.id).length,
            fillSuggestionCount: this.stallService.getAutoFillSuggestions(stall.id).length
        }));
        
        this.stallsWithStats.set(stallsWithStats);
    }

    openStall(stallId: string): void {
        this.router.navigate(['/farming/stall', stallId]);
    }

    getStallTypeLabel(type: 'pre-fattening' | 'finishing'): string {
        return type === 'pre-fattening' ? 'Vormast' : 'Endmast';
    }

    getStallTypeIcon(type: 'pre-fattening' | 'finishing'): string {
        return type === 'pre-fattening' ? 'child_care' : 'pets';
    }

    getOccupancyColor(rate: number): string {
        const percentage = rate * 100;
        if (percentage < 50) return 'primary';
        if (percentage < 80) return 'accent';
        return 'warn';
    }

    formatPercentage(rate: number): string {
        return (rate * 100).toFixed(1) + '%';
    }

    goBack(): void {
        this.router.navigate(['/farming']);
    }

    refresh(): void {
        this.loadStalls();
    }
}
