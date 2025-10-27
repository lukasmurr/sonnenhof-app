import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(this.checkAuthStatus());

  get isAuthenticated() {
    return this.isAuthenticatedSignal.asReadonly();
  }

  constructor() {
    // Check if user is already logged in on service initialization
    this.updateAuthStatus();
  }

  private checkAuthStatus(): boolean {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  }

  private updateAuthStatus(): void {
    this.isAuthenticatedSignal.set(this.checkAuthStatus());
  }

  public login(email: string, password: string): boolean {
    // Demo credentials
    if (email === 'demo@sonnenhof.de' && password === 'password123') {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('loginTimestamp', new Date().toISOString());
      this.updateAuthStatus();
      return true;
    }
    return false;
  }

  public logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
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
}
