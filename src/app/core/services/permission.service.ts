import { Injectable } from '@angular/core';
import { Permission, User, UserGroup } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionService {

    private readonly GROUP_PERMISSIONS: Record<UserGroup, Permission[]> = {
        admin: [
            'butchery.view', 'office.view',
            'product.view', 'product.create', 'product.update', 'product.delete',
            'market.view', 'market.create', 'market.update', 'market.delete',
            'order.view', 'order.create', 'order.update', 'order.delete',
            'employee.view', 'employee.create', 'employee.update', 'employee.delete',
            'tuev.view',
            'user.manage',
            'vacation.view', 'vacation.create_own', 'vacation.update_own',
            'vacation.create_others', 'vacation.update_others', 'vacation.delete_others'
        ],
        office: [
            'office.view',
            'product.view', 'product.create', 'product.update', 'product.delete',
            'market.view', 'market.create', 'market.update', 'market.delete',
            'order.view', 'order.create', 'order.update', 'order.delete',
            'employee.view', 'employee.create', 'employee.update', 'employee.delete',
            'tuev.view',
            'vacation.view', 'vacation.create_own', 'vacation.update_own',
            'vacation.create_others', 'vacation.update_others', 'vacation.delete_others'
        ],
        butchery: [
            'butchery.view',
            'product.view', 'product.create',
            'order.view', 'order.create',
            'vacation.create_own', 'vacation.update_own'
        ],
        sales: [
            'butchery.view',
            'order.view', 'order.create',
            'vacation.create_own', 'vacation.update_own'
        ]
    };

    getGroupPermissions(group: UserGroup): Permission[] {
        return this.GROUP_PERMISSIONS[group] || [];
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
