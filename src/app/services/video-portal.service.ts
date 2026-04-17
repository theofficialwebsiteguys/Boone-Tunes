import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Lets the player page (primary) and mini player (secondary) each register
 * a sentinel DOM element. AppComponent positions the always-mounted YouTube
 * iframe to match whichever slot is active — primary takes priority.
 */
@Injectable({ providedIn: 'root' })
export class VideoPortalService {
  private readonly slotS      = new BehaviorSubject<HTMLElement | null>(null);
  private readonly miniSlotS  = new BehaviorSubject<HTMLElement | null>(null);

  readonly slot$     = this.slotS.asObservable();
  readonly miniSlot$ = this.miniSlotS.asObservable();

  setSlot(el: HTMLElement): void     { this.slotS.next(el); }
  clearSlot(): void                  { this.slotS.next(null); }

  setMiniSlot(el: HTMLElement): void { this.miniSlotS.next(el); }
  clearMiniSlot(): void              { this.miniSlotS.next(null); }
}
