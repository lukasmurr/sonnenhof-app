import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { ConfirmationDialogComponent } from '../../../core/components/confirmation-dialog/confirmation-dialog';
import { SupplierPurchaseList, SupplierPurchaseSupplier } from '../../../core/models/supplier-purchase.model';
import { AuthService } from '../../../core/services/auth.service';
import { SupplierPurchaseService } from '../../../core/services/supplier-purchase.service';
import { SupplierPurchaseChecklistDialogComponent } from './dialog/supplier-purchase-checklist-dialog/supplier-purchase-checklist-dialog';
import { SupplierCreateDialogComponent } from './dialog/supplier-create-dialog/supplier-create-dialog';
import { SupplierTargetListDialogComponent } from './dialog/supplier-target-list-dialog/supplier-target-list-dialog';

interface SupplierSummary {
    supplier: SupplierPurchaseSupplier;
    lists: SupplierPurchaseList[];
}

@Component({
    selector: 'app-supplier-purchase',
    imports: [
        MatButtonModule,
        MatCardModule,
        MatDialogModule,
        MatIconModule,
        MatMenuModule
    ],
    templateUrl: './supplier-purchase.html',
    styleUrls: ['./supplier-purchase.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierPurchaseComponent implements OnInit {
    private readonly supplierPurchaseService = inject(SupplierPurchaseService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly router = inject(Router);

    readonly suppliers = signal<SupplierPurchaseSupplier[]>([]);
    readonly lists = signal<SupplierPurchaseList[]>([]);
    readonly canCreateSupplier = computed(() => this.authService.hasPermission('supplier-purchase.create'));
    readonly canUpdateSuppliers = computed(() => this.authService.hasPermission('supplier-purchase.update'));
    readonly canDeleteSuppliers = computed(() => this.authService.hasPermission('supplier-purchase.delete'));
    readonly canMaintainLists = computed(
        () => this.authService.hasPermission('supplier-purchase.create') || this.authService.hasPermission('supplier-purchase.update')
    );
    readonly canDeleteLists = computed(() => this.authService.hasPermission('supplier-purchase.delete'));
    readonly canProcessLists = computed(() => this.authService.hasPermission('supplier-purchase.view'));

    readonly supplierSummaries = computed<SupplierSummary[]>(() => {
        const suppliers = this.suppliers();
        const lists = this.lists();

        return suppliers
            .map(supplier => {
                const supplierLists = lists
                    .filter(entry => entry.supplierId === supplier._id)
                    .sort((a, b) => {
                        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
                        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
                        return bTime - aTime;
                    });

                return {
                    supplier,
                    lists: supplierLists
                };
            })
            .sort((a, b) => a.supplier.name.localeCompare(b.supplier.name, 'de'));
    });

    ngOnInit(): void {
        this.supplierPurchaseService.getSuppliers().subscribe(suppliers => {
            this.suppliers.set(suppliers);
        });

        this.supplierPurchaseService.getLists().subscribe(lists => {
            this.lists.set(lists);
        });
    }

    goBack(): void {
        this.router.navigate(['/butchery']);
    }

    openCreateSupplierDialog(): void {
        if (!this.canCreateSupplier()) {
            return;
        }

        const dialogRef = this.dialog.open(SupplierCreateDialogComponent, {
            width: 'min(520px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh'
        });

        dialogRef.afterClosed().subscribe(async result => {
            if (!result) {
                return;
            }

            await this.supplierPurchaseService.addSupplier(result);
        });
    }

    openEditSupplierDialog(summary: SupplierSummary): void {
        if (!this.canUpdateSuppliers()) {
            return;
        }

        const dialogRef = this.dialog.open(SupplierCreateDialogComponent, {
            width: 'min(520px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                supplier: summary.supplier
            }
        });

        dialogRef.afterClosed().subscribe(async result => {
            if (!result || !summary.supplier._id) {
                return;
            }

            await this.supplierPurchaseService.updateSupplier({
                ...summary.supplier,
                name: result.name,
                phone: result.phone,
                email: result.email
            });
        });
    }

    openDeleteSupplierDialog(summary: SupplierSummary): void {
        if (!this.canDeleteSuppliers() || !summary.supplier._id) {
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: 'min(460px, 95vw)',
            maxWidth: '95vw',
            data: {
                title: 'Lieferant löschen',
                message: `Möchten Sie den Lieferanten ${summary.supplier.name} wirklich löschen? Vorhandene Solllisten werden ebenfalls entfernt.`
            }
        });

        dialogRef.afterClosed().subscribe(async confirmed => {
            if (!confirmed || !summary.supplier._id) {
                return;
            }

            await this.supplierPurchaseService.deleteSupplier(summary.supplier._id);
        });
    }

    openCreateListDialog(summary: SupplierSummary): void {
        this.openTargetListDialog(summary.supplier);
    }

    openTargetListDialog(supplier: SupplierPurchaseSupplier, existingList?: SupplierPurchaseList): void {
        if (!this.canMaintainLists()) {
            return;
        }

        const dialogRef = this.dialog.open(SupplierTargetListDialogComponent, {
            width: 'min(920px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                supplier,
                existingList
            }
        });

        dialogRef.afterClosed().subscribe(async result => {
            if (!result || !supplier._id) {
                return;
            }

            await this.supplierPurchaseService.saveList(
                supplier._id,
                supplier.name,
                result.items,
                existingList?._id
            );
        });
    }

    openChecklistDialog(supplier: SupplierPurchaseSupplier, list: SupplierPurchaseList): void {
        if (!this.canProcessLists()) {
            return;
        }

        if (list.items.length === 0) {
            return;
        }

        this.dialog.open(SupplierPurchaseChecklistDialogComponent, {
            width: 'min(920px, 95vw)',
            maxWidth: '95vw',
            maxHeight: '92vh',
            data: {
                supplier,
                list
            }
        });
    }

    openDeleteListDialog(supplier: SupplierPurchaseSupplier, list: SupplierPurchaseList): void {
        if (!this.canDeleteLists() || !list._id) {
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: 'min(460px, 95vw)',
            maxWidth: '95vw',
            data: {
                title: 'Sollliste loeschen',
                message: `Moechten Sie diese Sollliste von ${supplier.name} wirklich loeschen?`
            }
        });

        dialogRef.afterClosed().subscribe(async confirmed => {
            if (!confirmed || !list._id) {
                return;
            }

            await this.supplierPurchaseService.deleteList(list._id);
        });
    }

    trackBySupplier(index: number, summary: SupplierSummary): string | number {
        return summary.supplier._id ?? index;
    }

    trackByList(index: number, list: SupplierPurchaseList): string | number {
        return list._id ?? `${list.supplierId}-${index}`;
    }

    listDisplayName(index: number, list: SupplierPurchaseList): string {
        const timestamp = list.updatedAt ?? list.createdAt;
        if (!timestamp) {
            return `Sollliste ${index + 1}`;
        }

        return `Sollliste ${index + 1} (${new Date(timestamp).toLocaleDateString('de-DE')})`;
    }
}
