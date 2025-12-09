import { Vacation } from './vacation.model';

export interface VacationDialogData {
    vacation?: Vacation;
    preselectedDate?: Date;
    canSeeAll?: boolean;
    currentEmployeeId?: string;
}
