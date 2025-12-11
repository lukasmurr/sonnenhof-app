import { AfterViewInit, Component, OnInit, ViewChild, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Offer } from '../../../core/models/offer.model';
import { OfferService } from '../../../core/services/offer.service';
import { PdfService } from '../../../core/services/pdf.service';
import { OfferDialogComponent } from './dialog/offer-dialog';

@Component({
    selector: 'app-offers',
    standalone: true,
    imports: [
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatTabsModule,
        MatSelectModule,
        FormsModule,
        HasPermissionDirective
    ],
    templateUrl: './offers.html',
    styleUrls: ['./offers.scss']
})
export class OffersComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['week', 'product1', 'product2', 'actions'];
    dataSource: MatTableDataSource<Offer>;
    
    offers = signal<Offer[]>([]);
    selectedYear = signal<number>(new Date().getFullYear());
    availableYears: number[] = [];
    calendarWeeks: { week: number, offer?: Offer }[] = [];

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private offerService: OfferService,
        private dialog: MatDialog,
        private pdfService: PdfService,
        private router: Router
    ) {
        this.dataSource = new MatTableDataSource();
        
        // Generate years (current - 1 to current + 2)
        const current = new Date().getFullYear();
        this.availableYears = [current - 1, current, current + 1, current + 2];
    }

    ngOnInit(): void {
        this.loadOffers();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    goBack() {
        this.router.navigate(['/butchery']);
    }

    loadOffers() {
        this.offerService.getOffers().subscribe(allOffers => {
            this.offers.set(allOffers);
            this.filterOffers();
        });
    }

    filterOffers() {
        const filtered = this.offers().filter(o => o.year === this.selectedYear());
        filtered.sort((a, b) => a.week - b.week);
        this.dataSource.data = filtered;

        this.calendarWeeks = [];
        for (let i = 1; i <= 52; i++) {
            this.calendarWeeks.push({
                week: i,
                offer: filtered.find(o => o.week === i)
            });
        }
    }

    createNewOffer(week: number) {
        const newOffer: Offer = {
            type: 'offer',
            year: this.selectedYear(),
            week: week,
            items: []
        };
        this.openOfferDialog(newOffer);
    }

    onYearChange() {
        this.filterOffers();
    }

    openOfferDialog(offer?: Offer) {
        const dialogRef = this.dialog.open(OfferDialogComponent, {
            width: '600px',
            data: { 
                offer,
                allOffers: this.offers()
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (offer) {
                    // Update
                    const updatedOffer: Offer = {
                        ...offer,
                        ...result
                    };
                    this.offerService.updateOffer(updatedOffer);
                } else {
                    // Create
                    this.offerService.addOffer(result);
                }
            }
        });
    }

    deleteOffer(offer: Offer) {
        if (confirm(`Möchten Sie das Angebot für KW ${offer.week}/${offer.year} wirklich löschen?`)) {
            if (offer._id) {
                this.offerService.deleteOffer(offer._id);
            }
        }
    }

    printWeeklyReport(offer: Offer) {
        this.pdfService.generateWeeklyOfferReport(offer);
    }

    printYearlyOverview() {
        this.pdfService.generateOfferOverview(this.dataSource.data, this.selectedYear());
    }
}
