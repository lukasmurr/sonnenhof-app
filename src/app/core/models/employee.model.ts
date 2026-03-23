export interface Employee {
    _id?: string;
    _rev?: string;
    type: 'employee';
    name: string;
    birthDate: string;
    landline?: string;
    mobile?: string;
    email: string;
    vacationDays: number;
    // Weekdays as JS day numbers: 1 = Monday ... 5 = Friday
    workingDays?: number[];
    createdAt?: string;
    updatedAt?: string;
}
