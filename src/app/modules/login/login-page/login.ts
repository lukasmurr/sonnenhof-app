import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  loginForm!: FormGroup;
  hidePassword = signal(true);
  isLoading = signal(false);
  loginError = signal<string | null>(null);
  private returnUrl: string = '/landing';

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  constructor() {
    // Get return URL from route parameters or default to landing
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/landing';
    this.initializeForm();

    // If already logged in, redirect to landing
    if (this.authService.isUserLoggedIn()) {
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

  togglePasswordVisibility(): void {
    this.hidePassword.update(value => !value);
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginError.set('Bitte füllen Sie alle Felder korrekt aus.');
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    // Simuliere Login-Prozess (in Produktion würde hier ein API-Call stattfinden)
    setTimeout(() => {
      const { email, password, rememberMe } = this.loginForm.value;

      // Verwende AuthService für Login
      if (this.authService.login(email, password)) {
        // Optionaler "Remember Me" Feature
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email);
        }

        this.isLoading.set(false);
        this.router.navigate([this.returnUrl]);
      } else {
        this.isLoading.set(false);
        this.loginError.set('Email oder Passwort ist falsch.');
      }
    }, 1500);
  }

  forgotPassword(): void {
    console.log('Passwort vergessen - Seite würde hier implementiert');
  }

  getEmailError(): string {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Email ist erforderlich.';
    }
    if (emailControl?.hasError('email')) {
      return 'Bitte geben Sie eine gültige Email ein.';
    }
    return '';
  }

  getPasswordError(): string {
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
