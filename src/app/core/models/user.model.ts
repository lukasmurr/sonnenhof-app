export interface User {
    _id?: string;
    _rev?: string;
    type: 'user';
    name: string;
    email: string;
    password?: string; // Optional when retrieving list, required for creation/login
    role: 'admin' | 'user' | 'viewer';
    isLocked: boolean;
    createdAt?: string;
    updatedAt?: string;
}
