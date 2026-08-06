import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PlayerService } from './player.service';
import { Track } from '../models/track.model';
import { environment } from '../../environments/environment';

const track = (id: string, name = `Song ${id}`): Track => ({
  spotifyId: id,
  name,
  artists: [`Artist ${id}`],
  albumName: 'Album',
  albumArtUrl: null,
  durationMs: 200000,
  spotifyUri: `spotify:track:${id}`,
});

const resolutionUrl = (id: string) => `${environment.apiUrl}/api/tracks/${id}/youtube-resolution`;

describe('PlayerService', () => {
  let service: PlayerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(PlayerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('resolves the current track with exactly one POST request', () => {
    service.appendTracksToQueue([track('a')]);

    const req = httpMock.expectOne(resolutionUrl('a'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.mode).toBe('interactive');
    req.flush({ status: 'resolved', videoId: 'vid-a', source: 'search', confidence: 0.9, retryAfter: null });

    expect(service.currentVideoId).toBe('vid-a');
    expect(service.queue[0].youtubeVideoId).toBe('vid-a');
    expect(service.queue[0].status).toBe('ready');
    // httpMock.verify() in afterEach confirms no other request (e.g. prefetch) was made —
    // there's nothing to prefetch since this is the only track in the queue.
  });

  it('does not issue a second request for the same track on a duplicate fetchVideos() call', () => {
    service.appendTracksToQueue([track('a')]);
    httpMock.expectOne(resolutionUrl('a')).flush({ status: 'resolved', videoId: 'vid-a', source: 'search', confidence: 0.9, retryAfter: null });

    service.fetchVideos(); // not forced, same index — must be a no-op
    httpMock.expectNone(resolutionUrl('a'));
    expect(service.currentVideoId).toBe('vid-a');
  });

  it('marks a no_match result without leaving the player stuck loading', () => {
    service.appendTracksToQueue([track('a')]);
    httpMock.expectOne(resolutionUrl('a')).flush({ status: 'no_match', videoId: null, source: 'search', confidence: null, retryAfter: null });

    expect(service.loadingVideo).toBe(false);
    expect(service.currentVideoId).toBeNull();
    expect(service.queue[0].status).toBe('no_match');
  });

  it('marks quota_blocked distinctly so cached tracks are unaffected', () => {
    service.appendTracksToQueue([track('a')]);
    httpMock.expectOne(resolutionUrl('a')).flush({ status: 'quota_blocked', videoId: null, source: 'quota', confidence: null, retryAfter: '2026-01-01' });

    expect(service.queue[0].status).toBe('quota_blocked');
  });

  it('prefetches only the configured window (current + N), never the whole queue', () => {
    const tracks = [track('a'), track('b'), track('c'), track('d'), track('e')];
    service.appendTracksToQueue(tracks);

    httpMock.expectOne(resolutionUrl('a')).flush({ status: 'resolved', videoId: 'vid-a', source: 'search', confidence: 0.9, retryAfter: null });

    // youtubePrefetchCount defaults to 2 -> tracks b and c should be prefetched, d/e should not.
    const prefetchB = httpMock.expectOne(resolutionUrl('b'));
    const prefetchC = httpMock.expectOne(resolutionUrl('c'));
    expect(prefetchB.request.body.mode).toBe('prefetch');
    expect(prefetchC.request.body.mode).toBe('prefetch');
    httpMock.expectNone(resolutionUrl('d'));
    httpMock.expectNone(resolutionUrl('e'));

    prefetchB.flush({ status: 'resolved', videoId: 'vid-b', source: 'search', confidence: 0.9, retryAfter: null });
    prefetchC.flush({ status: 'resolved', videoId: 'vid-c', source: 'search', confidence: 0.9, retryAfter: null });

    expect(service.queue[1].youtubeVideoId).toBe('vid-b');
    expect(service.queue[2].youtubeVideoId).toBe('vid-c');
  });

  it('skips prefetching a track that already has a known videoId', () => {
    service.playItems([
      { track: track('a'), youtubeVideoId: null, status: 'ready' },
      { track: track('b'), youtubeVideoId: 'known-b', status: 'ready' },
    ]);

    httpMock.expectOne(resolutionUrl('a')).flush({ status: 'resolved', videoId: 'vid-a', source: 'search', confidence: 0.9, retryAfter: null });

    // "b" already has a videoId — prefetch must skip it entirely, zero requests.
    httpMock.expectNone(resolutionUrl('b'));
    expect(service.currentVideoId).toBe('vid-a');
  });

  it('discards a stale prefetch result after the queue is replaced by playItems()', () => {
    const tracks = [track('a'), track('b')];
    service.appendTracksToQueue(tracks);
    httpMock.expectOne(resolutionUrl('a')).flush({ status: 'resolved', videoId: 'vid-a', source: 'search', confidence: 0.9, retryAfter: null });
    const stalePrefetch = httpMock.expectOne(resolutionUrl('b'));

    // Queue changes entirely before the prefetch for "b" returns.
    service.playItems([{ track: track('z'), youtubeVideoId: 'vid-z', status: 'ready' }]);

    // The stale prefetch for the OLD track "b" (no longer in the queue) resolves late —
    // it must not throw, and must not corrupt the new queue.
    stalePrefetch.flush({ status: 'resolved', videoId: 'late-vid-b', source: 'search', confidence: 0.9, retryAfter: null });

    expect(service.queue).toHaveSize(1);
    expect(service.queue[0].track.spotifyId).toBe('z');
    expect(service.currentVideoId).toBe('vid-z');
  });

  it('never sends a request for a track that already has a known videoId (BT playlist entries)', () => {
    service.playItems([{ track: track('known'), youtubeVideoId: 'preset-vid', status: 'ready' }]);
    httpMock.expectNone(resolutionUrl('known'));
    expect(service.currentVideoId).toBe('preset-vid');
  });

  describe('playTracksFrom', () => {
    it('replaces the queue and plays the chosen track immediately, even mid-playback of something else', () => {
      // Something is already current (and left paused, e.g. from an earlier session).
      service.playItems([{ track: track('old'), youtubeVideoId: 'vid-old', status: 'ready' }]);
      service.togglePlay(); // pause it

      // User picks a different song from a list — must jump straight to it and play it,
      // not sit on the old track with the new one merely queued as "next".
      service.playTracksFrom([track('picked'), track('after')], 0);

      expect(service.index).toBe(0);
      expect(service.currentItem?.track.spotifyId).toBe('picked');
      expect(service.isPlaying).toBe(true);
      expect(service.queue.map(q => q.track.spotifyId)).toEqual(['picked', 'after']);

      httpMock.expectOne(resolutionUrl('picked')).flush({ status: 'resolved', videoId: 'vid-picked', source: 'search', confidence: 0.9, retryAfter: null });
      expect(service.currentVideoId).toBe('vid-picked');

      // Bounded prefetch for "after" — not a bug, just needs to be drained.
      httpMock.expectOne(resolutionUrl('after')).flush({ status: 'resolved', videoId: 'vid-after', source: 'search', confidence: 0.9, retryAfter: null });
    });

    it('starts at the given index, not always the front of the list', () => {
      service.playTracksFrom([track('a'), track('b'), track('c')], 1);
      expect(service.index).toBe(1);
      expect(service.currentItem?.track.spotifyId).toBe('b');
      httpMock.expectOne(resolutionUrl('b')).flush({ status: 'resolved', videoId: 'vid-b', source: 'search', confidence: 0.9, retryAfter: null });

      // Bounded prefetch for "c" (the only remaining track) — drain it too.
      httpMock.expectOne(resolutionUrl('c')).flush({ status: 'resolved', videoId: 'vid-c', source: 'search', confidence: 0.9, retryAfter: null });
    });
  });

  describe('setVideoPreference', () => {
    const searchUrl = `${environment.apiUrl}/api/youtube/search`;

    it('fetches alternates on demand when none are loaded yet, and lands on the requested category', () => {
      service.appendTracksToQueue([track('a')]);
      httpMock.expectOne(resolutionUrl('a')).flush({ status: 'resolved', videoId: 'vid-default', source: 'search', confidence: 0.9, retryAfter: null });

      service.setVideoPreference('live');

      const req = httpMock.expectOne(r => r.url === searchUrl);
      req.flush({
        videos: [
          { videoId: 'vid-mv', title: 'Music Video', channelTitle: 'Artist', thumbnail: null, category: 'music-video' },
          { videoId: 'vid-live', title: 'Live', channelTitle: 'Artist', thumbnail: null, category: 'live' },
        ],
      });

      expect(service.currentVideoId).toBe('vid-live');
    });

    it('does not re-fetch once alternates are already loaded for the current track', () => {
      service.appendTracksToQueue([track('a')]);
      httpMock.expectOne(resolutionUrl('a')).flush({ status: 'resolved', videoId: 'vid-default', source: 'search', confidence: 0.9, retryAfter: null });

      service.setVideoPreference('live');
      httpMock.expectOne(r => r.url === searchUrl).flush({
        videos: [
          { videoId: 'vid-mv', title: 'Music Video', channelTitle: 'Artist', thumbnail: null, category: 'music-video' },
          { videoId: 'vid-live', title: 'Live', channelTitle: 'Artist', thumbnail: null, category: 'live' },
        ],
      });

      service.setVideoPreference('music-video');
      httpMock.expectNone(r => r.url === searchUrl);
      expect(service.currentVideoId).toBe('vid-mv');
    });
  });
});
