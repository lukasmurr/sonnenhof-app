import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { MatPaginatorIntlDe } from '../../core/services/paginator-intl';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog';
import { UserDialogComponent } from './user-dialog/user-dialog';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorIntlDe }
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit, AfterViewInit {
  dataSource = new MatTableDataSource<User>([]);
  displayedColumns: string[] = ['name', 'email', 'role', 'status', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private router: Router
  ) { }

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
