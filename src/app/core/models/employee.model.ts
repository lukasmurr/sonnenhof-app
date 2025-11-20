export interface Employee {
    _id?: string;
    _rev?: string;
    type: 'employee';
    name: string;
    birthDate: string;
    landline?: string;
    mobile?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}
