import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isAuthenticated(): boolean {
    // Replace this with your actual authentication logic
    return !!localStorage.getItem('token');
  }

}
