import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../models/order.model';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  generateMarketVehicleReport(orders: Order[], filter: { market: string, date?: Date, week?: number, year?: number }) {
    const doc = new jsPDF();
    let title = `Bestellbericht - ${filter.market}`;
    
    if (filter.date) {
      title += ` - ${moment(filter.date).format('DD.MM.YYYY')}`;
    } else if (filter.week && filter.year) {
      title += ` - KW ${filter.week} / ${filter.year}`;
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const tableData: any[] = [];

    orders.forEach(order => {
      order.items.forEach(item => {
        tableData.push([
          moment(order.orderDate).format('DD.MM.YYYY'),
          order.customerName,
          item.productName,
          `${item.quantity} ${item.unit}`,
          item.notes || ''
        ]);
      });
    });

    autoTable(doc, {
      head: [['Datum', 'Kunde', 'Produkt', 'Menge', 'Notiz']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    doc.save(`Bestellbericht_${filter.market}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  generateProductionReport(orders: Order[], week: number, year: number) {
    const doc = new jsPDF();
    const title = `Produktionsbericht - KW ${week} / ${year}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Aggregate products
    const productMap = new Map<string, { name: string, quantity: number, unit: string }>();

    orders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.productName}-${item.unit}`;
        if (productMap.has(key)) {
          const existing = productMap.get(key)!;
          existing.quantity += item.quantity;
        } else {
          productMap.set(key, {
            name: item.productName,
            quantity: item.quantity,
            unit: item.unit
          });
        }
      });
    });

    const tableData = Array.from(productMap.values()).map(p => [
      p.name,
      `${p.quantity} ${p.unit}`
    ]);

    autoTable(doc, {
      head: [['Produkt', 'Gesamtmenge']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    doc.save(`Produktionsbericht_KW${week}_${year}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }
}
