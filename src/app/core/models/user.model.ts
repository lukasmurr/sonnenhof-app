export type Permission =
    | 'product.create' | 'product.update' | 'product.delete'
    | 'market.create' | 'market.update' | 'market.delete'
    | 'order.create' | 'order.update' | 'order.delete'
    | 'employee.create' | 'employee.update' | 'employee.delete'
    | 'vacation.create_own' | 'vacation.update_own'
    | 'vacation.create_others' | 'vacation.update_others' | 'vacation.delete_others';

export type UserGroup = 'admin' | 'office' | 'butchery' | 'sales';

export interface User {
    _id?: string;
    _rev?: string;
    type: 'user';
    name: string;
    email: string;
    password?: string; // Optional when retrieving list, required for creation/login
    role: 'admin' | 'user' | 'viewer';
    group?: UserGroup;
    permissions?: Permission[];
    isLocked: boolean;
    createdAt?: string;
    updatedAt?: string;
}
