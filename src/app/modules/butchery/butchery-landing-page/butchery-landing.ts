import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
    selector: 'app-butchery-landing',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    templateUrl: './butchery-landing.html',
    styleUrls: ['./butchery-landing.scss']
})
export class ButcheryLanding {
    constructor(private router: Router) { }

    public navigateToSection(section: string): void {
        this.router.navigate(['/butchery', section]);
    }

    public goBack(): void {
        this.router.navigate(['/landing']);
    }
}
