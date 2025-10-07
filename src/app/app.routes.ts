import { Routes } from '@angular/router';
import { Landing } from './landing/landing';
import { Settings } from './settings/settings';

export const routes: Routes = [
    { path: '', component: Landing },
    { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard) },
    { path: 'settings', component: Settings },
    // Weitere Routen
];
