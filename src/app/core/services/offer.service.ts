import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Offer } from '../models/offer.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class OfferService {
    private readonly TYPE = 'offer';

    constructor(private dbService: CouchDbService) { }

    getOffers(): Observable<Offer[]> {
        return this.dbService.watchDocs(this.TYPE) as Observable<Offer[]>;
    }

    getOffersByYear(year: number): Observable<Offer[]> {
        return this.getOffers().pipe(
            map(offers => offers.filter(o => o.year === year))
        );
    }

    addOffer(offer: Omit<Offer, '_id' | '_rev' | 'type' | 'createdAt' | 'updatedAt'>): Promise<any> {
        const newOffer: Offer = {
            ...offer,
            type: this.TYPE,
            _id: `offer_${offer.year}_${offer.week}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return this.dbService.addDoc(newOffer);
    }

    updateOffer(offer: Offer): Promise<any> {
        const updatedOffer = {
            ...offer,
            updatedAt: new Date().toISOString()
        };
        return this.dbService.updateDoc(updatedOffer);
    }

    deleteOffer(id: string): Promise<any> {
        return this.dbService.deleteDoc(id);
    }

    // Helper to find last usage of a product
    getLastOfferDate(productId: string, allOffers: Offer[], currentYear: number, currentWeek: number): { year: number, week: number } | null {
        // Filter offers that are BEFORE the current one
        const previousOffers = allOffers.filter(o => 
            (o.year < currentYear) || (o.year === currentYear && o.week < currentWeek)
        );

        // Sort by date descending (newest first)
        previousOffers.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.week - a.week;
        });

        for (const offer of previousOffers) {
            if (offer.items.some(item => item.productId === productId)) {
                return { year: offer.year, week: offer.week };
            }
        }

        return null;
    }
}
