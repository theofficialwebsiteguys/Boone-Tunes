import { Injectable, NgZone, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare global {
  // eslint-disable-next-line no-var
  var cast:   any;
  // eslint-disable-next-line no-var
  var chrome: any;
}

export type CastState =
  | 'NO_DEVICES_AVAILABLE'
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED';

/**
 * Thin wrapper around the Cast Web Sender SDK.
 * Opens Chrome's native cast picker — the user selects their Chromecast
 * and Chrome mirrors the tab to the TV. No custom receiver involved.
 */
@Injectable({ providedIn: 'root' })
export class CastService implements OnDestroy {
  private readonly ngZone = inject(NgZone);

  private readonly castStateS = new BehaviorSubject<CastState>('NO_DEVICES_AVAILABLE');
  readonly castState$ = this.castStateS.asObservable();

  get isCasting(): boolean { return this.castStateS.value === 'CONNECTED'; }

  private session: any = null;

  constructor() { this.loadSdk(); }

  ngOnDestroy(): void {}

  toggleCasting(): void {
    this.isCasting ? this.stopCasting() : this.startCasting();
  }

  startCasting(): void {
    if (!globalThis.cast?.framework) return;
    globalThis.cast.framework.CastContext.getInstance()
      .requestSession()
      .catch(() => {});
  }

  stopCasting(): void {
    this.session?.endSession(true);
  }

  // ── Private ────────────────────────────────────────────────────────────────

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
        // Default Media Receiver — works with all Chromecasts, no registration needed.
        // Opens Chrome's native cast picker for tab/screen casting.
        receiverApplicationId: globalThis.cast.framework.CastContext.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: globalThis.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      this.castStateS.next(ctx.getCastState() as CastState);

      ctx.addEventListener(
        globalThis.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        (e: any) => this.ngZone.run(() => {
          this.castStateS.next(e.castState as CastState);
          this.session = e.castState === 'CONNECTED'
            ? ctx.getCurrentSession()
            : null;
        }),
      );
    } catch (err) {
      console.error('[Cast] init error:', err);
    }
  }
}
