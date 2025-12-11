import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { CrateRecord } from '../../../core/models/crate.model';
import { CrateService } from '../../../core/services/crate.service';
import { PdfService } from '../../../core/services/pdf.service';
import { CrateDialogComponent } from './dialog/crate-dialog';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-crates',
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
        HasPermissionDirective,
        DatePipe
    ],
    templateUrl: './crates.html',
    styleUrls: ['./crates.scss']
})
export class CratesComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['customerName', 'count', 'lastUpdated', 'actions'];
    dataSource: MatTableDataSource<CrateRecord>;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private crateService: CrateService,
        private dialog: MatDialog,
        private pdfService: PdfService,
        private router: Router
    ) {
        this.dataSource = new MatTableDataSource();
    }

    ngOnInit(): void {
        this.loadCrates();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    goBack() {
        this.router.navigate(['/butchery']);
    }

    loadCrates() {
        this.crateService.getCrates().subscribe(crates => {
            this.dataSource.data = crates;
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    openCrateDialog(record?: CrateRecord) {
        const dialogRef = this.dialog.open(CrateDialogComponent, {
            width: '400px',
            data: { 
                record,
                mode: record ? 'edit' : 'create'
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (record) {
                    // Update existing (Name only)
                    const updatedRecord: CrateRecord = {
                        ...record,
                        customerName: result.customerName,
                        lastUpdated: new Date().toISOString()
                    };
                    this.crateService.updateCrateRecord(updatedRecord);
                } else {
                    // Create new
                    const newRecord: Omit<CrateRecord, '_id' | '_rev' | 'type'> = {
                        customerName: result.customerName,
                        count: result.amount,
                        lastUpdated: new Date().toISOString(),
                        history: [
                            {
                                date: new Date().toISOString(),
                                change: result.amount,
                                action: 'borrow'
                            }
                        ]
                    };
                    this.crateService.addCrateRecord(newRecord);
                }
            }
        });
    }

    openTransactionDialog(record: CrateRecord, type: 'borrow' | 'return') {
        const dialogRef = this.dialog.open(CrateDialogComponent, {
            width: '400px',
            data: { 
                record,
                mode: 'transaction',
                transactionType: type
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const change = type === 'borrow' ? result.amount : -result.amount;
                const updatedRecord: CrateRecord = {
                    ...record,
                    count: record.count + change,
                    lastUpdated: new Date().toISOString(),
                    history: [
                        ...(record.history || []),
                        {
                            date: new Date().toISOString(),
                            change: change,
                            action: type
                        }
                    ]
                };
                this.crateService.updateCrateRecord(updatedRecord);
            }
        });
    }

    deleteCrateRecord(record: CrateRecord) {
        if (confirm(`Möchten Sie den Eintrag für ${record.customerName} wirklich löschen?`)) {
            if (record._id) {
                this.crateService.deleteCrateRecord(record._id);
            }
        }
    }

    printCustomerReport(record: CrateRecord) {
        this.pdfService.generateCustomerCrateReport(record);
    }

    generatePdf() {
        this.pdfService.generateCrateOverview(this.dataSource.data);
    }
}
