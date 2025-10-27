import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('sonnenhof-management-ui');
  private router = inject(Router);
  private authService = inject(AuthService);
  protected showToolbar = signal(false);

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Toolbar wird nicht auf Login-Seite angezeigt
        this.showToolbar.set(event.url !== '/login');
      });
  }

  public navigateHome(): void {
    this.router.navigate(['/landing']);
  }

  public navigateSettings(): void {
    this.router.navigate(['/settings']);
  }

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  public profile(): void {
    console.log('Profile opened');
  }
}
