import { Injectable, signal } from '@angular/core';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(this.checkAuthStatus());
  private userRoleSignal = signal<string | null>(this.getUserRoleFromStorage());
  private userNameSignal = signal<string | null>(this.getUserNameFromStorage());

  get isAuthenticated() {
    return this.isAuthenticatedSignal.asReadonly();
  }

  get userRole() {
    return this.userRoleSignal.asReadonly();
  }

  get userName() {
    return this.userNameSignal.asReadonly();
  }

  constructor(private userService: UserService) {
    // Check if user is already logged in on service initialization
    this.updateAuthStatus();
    this.restoreSessionData();
  }

  private async restoreSessionData() {
    if (this.isAuthenticatedSignal() && !this.userNameSignal()) {
      const email = this.getCurrentUser();
      if (email) {
        // Try to find user in DB
        const user = await this.userService.getUserByEmail(email);
        if (user) {
          localStorage.setItem('userName', user.name);
          localStorage.setItem('userRole', user.role);
          this.updateAuthStatus();
        }
      }
    }
  }

  private checkAuthStatus(): boolean {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  }

  private getUserRoleFromStorage(): string | null {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('userRole');
    }
    return null;
  }

  private getUserNameFromStorage(): string | null {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('userName');
    }
    return null;
  }

  private updateAuthStatus(): void {
    this.isAuthenticatedSignal.set(this.checkAuthStatus());
    this.userRoleSignal.set(this.getUserRoleFromStorage());
    this.userNameSignal.set(this.getUserNameFromStorage());
  }

  public async login(email: string, password: string): Promise<boolean> {
    // Check against database users
    const user = await this.userService.verifyCredentials(email.trim(), password.trim());
    
    if (user) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('loginTimestamp', new Date().toISOString());
      this.updateAuthStatus();
      return true;
    }

    return false;
  }

  public logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('loginTimestamp');
    this.updateAuthStatus();
  }

  public getCurrentUser(): string | null {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('userEmail');
    }
    return null;
  }

  public isUserLoggedIn(): boolean {
    return this.isAuthenticatedSignal();
  }

  public isAdmin(): boolean {
    return this.userRoleSignal() === 'admin';
  }
}
