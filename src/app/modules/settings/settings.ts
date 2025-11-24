import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user.model';
import { UserDialogComponent } from './user-dialog/user-dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule,
    MatMenuModule
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class SettingsComponent implements OnInit {
  users: User[] = [];
  displayedColumns: string[] = ['name', 'email', 'role', 'status', 'actions'];

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
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
}
