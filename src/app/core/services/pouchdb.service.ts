import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare const PouchDB: any;

@Injectable({
    providedIn: 'root'
})
export class CouchDbService {
    private db!: any;
    private dbInitialized$ = new BehaviorSubject<boolean>(false);

    constructor() {
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        this.db = new PouchDB('sonnenhof_db');
        const remoteUrl = 'http://admin:admin@localhost:5984/sonnenhof_db';

        this.db.sync(remoteUrl, {
            live: true,
            retry: true
        })
            .on('complete', () => {
                console.log('CouchDB Sync complete');
                this.dbInitialized$.next(true);
            })
            .on('error', (err: any) => {
                console.warn('CouchDB Sync error (working offline):', err);
                this.dbInitialized$.next(true);
            });
    }

    // ===== CRUD Operationen =====

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

    // ===== Query Operationen =====

    public getAllDocs(type?: string): Promise<any> {
        if (type) {
            return this.db.allDocs({ include_docs: true })
                .then((result: any) => {
                    return result.rows
                        .map((row: any) => row.doc)
                        .filter((doc: any) => doc.type === type);
                });
        }
        return this.db.allDocs({ include_docs: true })
            .then((result: any) => {
                return result.rows.map((row: any) => row.doc);
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

    // ===== Watch Operationen (Live Updates) =====

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

    // ===== Utility Funktionen =====

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
}
