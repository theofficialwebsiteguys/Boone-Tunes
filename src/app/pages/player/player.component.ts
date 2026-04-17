import {
  Component, OnInit, OnDestroy,
  ElementRef, ViewChild, AfterViewInit, inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

import { PlayerService } from '../../services/player.service';
import { VideoPortalService } from '../../services/video-portal.service';
import { YoutubeVideo } from '../../services/youtube.service';
import { QueueItem } from '../../models/queue-item.model';
import { PlayerControlsComponent } from '../../components/player-controls/player-controls.component';
import { QueueSidebarComponent } from '../../components/queue-sidebar/queue-sidebar.component';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, PlayerControlsComponent, QueueSidebarComponent],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly playerSvc   = inject(PlayerService);
  private readonly portalSvc = inject(VideoPortalService);
  private readonly router    = inject(Router);

  /** Sentinel: the iframe will be positioned to fill this element */
  @ViewChild('videoSlot') videoSlotRef!: ElementRef<HTMLDivElement>;

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

  private readonly subs: Subscription[] = [];

  get currentItem(): QueueItem | null {
    return this.index >= 0 && this.index < this.queue.length
      ? this.queue[this.index] : null;
  }
  get currentTimeStr(): string { return this.msToTime(this.currentMs); }
  get totalTimeStr():   string { return this.msToTime(this.totalMs); }

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
      this.playerSvc.currentVideoId$.subscribe(id => (this.currentVideoId = id)),
      this.playerSvc.index$.subscribe(i          => (this.index         = i)),
    );
  }

  ngAfterViewInit(): void {
    this.portalSvc.setSlot(this.videoSlotRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.portalSvc.clearSlot();
    this.subs.forEach(s => s.unsubscribe());
  }

  goBack(): void { this.router.navigate(['/dashboard']); }

  selectVideo(video: YoutubeVideo): void {
    this.playerSvc.selectVideo(video.videoId);
  }

  onSeekTo(pct: number): void { this.playerSvc.seekTo(pct); }
  onVolumeChange(v: number): void { this.playerSvc.setVolume(v); }
  onAddToPlaylist(): void { /* placeholder */ }

  private msToTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }
}
