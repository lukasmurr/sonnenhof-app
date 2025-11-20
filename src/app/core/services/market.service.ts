import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CouchDbService } from './pouchdb.service';
import { Market } from '../models/market.model';

@Injectable({
    providedIn: 'root'
})
export class MarketService {
    private readonly TYPE = 'market';

    constructor(private dbService: CouchDbService) {}

    getMarkets(): Observable<Market[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Market[]>;
    }

    addMarket(market: Omit<Market, '_id' | '_rev' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newMarket: Market = {
            ...market,
            type: this.TYPE
        };
        return this.dbService.addDoc(newMarket);
    }

    updateMarket(market: Market): Promise<any> {
        return this.dbService.updateDoc(market);
    }

    deleteMarket(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }
}
