import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Playlist } from '../models/playlist.model';
import { TrackPage } from '../models/track.model';

export const DEFAULT_TRACK_PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private api = inject(ApiService);

  private selectedS = new BehaviorSubject<Playlist | null>(null);
  selectedPlaylist$ = this.selectedS.asObservable();

  setSelected(playlist: Playlist): void {
    this.selectedS.next(playlist);
  }

  getPlaylists(): Observable<{ playlists: Playlist[] }> {
    return this.api.get('/api/playlists');
  }

  /**
   * Fetches one page of tracks. Never triggers YouTube resolution — the
   * response only reports each track's already-cached mapping status.
   */
  getTracks(spotifyPlaylistId: string, offset = 0, limit = DEFAULT_TRACK_PAGE_SIZE): Observable<TrackPage> {
    return this.api.get(`/api/playlists/${spotifyPlaylistId}/tracks`, { offset, limit });
  }
}
