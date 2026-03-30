import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.css'
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  errorMsg = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');

    if (error) {
      this.errorMsg = `Login failed: ${error}`;
      return;
    }

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      this.errorMsg = 'Missing tokens. Please try again.';
      return;
    }

    const tokens = { accessToken, refreshToken };
    this.auth.storeTokens(tokens);

    this.auth.loadUser().subscribe({
      next: user => {
        this.auth.setSession(tokens, user);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMsg = 'Failed to load user profile. Please try again.';
      }
    });
  }
}
