import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
    selector: 'app-farming-landing',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    templateUrl: './farming-landing.html',
    styleUrls: ['./farming-landing.scss']
})
export class FarmingLanding {
    constructor(private router: Router) { }

    public navigateToSection(section: string): void {
        this.router.navigate(['/farming', section]);
    }

    public goBack(): void {
        this.router.navigate(['/landing']);
    }
}
