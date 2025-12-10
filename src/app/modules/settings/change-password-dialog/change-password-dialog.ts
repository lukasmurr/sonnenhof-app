
import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
],
  templateUrl: './change-password-dialog.html',
  styleUrls: ['./change-password-dialog.scss']
})
export class ChangePasswordDialogComponent {
  passwordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ChangePasswordDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { isAdminReset: boolean } | null
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: [this.data?.isAdminReset ? '' : '', this.data?.isAdminReset ? [] : [Validators.required]],
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
