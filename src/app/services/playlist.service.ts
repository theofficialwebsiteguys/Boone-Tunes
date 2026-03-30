import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Playlist } from '../models/playlist.model';
import { Track } from '../models/track.model';

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

  getTracks(spotifyPlaylistId: string): Observable<{ tracks: Track[]; fromCache: boolean }> {
    return this.api.get(`/api/playlists/${spotifyPlaylistId}/tracks`);
  }
}
