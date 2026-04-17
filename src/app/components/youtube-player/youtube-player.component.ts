import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy, SimpleChanges,
  NgZone, inject,
} from '@angular/core';

declare global {
  // eslint-disable-next-line no-var
  var YT: any;
  // eslint-disable-next-line no-var
  var onYouTubeIframeAPIReady: () => void;
}

@Component({
  selector: 'app-youtube-player',
  standalone: true,
  template: `<div [id]="containerId" style="width:100%;height:100%"></div>`,
  styles: [`:host { display:block; width:100%; height:100%; overflow:hidden; }`],
})
export class YoutubePlayerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() videoId: string | null = null;
  @Input() playing = false;
  @Input() volume  = 75;

  @Output() timeUpdate       = new EventEmitter<{ currentMs: number; totalMs: number }>();
  @Output() videoEnded       = new EventEmitter<void>();
  @Output() ready            = new EventEmitter<void>();
  /** Emits true when YT player starts playing, false when it pauses. */
  @Output() playStateChange  = new EventEmitter<boolean>();

  readonly containerId = `yt-${Math.random().toString(36).slice(2, 9)}`;

  private readonly ngZone = inject(NgZone);

  private player: any = null;
  private tickerHandle: ReturnType<typeof setInterval> | null = null;
  private playerReady = false;
  // Prevents play/pause input from fighting loadVideoById's auto-play
  private justLoaded = false;

  ngOnInit(): void {
    this.loadApi();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.playerReady) return;

    if (changes['videoId'] && this.videoId) {
      this.loadVideo(this.videoId);
    }

    // Only respond to play/pause after the load settle period
    if (changes['playing'] && !this.justLoaded && this.videoId) {
      this.playing ? this.player.playVideo() : this.player.pauseVideo();
    }

    if (changes['volume']) {
      this.player.setVolume(this.volume);
    }
  }

  /** Called by the player component to scrub the video */
  seekTo(pct: number): void {
    if (!this.playerReady) return;
    const dur = this.player.getDuration?.() ?? 0;
    if (dur > 0) this.player.seekTo((pct / 100) * dur, true);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private loadVideo(id: string): void {
    this.justLoaded = true;
    this.player.loadVideoById(id);
    setTimeout(() => (this.justLoaded = false), 1500);
  }

  private loadApi(): void {
    if (globalThis.YT?.Player) {
      this.createPlayer();
      return;
    }

    // Inject the IFrame API script only once globally
    if (!document.getElementById('yt-iframe-api')) {
      const script = document.createElement('script');
      script.id  = 'yt-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }

    // Chain onto any existing callback so multiple instances co-exist
    const prev = globalThis.onYouTubeIframeAPIReady;
    globalThis.onYouTubeIframeAPIReady = () => {
      prev?.();
      this.createPlayer();
    };
  }

  private createPlayer(): void {
    // Run outside Angular zone — YouTube creates its own event loop
    this.ngZone.runOutsideAngular(() => {
      this.player = new globalThis.YT.Player(this.containerId, {
        width: '100%',
        height: '100%',
        // Start with empty video; the real videoId is loaded in onReady
        videoId: '',
        playerVars: {
          autoplay:       1,
          controls:       0,   // hide all native YouTube controls
          rel:            0,   // no related videos at end
          modestbranding: 1,
          iv_load_policy: 3,   // hide annotations
          disablekb:      1,   // disable YouTube keyboard shortcuts
          fs:             0,
          enablejsapi:    1,
        },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(this.volume);
            this.playerReady = true;

            // Handle race condition: if videoId arrived before the player
            // was ready, ngOnChanges was blocked — load it now.
            if (this.videoId) {
              this.loadVideo(this.videoId);
            }

            // Re-enter Angular zone so emitting triggers change detection
            this.ngZone.run(() => this.ready.emit());
            this.startTicker();
          },
          onStateChange: (e: any) => {
            if (e.data === 0) {
              // Video ended — stop immediately to kill the YouTube end-screen
              this.player.stopVideo();
              this.ngZone.run(() => this.videoEnded.emit());
            } else if (e.data === 1) {
              // Playing — sync autoplay back to service.
              // State 2 (paused) is NOT forwarded here: YouTube briefly emits it
              // during buffering/load before reaching state 1, and forwarding it
              // would race with the justLoaded guard and pause the video.
              // Pausing is always driven Angular → YT via the playing input.
              this.ngZone.run(() => this.playStateChange.emit(true));
            }
          },
        },
      });
    });
  }

  private startTicker(): void {
    // Ticker runs outside Angular zone to avoid triggering change detection
    // on every 500 ms tick; we re-enter zone only when emitting.
    this.ngZone.runOutsideAngular(() => {
      this.tickerHandle = setInterval(() => {
        if (!this.playerReady || !this.player?.getCurrentTime) return;
        const currentMs = (this.player.getCurrentTime() ?? 0) * 1000;
        const totalMs   = (this.player.getDuration()    ?? 0) * 1000;
        if (totalMs > 0) {
          this.ngZone.run(() => this.timeUpdate.emit({ currentMs, totalMs }));
        }
      }, 500);
    });
  }

  ngOnDestroy(): void {
    if (this.tickerHandle) clearInterval(this.tickerHandle);
    this.player?.destroy?.();
  }
}
