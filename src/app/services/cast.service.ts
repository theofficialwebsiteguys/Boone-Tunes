import { Injectable, NgZone, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, skip } from 'rxjs';
import { PlayerService } from './player.service';

declare global {
  // eslint-disable-next-line no-var
  var cast:   any;
  // eslint-disable-next-line no-var
  var chrome: any;
}

const APP_ID    = '0F82755C';
const NAMESPACE = 'urn:x-cast:com.boonetunes.player';

export type CastState =
  | 'NO_DEVICES_AVAILABLE'
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED';

@Injectable({ providedIn: 'root' })
export class CastService implements OnDestroy {
  private readonly ngZone    = inject(NgZone);
  private readonly playerSvc = inject(PlayerService);

  private readonly castStateS = new BehaviorSubject<CastState>('NO_DEVICES_AVAILABLE');
  readonly castState$ = this.castStateS.asObservable();

  get castState(): CastState { return this.castStateS.value; }
  get isCasting():  boolean    { return this.castStateS.value === 'CONNECTED'; }

  private session: any = null;
  private playerSubs: Subscription[] = [];

  constructor() { this.loadSdk(); }

  ngOnDestroy(): void {
    this.playerSubs.forEach(s => s.unsubscribe());
  }

  toggleCasting(): void {
    this.isCasting ? this.stopCasting() : this.startCasting();
  }

  startCasting(): void {
    if (!globalThis.cast?.framework) {
      console.warn('[Cast] SDK not loaded');
      return;
    }
    console.log('[Cast] requestSession — current state:', this.castStateS.value);
    globalThis.cast.framework.CastContext.getInstance()
      .requestSession()
      .then(() => console.log('[Cast] session started'))
      .catch((err: any) => console.warn('[Cast] requestSession failed:', err));
  }

  stopCasting(): void {
    this.session?.endSession(true);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private send(msg: object): void {
    if (!this.session) return;
    this.session.sendMessage(NAMESPACE, msg)
      .catch((err: any) => console.warn('[Cast] send error:', err));
  }

  private loadSdk(): void {
    if (globalThis.cast?.framework) {
      this.initCastFramework();
      return;
    }

    (window as any)['__onGCastApiAvailable'] = (isAvailable: boolean) => {
      if (isAvailable) this.ngZone.run(() => this.initCastFramework());
    };

    if (!document.getElementById('cast-sender-sdk')) {
      const s  = document.createElement('script');
      s.id     = 'cast-sender-sdk';
      s.src    = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      document.head.appendChild(s);
    }
  }

  private initCastFramework(): void {
    try {
      const ctx = globalThis.cast.framework.CastContext.getInstance();
      ctx.setOptions({
        receiverApplicationId: APP_ID,
        autoJoinPolicy: globalThis.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      this.castStateS.next(ctx.getCastState() as CastState);

      ctx.addEventListener(
        globalThis.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        (e: any) => this.ngZone.run(() => this.castStateS.next(e.castState as CastState)),
      );

      ctx.addEventListener(
        globalThis.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        (e: any) => this.ngZone.run(() => this.onSessionStateChange(e)),
      );
    } catch (err) {
      console.error('[Cast] init error:', err);
    }
  }

  private onSessionStateChange(e: any): void {
    const { SessionState } = globalThis.cast.framework;
    if (
      e.sessionState === SessionState.SESSION_STARTED ||
      e.sessionState === SessionState.SESSION_RESUMED
    ) {
      this.session = globalThis.cast.framework.CastContext.getInstance().getCurrentSession();
      this.setupMessageListener();
      this.subscribeToPlayer();
      this.loadCurrentVideo();
    } else if (e.sessionState === SessionState.SESSION_ENDED) {
      this.session = null;
      this.playerSubs.forEach(s => s.unsubscribe());
      this.playerSubs = [];
    }
  }

  private setupMessageListener(): void {
    if (!this.session) return;
    this.session.addMessageListener(NAMESPACE, (_ns: string, raw: string) => {
      this.ngZone.run(() => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'ENDED') this.playerSvc.next();
        } catch {}
      });
    });
  }

  private subscribeToPlayer(): void {
    this.playerSubs.forEach(s => s.unsubscribe());

    this.playerSubs = [
      // Song changes → LOAD on receiver (skip initial; loadCurrentVideo handles it)
      this.playerSvc.currentVideoId$.pipe(skip(1)).subscribe(videoId => {
        if (!this.isCasting || !videoId) return;
        const item = this.playerSvc.currentItem;
        this.send({
          type:       'LOAD',
          videoId,
          autoPlay:   true,
          trackName:  item?.track.name ?? '',
          artistName: item?.track.artists.join(', ') ?? '',
        });
      }),

      // Play / pause changes → receiver (skip initial; loadCurrentVideo's autoPlay handles it)
      this.playerSvc.playing$.pipe(skip(1)).subscribe(playing => {
        if (!this.isCasting) return;
        this.send({ type: playing ? 'PLAY' : 'PAUSE' });
      }),

      // Seek → receiver (converts progress % to seconds using local player duration)
      this.playerSvc.seekCommand$.subscribe(pct => {
        if (!this.isCasting) return;
        const totalSec = this.playerSvc.totalMs / 1000;
        if (totalSec > 0) this.send({ type: 'SEEK', seconds: (pct / 100) * totalSec });
      }),
    ];
  }

  private loadCurrentVideo(): void {
    const videoId = this.playerSvc.currentVideoId;
    if (!videoId) return;
    const item = this.playerSvc.currentItem;
    this.send({
      type:       'LOAD',
      videoId,
      autoPlay:   this.playerSvc.isPlaying,
      trackName:  item?.track.name ?? '',
      artistName: item?.track.artists.join(', ') ?? '',
    });
  }
}
