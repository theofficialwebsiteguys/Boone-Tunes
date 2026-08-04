import {
  Component, OnInit, OnDestroy,
  ElementRef, ViewChild, AfterViewInit, inject, HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

import { PlayerService, VideoPreference } from '../../services/player.service';
import { VideoPortalService } from '../../services/video-portal.service';
import { CastService } from '../../services/cast.service';
import { YoutubeVideo } from '../../services/youtube.service';
import { QueueItem } from '../../models/queue-item.model';
import { PlayerControlsComponent } from '../../components/player-controls/player-controls.component';
import { QueueSidebarComponent } from '../../components/queue-sidebar/queue-sidebar.component';
import { AddToBtPlaylistModalComponent } from '../../components/add-to-bt-playlist-modal/add-to-bt-playlist-modal.component';
import { MarqueeTextComponent } from '../../components/marquee-text/marquee-text.component';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, PlayerControlsComponent, QueueSidebarComponent, AddToBtPlaylistModalComponent, MarqueeTextComponent],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly playerSvc         = inject(PlayerService);
  readonly castSvc           = inject(CastService);
  private readonly portalSvc = inject(VideoPortalService);
  private readonly router    = inject(Router);

  /** Sentinel: the iframe will be positioned to fill this element */
  @ViewChild('videoSlot')   videoSlotRef!:   ElementRef<HTMLDivElement>;
  @ViewChild('videoScreen') videoScreenRef!: ElementRef<HTMLDivElement>;

  isFullscreen          = false;
  fsControlsVisible     = false;
  fsQueueOpen           = false;
  showMobileQueue       = false;
  showAddToPlaylistModal = false;
  private fsHideTimer: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    if (!this.isFullscreen) {
      this.fsControlsVisible = false;
      this.fsQueueOpen = false;
      if (this.fsHideTimer) { clearTimeout(this.fsHideTimer); this.fsHideTimer = null; }
    }
  }

  /* Player state */
  queue:     QueueItem[] = [];
  index      = -1;
  isPlaying  = false;
  isShuffle  = false;
  isRepeat   = false;
  progress   = 0;
  volume     = 75;
  currentMs  = 0;
  totalMs    = 0;

  /* Video state (now from service) */
  videos:       YoutubeVideo[]    = [];
  currentVideoId: string | null   = null;
  loadingVideo    = false;
  resolutionStatus: string | null = null;

  private readonly subs: Subscription[] = [];

  get currentItem(): QueueItem | null {
    return this.index >= 0 && this.index < this.queue.length
      ? this.queue[this.index] : null;
  }
  get currentTimeStr(): string { return this.msToTime(this.currentMs); }
  get totalTimeStr():   string { return this.msToTime(this.totalMs); }

  videoPreference: VideoPreference = 'music-video';

  readonly videoPrefOptions: { value: VideoPreference; label: string; icon: string }[] = [
    { value: 'music-video',    label: 'Music Video',  icon: 'M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z' },
    { value: 'official-audio', label: 'Audio',        icon: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
    { value: 'lyric-video',    label: 'Lyrics',       icon: 'M4 6h16M4 12h16M4 18h7' },
    { value: 'live',           label: 'Live',         icon: 'M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8' },
  ];

  get fsPlayNextItems(): QueueItem[] {
    const result: QueueItem[] = [];
    for (let i = this.index + 1; i < this.queue.length; i++) {
      if (this.queue[i].isPlayNext) result.push(this.queue[i]);
      else break;
    }
    return result;
  }

  get fsQueueItems(): QueueItem[] {
    return this.queue.slice(this.index + 1 + this.fsPlayNextItems.length);
  }

  ngOnInit(): void {
    this.subs.push(
      this.playerSvc.queue$.subscribe(q          => (this.queue         = q)),
      this.playerSvc.playing$.subscribe(v        => (this.isPlaying     = v)),
      this.playerSvc.shuffle$.subscribe(v        => (this.isShuffle     = v)),
      this.playerSvc.repeat$.subscribe(v         => (this.isRepeat      = v)),
      this.playerSvc.progress$.subscribe(v       => (this.progress      = v)),
      this.playerSvc.volume$.subscribe(v         => (this.volume        = v)),
      this.playerSvc.currentMs$.subscribe(v      => (this.currentMs     = v)),
      this.playerSvc.totalMs$.subscribe(v        => (this.totalMs       = v)),
      this.playerSvc.videos$.subscribe(v         => (this.videos        = v)),
      this.playerSvc.loadingVideo$.subscribe(v   => (this.loadingVideo  = v)),
      this.playerSvc.resolutionStatus$.subscribe(s => (this.resolutionStatus = s)),
      this.playerSvc.currentVideoId$.subscribe(id => (this.currentVideoId = id)),
      this.playerSvc.index$.subscribe(i             => (this.index           = i)),
      this.playerSvc.videoPreference$.subscribe(p   => (this.videoPreference = p)),
    );
  }

  ngAfterViewInit(): void {
    this.portalSvc.setSlot(this.videoSlotRef.nativeElement);
    // currentVideoId is only ever unset here after a hard refresh (it isn't
    // persisted to localStorage, unlike the queue/index) — a genuinely fresh
    // entry, so start playing once the video resolves. If it's already set,
    // this track was already established earlier THIS session (the user
    // navigated away and back) — leave play/pause exactly as they left it;
    // an existing pause on the current track is intentional, not something
    // re-entering the page should override.
    if (this.playerSvc.currentItem && !this.playerSvc.currentVideoId) {
      this.playerSvc.play();
      // Defer past the current change-detection cycle to avoid NG0100.
      setTimeout(() => this.playerSvc.fetchVideos(), 0);
    }
  }

  ngOnDestroy(): void {
    this.portalSvc.clearSlot();
    this.subs.forEach(s => s.unsubscribe());
    if (this.fsHideTimer) clearTimeout(this.fsHideTimer);
  }

  goBack(): void { this.router.navigate(['/dashboard']); }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  onFsMouseMove(): void {
    this.fsControlsVisible = true;
    if (this.fsHideTimer) clearTimeout(this.fsHideTimer);
    this.fsHideTimer = setTimeout(() => {
      if (!this.fsQueueOpen) this.fsControlsVisible = false;
    }, 3000);
  }

  onFsMouseLeave(): void {
    if (this.fsHideTimer) clearTimeout(this.fsHideTimer);
    this.fsControlsVisible = false;
  }

  onFsSeek(e: Event):   void { this.onSeekTo(+(e.target as HTMLInputElement).value); }
  onFsVolume(e: Event): void { this.onVolumeChange(+(e.target as HTMLInputElement).value); }

  selectVideo(video: YoutubeVideo): void {
    this.playerSvc.selectVideo(video.videoId);
  }

  onSeekTo(pct: number): void { this.playerSvc.seekTo(pct); }
  onVolumeChange(v: number): void { this.playerSvc.setVolume(v); }

  /** Loads "Switch video" alternates on demand — never automatic. */
  onChangeVideo(): void { this.playerSvc.loadVideoAlternatives(); }

  /** Re-attempts resolution for the current track (e.g. after a transient failure). */
  retryCurrent(): void { this.playerSvc.fetchVideos(true); }

  skipToNext(): void { this.playerSvc.next(); }

  get currentVideoTitle(): string {
    if (!this.currentVideoId) return this.currentItem?.track.name ?? '';
    return (
      this.videos.find(v => v.videoId === this.currentVideoId)?.title
      ?? this.currentItem?.track.name
      ?? ''
    );
  }

  get currentVideoThumbnail(): string | null {
    if (!this.currentVideoId) return this.currentItem?.track.albumArtUrl ?? null;
    return (
      this.videos.find(v => v.videoId === this.currentVideoId)?.thumbnail
      ?? this.currentItem?.track.albumArtUrl
      ?? null
    );
  }

  onAddToPlaylist(): void {
    if (!this.currentItem || !this.currentVideoId) return;
    this.showAddToPlaylistModal = true;
  }

  private msToTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }
}
