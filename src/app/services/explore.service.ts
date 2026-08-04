import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Track } from '../models/track.model';
import { TrendingVideo } from '../models/recommendation.model';

@Injectable({ providedIn: 'root' })
export class ExploreService {
  private api = inject(ApiService);

  /** Seeded from artist names already known client-side (from loaded playlists/liked songs). */
  getRecommendations(seedArtists: string[]): Observable<{ tracks: Track[] }> {
    return this.api.get('/api/explore/recommendations', {
      seedArtists: seedArtists.join(','),
    });
  }

  getTrending(): Observable<{ videos: TrendingVideo[] }> {
    return this.api.get('/api/explore/trending');
  }
}
