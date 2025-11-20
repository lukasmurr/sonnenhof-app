export interface Vacation {
    _id?: string;
    _rev?: string;
    type: 'vacation';
    employeeId: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    status: 'approved' | 'pending' | 'rejected';
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
