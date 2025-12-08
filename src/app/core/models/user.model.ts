export type Permission =
    | 'butchery.view' | 'office.view'
    | 'product.view' | 'product.create' | 'product.update' | 'product.delete'
    | 'market.view' | 'market.create' | 'market.update' | 'market.delete'
    | 'order.view' | 'order.create' | 'order.update' | 'order.delete'
    | 'employee.view' | 'employee.create' | 'employee.update' | 'employee.delete'
    | 'tuev.view'
    | 'user.manage'
    | 'vacation.view' | 'vacation.create_own' | 'vacation.update_own'
    | 'vacation.create_others' | 'vacation.update_others' | 'vacation.delete_others';

export type UserGroup = 'admin' | 'office' | 'butchery' | 'sales';

export interface User {
    _id?: string;
    _rev?: string;
    type: 'user';
    name: string;
    email: string;
    password?: string; // Optional when retrieving list, required for creation/login
    group?: UserGroup;
    isLocked: boolean;
    createdAt?: string;
    updatedAt?: string;
}
