import { Injectable } from '@angular/core';
import { Permission, User, UserGroup } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionService {

    private readonly GROUP_PERMISSIONS: Record<UserGroup, Permission[]> = {
        admin: [
            'product.create', 'product.update', 'product.delete',
            'market.create', 'market.update', 'market.delete',
            'order.create', 'order.update', 'order.delete',
            'employee.create', 'employee.update', 'employee.delete',
            'vacation.create_own', 'vacation.update_own',
            'vacation.create_others', 'vacation.update_others', 'vacation.delete_others'
        ],
        office: [
            'market.update', 'market.delete',
            'order.update', 'order.delete',
            'employee.create', 'employee.update', 'employee.delete',
            'vacation.create_others', 'vacation.update_others', 'vacation.delete_others'
        ],
        butchery: [
            'product.create',
            'order.create',
            'vacation.create_own', 'vacation.update_own'
        ],
        sales: [
            'order.create',
            'vacation.create_own', 'vacation.update_own'
        ]
    };

    private readonly PERMISSION_LABELS: Record<Permission, string> = {
        'product.create': 'Produkte anlegen',
        'product.update': 'Produkte bearbeiten',
        'product.delete': 'Produkte löschen',
        'market.create': 'Märkte anlegen',
        'market.update': 'Märkte bearbeiten',
        'market.delete': 'Märkte löschen',
        'order.create': 'Bestellungen anlegen',
        'order.update': 'Bestellungen bearbeiten',
        'order.delete': 'Bestellungen löschen',
        'employee.create': 'Mitarbeiter anlegen',
        'employee.update': 'Mitarbeiter bearbeiten',
        'employee.delete': 'Mitarbeiter löschen',
        'vacation.create_own': 'Eigenen Urlaub planen',
        'vacation.update_own': 'Eigenen Urlaub bearbeiten',
        'vacation.create_others': 'Urlaub für andere planen',
        'vacation.update_others': 'Urlaub für andere bearbeiten',
        'vacation.delete_others': 'Urlaub von anderen löschen'
    };

    getGroupPermissions(group: UserGroup): Permission[] {
        return this.GROUP_PERMISSIONS[group] || [];
    }

    getAllPermissions(): Permission[] {
        return Object.keys(this.PERMISSION_LABELS) as Permission[];
    }

    getPermissionLabel(permission: Permission): string {
        return this.PERMISSION_LABELS[permission];
    }

    hasPermission(user: User, permission: Permission): boolean {
        if (user.permissions && user.permissions.includes(permission)) {
            return true;
        }
        return false;
    }
    
    getGroups(): { value: UserGroup, label: string }[] {
        return [
            { value: 'admin', label: 'Admin' },
            { value: 'office', label: 'Büro' },
            { value: 'butchery', label: 'Metzgerei' },
            { value: 'sales', label: 'Verkauf' }
        ];
    }
}
