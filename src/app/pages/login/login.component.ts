import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  email = '';
  password = '';
  error = '';
  loading = false;

  loginWithSpotify(): void {
    window.location.href = `${environment.apiUrl}/api/auth/spotify`;
  }

  login(): void {
    this.error = '';
    this.loading = true;
    this.api
      .post<{ accessToken: string; refreshToken: string }>('/api/auth/login', {
        email: this.email,
        password: this.password
      })
      .subscribe({
        next: tokens => {
          this.auth.storeTokens(tokens);
          this.auth.loadUser().subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: () => {
              this.error = 'Failed to load profile.';
              this.loading = false;
            }
          });
        },
        error: () => {
          this.error = 'Invalid email or password.';
          this.loading = false;
        }
      });
  }

  register(): void {
    this.error = '';
    this.loading = true;
    this.api
      .post<{ accessToken: string; refreshToken: string }>('/api/auth/register', {
        email: this.email,
        password: this.password
      })
      .subscribe({
        next: tokens => {
          this.auth.storeTokens(tokens);
          this.auth.loadUser().subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: () => {
              this.error = 'Failed to load profile.';
              this.loading = false;
            }
          });
        },
        error: () => {
          this.error = 'Registration failed. Try a different email.';
          this.loading = false;
        }
      });
  }
}
