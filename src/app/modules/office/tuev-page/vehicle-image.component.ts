import { Component, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CouchDbService } from '../../../core/services/pouchdb.service';
import { ImagePreviewDialog } from './dialog/image-preview-dialog/image-preview-dialog';

@Component({
    selector: 'app-vehicle-image',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
        <div class="vehicle-image-container" (click)="openPreview($event)">
            <img *ngIf="imageUrl" [src]="imageUrl" class="vehicle-thumbnail" alt="Fahrzeugbild">
            <div *ngIf="!imageUrl" class="placeholder">
                <mat-icon>directions_car</mat-icon>
            </div>
        </div>
    `,
    styles: [`
        .vehicle-image-container {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            overflow: hidden;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f0f0f0;
            margin-right: 8px;
        }
        .vehicle-thumbnail {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .placeholder {
            color: #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `]
})
export class VehicleImageComponent implements OnChanges, OnDestroy {
    @Input() vehicle: any;
    imageUrl: string | null = null;

    constructor(private couchDbService: CouchDbService, private dialog: MatDialog) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['vehicle'] && this.vehicle) {
            this.loadImage();
        }
    }

    ngOnDestroy() {
        if (this.imageUrl) {
            URL.revokeObjectURL(this.imageUrl);
        }
    }

    loadImage() {
        if (this.vehicle._attachments && this.vehicle._attachments['vehicle-image']) {
            this.couchDbService.getAttachment(this.vehicle._id, 'vehicle-image').then(blob => {
                if (this.imageUrl) {
                    URL.revokeObjectURL(this.imageUrl);
                }
                this.imageUrl = URL.createObjectURL(blob);
            }).catch(err => {
                console.error('Error loading image', err);
                this.imageUrl = null;
            });
        } else {
            this.imageUrl = null;
        }
    }

    openPreview(event: Event) {
        event.stopPropagation();
        if (this.imageUrl) {
            this.dialog.open(ImagePreviewDialog, {
                data: { imageUrl: this.imageUrl },
                panelClass: 'image-preview-dialog'
            });
        }
    }
}
