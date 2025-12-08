export interface Vacation {
    _id?: string;
    _rev?: string;
    type: 'vacation';
    employeeId: string;
    employeeName: string;
    startDate: string;
    endDate: string;
    leaveType: 'vacation' | 'paid_leave' | 'unpaid_leave' | 'sick_with_certificate' | 'sick_without_certificate';
    status: 'approved' | 'pending' | 'rejected';
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
