import {
  Component, OnInit, OnDestroy, ViewChild,
  NgZone, ChangeDetectorRef, inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { MiniPlayerComponent } from './components/mini-player/mini-player.component';
import { YoutubePlayerComponent } from './components/youtube-player/youtube-player.component';
import { PlayerService } from './services/player.service';
import { VideoPortalService } from './services/video-portal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MiniPlayerComponent, YoutubePlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly playerSvc = inject(PlayerService);
  private readonly portalSvc = inject(VideoPortalService);
  private readonly ngZone    = inject(NgZone);
  private readonly cdr       = inject(ChangeDetectorRef);

  @ViewChild(YoutubePlayerComponent) ytPlayer!: YoutubePlayerComponent;

  currentVideoId: string | null = null;
  isPlaying  = false;
  volume     = 75;

  /** Rect for the fixed-position iframe */
  iframeRect: DOMRect | null = null;
  /** True when showing inside the mini player (affects border-radius + z-index) */
  isMini = false;

  private primaryEl:   HTMLElement | null = null;
  private secondaryEl: HTMLElement | null = null;
  private rafId: number | null = null;
  private readonly subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.playerSvc.currentVideoId$.subscribe(id => (this.currentVideoId = id)),
      this.playerSvc.playing$.subscribe(v => (this.isPlaying = v)),
      this.playerSvc.volume$.subscribe(v  => (this.volume    = v)),
      this.playerSvc.seekCommand$.subscribe(pct => {
        this.ytPlayer?.seekTo(pct);
      }),

      this.portalSvc.slot$.subscribe(el => {
        this.primaryEl = el;
        this.syncTracking();
      }),
      this.portalSvc.miniSlot$.subscribe(el => {
        this.secondaryEl = el;
        this.syncTracking();
      }),
    );
  }

  ngOnDestroy(): void {
    this.stopTracking();
    this.subs.forEach(s => s.unsubscribe());
  }

  onTimeUpdate(e: { currentMs: number; totalMs: number }): void {
    this.playerSvc.updateTime(e.currentMs, e.totalMs);
  }
  onVideoEnded():              void { this.playerSvc.next(); }
  onPlayerReady():             void { /* player initialised; playStateChange handles sync */ }
  onPlayStateChange(v: boolean): void { this.playerSvc.setPlaying(v); }

  get iframeStyle(): Record<string, string> {
    const r = this.iframeRect;
    if (!r) {
      return {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '1px',
        height: '1px',
        'z-index': '-1',
        overflow: 'hidden',
      };
    }
    return {
      position: 'fixed',
      top:    `${r.top}px`,
      left:   `${r.left}px`,
      width:  `${r.width}px`,
      height: `${r.height}px`,
      'z-index':       this.isMini ? '1001' : '1',
      'border-radius': this.isMini ? '12px 0 0 12px' : '0',
      overflow: 'hidden',
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private syncTracking(): void {
    const active = this.primaryEl ?? this.secondaryEl;
    if (active) {
      this.startTracking();
    } else {
      this.stopTracking();
      this.iframeRect = null;
      this.isMini = false;
      this.cdr.markForCheck();
    }
  }

  private startTracking(): void {
    this.stopTracking();
    const loop = () => {
      const el = this.primaryEl ?? this.secondaryEl;
      if (!el) return;
      const isMini = el === this.secondaryEl;
      const r = el.getBoundingClientRect();
      const prev = this.iframeRect;
      if (
        this.isMini !== isMini ||
        !prev ||
        prev.top !== r.top || prev.left !== r.left ||
        prev.width !== r.width || prev.height !== r.height
      ) {
        this.ngZone.run(() => {
          this.iframeRect = r;
          this.isMini = isMini;
          this.cdr.markForCheck();
        });
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.ngZone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(loop);
    });
  }

  private stopTracking(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
