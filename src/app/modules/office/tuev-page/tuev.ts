import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Vehicle } from '../../../core/models';
import { TuevService } from '../../../core/services/tuev.service';
import { RenewDialog } from './dialog/renew-dialog/renew-dialog';
import { VehicleDialog } from './dialog/vehicle-dialog/vehicle-dialog';
import { VehicleImageComponent } from './vehicle-image.component';

@Component({
    selector: 'app-tuev',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatCardModule,
        HasPermissionDirective,
        VehicleImageComponent
    ],
    templateUrl: './tuev.html',
    styleUrls: ['./tuev.scss']
})
export class Tuev implements OnInit {
    vehicles: Vehicle[] = [];
    displayedColumns: string[] = ['image', 'licensePlate', 'name', 'type', 'nextTuevDate', 'actions'];

    constructor(
        private tuevService: TuevService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private location: Location
    ) { }

    ngOnInit() {
        this.loadVehicles();
    }

    goBack() {
        this.location.back();
    }

    loadVehicles() {
        this.tuevService.getVehicles().subscribe(vehicles => {
            this.vehicles = vehicles;
        });
    }

    getVehicleTypeLabel(type: string): string {
        const types: { [key: string]: string } = {
            'car': 'Auto',
            'truck': 'LKW',
            'trailer': 'Hänger',
            'tractor': 'Traktor',
            'other': 'Sonstiges'
        };
        return types[type] || type;
    }

    openAddVehicleDialog() {
        const dialogRef = this.dialog.open(VehicleDialog, {
            data: {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const { vehicle, file } = result;
                this.tuevService.addVehicle(vehicle, file).then(() => {
                    this.snackBar.open('Fahrzeug erstellt', 'OK', { duration: 3000 });
                });
            }
        });
    }

    openEditVehicleDialog(vehicle: Vehicle) {
        const dialogRef = this.dialog.open(VehicleDialog, {
            data: { vehicle }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const { vehicle: formValue, file } = result;
                const updatedVehicle = { ...vehicle, ...formValue };
                this.tuevService.updateVehicle(updatedVehicle, file).then(() => {
                    this.snackBar.open('Fahrzeug aktualisiert', 'OK', { duration: 3000 });
                });
            }
        });
    }

    openRenewDialog(vehicle: Vehicle) {
        const dialogRef = this.dialog.open(RenewDialog, {
            data: { vehicle }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.tuevService.renewTuev(vehicle, result).then(() => {
                    this.snackBar.open('TÜV erneuert', 'OK', { duration: 3000 });
                });
            }
        });
    }

    deleteVehicle(vehicle: Vehicle) {
        if (confirm(`Möchten Sie das Fahrzeug ${vehicle.licensePlate} wirklich löschen?`)) {
            this.tuevService.deleteVehicle(vehicle._id!).then(() => {
                this.snackBar.open('Fahrzeug gelöscht', 'OK', { duration: 3000 });
            });
        }
    }

    isExpired(date: Date): boolean {
        if (!date) return false;
        return new Date(date) < new Date();
    }

    isSoonExpired(date: Date): boolean {
        if (!date) return false;
        const now = new Date();
        const expiry = new Date(date);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
    }
}
