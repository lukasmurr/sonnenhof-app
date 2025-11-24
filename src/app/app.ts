import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UserService } from './core/services/user.service';
import { ChangePasswordDialogComponent } from './modules/settings/change-password-dialog/change-password-dialog';

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
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('sonnenhof-management-ui');
  private router = inject(Router);
  public authService = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
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

  public openChangePasswordDialog(): void {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        const email = this.authService.getCurrentUser();
        if (email) {
          try {
            const success = await this.userService.changePassword(email, result.currentPassword, result.newPassword);
            if (success) {
              this.snackBar.open('Passwort erfolgreich geändert', 'OK', { duration: 3000 });
            } else {
              this.snackBar.open('Aktuelles Passwort ist falsch', 'OK', { duration: 3000, panelClass: ['error-snackbar'] });
            }
          } catch (error) {
            this.snackBar.open('Fehler beim Ändern des Passworts', 'OK', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        }
      }
    });
  }
}
