import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import { Market } from '../models/market.model';
import { Order } from '../models/order.model';
import { Product } from '../models/product.model';
import { CrateRecord } from '../models/crate.model';
import { Offer } from '../models/offer.model';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  generateMarketVehicleReport(orders: Order[], filter: any, products: Product[] = []) {
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

    // Sort orders
    if (filter.sortBy === 'customer') {
      orders.sort((a, b) => a.customerName.localeCompare(b.customerName));
    } else if (filter.sortBy === 'orderNumber') {
      orders.sort((a, b) => {
        const orderA = a.orderNumber || '';
        const orderB = b.orderNumber || '';
        return orderA.localeCompare(orderB, undefined, { numeric: true });
      });
    } else {
      // Default sort by date then customer
      orders.sort((a, b) => {
        const dateDiff = moment(a.orderDate).diff(moment(b.orderDate));
        if (dateDiff !== 0) return dateDiff;
        return a.customerName.localeCompare(b.customerName);
      });
    }

    const tableData: any[] = [];

    orders.forEach(order => {
      order.items.forEach((item, index) => {
        const row: any[] = [];
        const isFirst = index === 0;
        const rowSpan = order.items.length;

        if (isFirst) {
          row.push({ content: moment(order.orderDate).format('DD.MM.YYYY'), rowSpan: rowSpan, styles: { valign: 'middle' } });
          row.push({ content: order.orderNumber || '', rowSpan: rowSpan, styles: { valign: 'middle' } });
          
          let customerInfo = order.customerName;
          if (order.customerPhone) {
            customerInfo += `\n${order.customerPhone}`;
          }
          row.push({ content: customerInfo, rowSpan: rowSpan, styles: { valign: 'middle' } });
        }

        row.push(item.productName);
        row.push(`${item.quantity} ${item.unit}`);
        row.push(item.notes || '');

        tableData.push(row);
      });
    });

    autoTable(doc, {
      head: [['Datum', 'Bestellnr.', 'Kunde', 'Produkt', 'Menge', 'Notiz']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3, valign: 'top' },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        4: { cellWidth: 25 } // Increase width for Quantity column
      }
    });

    doc.save(`Bestellbericht_${filter.market}_${moment().format('YYYYMMDD_HHmmss')}.pdf`);
  }

  generateCrateOverview(crates: CrateRecord[]) {
    const doc = new jsPDF();
    const title = `Übersicht Rote Kisten - ${moment().format('DD.MM.YYYY')}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const tableData = crates.map(crate => [
      crate.customerName,
      crate.count,
      moment(crate.lastUpdated).format('DD.MM.YYYY HH:mm')
    ]);

    autoTable(doc, {
      head: [['Kunde', 'Anzahl', 'Zuletzt aktualisiert']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    });

    doc.save(`rote-kisten-uebersicht-${moment().format('YYYY-MM-DD')}.pdf`);
  }

  generateCustomerCrateReport(crate: CrateRecord) {
    const doc = new jsPDF();
    const title = `Kisten-Historie - ${crate.customerName}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Aktueller Bestand: ${crate.count} Kisten`, 14, 32);
    doc.text(`Stand: ${moment().format('DD.MM.YYYY HH:mm')}`, 14, 39);

    const history = crate.history || [];
    // Sort history by date descending (newest first)
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const tableData = history.map(entry => [
      moment(entry.date).format('DD.MM.YYYY HH:mm'),
      entry.action === 'borrow' ? 'Ausgeliehen' : 'Zurückgegeben',
      Math.abs(entry.change).toString()
    ]);

    autoTable(doc, {
      head: [['Datum', 'Aktion', 'Anzahl']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' }
      }
    });

    doc.save(`kisten-historie-${crate.customerName.replace(/\s+/g, '_')}-${moment().format('YYYY-MM-DD')}.pdf`);
  }

  generateWeeklyOfferReport(offer: Offer) {
    const doc = new jsPDF();
    const title = `Wochenangebot KW ${offer.week} / ${offer.year}`;

    doc.setFontSize(20);
    doc.text(title, 14, 22);

    doc.setFontSize(12);
    doc.text(`Gültig für die Woche ${offer.week}`, 14, 32);

    const tableData = offer.items.map(item => [
      item.productName,
      item.puNumber,
      item.price ? `${item.price.toFixed(2)} €` : '-',
      item.soldQuantity ? `${item.soldQuantity}` : '-'
    ]);

    autoTable(doc, {
      head: [['Produkt', 'PU-Nummer', 'Preis', 'Verkauft']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 12, cellPadding: 5 }
    });

    if (offer.notes) {
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.text('Notizen:', 14, finalY + 10);
      doc.setFontSize(10);
      doc.text(offer.notes, 14, finalY + 17);
    }

    doc.save(`angebot-kw${offer.week}-${offer.year}.pdf`);
  }

  generateOfferOverview(offers: Offer[], year: number) {
    const doc = new jsPDF();
    const title = `Angebotsübersicht ${year}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Sort by week
    offers.sort((a, b) => a.week - b.week);

    const tableData = offers.map(offer => {
      const p1 = offer.items[0];
      const p2 = offer.items[1];
      return [
        `KW ${offer.week}`,
        `${p1?.productName || '-'} (${p1?.soldQuantity || 0})`,
        `${p2?.productName || '-'} (${p2?.soldQuantity || 0})`
      ];
    });

    autoTable(doc, {
      head: [['Woche', 'Produkt 1 (Verkauf)', 'Produkt 2 (Verkauf)']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 10, cellPadding: 3 }
    });

    doc.save(`angebotsuebersicht-${year}.pdf`);
  }

  generateProductionReport(orders: Order[], filter: any, products: Product[] = []) {
    const doc = new jsPDF();
    let title = `Produktionsbericht`;

    if (filter.dateType === 'day') {
      title += ` - ${moment(filter.date).format('DD.MM.YYYY')}`;
    } else if (filter.dateType === 'range') {
      title += ` - ${moment(filter.startDate).format('DD.MM.YYYY')} bis ${moment(filter.endDate).format('DD.MM.YYYY')}`;
    } else {
      title += ` - KW ${filter.week} / ${filter.year}`;
    }

    if (filter.product && filter.product.length > 0) {
      if (filter.product.length === 1) {
        title += ` (${filter.product[0]})`;
      } else {
        title += ` (${filter.product.length} Produkte)`;
      }
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    // Aggregate products
    const productMap = new Map<string, { name: string, quantity: number, unit: string, puNumber: string }>();

    orders.forEach(order => {
      order.items.forEach(item => {
        // Filter by product if specified
        if (filter.product && filter.product.length > 0 && !filter.product.includes(item.productName)) {
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
            unit: item.unit,
            puNumber: this.getPuNumber(item.productName, products)
          });
        }
      });
    });

    let aggregatedItems = Array.from(productMap.values());

    // Sort items
    if (filter.sortBy === 'puNumber') {
      aggregatedItems.sort((a, b) => {
        const puA = a.puNumber || '';
        const puB = b.puNumber || '';
        return puA.localeCompare(puB, undefined, { numeric: true });
      });
    } else {
      // Default abc
      aggregatedItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    const tableData = aggregatedItems.map(p => [
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

  private getPuNumber(productName: string, products: Product[]): string {
    const product = products.find(p => p.name === productName);
    return product ? product.puNumber : '';
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
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Erstellt am ${moment().format('DD.MM.YYYY HH:mm')}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Bestellung_${order.customerName.replace(/\s+/g, '_')}_${moment(order.orderDate).format('YYYYMMDD')}.pdf`);
  }
}
