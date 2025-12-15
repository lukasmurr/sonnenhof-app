import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-image-preview-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="preview-container">
            <img [src]="data.imageUrl" class="preview-image">
            <button mat-icon-button class="close-button" mat-dialog-close>
                <mat-icon>close</mat-icon>
            </button>
        </div>
    `,
    styles: [`
        .preview-container {
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: black;
        }
        .preview-image {
            max-width: 100%;
            max-height: 90vh;
            object-fit: contain;
        }
        .close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            color: white;
            background: rgba(0,0,0,0.5);
        }
    `]
})
export class ImagePreviewDialog {
    constructor(@Inject(MAT_DIALOG_DATA) public data: { imageUrl: string }) {}
}
