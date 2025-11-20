import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CouchDbService } from './pouchdb.service';
import { Vacation } from '../models/vacation.model';

@Injectable({
    providedIn: 'root'
})
export class VacationService {
    private readonly TYPE = 'vacation';

    constructor(private dbService: CouchDbService) {}

    getVacations(): Observable<Vacation[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Vacation[]>;
    }

    addVacation(vacation: Omit<Vacation, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newVacation: Vacation = {
            ...vacation,
            type: this.TYPE
        };
        return this.dbService.addDoc(newVacation);
    }

    updateVacation(vacation: Vacation): Promise<any> {
        return this.dbService.updateDoc(vacation);
    }

    deleteVacation(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
