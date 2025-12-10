
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { User } from '../../core/models/user.model';
import { MatPaginatorIntlDe } from '../../core/services/paginator-intl';
import { PermissionService } from '../../core/services/permission.service';
import { ProductService } from '../../core/services/product.service';
import { UserService } from '../../core/services/user.service';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog';
import { UserDialogComponent } from './user-dialog/user-dialog';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule
],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorIntlDe }
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['name', 'email', 'group', 'status', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private router: Router,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private permissionService: PermissionService
  ) { }

  getGroupLabel(group: string): string {
    const groups = this.permissionService.getGroups();
    const found = groups.find(g => g.value === group);
    return found ? found.label : group;
  }

  async cleanupProducts() {
    try {
      const count = await this.productService.cleanupDuplicates();
      this.snackBar.open(`${count} doppelte Produkte wurden entfernt.`, 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Fehler beim Bereinigen:', error);
      this.snackBar.open('Fehler beim Bereinigen der Produkte.', 'OK', { duration: 3000 });
    }
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.dataSource.data = users;
    });
  }

  goBack(): void {
    this.router.navigate(['/landing']);
  }

  openUserDialog(user?: User): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '500px',
      data: user ? { ...user } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result._id) {
          this.userService.updateUser(result);
        } else {
          this.userService.addUser(result);
        }
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Möchten Sie den Benutzer ${user.name} wirklich löschen?`)) {
      if (user._id) {
        this.userService.deleteUser(user._id);
      }
    }
  }

  toggleLock(user: User): void {
    const updatedUser = { ...user, isLocked: !user.isLocked };
    this.userService.updateUser(updatedUser);
  }

  changePassword(user: User): void {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '400px',
      data: { isAdminReset: true }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.newPassword) {
        const updatedUser = { ...user, password: result.newPassword };
        this.userService.updateUser(updatedUser).then(() => {
          // Optional: Show success message
        });
      }
    });
  }
}
