import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () => import('./modules/login/login-page/login').then(m => m.Login)
    },
    {
        path: 'landing',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/butchery/butchery-landing-page/butchery-landing').then(m => m.ButcheryLanding),
        children: [
            { path: '', redirectTo: '', pathMatch: 'full' },
            { path: 'production', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'inventory', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'quality', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'sales', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) }
        ]
    },
    {
        path: 'office',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/office/office-landing-page/office-landing').then(m => m.OfficeLanding),
        children: [
            { path: '', redirectTo: '', pathMatch: 'full' },
            { path: 'administration', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'documents', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'calendar', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'contacts', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'tuev', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) }
        ]
    },
    {
        path: 'farming',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/farming/farming-landing-page/farming-landing').then(m => m.FarmingLanding),
        children: [
            { path: '', redirectTo: '', pathMatch: 'full' },
            { path: 'fields', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'animals', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'harvest', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
            { path: 'equipment', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) }
        ]
    },
    // Example placeholders - replace with real components or lazy-loaded features
    { path: 'settings', canActivate: [authGuard], loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
    { path: 'agriculture', canActivate: [authGuard], loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },

    // Catch-all
    { path: '**', redirectTo: 'login' }
];

/*
    Examples: where to put children routes
    {
        path: 'butchery',
        loadComponent: () => import('./modules/butchery/butchery-shell').then(m => m.ButcheryShell),
        // children are declared here (they are relative to /butchery)
        children: [
            { path: '', redirectTo: 'production', pathMatch: 'full' },
            { path: 'production', loadComponent: () => import('./modules/butchery/production').then(m => m.Production) },
            { path: 'inventory', loadComponent: () => import('./modules/butchery/inventory').then(m => m.Inventory) },
        ]
    }
*/
