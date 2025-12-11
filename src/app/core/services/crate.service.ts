import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrateRecord } from '../models/crate.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class CrateService {
    private readonly TYPE = 'crate-record';

    constructor(private dbService: CouchDbService) { }

    getCrates(): Observable<CrateRecord[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<CrateRecord[]>;
    }

    addCrateRecord(record: Omit<CrateRecord, '_id' | '_rev' | 'type'>): Promise<any> {
        const newRecord: CrateRecord = {
            ...record,
            type: this.TYPE,
            _id: `crate_${new Date().getTime()}`
        };
        return this.dbService.addDoc(newRecord);
    }

    updateCrateRecord(record: CrateRecord): Promise<any> {
        return this.dbService.updateDoc(record);
    }

    deleteCrateRecord(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
