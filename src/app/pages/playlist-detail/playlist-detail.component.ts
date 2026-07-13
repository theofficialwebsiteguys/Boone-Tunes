import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistService } from '../../services/playlist.service';
import { PlayerService } from '../../services/player.service';
import { ExploreService } from '../../services/explore.service';
import { Playlist } from '../../models/playlist.model';
import { Track } from '../../models/track.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { TrackRowComponent } from '../../components/track-row/track-row.component';

const MAX_SEED_ARTISTS = 5;

@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [NavbarComponent, TrackRowComponent],
  templateUrl: './playlist-detail.component.html',
  styleUrl: './playlist-detail.component.css'
})
export class PlaylistDetailComponent implements OnInit {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private plSvc       = inject(PlaylistService);
  private player      = inject(PlayerService);
  private exploreSvc  = inject(ExploreService);

  playlist: Playlist | null = null;
  tracks: Track[] = [];
  loading = true;
  error = '';

  recommended: Track[] = [];
  loadingRecommended = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    // Use cached selection if IDs match, otherwise we still load tracks
    this.plSvc.selectedPlaylist$.subscribe(pl => {
      if (pl && pl.spotifyPlaylistId === id) {
        this.playlist = pl;
      }
    });

    this.plSvc.getTracks(id).subscribe({
      next: res => {
        this.tracks = res.tracks;
        this.loading = false;
        this.loadRecommended();
      },
      error: () => {
        this.error = 'Failed to load tracks.';
        this.loading = false;
      }
    });
  }

  private loadRecommended(): void {
    const seeds = Array.from(new Set(this.tracks.flatMap(t => t.artists))).slice(0, MAX_SEED_ARTISTS);
    if (seeds.length === 0) return;

    this.loadingRecommended = true;
    this.exploreSvc.getRecommendations(seeds).subscribe({
      next: res => {
        const seenIds = new Set(this.tracks.map(t => t.spotifyId));
        this.recommended = res.tracks.filter(t => !seenIds.has(t.spotifyId)).slice(0, 8);
        this.loadingRecommended = false;
      },
      error: () => { this.loadingRecommended = false; },
    });
  }

  playAll(): void {
    if (this.tracks.length) {
      this.player.appendTracksToQueue(this.tracks);
    }
  }

  playShuffle(): void {
    if (this.tracks.length) {
      this.player.shuffleAndAppendToQueue(this.tracks);
    }
  }

  playTrack(track: Track): void {
    this.player.appendTracksToQueue([track]);
  }

  addToQueue(track: Track): void {
    this.player.addToQueue(track);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  get isLikedSongs(): boolean {
    return this.playlist?.spotifyPlaylistId === 'liked-songs';
  }
}
