import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  currentUser$ = new BehaviorSubject<User | null>(null);

  /** Store tokens + user (full session). */
  setSession(tokens: { accessToken: string; refreshToken: string }, user: User): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.currentUser$.next(user);
  }

  /** Store only tokens — use before calling loadUser() so the interceptor can attach them. */
  storeTokens(tokens: { accessToken: string; refreshToken: string }): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  /** Clear local state only. Callers are responsible for hitting POST /api/auth/logout first. */
  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.currentUser$.next(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  /** GET /api/auth/me — returns the User directly and updates currentUser$. */
  loadUser(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/api/auth/me`)
      .pipe(tap(user => this.currentUser$.next(user)));
  }

  /** Called by APP_INITIALIZER to restore session on page load. */
  initSession(): Promise<void> {
    if (!this.isLoggedIn()) return Promise.resolve();
    return this.loadUser()
      .toPromise()
      .then(() => {})
      .catch(() => this.logout());
  }
}
