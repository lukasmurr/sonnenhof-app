import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

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
        canActivate: [permissionGuard],
        data: { permission: 'butchery.view' },
        loadComponent: () => import('./modules/butchery/butchery-landing-page/butchery-landing').then(m => m.ButcheryLanding)
    },
    {
        path: 'butchery/products',
        canActivate: [permissionGuard],
        data: { permission: 'product.view' },
        loadComponent: () => import('./modules/butchery/products/products').then(m => m.ProductsComponent)
    },
    {
        path: 'butchery/orders',
        canActivate: [permissionGuard],
        data: { permission: 'order.view' },
        loadComponent: () => import('./modules/butchery/orders/orders').then(m => m.OrdersComponent)
    },
    {
        path: 'butchery/orders/archive',
        canActivate: [permissionGuard],
        data: { permission: 'order.view', isArchive: true },
        loadComponent: () => import('./modules/butchery/orders/orders').then(m => m.OrdersComponent)
    },
    {
        path: 'butchery/crates',
        canActivate: [permissionGuard],
        data: { permission: 'crate.view' },
        loadComponent: () => import('./modules/butchery/crates/crates').then(m => m.CratesComponent)
    },
    {
        path: 'butchery/vehicle-stock',
        canActivate: [permissionGuard],
        data: { permission: 'vehicle-stock.view' },
        loadComponent: () => import('./modules/butchery/vehicle-stock/vehicle-stock').then(m => m.VehicleStockComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./modules/butchery/vehicle-stock/components/stock-preparation/stock-preparation').then(m => m.StockPreparationComponent)
            },
            {
                path: 'report',
                canActivate: [permissionGuard],
                data: { permission: 'vehicle-stock.create' },
                loadComponent: () => import('./modules/butchery/vehicle-stock/components/stock-reporting/stock-reporting').then(m => m.StockReportingComponent)
            },
            {
                path: 'report/:id',
                loadComponent: () => import('./modules/butchery/vehicle-stock/components/stock-reporting/stock-reporting').then(m => m.StockReportingComponent)
            },
            {
                path: 'management',
                canActivate: [permissionGuard],
                data: { permission: 'vehicle-stock.manage' },
                loadComponent: () => import('./modules/butchery/vehicle-stock/components/stock-management/stock-management').then(m => m.StockManagementComponent)
            }
        ]
    },
    {
        path: 'butchery/offers',
        canActivate: [permissionGuard],
        data: { permission: 'offer.view' },
        loadComponent: () => import('./modules/butchery/offers/offers').then(m => m.OffersComponent)
    },
    {
        path: 'butchery/production',
        canActivate: [permissionGuard],
        data: { permission: 'product.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery/inventory',
        canActivate: [permissionGuard],
        data: { permission: 'product.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery/quality',
        canActivate: [permissionGuard],
        data: { permission: 'product.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'butchery/sales',
        canActivate: [permissionGuard],
        data: { permission: 'product.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },

    // Office
    {
        path: 'office',
        canActivate: [permissionGuard],
        data: { permission: 'office.view' },
        loadComponent: () => import('./modules/office/office-landing-page/office-landing').then(m => m.OfficeLanding)
    },
    {
        path: 'office/administration',
        canActivate: [permissionGuard],
        data: { permission: 'office.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/documents',
        canActivate: [permissionGuard],
        data: { permission: 'office.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/calendar',
        canActivate: [permissionGuard],
        data: { permission: 'office.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/contacts',
        canActivate: [permissionGuard],
        data: { permission: 'office.view' },
        loadComponent: () => import('./modules/landing-page/landing').then(m => m.Landing)
    },
    {
        path: 'office/tuev',
        canActivate: [permissionGuard],
        data: { permission: 'tuev.view' },
        loadComponent: () => import('./modules/office/tuev-page/tuev').then(m => m.Tuev)
    },
    {
        path: 'office/markets',
        canActivate: [permissionGuard],
        data: { permission: 'market.view' },
        loadComponent: () => import('./modules/office/markets/markets').then(m => m.MarketsComponent)
    },
    {
        path: 'office/employees',
        canActivate: [permissionGuard],
        data: { permission: 'employee.view' },
        loadComponent: () => import('./modules/office/employees/employees').then(m => m.EmployeesComponent)
    },
    {
        path: 'office/vacation',
        canActivate: [permissionGuard],
        data: { permission: 'vacation.view' },
        loadComponent: () => import('./modules/office/vacation/vacation-planning').then(m => m.VacationPlanningComponent)
    },
    {
        path: 'office/purchasing-prices',
        canActivate: [permissionGuard],
        data: { permission: 'purchasing-price.view' },
        loadComponent: () => import('./modules/office/purchasing-prices/purchasing-prices').then(m => m.PurchasingPricesComponent)
    },
    {
        path: 'office/purchasing-prices/:id',
        canActivate: [permissionGuard],
        data: { permission: 'purchasing-price.view' },
        loadComponent: () => import('./modules/office/purchasing-prices/detail/purchasing-price-detail').then(m => m.PurchasingPriceDetailComponent)
    },

    // Farming
    {
        path: 'farming',
        canActivate: [permissionGuard],
        data: { permission: 'farming.view' },
        loadComponent: () => import('./modules/farming/farming-landing-page/farming-landing').then(m => m.FarmingLanding)
    },
    {
        path: 'farming/stall',
        canActivate: [permissionGuard],
        data: { permission: 'stall.view' },
        loadComponent: () => import('./modules/farming/stall/stall-overview/stall-overview').then(m => m.StallOverviewComponent)
    },
    {
        path: 'farming/stall/:id',
        canActivate: [permissionGuard],
        data: { permission: 'stall.view' },
        loadComponent: () => import('./modules/farming/stall/stall-detail/stall-detail').then(m => m.StallDetailComponent)
    },

    // Settings
    {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permission: 'user.manage' },
        loadComponent: () => import('./modules/settings/settings').then(m => m.SettingsComponent)
    },

    // Catch-all
    { path: '**', redirectTo: 'login' }
];
