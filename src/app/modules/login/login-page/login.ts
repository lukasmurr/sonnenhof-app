import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  public loginForm!: FormGroup;
  public hidePassword = signal(true);
  public isLoading = signal(false);
  public loginError = signal<string | null>(null);

  private readonly returnUrl: string = '/landing';
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  constructor() {
    // Get return URL from route parameters or default to landing
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/landing';
    this.initializeForm();

    // If already logged in, redirect to landing
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  public togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }

  public async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginError.set('Bitte füllen Sie alle Felder korrekt aus.');
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    try {
      const { email, password, rememberMe } = this.loginForm.value;

      // Verwende AuthService für Login
      const success = await this.authService.login(email, password);
      
      if (success) {
        // Optionaler "Remember Me" Feature
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        }

        this.router.navigate([this.returnUrl]);
      } else {
        this.loginError.set('Email oder Passwort ist falsch.');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.loginError.set('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      this.isLoading.set(false);
    }
  }

  public getEmailError(): string {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email ist erforderlich.';
    }
    if (emailControl?.hasError('email')) {
      return 'Bitte geben Sie eine gültige Email ein.';
    }
    return '';
  }

  public getPasswordError(): string {
    const passwordControl = this.loginForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'Passwort ist erforderlich.';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'Passwort muss mindestens 6 Zeichen lang sein.';
    }
    return '';
  }
}
