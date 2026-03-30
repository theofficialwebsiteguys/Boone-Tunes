import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Track } from '../models/track.model';
import { QueueItem } from '../models/queue-item.model';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private router = inject(Router);

  private queueS   = new BehaviorSubject<QueueItem[]>([]);
  private indexS   = new BehaviorSubject<number>(-1);
  private playingS = new BehaviorSubject<boolean>(false);
  private shuffleS = new BehaviorSubject<boolean>(false);
  private repeatS  = new BehaviorSubject<boolean>(false);
  private progressS = new BehaviorSubject<number>(0);
  private volumeS  = new BehaviorSubject<number>(75);

  queue$    = this.queueS.asObservable();
  index$    = this.indexS.asObservable();
  playing$  = this.playingS.asObservable();
  shuffle$  = this.shuffleS.asObservable();
  repeat$   = this.repeatS.asObservable();
  progress$ = this.progressS.asObservable();
  volume$   = this.volumeS.asObservable();

  private ticker: Subscription | null = null;

  /* ── Snapshots ─────────────────────────── */
  get currentItem(): QueueItem | null {
    const q = this.queueS.value, i = this.indexS.value;
    return i >= 0 && i < q.length ? q[i] : null;
  }
  get queue():    QueueItem[] { return this.queueS.value; }
  get index():    number      { return this.indexS.value; }
  get isPlaying():boolean     { return this.playingS.value; }
  get isShuffle():boolean     { return this.shuffleS.value; }
  get isRepeat(): boolean     { return this.repeatS.value; }
  get progress(): number      { return this.progressS.value; }
  get volume():   number      { return this.volumeS.value; }

  /* ── Playback ──────────────────────────── */
  playTracks(tracks: Track[], startIndex = 0): void {
    const items: QueueItem[] = tracks.map(t => ({
      track: t, youtubeVideoId: null, status: 'ready'
    }));
    this.queueS.next(items);
    this.indexS.next(startIndex);
    this.progressS.next(0);
    this.startTicker();
    this.router.navigate(['/player']);
  }

  playTrack(track: Track, rest: Track[] = []): void {
    this.playTracks([track, ...rest], 0);
  }

  addToQueue(track: Track): void {
    this.queueS.next([
      ...this.queue,
      { track, youtubeVideoId: null, status: 'ready' }
    ]);
  }

  playAtIndex(i: number): void {
    if (i >= 0 && i < this.queue.length) {
      this.indexS.next(i);
      this.progressS.next(0);
      this.startTicker();
    }
  }

  next(): void {
    const q = this.queue;
    if (!q.length) return;
    let n = this.isShuffle
      ? Math.floor(Math.random() * q.length)
      : this.index + 1;
    if (n >= q.length) {
      if (this.isRepeat) n = 0;
      else { this.stopTicker(); return; }
    }
    this.indexS.next(n);
    this.progressS.next(0);
    this.startTicker();
  }

  previous(): void {
    this.indexS.next(Math.max(0, this.index - 1));
    this.progressS.next(0);
  }

  togglePlay(): void {
    if (this.isPlaying) this.stopTicker();
    else this.startTicker();
  }

  toggleShuffle(): void { this.shuffleS.next(!this.isShuffle); }
  toggleRepeat():  void { this.repeatS.next(!this.isRepeat); }
  seekTo(v: number):    void { this.progressS.next(v); }
  setVolume(v: number): void { this.volumeS.next(v); }

  clearQueue(): void {
    this.stopTicker();
    this.queueS.next([]);
    this.indexS.next(-1);
    this.progressS.next(0);
  }

  /* ── Internal ──────────────────────────── */
  private startTicker(): void {
    this.stopTicker();
    this.playingS.next(true);
    // Advance ~0.3% per second (simulates a ~5min track at 100%)
    this.ticker = interval(1000).subscribe(() => {
      const p = this.progressS.value;
      if (p < 100) {
        this.progressS.next(Math.min(p + 0.28, 100));
      } else {
        this.next();
      }
    });
  }

  private stopTicker(): void {
    this.playingS.next(false);
    this.ticker?.unsubscribe();
    this.ticker = null;
  }
}
