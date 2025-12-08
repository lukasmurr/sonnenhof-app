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
            'user.manage',
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
