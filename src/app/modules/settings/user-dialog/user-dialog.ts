import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User, UserGroup } from '../../../core/models/user.model';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './user-dialog.html',
  styles: [`
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 16px; }
  `]
})
export class UserDialogComponent {
  userForm: FormGroup;
  isEditMode: boolean;
  groups: { value: UserGroup, label: string }[];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    private permissionService: PermissionService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
    this.isEditMode = !!data;
    this.groups = this.permissionService.getGroups();

    // Determine initial group
    let initialGroup: UserGroup = 'sales';
    if (data?.group) {
        initialGroup = data.group;
    }

    this.userForm = this.fb.group({
      _id: [data?._id],
      _rev: [data?._rev],
      type: [data?.type || 'user'],
      createdAt: [data?.createdAt],
      name: [data?.name || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      password: [data?.password || '', this.isEditMode ? [] : [Validators.required]],
      group: [initialGroup, Validators.required],
      isLocked: [data?.isLocked || false]
    });

    if (!this.isEditMode) {
        this.generateAndCopyPassword();
    }
  }

  generateAndCopyPassword() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      this.userForm.patchValue({ password });
      
      navigator.clipboard.writeText(password).then(() => {
          this.snackBar.open('Passwort generiert und kopiert!', 'OK', { duration: 3000 });
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.getRawValue();
      
      const userData: User = {
          ...formValue
      };

      this.dialogRef.close(userData);
    }
  }
}
