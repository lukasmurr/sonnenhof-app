import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { Permission } from '../models/user.model';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const requiredPermission = route.data['permission'] as Permission;

    if (!authService.isAuthenticated()) {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }

    if (authService.hasPermission(requiredPermission)) {
        return true;
    }

    // Not authorized, redirect to landing page or show error
    // For now, redirect to landing
    router.navigate(['/landing']);
    return false;
};
