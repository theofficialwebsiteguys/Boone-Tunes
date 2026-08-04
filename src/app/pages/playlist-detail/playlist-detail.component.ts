import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlaylistService, DEFAULT_TRACK_PAGE_SIZE } from '../../services/playlist.service';
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
export class PlaylistDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private plSvc       = inject(PlaylistService);
  private player      = inject(PlayerService);
  private exploreSvc  = inject(ExploreService);

  @ViewChild('scrollSentinel') scrollSentinelRef?: ElementRef<HTMLDivElement>;

  playlist: Playlist | null = null;
  tracks: Track[] = [];
  loading = true;
  loadingMore = false;
  error = '';

  hasMore = false;
  private nextOffset = 0;
  /** Bumped on every playlist load — stale in-flight page requests check this before applying. */
  private loadGeneration = 0;
  private observer?: IntersectionObserver;

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

    this.loadFirstPage(id);
  }

  ngAfterViewInit(): void {
    this.setupInfiniteScroll();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private loadFirstPage(id: string): void {
    const generation = ++this.loadGeneration;
    this.loading = true;
    this.tracks = [];
    this.hasMore = false;
    this.nextOffset = 0;

    this.plSvc.getTracks(id, 0, DEFAULT_TRACK_PAGE_SIZE).subscribe({
      next: res => {
        if (generation !== this.loadGeneration) return; // playlist changed since this request started
        this.tracks = res.tracks;
        this.hasMore = res.pagination.hasMore;
        this.nextOffset = res.pagination.offset + res.pagination.limit;
        this.loading = false;
        this.loadRecommended();
      },
      error: () => {
        if (generation !== this.loadGeneration) return;
        this.error = 'Failed to load tracks.';
        this.loading = false;
      }
    });
  }

  private loadNextPage(): void {
    if (this.loadingMore || !this.hasMore) return;
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    const generation = this.loadGeneration;

    this.loadingMore = true;
    this.plSvc.getTracks(id, this.nextOffset, DEFAULT_TRACK_PAGE_SIZE).subscribe({
      next: res => {
        if (generation !== this.loadGeneration) return; // user navigated to another playlist mid-fetch
        this.tracks = [...this.tracks, ...res.tracks];
        this.hasMore = res.pagination.hasMore;
        this.nextOffset = res.pagination.offset + res.pagination.limit;
        this.loadingMore = false;
      },
      error: () => {
        if (generation !== this.loadGeneration) return;
        this.loadingMore = false;
      }
    });
  }

  private setupInfiniteScroll(): void {
    if (!this.scrollSentinelRef || typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) this.loadNextPage();
    }, { rootMargin: '400px' });
    this.observer.observe(this.scrollSentinelRef.nativeElement);
  }

  private loadRecommended(): void {
    const seeds = Array.from(new Set(this.tracks.flatMap(t => t.artists))).slice(0, MAX_SEED_ARTISTS);
    if (seeds.length === 0) return;

    const generation = this.loadGeneration;
    this.loadingRecommended = true;
    this.exploreSvc.getRecommendations(seeds).subscribe({
      next: res => {
        if (generation !== this.loadGeneration) return;
        const seenIds = new Set(this.tracks.map(t => t.spotifyId));
        this.recommended = res.tracks.filter(t => !seenIds.has(t.spotifyId)).slice(0, 8);
        this.loadingRecommended = false;
      },
      error: () => { if (generation === this.loadGeneration) this.loadingRecommended = false; },
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
