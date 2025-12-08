import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Stall } from '../../../../core/models/stall.model';
import { StallService } from '../../../../core/services/stall.service';

@Component({
    selector: 'app-stall-overview',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    templateUrl: './stall-overview.html',
    styleUrls: ['./stall-overview.scss']
})
export class StallOverviewComponent implements OnInit {
    stalls$: Observable<Stall[]>;

    constructor(private stallService: StallService, private router: Router) {
        this.stalls$ = this.stallService.getStalls();
    }

    ngOnInit(): void {
    }

    openStall(stallId: string): void {
        this.router.navigate(['/farming/stall', stallId]);
    }

    getTotalPigs(stall: Stall): number {
        return stall.boxes.reduce((sum, box) => sum + box.pigs.length, 0);
    }

    getOccupiedBoxes(stall: Stall): number {
        return stall.boxes.filter(box => box.pigs.length > 0).length;
    }
    
    goBack(): void {
        this.router.navigate(['/farming']);
    }
}
