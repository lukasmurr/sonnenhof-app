import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    constructor(private dbService: CouchDbService, private http: HttpClient) { }

    getUsers(): Observable<User[]> {
        return this.dbService.watchDocs('user');
    }

    async addUser(user: User): Promise<any> {
        user.type = 'user';
        // Remove _rev if it's null/undefined/empty to avoid PouchDB "Invalid rev format" error
        if (!user._rev) {
            delete user._rev;
        }
        // Remove _id if it's null/undefined/empty so PouchDB/Service can generate one
        if (!user._id) {
            delete user._id;
        }

        // In a real app, hash the password here.
        // For now, we store it as is (or base64 encoded if we wanted slight obfuscation)
        const result = await this.dbService.addDoc(user);

        if (result && result.ok) {
            this.sendAccountCreatedEmail(user).catch(err => console.error('Failed to send email', err));
        }

        return result;
    }

    private async sendAccountCreatedEmail(user: User): Promise<void> {
        const apiUrl = 'http://localhost:3000/api/mail/account-created';
        await firstValueFrom(this.http.post(apiUrl, {
            email: user.email,
            password: user.password,
            name: user.name
        }));
    }

    async updateUser(user: User): Promise<any> {
        return this.dbService.updateDoc(user);
    }

    async deleteUser(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    async verifyCredentials(email: string, password: string): Promise<User | null> {
        const users = await this.dbService.getAllDocs('user');
        const user = users.find((u: User) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.password === password &&
            !u.isLocked
        );
        return user || null;
    }

    async changePassword(email: string, oldPass: string, newPass: string): Promise<boolean> {
        const user = await this.verifyCredentials(email, oldPass);
        if (user) {
            user.password = newPass;
            await this.updateUser(user);
            return true;
        }
        return false;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const users = await this.dbService.getAllDocs('user');
        return users.find((u: User) => u.email === email);
    }
}
