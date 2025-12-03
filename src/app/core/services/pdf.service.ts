import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../models/order.model';
import { Market } from '../models/market.model';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  generateMarketVehicleReport(orders: Order[], filter: any) {
    const doc = new jsPDF();
    let title = `Bestellbericht - ${filter.market}`;
    
    if (filter.dateType === 'day') {
      title += ` - ${moment(filter.date).format('DD.MM.YYYY')}`;
    } else if (filter.dateType === 'range') {
      title += ` - ${moment(filter.startDate).format('DD.MM.YYYY')} bis ${moment(filter.endDate).format('DD.MM.YYYY')}`;
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

  generateProductionReport(orders: Order[], filter: any) {
    const doc = new jsPDF();
    let title = `Produktionsbericht`;

    if (filter.dateType === 'day') {
        title += ` - ${moment(filter.date).format('DD.MM.YYYY')}`;
    } else if (filter.dateType === 'range') {
        title += ` - ${moment(filter.startDate).format('DD.MM.YYYY')} bis ${moment(filter.endDate).format('DD.MM.YYYY')}`;
    } else {
        title += ` - KW ${filter.week} / ${filter.year}`;
    }

    if (filter.product) {
        title += ` (${filter.product})`;
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Aggregate products
    const productMap = new Map<string, { name: string, quantity: number, unit: string }>();

    orders.forEach(order => {
      order.items.forEach(item => {
        // Filter by product if specified
        if (filter.product && item.productName !== filter.product) {
            return;
        }

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

    doc.save(`Produktionsbericht_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  generateFilteredOrdersReport(orders: Order[]) {
    const doc = new jsPDF();
    const title = `Bestellbericht - Suchergebnisse`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Erstellt am: ${moment().format('DD.MM.YYYY HH:mm')}`, 14, 30);

    const tableData: any[] = [];

    orders.forEach(order => {
      order.items.forEach(item => {
        tableData.push([
          moment(order.orderDate).format('DD.MM.YYYY'),
          order.customerName,
          order.market,
          item.productName,
          `${item.quantity} ${item.unit}`,
          item.notes || ''
        ]);
      });
    });

    autoTable(doc, {
      head: [['Datum', 'Kunde', 'Markt', 'Produkt', 'Menge', 'Notiz']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    doc.save(`Bestellbericht_Suche_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  generateOrderPdf(order: Order, market?: Market) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Bestellübersicht', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    
    // Customer Info
    doc.setFontSize(14);
    doc.text('Kunde', 14, 35);
    doc.setFontSize(11);
    doc.text(`Name: ${order.customerName}`, 14, 42);
    let yPos = 49;
    if (order.customerPhone) {
        doc.text(`Telefon: ${order.customerPhone}`, 14, yPos);
        yPos += 7;
    }
    if (order.customerEmail) {
        doc.text(`E-Mail: ${order.customerEmail}`, 14, yPos);
    }
    
    // Order Info
    doc.setFontSize(14);
    doc.text('Bestelldaten', 120, 35);
    doc.setFontSize(11);
    doc.text(`Datum: ${moment(order.orderDate).format('DD.MM.YYYY')}`, 120, 42);
    if (order.orderNumber) {
        doc.text(`Bestell-Nr.: ${order.orderNumber}`, 120, 49);
    }

    // Market Info
    if (market) {
        doc.setFontSize(14);
        doc.text('Markt', 120, 65);
        doc.setFontSize(11);
        doc.text(`Name: ${market.name}`, 120, 72);
        doc.text(`Adresse: ${market.address}`, 120, 79);
        doc.text(`Zeit: ${market.day}, ${market.startTime} - ${market.endTime} Uhr`, 120, 86);
    } else {
        doc.text(`Markt: ${order.market}`, 120, 65);
    }

    // Items Table
    const tableData = order.items.map(item => [
      item.productName,
      `${item.quantity} ${item.unit}`,
      item.notes || ''
    ]);

    autoTable(doc, {
      head: [['Produkt', 'Menge', 'Bemerkung']],
      body: tableData,
      startY: 100,
      theme: 'grid',
      styles: { fontSize: 12 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Erstellt am ${moment().format('DD.MM.YYYY HH:mm')}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Bestellung_${order.customerName.replace(/\s+/g, '_')}_${moment(order.orderDate).format('YYYYMMDD')}.pdf`);
  }
}
