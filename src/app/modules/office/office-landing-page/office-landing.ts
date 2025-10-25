import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-office-landing',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
    templateUrl: './office-landing.html',
    styleUrls: ['./office-landing.scss']
})
export class OfficeLanding {
    constructor(private router: Router) { }

    navigateToSection(section: string) {
        this.router.navigate(['/office', section]);
    }

    goBack() {
        this.router.navigate(['/landing']);
    }
}
