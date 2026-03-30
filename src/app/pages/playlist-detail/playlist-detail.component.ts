import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistService } from '../../services/playlist.service';
import { PlayerService } from '../../services/player.service';
import { Playlist } from '../../models/playlist.model';
import { Track } from '../../models/track.model';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { TrackRowComponent } from '../../components/track-row/track-row.component';

@Component({
  selector: 'app-playlist-detail',
  standalone: true,
  imports: [NavbarComponent, TrackRowComponent],
  templateUrl: './playlist-detail.component.html',
  styleUrl: './playlist-detail.component.css'
})
export class PlaylistDetailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private plSvc  = inject(PlaylistService);
  private player = inject(PlayerService);

  playlist: Playlist | null = null;
  tracks: Track[] = [];
  loading = true;
  error = '';

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
      },
      error: () => {
        this.error = 'Failed to load tracks.';
        this.loading = false;
      }
    });
  }

  playAll(startIndex = 0): void {
    if (this.tracks.length) {
      this.player.playTracks(this.tracks, startIndex);
    }
  }

  playShuffle(): void {
    if (!this.tracks.length) return;
    const idx = Math.floor(Math.random() * this.tracks.length);
    this.player.playTracks([...this.tracks], idx);
  }

  playTrack(track: Track): void {
    const idx = this.tracks.indexOf(track);
    this.player.playTracks(this.tracks, idx >= 0 ? idx : 0);
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
