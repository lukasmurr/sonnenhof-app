import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { User } from '../models/user.model';
import { CouchDbService } from './pouchdb.service';
import * as bcrypt from 'bcryptjs';

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

        const plainPassword = user.password;
        if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
        }

        const result = await this.dbService.addDoc(user);

        if (result && result.ok) {
            const userForEmail = { ...user, password: plainPassword };
            this.sendAccountCreatedEmail(userForEmail).catch(err => console.error('Failed to send email', err));
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

    async resetUserPassword(user: User, newPassword: string): Promise<any> {
        user.password = await bcrypt.hash(newPassword, 10);
        return this.updateUser(user);
    }

    async updateUser(user: User): Promise<any> {
        return this.dbService.updateDoc(user);
    }

    async verifyCredentials(email: string, password: string): Promise<User | null> {
        let user: User | undefined;
        let remoteFetchSuccess = false;

        // 1. Try Remote First (Security & Freshness)
        // Always check server first to ensure we have the latest data (e.g. user locks, password changes)
        try {
            const remoteUsers = await this.dbService.getRemoteAllDocs('user');
            user = remoteUsers.find((u: User) =>
                u.email.toLowerCase() === email.toLowerCase() &&
                !u.isLocked
            );
            remoteFetchSuccess = true;
        } catch (error) {
            console.warn('Remote login failed (offline?), checking local DB...');
        }

        // 2. If Remote failed (offline), try Local
        if (!remoteFetchSuccess) {
            const localUsers = await this.dbService.getAllDocs('user');
            user = localUsers.find((u: User) =>
                u.email.toLowerCase() === email.toLowerCase() &&
                !u.isLocked
            );
        }

        if (user && user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return user;
            }
        }
        return null;
    }

    async changePassword(email: string, oldPass: string, newPass: string): Promise<boolean> {
        const user = await this.verifyCredentials(email, oldPass);
        if (user) {
            user.password = await bcrypt.hash(newPass, 10);
            await this.updateUser(user);
            return true;
        }
        return false;
    }

    async deleteUser(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const users = await this.dbService.getAllDocs('user');
        return users.find((u: User) => u.email === email);
    }
}
