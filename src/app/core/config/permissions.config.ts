import { Permission, UserGroup } from '../models/permission.model';

export const GROUP_PERMISSIONS: Record<UserGroup, Permission[]> = {
    admin: [
        'butchery.view', 'office.view', 'farming.view',
        'product.view', 'product.create', 'product.update', 'product.delete',
        'market.view', 'market.create', 'market.update', 'market.delete',
        'order.view', 'order.create', 'order.update', 'order.delete',
        'employee.view', 'employee.create', 'employee.update', 'employee.delete',
        'tuev.view', 'tuev.create', 'tuev.update', 'tuev.delete',
        'user.manage',
        'vacation.view', 'vacation.create_own', 'vacation.update_own',
        'vacation.create_others', 'vacation.update_others', 'vacation.delete_others',
        'stall.view', 'stall.create', 'stall.update', 'stall.delete'
    ],
    office: [
        'butchery.view', 'office.view', 'farming.view',
        'product.view', 'product.create', 'product.update', 'product.delete',
        'market.view', 'market.create', 'market.update', 'market.delete',
        'order.view', 'order.create', 'order.update', 'order.delete',
        'employee.view', 'employee.create', 'employee.update', 'employee.delete',
        'tuev.view', 'tuev.create', 'tuev.update', 'tuev.delete',
        'vacation.view', 'vacation.create_own', 'vacation.update_own',
        'vacation.create_others', 'vacation.update_others', 'vacation.delete_others',
        'stall.view', 'stall.create', 'stall.update', 'stall.delete'
    ],
    butchery: [
        'office.view',
        'butchery.view',
        'product.view',
        'order.view',
        'vacation.view', 'vacation.create_own', 'vacation.update_own'
    ],
    sales: [
        'office.view',
        'butchery.view',
        'order.view',
        'vacation.view', 'vacation.create_own', 'vacation.update_own'
    ]
};
