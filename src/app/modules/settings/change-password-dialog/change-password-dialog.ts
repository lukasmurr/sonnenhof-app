import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
    selector: 'app-change-password-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule
    ],
    template: `
    <h2 mat-dialog-title>Passwort ändern</h2>
    <mat-dialog-content>
      <form [formGroup]="passwordForm" class="password-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Aktuelles Passwort</mat-label>
          <input matInput formControlName="currentPassword" type="password">
          <mat-error *ngIf="passwordForm.get('currentPassword')?.hasError('required')">
            Aktuelles Passwort ist erforderlich
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Neues Passwort</mat-label>
          <input matInput formControlName="newPassword" type="password">
          <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('required')">
            Neues Passwort ist erforderlich
          </mat-error>
          <mat-error *ngIf="passwordForm.get('newPassword')?.hasError('minlength')">
            Mindestens 6 Zeichen
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Passwort bestätigen</mat-label>
          <input matInput formControlName="confirmPassword" type="password">
          <mat-error *ngIf="passwordForm.hasError('mismatch') && passwordForm.get('confirmPassword')?.touched">
            Passwörter stimmen nicht überein
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Abbrechen</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="passwordForm.invalid">
        Ändern
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    .full-width { width: 100%; }
    .password-form { display: flex; flex-direction: column; gap: 16px; padding-top: 8px; }
  `]
})
export class ChangePasswordDialogComponent {
    passwordForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<ChangePasswordDialogComponent>
    ) {
        this.passwordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onSave(): void {
        if (this.passwordForm.valid) {
            this.dialogRef.close(this.passwordForm.value);
        }
    }
}
