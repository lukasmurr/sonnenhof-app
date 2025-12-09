import { Vacation } from './vacation.model';

export interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    vacations: Vacation[];
}
