import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CouchDbService } from './pouchdb.service';
import { Stall, Box, Pig } from '../models/stall.model';

@Injectable({
    providedIn: 'root'
})
export class StallService {

    constructor(private dbService: CouchDbService) {
        this.initializeStalls();
    }

    private initializeStalls() {
        this.dbService.getAllDocs('stall').then(stalls => {
            if (stalls.length === 0) {
                const defaultStalls: Stall[] = [
                    { _id: 'stall-1', type: 'stall', name: 'Stall 1', boxes: this.createBoxes('stall-1', 10) },
                    { _id: 'stall-2', type: 'stall', name: 'Stall 2', boxes: this.createBoxes('stall-2', 10) },
                    { _id: 'stall-3', type: 'stall', name: 'Stall 3', boxes: this.createBoxes('stall-3', 10) }
                ];
                defaultStalls.forEach(stall => this.dbService.addDoc(stall));
            }
        });
    }

    private createBoxes(stallId: string, count: number): Box[] {
        const boxes: Box[] = [];
        for (let i = 1; i <= count; i++) {
            boxes.push({
                id: `${stallId}-box-${i}`,
                stallId: stallId,
                name: `Box ${i}`,
                capacity: 10,
                pigs: []
            });
        }
        return boxes;
    }

    getStalls(): Observable<Stall[]> {
        return this.dbService.watchDocs('stall');
    }

    getStall(id: string): Observable<Stall> {
        return from(this.dbService.getDoc(id));
    }

    updateStall(stall: Stall): Promise<any> {
        return this.dbService.updateDoc(stall);
    }

    addPig(stallId: string, boxId: string, pig: Pig): Promise<any> {
        return this.dbService.getDoc(stallId).then((stall: Stall) => {
            const box = stall.boxes.find(b => b.id === boxId);
            if (box && box.pigs.length < box.capacity) {
                box.pigs.push(pig);
                return this.dbService.updateDoc(stall);
            }
            return Promise.reject('Box not found or full');
        });
    }

    removePig(stallId: string, boxId: string, pigId: string): Promise<any> {
        return this.dbService.getDoc(stallId).then((stall: Stall) => {
            const box = stall.boxes.find(b => b.id === boxId);
            if (box) {
                box.pigs = box.pigs.filter(p => p.id !== pigId);
                return this.dbService.updateDoc(stall);
            }
            return Promise.reject('Box not found');
        });
    }

    movePig(stallId: string, fromBoxId: string, toBoxId: string, pigId: string): Promise<any> {
        return this.dbService.getDoc(stallId).then((stall: Stall) => {
            const fromBox = stall.boxes.find(b => b.id === fromBoxId);
            const toBox = stall.boxes.find(b => b.id === toBoxId);

            if (fromBox && toBox) {
                if (toBox.pigs.length > 0) {
                     return Promise.reject('Target box must be empty');
                }
                
                const pigIndex = fromBox.pigs.findIndex(p => p.id === pigId);
                if (pigIndex > -1) {
                    const pig = fromBox.pigs[pigIndex];
                    fromBox.pigs.splice(pigIndex, 1);
                    pig.boxId = toBoxId;
                    toBox.pigs.push(pig);
                    return this.dbService.updateDoc(stall);
                }
            }
            return Promise.reject('Invalid move operation');
        });
    }
    
    slaughterPig(stallId: string, boxId: string, pigId: string): Promise<any> {
         return this.removePig(stallId, boxId, pigId);
    }

    getSlaughterRecommendations(stall: Stall): Box[] {
        return stall.boxes
            .filter(b => b.pigs.length > 0)
            .map(box => {
                const totalAge = box.pigs.reduce((sum, pig) => {
                    const age = new Date().getTime() - new Date(pig.birthDate).getTime();
                    return sum + age;
                }, 0);
                const avgAge = totalAge / box.pigs.length;
                return { box, avgAge };
            })
            .sort((a, b) => b.avgAge - a.avgAge)
            .map(item => item.box);
    }
}
