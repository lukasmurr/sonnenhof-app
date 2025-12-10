
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

@Component({
    selector: 'app-farming-landing',
    standalone: true,
    imports: [MatCardModule, MatIconModule, MatButtonModule, HasPermissionDirective],
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
