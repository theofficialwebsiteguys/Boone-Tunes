import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { PlaylistService } from '../../services/playlist.service';
import { PlayerService } from '../../services/player.service';
import { SearchService } from '../../services/search.service';
import { YoutubeService, YoutubeVideo } from '../../services/youtube.service';
import { BtPlaylistService } from '../../services/bt-playlist.service';
import { User } from '../../models/user.model';
import { Playlist } from '../../models/playlist.model';
import { Track } from '../../models/track.model';
import { BtPlaylist } from '../../models/bt-playlist.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PlaylistCardComponent } from '../../components/playlist-card/playlist-card.component';
import { TrackRowComponent } from '../../components/track-row/track-row.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NavbarComponent, PlaylistCardComponent, TrackRowComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private auth      = inject(AuthService);
  private api       = inject(ApiService);
  private plSvc     = inject(PlaylistService);
  private player    = inject(PlayerService);
  private searchSvc = inject(SearchService);
  private ytSvc     = inject(YoutubeService);
  private btSvc     = inject(BtPlaylistService);
  private router    = inject(Router);

  user: User | null = null;
  playlists: Playlist[] = [];
  btPlaylists: BtPlaylist[] = [];
  activeTab: 'playlists' | 'liked' | 'bt' = 'playlists';

  searchQuery = '';
  searchResults: Track[] = [];
  loadingSearch = false;
  searchError = '';
  showAllSpotify = false;

  get visibleSearchResults(): Track[] {
    return this.showAllSpotify ? this.searchResults : this.searchResults.slice(0, 5);
  }

  ytResults: YoutubeVideo[] = [];
  loadingYt = false;
  ytError = '';
  ytSearchActive = false;

  loadingPlaylists = true;
  playlistsError = '';

  likedTracks: Track[] = [];
  loadingLiked = false;
  likedError = '';
  likedHasMore = false;
  loadingMoreLiked = false;
  private likedLoaded = false;
  private likedNextOffset = 0;

  get visiblePlaylists(): Playlist[] {
    return this.playlists.filter(p => p.spotifyPlaylistId !== 'liked-songs');
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(u => (this.user = u));
    this.btSvc.playlists$.subscribe(pls => (this.btPlaylists = pls));
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

  selectTab(tab: 'playlists' | 'liked' | 'bt'): void {
    this.activeTab = tab;
    if (tab === 'liked' && !this.likedLoaded) {
      this.loadLikedTracks();
    }
  }

  private loadLikedTracks(): void {
    this.loadingLiked = true;
    this.likedError = '';
    this.plSvc.getTracks('liked-songs', 0).subscribe({
      next: res => {
        this.likedTracks = res.tracks;
        this.likedHasMore = res.pagination.hasMore;
        this.likedNextOffset = res.pagination.offset + res.pagination.limit;
        this.likedLoaded = true;
        this.loadingLiked = false;
      },
      error: () => {
        this.likedError = 'Failed to load liked songs.';
        this.loadingLiked = false;
      }
    });
  }

  loadMoreLiked(): void {
    if (this.loadingMoreLiked || !this.likedHasMore) return;
    this.loadingMoreLiked = true;
    this.plSvc.getTracks('liked-songs', this.likedNextOffset).subscribe({
      next: res => {
        this.likedTracks = [...this.likedTracks, ...res.tracks];
        this.likedHasMore = res.pagination.hasMore;
        this.likedNextOffset = res.pagination.offset + res.pagination.limit;
        this.loadingMoreLiked = false;
      },
      error: () => { this.loadingMoreLiked = false; }
    });
  }

  selectPlaylist(playlist: Playlist): void {
    this.plSvc.setSelected(playlist);
    this.router.navigate(['/playlist', playlist.spotifyPlaylistId]);
  }

  openBtPlaylist(id: string): void {
    this.router.navigate(['/bt-playlist', id]);
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.ytResults = [];
    this.ytError = '';
    this.ytSearchActive = false;
    this.showAllSpotify = false;
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

  searchYouTube(): void {
    if (!this.searchQuery || this.loadingYt) return;
    this.ytSearchActive = true;
    this.loadingYt = true;
    this.ytError = '';
    this.ytResults = [];
    this.ytSvc.directSearch(this.searchQuery).subscribe({
      next: res => {
        this.ytResults = res.videos;
        this.loadingYt = false;
      },
      error: () => {
        this.ytError = 'YouTube search failed. Please try again.';
        this.loadingYt = false;
      }
    });
  }

  addYtVideoToQueue(video: YoutubeVideo): void {
    this.player.addYouTubeVideoToQueue(video);
  }

  /** Plays `list[index]` immediately, replacing the queue with the rest of
   *  that list — `list` is whichever backing array the clicked row belongs
   *  to (searchResults or likedTracks), passed from the template loop. */
  playTrack(list: Track[], index: number): void {
    this.player.playTracksFrom(list, index);
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
