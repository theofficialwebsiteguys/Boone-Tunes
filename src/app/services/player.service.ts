import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { Track } from '../models/track.model';
import { QueueItem } from '../models/queue-item.model';
import { YoutubeService, YoutubeVideo, VideoCategory } from './youtube.service';
import { ExploreService } from './explore.service';

const STORAGE_KEY = 'bt-player-state';
const PREF_KEY    = 'bt-video-pref';

export type VideoPreference = VideoCategory;

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly router     = inject(Router);
  private readonly ytSvc      = inject(YoutubeService);
  private readonly exploreSvc = inject(ExploreService);

  private readonly queueS        = new BehaviorSubject<QueueItem[]>([]);
  private readonly indexS        = new BehaviorSubject<number>(-1);
  private readonly playingS      = new BehaviorSubject<boolean>(false);
  private readonly shuffleS      = new BehaviorSubject<boolean>(false);
  private readonly repeatS       = new BehaviorSubject<boolean>(false);
  private readonly progressS     = new BehaviorSubject<number>(0);
  private readonly volumeS       = new BehaviorSubject<number>(75);
  private readonly currentMsS    = new BehaviorSubject<number>(0);
  private readonly totalMsS      = new BehaviorSubject<number>(0);
  private readonly currentVideoS = new BehaviorSubject<string | null>(null);
  private readonly videosS       = new BehaviorSubject<YoutubeVideo[]>([]);
  private readonly loadingVideoS = new BehaviorSubject<boolean>(false);
  private readonly seekS         = new Subject<number>();
  private readonly videoPrefS    = new BehaviorSubject<VideoPreference>(
    (localStorage.getItem(PREF_KEY) as VideoPreference) ?? 'music-video'
  );
  private lastFetchedIndex       = -2;

  constructor() { this.restoreState(); }

  queue$          = this.queueS.asObservable();
  index$          = this.indexS.asObservable();
  playing$        = this.playingS.asObservable();
  shuffle$        = this.shuffleS.asObservable();
  repeat$         = this.repeatS.asObservable();
  progress$       = this.progressS.asObservable();
  volume$         = this.volumeS.asObservable();
  currentMs$      = this.currentMsS.asObservable();
  totalMs$        = this.totalMsS.asObservable();
  currentVideoId$ = this.currentVideoS.asObservable();
  videos$         = this.videosS.asObservable();
  loadingVideo$   = this.loadingVideoS.asObservable();
  /** One-shot seek commands forwarded to the YouTube player */
  seekCommand$       = this.seekS.asObservable();
  videoPreference$   = this.videoPrefS.asObservable();
  get videoPreference(): VideoPreference { return this.videoPrefS.value; }

  /* ── Snapshots ─────────────────────────── */
  get currentItem(): QueueItem | null {
    const q = this.queueS.value, i = this.indexS.value;
    return i >= 0 && i < q.length ? q[i] : null;
  }
  get queue():          QueueItem[]    { return this.queueS.value; }
  get index():          number         { return this.indexS.value; }
  get isPlaying():      boolean        { return this.playingS.value; }
  get isShuffle():      boolean        { return this.shuffleS.value; }
  get isRepeat():       boolean        { return this.repeatS.value; }
  get progress():       number         { return this.progressS.value; }
  get volume():         number         { return this.volumeS.value; }
  get currentMs():      number         { return this.currentMsS.value; }
  get totalMs():        number         { return this.totalMsS.value; }
  get currentVideoId(): string | null  { return this.currentVideoS.value; }
  get videos():         YoutubeVideo[] { return this.videosS.value; }
  get loadingVideo():   boolean        { return this.loadingVideoS.value; }

  /* ── Queue management ─────────────────── */

  /** Append tracks to the end of the queue. If the queue was empty, starts
   *  playback from the first appended track and navigates to /player. */
  appendTracksToQueue(tracks: Track[]): void {
    if (!tracks.length) return;
    const wasEmpty   = this.queue.length === 0;
    const startIndex = this.queue.length;
    const newItems: QueueItem[] = tracks.map(t => ({
      track: t, youtubeVideoId: null, status: 'ready'
    }));
    this.queueS.next([...this.queue, ...newItems]);

    if (wasEmpty) {
      this.indexS.next(startIndex);
      this.resetTime();
      this.playingS.next(false);
      this.fetchVideos();
    }
    this.saveState();
    this.router.navigate(['/player']);
  }

  /** Fisher-Yates shuffle the given tracks, then append to queue. */
  shuffleAndAppendToQueue(tracks: Track[]): void {
    if (!tracks.length) return;
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.appendTracksToQueue(shuffled);
  }

  /** Insert a single track into the "Playing Next" sub-queue — right after any
   *  other play-next items, but always before the general playlist queue.
   *  If the queue is empty, starts playback from the beginning instead. */
  addPlayNext(track: Track): void {
    const item: QueueItem = { track, youtubeVideoId: null, status: 'ready', isPlayNext: true };
    if (this.queue.length === 0) {
      this.queueS.next([item]);
      this.indexS.next(0);
      this.resetTime();
      this.playingS.next(false);
      this.fetchVideos();
      this.saveState();
      this.router.navigate(['/player']);
      return;
    }
    // Insert after the last consecutive isPlayNext item in the upcoming section
    const q = this.queue;
    let insertAt = this.index + 1;
    for (let i = this.index + 1; i < q.length; i++) {
      if (q[i].isPlayNext) insertAt = i + 1;
      else break;
    }
    const newQ = [...q];
    newQ.splice(insertAt, 0, item);
    this.queueS.next(newQ);
    this.saveState();
    this.router.navigate(['/player']);
  }

  /** Add a single track to play next (after the currently playing track). */
  addToQueue(track: Track): void {
    this.addPlayNext(track);
  }

  /** Replace the queue with a list of pre-built QueueItems and start playing at startIndex.
   *  Used by BT playlists where videoIds are already known. */
  playItems(items: QueueItem[], startIndex = 0): void {
    if (!items.length) return;
    this.playingS.next(false);
    this.queueS.next(items);
    this.indexS.next(Math.max(0, Math.min(startIndex, items.length - 1)));
    this.videosS.next([]);
    this.currentVideoS.next(null);
    this.resetTime();
    this.lastFetchedIndex = -2;
    this.fetchVideos();
    this.saveState();
    this.router.navigate(['/player']);
  }

  /** Add a pre-built QueueItem to the play-next slot (used for BT playlist entries). */
  addQueueItem(item: QueueItem): void {
    const qItem = { ...item, isPlayNext: true };
    if (this.queue.length === 0) {
      this.queueS.next([qItem]);
      this.indexS.next(0);
      this.resetTime();
      this.playingS.next(false);
      this.lastFetchedIndex = -2;
      this.fetchVideos();
      this.saveState();
      this.router.navigate(['/player']);
      return;
    }
    let insertAt = this.index + 1;
    const q = this.queue;
    for (let i = this.index + 1; i < q.length; i++) {
      if (q[i].isPlayNext) insertAt = i + 1;
      else break;
    }
    const newQ = [...q];
    newQ.splice(insertAt, 0, qItem);
    this.queueS.next(newQ);
    this.saveState();
  }

  /** Add a YouTube video directly to the queue without needing a Spotify track.
   *  Builds a synthetic Track from the video metadata so the queue model stays uniform.
   *  Because the videoId is already known, fetchVideos() skips the API search.
   *  Inserts after the current track so it plays next. */
  addYouTubeVideoToQueue(video: YoutubeVideo): void {
    const syntheticTrack: Track = {
      spotifyId:   `yt:${video.videoId}`,
      name:        video.title,
      artists:     [video.channelTitle],
      albumName:   'YouTube',
      albumArtUrl: video.thumbnail,
      durationMs:  0,
      spotifyUri:  '',
    };
    const item: QueueItem = {
      track:          syntheticTrack,
      youtubeVideoId: video.videoId,
      status:         'ready',
      isPlayNext:     true,
    };
    if (this.queue.length === 0) {
      this.queueS.next([item]);
      this.indexS.next(0);
      this.resetTime();
      this.playingS.next(false);
      this.fetchVideos();
      this.saveState();
      this.router.navigate(['/player']);
      return;
    }
    let insertAt = this.index + 1;
    const q = this.queue;
    for (let i = this.index + 1; i < q.length; i++) {
      if (q[i].isPlayNext) insertAt = i + 1;
      else break;
    }
    const newQ = [...q];
    newQ.splice(insertAt, 0, item);
    this.queueS.next(newQ);
    this.saveState();
    this.router.navigate(['/player']);
  }

  /** Remove a track at the given absolute queue index.
   *  - Removing before current: decrements index (same track keeps playing).
   *  - Removing current: advances to the next track (or stops if queue empties).
   *  - Removing after current: no index change. */
  removeFromQueue(index: number): void {
    const q = [...this.queue];
    if (index < 0 || index >= q.length) return;

    q.splice(index, 1);
    let newIndex = this.index;

    if (q.length === 0) {
      // Queue is now empty — stop everything
      this.playingS.next(false);
      this.queueS.next([]);
      this.indexS.next(-1);
      this.currentVideoS.next(null);
      this.videosS.next([]);
      this.resetTime();
      this.saveState();
      return;
    }

    if (index < newIndex) {
      // A track before current was removed; shift index down
      newIndex--;
    } else if (index === newIndex) {
      // Current track removed — clamp so we don't go out of bounds
      newIndex = Math.min(newIndex, q.length - 1);
      this.queueS.next(q);
      this.indexS.next(newIndex);
      this.resetTime();
      this.fetchVideos();
      this.saveState();
      return;
    }
    // index > newIndex: no index change needed

    this.queueS.next(q);
    this.indexS.next(newIndex);
    this.saveState();
  }

  /** Move a track from one absolute queue index to another.
   *  Only the "Up Next" portion (index + 1 onwards) should be reorderable
   *  via the UI, but this method accepts any valid indices. */
  reorderQueue(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const q = [...this.queue];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= q.length || toIndex >= q.length) return;

    const [moved] = q.splice(fromIndex, 1);
    q.splice(toIndex, 0, moved);

    // Adjust current index if the currently-playing track moved
    let newIndex = this.index;
    if (fromIndex === newIndex) {
      newIndex = toIndex;
    } else if (fromIndex < newIndex && toIndex >= newIndex) {
      newIndex--;
    } else if (fromIndex > newIndex && toIndex <= newIndex) {
      newIndex++;
    }

    this.queueS.next(q);
    this.indexS.next(newIndex);
    this.saveState();
  }

  /* ── Playback ──────────────────────────── */

  playAtIndex(i: number): void {
    if (i >= 0 && i < this.queue.length) {
      this.indexS.next(i);
      this.resetTime();
      this.fetchVideos();
      this.saveState();
    }
  }

  next(): void {
    const q = this.queue;
    if (!q.length) return;
    const n = this.index + 1;
    if (n >= q.length) {
      if (this.isRepeat) {
        this.indexS.next(0);
        this.resetTime();
        this.fetchVideos();
        this.saveState();
      } else {
        this.autoplayRecommended();
      }
      return;
    }
    this.indexS.next(n);
    this.resetTime();
    this.fetchVideos();
    this.saveState();
  }

  /** Called when the queue runs out (repeat off). Seeds recommendations from
   *  artists already in the queue and keeps playing instead of stopping.
   *  Falls back to stopping playback if there are no usable seeds, the
   *  fetch fails, or every recommended track is already in the queue. */
  private autoplayRecommended(): void {
    const seeds = Array.from(new Set(this.queue.flatMap(item => item.track.artists))).slice(0, 5);
    if (seeds.length === 0) {
      this.playingS.next(false);
      return;
    }

    const seenIds = new Set(this.queue.map(item => item.track.spotifyId));

    this.exploreSvc.getRecommendations(seeds).subscribe({
      next: res => {
        const fresh = res.tracks.filter(t => !seenIds.has(t.spotifyId));
        if (fresh.length === 0) {
          this.playingS.next(false);
          return;
        }
        const startIndex = this.queue.length;
        const newItems: QueueItem[] = fresh.map(t => ({ track: t, youtubeVideoId: null, status: 'ready' }));
        this.queueS.next([...this.queue, ...newItems]);
        this.indexS.next(startIndex);
        this.resetTime();
        this.fetchVideos();
        this.saveState();
      },
      error: () => { this.playingS.next(false); },
    });
  }

  previous(): void {
    this.indexS.next(Math.max(0, this.index - 1));
    this.resetTime();
    this.fetchVideos();
    this.saveState();
  }

  togglePlay(): void { this.playingS.next(!this.isPlaying); }

  /** Toggle shuffle. Turning ON re-shuffles the unplayed portion of the queue
   *  (everything after the current track) so the upcoming order changes immediately. */
  toggleShuffle(): void {
    const newState = !this.isShuffle;
    this.shuffleS.next(newState);

    if (newState) {
      this.shuffleRemaining();
    }
    this.saveState();
  }

  toggleRepeat(): void { this.repeatS.next(!this.isRepeat); this.saveState(); }

  /** Emits a seek percentage; both the service progress and YouTube player receive it */
  seekTo(pct: number): void {
    this.progressS.next(pct);
    this.seekS.next(pct);
  }

  setVolume(v: number): void { this.volumeS.next(v); this.saveState(); }

  setVideoPreference(pref: VideoPreference): void {
    this.videoPrefS.next(pref);
    localStorage.setItem(PREF_KEY, pref);
    // Re-pick from already-fetched alternatives without a new API call
    const videos = this.videosS.value;
    if (videos.length > 0) {
      const preferred = this.pickPreferredVideo(videos);
      if (preferred) this.currentVideoS.next(preferred.videoId);
    }
  }

  /** Called by the YouTube player on each 500 ms tick */
  updateTime(currentMs: number, totalMs: number): void {
    this.currentMsS.next(currentMs);
    this.totalMsS.next(totalMs);
    this.progressS.next(totalMs > 0 ? (currentMs / totalMs) * 100 : 0);
  }

  /** Called by the YouTube player when it becomes ready */
  setPlaying(v: boolean): void { this.playingS.next(v); }

  /** Switch to a specific video alternative */
  selectVideo(videoId: string): void {
    this.currentVideoS.next(videoId);
  }

  clearQueue(): void {
    this.playingS.next(false);
    this.queueS.next([]);
    this.indexS.next(-1);
    this.currentVideoS.next(null);
    this.videosS.next([]);
    this.resetTime();
    this.saveState();
  }

  /* ── Internal ──────────────────────────── */

  /** Fisher-Yates shuffle of queue[index+1 ... end] in place. */
  private shuffleRemaining(): void {
    const q = [...this.queue];
    const start = this.index + 1;
    for (let i = q.length - 1; i > start; i--) {
      const j = start + Math.floor(Math.random() * (i - start + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    this.queueS.next(q);
    this.saveState();
  }

  /** Videos from searchForTrack are already tagged with their category by the
   *  backend (one targeted search per type), so this is a direct lookup rather
   *  than guessing from the title. */
  private pickPreferredVideo(videos: YoutubeVideo[]): YoutubeVideo | null {
    if (!videos.length) return null;
    return videos.find(v => v.category === this.videoPreference) ?? videos[0];
  }

  fetchVideos(force = false): void {
    const item = this.currentItem;
    if (!item) return;
    if (!force && this.indexS.value === this.lastFetchedIndex) return;
    this.lastFetchedIndex = this.indexS.value;

    // YouTube-sourced tracks already have a known videoId — skip the API search.
    if (item.youtubeVideoId) {
      this.videosS.next([]);
      this.currentVideoS.next(item.youtubeVideoId);
      this.loadingVideoS.next(false);
      return;
    }

    this.loadingVideoS.next(true);
    this.videosS.next([]);

    const track  = item.track.name;
    const artist = item.track.artists[0] ?? '';

    this.ytSvc.searchForTrack(track, artist).subscribe({
      next: result => {
        this.videosS.next(result.videos);
        this.currentVideoS.next(this.pickPreferredVideo(result.videos)?.videoId ?? null);
        this.loadingVideoS.next(false);
      },
      error: () => { this.loadingVideoS.next(false); },
    });
  }

  private resetTime(): void {
    this.progressS.next(0);
    this.currentMsS.next(0);
    this.totalMsS.next(0);
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        queue:     this.queueS.value,
        index:     this.indexS.value,
        isShuffle: this.shuffleS.value,
        isRepeat:  this.repeatS.value,
        volume:    this.volumeS.value,
      }));
    } catch { /* storage full or unavailable */ }
  }

  private restoreState(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Array.isArray(s.queue))           this.queueS.next(s.queue);
      if (typeof s.index     === 'number')  this.indexS.next(s.index);
      if (typeof s.isShuffle === 'boolean') this.shuffleS.next(s.isShuffle);
      if (typeof s.isRepeat  === 'boolean') this.repeatS.next(s.isRepeat);
      if (typeof s.volume    === 'number')  this.volumeS.next(s.volume);
      // Do NOT call fetchVideos() here — only fetch when user navigates to player.
    } catch { /* corrupted storage — silently ignore */ }
  }
}
