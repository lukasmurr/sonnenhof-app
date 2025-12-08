import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { TuevService } from '../../../core/services/tuev.service';
import { Vehicle } from '../../../core/models';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';

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
        HasPermissionDirective
    ],
    templateUrl: './tuev.html',
    styleUrls: ['./tuev.scss']
})
export class Tuev implements OnInit {
    vehicles: Vehicle[] = [];
    displayedColumns: string[] = ['licensePlate', 'name', 'type', 'nextTuevDate', 'actions'];

    vehicleForm: FormGroup;
    renewForm: FormGroup;
    selectedVehicle: Vehicle | null = null;

    @ViewChild('vehicleDialog') vehicleDialog!: TemplateRef<any>;
    @ViewChild('renewDialog') renewDialog!: TemplateRef<any>;

    constructor(
        private tuevService: TuevService,
        private fb: FormBuilder,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) {
        this.vehicleForm = this.fb.group({
            _id: [null],
            licensePlate: ['', [Validators.required, this.licensePlateValidator]],
            name: ['', Validators.required],
            type: ['car', Validators.required],
            nextTuevDate: [null, Validators.required]
        });

        this.renewForm = this.fb.group({
            nextTuevDate: [null, Validators.required]
        });
    }

    ngOnInit() {
        this.loadVehicles();
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
        this.selectedVehicle = null;
        this.vehicleForm.reset({ type: 'car' });
        this.dialog.open(this.vehicleDialog);
    }

    openEditVehicleDialog(vehicle: Vehicle) {
        this.selectedVehicle = vehicle;
        this.vehicleForm.patchValue(vehicle);
        this.dialog.open(this.vehicleDialog);
    }

    openRenewDialog(vehicle: Vehicle) {
        this.selectedVehicle = vehicle;
        this.renewForm.reset();
        this.dialog.open(this.renewDialog);
    }

    saveVehicle() {
        if (this.vehicleForm.valid) {
            const vehicleData = this.vehicleForm.value;
            if (this.selectedVehicle && this.selectedVehicle._id) {
                // Update
                const updatedVehicle = { ...this.selectedVehicle, ...vehicleData };
                this.tuevService.updateVehicle(updatedVehicle).then(() => {
                    this.snackBar.open('Fahrzeug aktualisiert', 'OK', { duration: 3000 });
                    this.dialog.closeAll();
                });
            } else {
                // Create
                this.tuevService.addVehicle(vehicleData).then(() => {
                    this.snackBar.open('Fahrzeug erstellt', 'OK', { duration: 3000 });
                    this.dialog.closeAll();
                });
            }
        }
    }

    deleteVehicle(vehicle: Vehicle) {
        if (confirm(`Möchten Sie das Fahrzeug ${vehicle.licensePlate} wirklich löschen?`)) {
            this.tuevService.deleteVehicle(vehicle._id!).then(() => {
                this.snackBar.open('Fahrzeug gelöscht', 'OK', { duration: 3000 });
            });
        }
    }

    saveRenew() {
        if (this.renewForm.valid && this.selectedVehicle) {
            const newDate = this.renewForm.value.nextTuevDate;
            this.tuevService.renewTuev(this.selectedVehicle, newDate).then(() => {
                this.snackBar.open('TÜV erneuert', 'OK', { duration: 3000 });
                this.dialog.closeAll();
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

    formatLicensePlate() {
        let value = this.vehicleForm.get('licensePlate')?.value;
        if (!value) return;

        // Remove all non-alphanumeric characters
        value = value.replace(/[^a-zA-Z0-9äöüÄÖÜ]/g, '').toUpperCase();

        // Try to format if it looks like a license plate
        // Simple heuristic: 1-3 letters (City) + 1-2 letters + 1-4 numbers
        // Example: DONLM320 -> DON-LM-320

        // Regex to split parts: ^([A-ZÄÖÜ]{1,3})([A-Z]{1,2})([0-9]{1,4})$
        const match = value.match(/^([A-ZÄÖÜ]{1,3})([A-Z]{1,2})([0-9]{1,4})$/);

        if (match) {
            const formatted = `${match[1]}-${match[2]}-${match[3]}`;
            this.vehicleForm.get('licensePlate')?.setValue(formatted);
        }
    }

    licensePlateValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        if (!value) return null;

        // Regex for format: CITY-LETTERS-NUMBERS
        // City: 1-3 letters (including umlauts)
        // Letters: 1-2 letters (A-Z only)
        // Numbers: 1-4 digits (1-9999)
        // Total length check is implicit in the parts check mostly, but we can check total length too if needed.

        const regex = /^[A-ZÄÖÜ]{1,3}-[A-Z]{1,2}-[1-9][0-9]{0,3}$/;

        if (!regex.test(value)) {
            return { invalidFormat: true };
        }

        return null;
    }
}
