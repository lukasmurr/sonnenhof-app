import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    
    // Login
    {
        path: 'login',
        loadComponent: () => import('./modules/login/login-page/login').then(m => m.Login)
    },
    
    // Landing
    {
        path: 'landing',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    
    // Butchery
    {
        path: 'butchery',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/butchery/butchery-landing-page/butchery-landing').then(m => m.ButcheryLanding)
    },
    {
        path: 'butchery/products',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/butchery/products/products').then(m => m.ProductsComponent)
    },
    {
        path: 'butchery/orders',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/butchery/orders/orders').then(m => m.OrdersComponent)
    },
    {
        path: 'butchery/production',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery/inventory',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery/quality',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery/sales',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    
    // Office
    {
        path: 'office',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/office/office-landing-page/office-landing').then(m => m.OfficeLanding)
    },
    {
        path: 'office/administration',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/documents',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/calendar',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/contacts',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/tuev',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/office/tuev-page/tuev').then(m => m.Tuev)
    },
    {
        path: 'office/markets',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/office/markets/markets').then(m => m.MarketsComponent)
    },
    {
        path: 'office/employees',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/office/employees/employees').then(m => m.EmployeesComponent)
    },
    {
        path: 'office/vacation',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/office/vacation/vacation-planning').then(m => m.VacationPlanningComponent)
    },
    
    // Farming
    {
        path: 'farming',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/farming/farming-landing-page/farming-landing').then(m => m.FarmingLanding)
    },
    {
        path: 'farming/fields',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'farming/animals',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'farming/harvest',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'farming/equipment',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    
    // Settings & Agriculture
    {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'agriculture',
        canActivate: [authGuard],
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },

    // Catch-all
    { path: '**', redirectTo: 'login' }
];
