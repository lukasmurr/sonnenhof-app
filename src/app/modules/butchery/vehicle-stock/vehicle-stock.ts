import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';

@Component({
    selector: 'app-vehicle-stock',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        RouterModule
    ],
    templateUrl: './vehicle-stock.html',
    styleUrls: ['./vehicle-stock.scss']
})
export class VehicleStockComponent {
    constructor(private router: Router) { }

    goBack() {
        this.router.navigate(['/butchery']);
    }
}
