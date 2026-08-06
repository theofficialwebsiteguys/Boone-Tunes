import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ExploreService } from '../../services/explore.service';
import { PlaylistService } from '../../services/playlist.service';
import { SearchService } from '../../services/search.service';
import { PlayerService } from '../../services/player.service';
import { Track } from '../../models/track.model';
import { TrendingVideo } from '../../models/recommendation.model';
import { TrackRowComponent } from '../../components/track-row/track-row.component';
import { MoodQuizComponent } from '../../components/mood-quiz/mood-quiz.component';

interface CuratedPlaylist {
  id: string;
  name: string;
  emoji: string;
  description: string;
  query: string;
  tracks: Track[];
  loading: boolean;
  error: boolean;
}

const MAX_SEED_ARTISTS = 5;

// Static mood/vibe queries — same "virtual playlist via search" mechanism
// proven out in mood-quiz.component.ts, just with fixed queries instead of
// quiz answers.
const CURATED_DEFS: Omit<CuratedPlaylist, 'tracks' | 'loading' | 'error'>[] = [
  { id: 'bbq',   name: 'BBQ Classics',      emoji: '🔥', description: 'Backyard cookout anthems',        query: 'bbq cookout summer party hits' },
  { id: 'club',  name: 'Club Night Energy', emoji: '🎉', description: 'High-energy dance floor bangers',  query: 'club dance party hits' },
  { id: 'gym',   name: 'Gym Power',         emoji: '💪', description: 'Fuel for your workout',            query: 'workout gym hype hits' },
  { id: 'chill', name: 'Chill Lounge',      emoji: '🌙', description: 'Laid-back vibes to unwind',        query: 'chill lounge relax hits' },
];

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [TrackRowComponent, MoodQuizComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.css',
})
export class ExploreComponent implements OnInit {
  private exploreSvc = inject(ExploreService);
  private plSvc      = inject(PlaylistService);
  private searchSvc  = inject(SearchService);
  private player     = inject(PlayerService);
  private router     = inject(Router);

  recTracks: Track[] = [];
  loadingRecs = true;
  recsError = false;

  curated: CuratedPlaylist[] = CURATED_DEFS.map(d => ({ ...d, tracks: [], loading: true, error: false }));

  trending: TrendingVideo[] = [];
  loadingTrending = true;
  trendingError = false;

  ngOnInit(): void {
    this.loadRecommendations();
    this.loadCurated();
    this.loadTrending();
  }

  /* ── Recommended For You ──────────────────────────────────────────── */

  private loadRecommendations(): void {
    this.loadingRecs = true;
    this.plSvc.getTracks('liked-songs').subscribe({
      next: res => {
        if (res.tracks.length > 0) {
          this.fetchRecommendationsFor(res.tracks);
        } else {
          this.fallbackSeedsFromAnyPlaylist();
        }
      },
      error: () => this.fallbackSeedsFromAnyPlaylist(),
    });
  }

  private fallbackSeedsFromAnyPlaylist(): void {
    this.plSvc.getPlaylists().subscribe({
      next: res => {
        const first = res.playlists.find(p => p.spotifyPlaylistId !== 'liked-songs');
        if (!first) {
          this.loadingRecs = false;
          return;
        }
        this.plSvc.getTracks(first.spotifyPlaylistId).subscribe({
          next: r => this.fetchRecommendationsFor(r.tracks),
          error: () => { this.loadingRecs = false; this.recsError = true; },
        });
      },
      error: () => { this.loadingRecs = false; this.recsError = true; },
    });
  }

  private fetchRecommendationsFor(tracks: Track[]): void {
    const artists = Array.from(new Set(tracks.flatMap(t => t.artists))).slice(0, MAX_SEED_ARTISTS);
    if (artists.length === 0) {
      this.loadingRecs = false;
      return;
    }
    this.exploreSvc.getRecommendations(artists).subscribe({
      next: r => { this.recTracks = r.tracks; this.loadingRecs = false; },
      error: () => { this.recsError = true; this.loadingRecs = false; },
    });
  }

  /* ── BooneTunes Curated ───────────────────────────────────────────── */

  private loadCurated(): void {
    this.curated.forEach((c, i) => {
      this.searchSvc.search(c.query, 8).subscribe({
        next: res => { this.curated[i] = { ...this.curated[i], tracks: res.tracks, loading: false }; },
        error: () => { this.curated[i] = { ...this.curated[i], loading: false, error: true }; },
      });
    });
  }

  /* ── Trending Now ──────────────────────────────────────────────────── */

  private loadTrending(): void {
    this.exploreSvc.getTrending().subscribe({
      next: res => { this.trending = res.videos; this.loadingTrending = false; },
      error: () => { this.trendingError = true; this.loadingTrending = false; },
    });
  }

  playTrending(video: TrendingVideo): void {
    this.player.addYouTubeVideoToQueue({
      videoId: video.videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnail: video.thumbnail,
    });
  }

  formatViews(count: number | null): string {
    if (count === null) return '';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M views`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1)}K views`;
    return `${count} views`;
  }

  /* ── Shared track actions ─────────────────────────────────────────── */

  playAll(tracks: Track[]): void {
    if (tracks.length) this.player.playTracksFrom(tracks, 0);
  }

  playTrack(list: Track[], index: number): void {
    this.player.playTracksFrom(list, index);
  }

  addToQueue(track: Track): void {
    this.player.addToQueue(track);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
