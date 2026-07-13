import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** One video result per type — kept in sync with the backend's VIDEO_CATEGORIES. */
export type VideoCategory = 'music-video' | 'official-audio' | 'lyric-video' | 'live';

export interface YoutubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
  /** Only present on results from searchForTrack — direct-search results are untyped. */
  category?: VideoCategory;
}

export interface YoutubeSearchResult {
  videos: YoutubeVideo[];
}

@Injectable({ providedIn: 'root' })
export class YoutubeService {
  private http = inject(HttpClient);

  /** Returns one video per type (top, live, lyrics, audio), in that order. */
  searchForTrack(track: string, artist: string): Observable<YoutubeSearchResult> {
    return this.http.get<YoutubeSearchResult>(`${environment.apiUrl}/api/youtube/search`, {
      params: { track, artist },
    });
  }

  /** Free-form YouTube search — query is sent as-is, no "official music video" suffix. */
  directSearch(query: string, maxResults = 8): Observable<YoutubeSearchResult> {
    return this.http.get<YoutubeSearchResult>(`${environment.apiUrl}/api/youtube/direct-search`, {
      params: { q: query, maxResults: maxResults.toString() },
    });
  }
}
