import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicle } from '../models/vehicle.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private readonly TYPE = 'vehicle';

    constructor(private dbService: CouchDbService) { }

    getVehicles(): Observable<Vehicle[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Vehicle[]>;
    }

    addVehicle(vehicle: Omit<Vehicle, '_id' | '_rev'>): Promise<any> {
        return this.dbService.addDoc({ ...vehicle, type: this.TYPE });
    }

    updateVehicle(vehicle: Vehicle): Promise<any> {
        return this.dbService.updateDoc(vehicle);
    }
    
    deleteVehicle(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
