import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const addToken = (r: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = auth.getAccessToken();
    if (!token) return r;
    return r.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  };

  return next(addToken(req)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      const refreshToken = auth.getRefreshToken();
      if (!refreshToken) {
        auth.logout();
        router.navigate(['/']);
        return throwError(() => err);
      }

      return http
        .post<{ accessToken: string }>(`${environment.apiUrl}/api/auth/refresh`, { refreshToken })
        .pipe(
          switchMap(res => {
            auth.setAccessToken(res.accessToken);
            return next(addToken(req));
          }),
          catchError(refreshErr => {
            auth.logout();
            router.navigate(['/']);
            return throwError(() => refreshErr);
          })
        );
    })
  );
};
