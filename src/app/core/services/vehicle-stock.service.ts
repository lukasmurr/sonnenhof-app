import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { VehicleStock, VehicleStockConfig } from '../models/vehicle-stock.model';
import { CouchDbService } from './pouchdb.service';

@Injectable({
    providedIn: 'root'
})
export class VehicleStockService {
    private readonly STOCK_TYPE = 'vehicle-stock';
    private readonly CONFIG_TYPE = 'vehicle-stock-config';

    constructor(private dbService: CouchDbService) { }

    getStocks(): Observable<VehicleStock[]> {
        return this.dbService.watchDocs(this.STOCK_TYPE) as Observable<VehicleStock[]>;
    }

    getConfigs(): Observable<VehicleStockConfig[]> {
        return this.dbService.watchDocs(this.CONFIG_TYPE) as Observable<VehicleStockConfig[]>;
    }

    async getStockByDateAndMarket(date: string, marketId: string): Promise<VehicleStock | undefined> {
        const stocks = await this.dbService.getAllDocs(this.STOCK_TYPE) as VehicleStock[];
        return stocks.find(s => s.date === date && s.marketId === marketId);
    }

    async getConfigByMarket(marketId: string): Promise<VehicleStockConfig | undefined> {
        const configs = await this.dbService.getAllDocs(this.CONFIG_TYPE) as VehicleStockConfig[];
        return configs.find(c => c.marketId === marketId);
    }

    addStock(stock: Omit<VehicleStock, '_id' | '_rev'>): Promise<any> {
        return this.dbService.addDoc({ ...stock, type: this.STOCK_TYPE });
    }

    updateStock(stock: VehicleStock): Promise<any> {
        return this.dbService.updateDoc(stock);
    }

    async saveConfig(config: VehicleStockConfig): Promise<any> {
        if (config._id) {
            return this.dbService.updateDoc(config);
        } else {
            return this.dbService.addDoc({ ...config, type: this.CONFIG_TYPE });
        }
    }
}
