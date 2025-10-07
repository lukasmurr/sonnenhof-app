import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: 'landing', pathMatch: 'full' },
    {
        path: 'landing',
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    // Example placeholders - replace with real components or lazy-loaded features
    { path: 'settings', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
    { path: 'login', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
    { path: 'office', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
    { path: 'butchery', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },
    { path: 'agriculture', loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing) },

    // Catch-all
    { path: '**', redirectTo: 'landing' }
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
