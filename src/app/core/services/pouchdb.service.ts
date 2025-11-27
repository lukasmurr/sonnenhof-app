import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

declare const PouchDB: any;

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
        this.db = new PouchDB('sonnenhof_db');

        this.db.sync("http://admin:server-lukas@0.tcp.eu.ngrok.io:18846/sonnenhof_db", {
            live: true,
            retry: true,
            ajax: {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                },
                timeout: 30000,
                withCredentials: false
            }
        })
            .on('complete', () => {
                console.log('CouchDB Sync complete');
                this.dbInitialized$.next(true);
            })
            .on('change', (info: any) => {
                console.log('CouchDB Sync change:', info);
                this.syncStatus$.next('syncing');
            })
            .on('paused', (err: any) => {
                console.log('CouchDB Sync paused (caught up)');
                if (err) {
                    this.syncStatus$.next('offline');
                } else {
                    this.syncStatus$.next('online');
                }
            })
            .on('active', () => {
                console.log('CouchDB Sync active (syncing)');
                this.syncStatus$.next('syncing');
            })
            .on('denied', (err: any) => {
                console.error('CouchDB Sync denied:', err);
                this.syncStatus$.next('offline');
            })
            .on('error', (err: any) => {
                console.warn('CouchDB Sync error (working offline):', err);
                this.dbInitialized$.next(true);
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

    public queryByType(type: string): Promise<any[]> {
        return this.getAllDocs(type);
    }

    public getDocsByIds(ids: string[]): Promise<any[]> {
        return this.db.allDocs({ include_docs: true, keys: ids })
            .then((result: any) => {
                return result.rows
                    .filter((row: any) => row.doc)
                    .map((row: any) => row.doc);
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

    public isInitialized(): Observable<boolean> {
        return this.dbInitialized$.asObservable();
    }

    public clearDatabase(): Promise<void> {
        return this.db.destroy().then(() => {
            this.db = new PouchDB('sonnenhof_db');
            this.dbInitialized$.next(true);
        });
    }

    public async checkRemoteConnection(): Promise<boolean> {
        try {
            const remoteDb = new PouchDB('https://admin:server-lukas@f59419414d64.ngrok-free.app/sonnenhof_db', {
                ajax: {
                    headers: {
                        'ngrok-skip-browser-warning': 'true'
                    },
                    withCredentials: false
                }
            });
            await remoteDb.info();
            return true;
        } catch (err) {
            console.error('Remote connection check failed:', err);
            return false;
        }
    }

    public async manualSync(): Promise<any> {
        const remoteUrl = 'https://admin:server-lukas@f59419414d64.ngrok-free.app/sonnenhof_db';
        return this.db.sync(remoteUrl, {
            ajax: {
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                },
                withCredentials: false
            }
        });
    }
}
