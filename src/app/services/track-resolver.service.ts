import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Track, YoutubeResolutionStatus } from '../models/track.model';

export interface ResolutionResult {
  status: YoutubeResolutionStatus;
  videoId: string | null;
  source: string | null;
  confidence: number | null;
  retryAfter: string | null;
}

/**
 * Thin wrapper around the backend's single-video resolution endpoint.
 * This is the ONLY thing that should ever ask the backend to find a YouTube
 * video for a track outside of the explicit "Switch video" alternates search
 * (see YoutubeService.searchForTrack) — one call per track, never a fan-out.
 */
@Injectable({ providedIn: 'root' })
export class TrackResolverService {
  private http = inject(HttpClient);

  resolve(track: Track, mode: 'interactive' | 'prefetch' = 'interactive'): Observable<ResolutionResult> {
    return this.http.post<ResolutionResult>(
      `${environment.apiUrl}/api/tracks/${encodeURIComponent(track.spotifyId)}/youtube-resolution`,
      {
        title: track.name,
        artist: track.artists[0] ?? '',
        albumName: track.albumName,
        durationMs: track.durationMs,
        isrc: track.isrc ?? undefined,
        mode,
      }
    );
  }
}
