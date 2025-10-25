import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-farming-landing',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    templateUrl: './farming-landing.html',
    styleUrls: ['./farming-landing.scss']
})
export class FarmingLanding {
    constructor(private router: Router) { }

    navigateToSection(section: string) {
        this.router.navigate(['/farming', section]);
    }

    goBack() {
        this.router.navigate(['/landing']);
    }
}
