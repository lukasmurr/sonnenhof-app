import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-butchery-landing',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    templateUrl: './butchery-landing.html',
    styleUrls: ['./butchery-landing.scss']
})
export class ButcheryLanding {
    constructor(private router: Router) { }

    navigateToSection(section: string) {
        this.router.navigate(['/butchery', section]);
    }

    goBack() {
        this.router.navigate(['/landing']);
    }
}
