import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Permission, User, UserGroup } from '../../../core/models/user.model';
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
    MatExpansionModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './user-dialog.html',
  styles: [`
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 16px; }
    .permissions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 8px;
        padding: 8px 0;
    }
  `]
})
export class UserDialogComponent {
  userForm: FormGroup;
  isEditMode: boolean;
  groups: { value: UserGroup, label: string }[];
  allPermissions: Permission[];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<UserDialogComponent>,
    private permissionService: PermissionService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: User | null
  ) {
    this.isEditMode = !!data;
    this.groups = this.permissionService.getGroups();
    this.allPermissions = this.permissionService.getAllPermissions();

    // Determine initial group
    let initialGroup: UserGroup = 'sales';
    if (data?.group) {
        initialGroup = data.group;
    } else if (data?.role === 'admin') {
        initialGroup = 'admin';
    }

    this.userForm = this.fb.group({
      _id: [data?._id],
      _rev: [data?._rev],
      type: [data?.type || 'user'],
      createdAt: [data?.createdAt],
      name: [data?.name || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      password: [data?.password || '', this.isEditMode ? [] : [Validators.required]],
      role: [data?.role || 'user'], // Keep for backward compatibility
      group: [initialGroup, Validators.required],
      isLocked: [data?.isLocked || false],
      permissions: this.fb.group({})
    });

    this.initPermissions();
    this.setupGroupListener();

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

  private initPermissions() {
    const permissionsGroup = this.userForm.get('permissions') as FormGroup;
    
    // Add control for each permission
    this.allPermissions.forEach(p => {
        permissionsGroup.addControl(p, this.fb.control(false));
    });

    // Set values
    if (this.data?.permissions && this.data.permissions.length > 0) {
        this.data.permissions.forEach(p => {
            permissionsGroup.get(p)?.setValue(true);
        });
    } else {
        // Fallback to group defaults (either from existing user group or default 'sales')
        const group = this.userForm.get('group')?.value as UserGroup;
        this.setPermissionsForGroup(group);
    }
  }

  private setupGroupListener() {
      this.userForm.get('group')?.valueChanges.subscribe((group: UserGroup) => {
          this.setPermissionsForGroup(group);
      });
  }

  private setPermissionsForGroup(group: UserGroup) {
      if (!group) return;
      
      const permissionsGroup = this.userForm.get('permissions') as FormGroup;
      const groupPerms = this.permissionService.getGroupPermissions(group);
      
      // Reset all first
      this.allPermissions.forEach(p => {
          permissionsGroup.get(p)?.setValue(false);
      });

      // Set group perms
      if (groupPerms) {
          groupPerms.forEach(p => {
              permissionsGroup.get(p)?.setValue(true);
          });
      }
  }

  getPermissionLabel(p: Permission): string {
      return this.permissionService.getPermissionLabel(p);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
      const formValue = this.userForm.value;
      
      // Convert permissions object back to array
      const permissionsObj = formValue.permissions;
      const permissionsArray = Object.keys(permissionsObj).filter(key => permissionsObj[key]) as Permission[];
      
      const userData: User = {
          ...formValue,
          permissions: permissionsArray,
          // Auto-set role based on group for backward compatibility
          role: formValue.group === 'admin' ? 'admin' : 'user'
      };

      // Remove the permissions object from the result as we mapped it to array
      // (Actually we constructed a new object so it's fine)

      this.dialogRef.close(userData);
    }
  }
}
