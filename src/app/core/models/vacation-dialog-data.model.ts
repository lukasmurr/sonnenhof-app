import { Vacation } from './vacation.model';

export interface VacationDialogData {
    vacation?: Vacation;
    preselectedDate?: Date;
    // Whether the user may create vacations for other employees (select from list)
    canCreateForOthers?: boolean;
    // Whether the user may approve / manage other employees' vacations
    canApprove?: boolean;
    currentEmployeeId?: string;
}
