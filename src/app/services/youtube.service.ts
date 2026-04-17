import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface YoutubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
}

export interface YoutubeSearchResult {
  videos: YoutubeVideo[];
}

@Injectable({ providedIn: 'root' })
export class YoutubeService {
  private http = inject(HttpClient);

  searchForTrack(track: string, artist: string, maxResults = 5): Observable<YoutubeSearchResult> {
    return this.http.get<YoutubeSearchResult>(`${environment.apiUrl}/api/youtube/search`, {
      params: { track, artist, maxResults: maxResults.toString() },
    });
  }

  /** Free-form YouTube search — query is sent as-is, no "official music video" suffix. */
  directSearch(query: string, maxResults = 8): Observable<YoutubeSearchResult> {
    return this.http.get<YoutubeSearchResult>(`${environment.apiUrl}/api/youtube/direct-search`, {
      params: { q: query, maxResults: maxResults.toString() },
    });
  }
}
