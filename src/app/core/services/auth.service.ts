import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Permission, User } from '../models/user.model';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(this.checkAuthStatus());
  private userRoleSignal = signal<string | null>(this.getUserRoleFromStorage());
  private userNameSignal = signal<string | null>(this.getUserNameFromStorage());
  private userPermissionsSignal = signal<Permission[]>(this.getUserPermissionsFromStorage());

  get isAuthenticated() {
    return this.isAuthenticatedSignal.asReadonly();
  }

  get userRole() {
    return this.userRoleSignal.asReadonly();
  }

  get userName() {
    return this.userNameSignal.asReadonly();
  }

  constructor(
      private userService: UserService,
      private router: Router
  ) {
    // Check if user is already logged in on service initialization
    this.updateAuthStatus();
    this.restoreSessionData();
    this.startUserMonitoring();
  }

  private startUserMonitoring() {
      this.userService.getUsers().subscribe(users => {
          if (this.isAuthenticatedSignal()) {
              const email = this.getCurrentUser();
              if (email) {
                  const currentUser = users.find(u => u.email === email);
                  
                  if (!currentUser) {
                      // User deleted
                      this.logoutAndRedirect('Ihr Benutzerkonto wurde gelöscht.');
                      return;
                  }

                  if (currentUser.isLocked) {
                      // User locked
                      this.logoutAndRedirect('Ihr Benutzerkonto wurde gesperrt.');
                      return;
                  }

                  // Check for permission/group changes
                  const storedRole = localStorage.getItem('userRole');
                  const storedGroup = localStorage.getItem('userGroup'); // We need to store group too
                  const storedPermissions = localStorage.getItem('userPermissions');
                  
                  const currentPermissionsStr = JSON.stringify(currentUser.permissions || []);
                  
                  // Check if critical data changed
                  // Note: We compare role, group and permissions
                  // If any of these changed, we logout the user as requested
                  
                  // We need to make sure we stored the group on login first, 
                  // otherwise this might trigger on first load if we didn't store it before.
                  // But since we are adding this feature now, existing sessions might not have 'userGroup'.
                  // We should handle that gracefully.
                  
                  const hasGroupChanged = storedGroup && storedGroup !== (currentUser.group || 'sales');
                  const hasRoleChanged = storedRole && storedRole !== currentUser.role;
                  const hasPermissionsChanged = storedPermissions && storedPermissions !== currentPermissionsStr;

                  if (hasGroupChanged || hasRoleChanged || hasPermissionsChanged) {
                      this.logoutAndRedirect('Ihre Berechtigungen haben sich geändert. Bitte melden Sie sich erneut an.');
                  }
              }
          }
      });
  }

  private logoutAndRedirect(message?: string) {
      this.logout();
      this.router.navigate(['/login']);
      if (message) {
          alert(message); // Simple alert for now, could be a snackbar if we injected it
      }
  }

  private async restoreSessionData() {
    if (this.isAuthenticatedSignal()) {
      const email = this.getCurrentUser();
      if (email) {
        // Try to find user in DB to get latest permissions
        const user = await this.userService.getUserByEmail(email);
        if (user) {
          localStorage.setItem('userName', user.name);
          localStorage.setItem('userRole', user.role);
          localStorage.setItem('userGroup', user.group || 'sales');
          localStorage.setItem('userPermissions', JSON.stringify(user.permissions || []));
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

  private getUserPermissionsFromStorage(): Permission[] {
      if (typeof window !== 'undefined' && localStorage) {
          const perms = localStorage.getItem('userPermissions');
          try {
              return perms ? JSON.parse(perms) : [];
          } catch (e) {
              return [];
          }
      }
      return [];
  }

  private updateAuthStatus(): void {
    this.isAuthenticatedSignal.set(this.checkAuthStatus());
    this.userRoleSignal.set(this.getUserRoleFromStorage());
    this.userNameSignal.set(this.getUserNameFromStorage());
    this.userPermissionsSignal.set(this.getUserPermissionsFromStorage());
  }

  public async login(email: string, password: string): Promise<boolean> {
    // Check against database users
    const user = await this.userService.verifyCredentials(email.trim(), password.trim());

    if (user) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userGroup', user.group || 'sales');
      localStorage.setItem('userPermissions', JSON.stringify(user.permissions || []));
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
    localStorage.removeItem('userGroup');
    localStorage.removeItem('userPermissions');
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

  public hasPermission(permission: Permission): boolean {
      if (this.isAdmin()) return true; // Admin has all permissions
      return this.userPermissionsSignal().includes(permission);
  }
}
