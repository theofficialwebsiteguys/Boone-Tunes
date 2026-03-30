import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { PlaylistService } from '../../services/playlist.service';
import { PlayerService } from '../../services/player.service';
import { SearchService } from '../../services/search.service';
import { User } from '../../models/user.model';
import { Playlist } from '../../models/playlist.model';
import { Track } from '../../models/track.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PlaylistCardComponent } from '../../components/playlist-card/playlist-card.component';
import { TrackRowComponent } from '../../components/track-row/track-row.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NavbarComponent, PlaylistCardComponent, TrackRowComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private auth     = inject(AuthService);
  private api      = inject(ApiService);
  private plSvc    = inject(PlaylistService);
  private player   = inject(PlayerService);
  private searchSvc = inject(SearchService);
  private router   = inject(Router);

  user: User | null = null;
  playlists: Playlist[] = [];
  activeTab: 'playlists' | 'liked' = 'playlists';

  searchQuery = '';
  searchResults: Track[] = [];
  loadingSearch = false;
  searchError = '';

  loadingPlaylists = true;
  playlistsError = '';

  get visiblePlaylists(): Playlist[] {
    return this.activeTab === 'liked'
      ? this.playlists.filter(p => p.spotifyPlaylistId === 'liked-songs')
      : this.playlists.filter(p => p.spotifyPlaylistId !== 'liked-songs');
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => (this.user = u));
    this.loadPlaylists();
  }

  private loadPlaylists(): void {
    this.loadingPlaylists = true;
    this.playlistsError = '';
    this.plSvc.getPlaylists().subscribe({
      next: res => {
        this.playlists = res.playlists;
        this.loadingPlaylists = false;
      },
      error: () => {
        this.playlistsError = 'Failed to load playlists.';
        this.loadingPlaylists = false;
      }
    });
  }

  selectPlaylist(playlist: Playlist): void {
    this.plSvc.setSelected(playlist);
    this.router.navigate(['/playlist', playlist.spotifyPlaylistId]);
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    if (!query) {
      this.searchResults = [];
      return;
    }
    this.loadingSearch = true;
    this.searchError = '';
    this.searchSvc.search(query).subscribe({
      next: res => {
        this.searchResults = res.tracks;
        this.loadingSearch = false;
      },
      error: () => {
        this.searchError = 'Search failed. Please try again.';
        this.loadingSearch = false;
      }
    });
  }

  playTrack(track: Track): void {
    const rest = this.searchResults.filter(t => t !== track);
    this.player.playTrack(track, rest);
  }

  addToQueue(track: Track): void {
    this.player.addToQueue(track);
  }

  logout(): void {
    this.api.post<{ message: string }>('/api/auth/logout', {}).subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout()
    });
  }

  private finishLogout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
