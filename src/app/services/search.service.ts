import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Track } from '../models/track.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private api = inject(ApiService);

  search(query: string, limit = 20): Observable<{ tracks: Track[]; query: string; fromCache: boolean }> {
    return this.api.get('/api/search', { q: query, limit });
  }
}
