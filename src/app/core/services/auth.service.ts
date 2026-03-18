import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Permission, UserGroup } from '../models/permission.model';
import { PermissionService } from './permission.service';
import { CouchDbService } from './pouchdb.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSignal = signal<boolean>(this.checkAuthStatus());
  private userNameSignal = signal<string | null>(this.getUserNameFromStorage());
  private userGroupSignal = signal<UserGroup | null>(this.getUserGroupFromStorage());
  private syncStatus: 'online' | 'offline' | 'syncing' = 'offline';

  // Computed permissions based on group
  private userPermissionsSignal = computed(() => {
    const group = this.userGroupSignal();
    if (!group) return [];
    return this.permissionService.getGroupPermissions(group);
  });

  get isAuthenticated() {
    return this.isAuthenticatedSignal.asReadonly();
  }

  get userName() {
    return this.userNameSignal.asReadonly();
  }

  constructor(
    private userService: UserService,
    private permissionService: PermissionService,
    private couchDbService: CouchDbService,
    private router: Router
  ) {
    // Check if user is already logged in on service initialization
    this.updateAuthStatus();
    this.restoreSessionData();
    this.couchDbService.syncStatus$.subscribe(status => {
      this.syncStatus = status;
    });
    this.startUserMonitoring();
  }

  private startUserMonitoring() {
    this.userService.getUsers().subscribe(users => {
      if (this.isAuthenticatedSignal()) {
        const email = this.getCurrentUser();
        if (email) {
          const currentUser = users.find(u => u.email === email);

          if (!currentUser) {
            // Nur mit bestätigter Online-Synchronisierung als gelöscht behandeln.
            // Sonst ist die lokale User-Liste ggf. noch nicht vollständig geladen.
            if (this.syncStatus === 'online') {
              this.logoutAndRedirect('Ihr Benutzerkonto wurde gelöscht.');
            }
            return;
          }

          if (currentUser.isLocked) {
            // User locked
            this.logoutAndRedirect('Ihr Benutzerkonto wurde gesperrt.');
            return;
          }

          // Check for permission/group changes
          const storedGroup = localStorage.getItem('userGroup'); // We need to store group too

          // Check if critical data changed
          // Note: We compare group
          // If any of these changed, we logout the user as requested

          const hasGroupChanged = storedGroup && storedGroup !== (currentUser.group || 'sales');

          if (hasGroupChanged) {
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
          localStorage.setItem('userGroup', user.group || 'sales');
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

  private getUserNameFromStorage(): string | null {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('userName');
    }
    return null;
  }

  private getUserGroupFromStorage(): UserGroup | null {
    if (typeof window !== 'undefined' && localStorage) {
      return localStorage.getItem('userGroup') as UserGroup;
    }
    return null;
  }

  private updateAuthStatus(): void {
    this.isAuthenticatedSignal.set(this.checkAuthStatus());
    this.userNameSignal.set(this.getUserNameFromStorage());
    this.userGroupSignal.set(this.getUserGroupFromStorage());
  }

  public async login(email: string, password: string): Promise<boolean> {
    // Check against database users
    const user = await this.userService.verifyCredentials(email.trim(), password.trim());

    if (user) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userGroup', user.group || 'sales');
      localStorage.setItem('loginTimestamp', new Date().toISOString());
      this.updateAuthStatus();
      return true;
    }
  }

  public logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userGroup');
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

  public hasPermission(permission: Permission): boolean {
    return this.userPermissionsSignal().includes(permission);
  }
}
