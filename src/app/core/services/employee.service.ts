import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CouchDbService } from './pouchdb.service';
import { Employee } from '../models/employee.model';

@Injectable({
    providedIn: 'root'
})
export class EmployeeService {
    private readonly TYPE = 'employee';

    constructor(private dbService: CouchDbService) {}

    getEmployees(): Observable<Employee[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Employee[]>;
    }

    addEmployee(employee: Omit<Employee, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newEmployee: Employee = {
            ...employee,
            type: this.TYPE
        };
        return this.dbService.addDoc(newEmployee);
    }

    updateEmployee(employee: Employee): Promise<any> {
        return this.dbService.updateDoc(employee);
    }

    deleteEmployee(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
