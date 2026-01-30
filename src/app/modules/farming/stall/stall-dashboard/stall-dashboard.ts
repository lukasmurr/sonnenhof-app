import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Stall, StallStats, SlaughterSuggestion, BoxFillSuggestion } from '../../../../core/models';
import { StallService } from '../../../../core/services/stall.service';

interface StallSummary {
    stall: Stall;
    stats: StallStats;
    fillSuggestions: BoxFillSuggestion[];
    slaughterSuggestions: SlaughterSuggestion[];
}

@Component({
    selector: 'app-stall-dashboard',
    templateUrl: './stall-dashboard.html',
    styleUrl: './stall-dashboard.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatProgressBarModule,
        MatChipsModule,
        MatTooltipModule,
        MatDividerModule
    ]
})
export class StallDashboardComponent implements OnInit {
    private readonly stallService = inject(StallService);

    readonly stalls = signal<Stall[]>([]);
    readonly stallSummaries = signal<StallSummary[]>([]);

    readonly totalPigs = computed(() => {
        return this.stallSummaries().reduce((sum, s) => sum + s.stats.totalPigs, 0);
    });

    readonly totalCapacity = computed(() => {
        return this.stallSummaries().reduce((sum, s) => sum + s.stats.totalCapacity, 0);
    });

    readonly overallOccupancy = computed(() => {
        const capacity = this.totalCapacity();
        return capacity > 0 ? (this.totalPigs() / capacity) * 100 : 0;
    });

    readonly totalSlaughterReady = computed(() => {
        return this.stallSummaries().reduce((sum, s) => sum + s.slaughterSuggestions.length, 0);
    });

    readonly totalEmptyBoxes = computed(() => {
        return this.stallSummaries().reduce((sum, s) => sum + s.stats.emptyBoxes, 0);
    });

    readonly averageDaysInSystem = computed(() => {
        const summaries = this.stallSummaries();
        if (summaries.length === 0) return 0;
        const totalDays = summaries.reduce((sum, s) => sum + s.stats.averageDaysInSystem, 0);
        return Math.round(totalDays / summaries.length);
    });

    ngOnInit(): void {
        this.loadData();
    }

    private loadData(): void {
        const stalls = this.stallService.getAllStalls();
        this.stalls.set(stalls);

        const summaries: StallSummary[] = stalls.map(stall => ({
            stall,
            stats: this.stallService.getStallStats(stall.id),
            fillSuggestions: this.stallService.getAutoFillSuggestions(stall.id),
            slaughterSuggestions: this.stallService.getSlaughterSuggestions(stall.id)
        }));

        this.stallSummaries.set(summaries);
    }

    getOccupancyColor(percentage: number): string {
        if (percentage < 50) return 'primary';
        if (percentage < 80) return 'accent';
        return 'warn';
    }

    getStallTypeLabel(type: 'pre-fattening' | 'finishing'): string {
        return type === 'pre-fattening' ? 'Vormast' : 'Endmast';
    }

    getStallTypeIcon(type: 'pre-fattening' | 'finishing'): string {
        return type === 'pre-fattening' ? 'child_care' : 'pets';
    }

    formatPercentage(value: number): string {
        return value.toFixed(1) + '%';
    }

    refresh(): void {
        this.loadData();
    }
}
