import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import PouchDB from 'pouchdb';

@Injectable({
    providedIn: 'root'
})
export class CouchDbService {
    private db!: any;
    private dbInitialized$ = new BehaviorSubject<boolean>(false);
    public syncStatus$ = new BehaviorSubject<'online' | 'offline' | 'syncing'>('offline');

    constructor() {
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        this.db = new PouchDB('sonnenhof_db'); // Lokale DB

        // Increase max listeners to prevent warning when multiple components watch for changes
        if (typeof this.db.setMaxListeners === 'function') {
            this.db.setMaxListeners(100);
        }

        const remoteUrl = environment.couchdb.remoteUrl;

        if (!remoteUrl) {
            console.warn('No remote CouchDB URL configured...');
            this.dbInitialized$.next(true);
            return;
        }

        // 1. Remote DB als Instanz erstellen (mit Auth!)
        const remoteDB = new PouchDB(remoteUrl, {
            auth: {
                username: environment.couchdb.user,
                password: environment.couchdb.password
            },
            // Wichtig für Nginx/CORS: Keine Cookies erwarten, wenn es nicht klappt
            skip_setup: true
        });

        // 2. Sync zwischen lokal (this.db) und remote (remoteDB) starten
        this.db.sync(remoteDB, { // Hier das Objekt übergeben, nicht den String!
            live: true,
            retry: true
        })
            .on('change', (info: any) => {
                console.log('CouchDB Sync change:', info);
                this.syncStatus$.next('syncing');
            })
            .on('paused', (err: any) => {
                console.log('CouchDB Sync paused');
                this.syncStatus$.next(err ? 'offline' : 'online');
            })
            .on('active', () => {
                console.log('CouchDB Sync active');
                this.syncStatus$.next('syncing');
            })
            .on('denied', (err: any) => console.error('Sync denied:', err))
            .on('error', (err: any) => {
                console.error('Sync error:', err);
                this.syncStatus$.next('offline');
            });
    }

    public addDoc(doc: any): Promise<any> {
        if (!doc._id) {
            doc._id = this.generateId();
        }
        doc.createdAt = new Date().toISOString();
        doc.updatedAt = new Date().toISOString();
        return this.db.put(doc);
    }

    public getDoc(id: string): Promise<any> {
        return this.db.get(id);
    }

    public updateDoc(doc: any): Promise<any> {
        doc.updatedAt = new Date().toISOString();
        return this.db.put(doc);
    }

    public deleteDoc(id: string): Promise<any> {
        return this.db.get(id).then((doc: any) => {
            return this.db.remove(doc);
        });
    }

    public getAllDocs(type?: string): Promise<any> {
        if (type) {
            return this.db.allDocs({ include_docs: true })
                .then((result: any) => {
                    return result.rows
                        .map((row: any) => row.doc)
                        .filter((doc: any) => doc.type === type && !doc._id.startsWith('_design'));
                });
        }
        return this.db.allDocs({ include_docs: true })
            .then((result: any) => {
                return result.rows
                    .map((row: any) => row.doc)
                    .filter((doc: any) => !doc._id.startsWith('_design')); // Filter Design Docs
            });
    }

    public watchDocs(type?: string): Observable<any[]> {
        return new Observable((subscriber) => {
            const sendUpdatedDocs = async () => {
                try {
                    const docs = await this.getAllDocs(type);
                    subscriber.next(docs);
                } catch (err) {
                    subscriber.error(err);
                }
            };

            // Initial load
            sendUpdatedDocs();

            // Listen to changes
            const changesFeed = this.db.changes({
                since: 'now',
                live: true,
                include_docs: true
            }).on('change', () => {
                sendUpdatedDocs();
            }).on('error', (err: any) => {
                console.error('Changes feed error:', err);
                subscriber.error(err);
            });

            // Cleanup
            return () => {
                changesFeed.cancel();
            };
        });
    }

    public generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
