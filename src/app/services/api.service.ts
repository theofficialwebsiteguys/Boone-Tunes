import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    if (params) {
      const httpParams = Object.entries(params).reduce(
        (p, [k, v]) => p.set(k, String(v)),
        new HttpParams()
      );
      return this.http.get<T>(`${this.base}${path}`, { params: httpParams });
    }
    return this.http.get<T>(`${this.base}${path}`);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }
}
