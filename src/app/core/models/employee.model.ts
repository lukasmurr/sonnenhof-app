export interface Employee {
    _id?: string;
    _rev?: string;
    type: 'employee';
    name: string;
    birthDate: string;
    landline?: string;
    mobile?: string;
    email?: string;
    vacationDays: number;
    createdAt?: string;
    updatedAt?: string;
}
