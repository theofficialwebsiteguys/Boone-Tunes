import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TrackResolverService } from './track-resolver.service';
import { Track } from '../models/track.model';
import { environment } from '../../environments/environment';

describe('TrackResolverService', () => {
  let service: TrackResolverService;
  let httpMock: HttpTestingController;

  const track: Track = {
    spotifyId: 'sp-1',
    name: 'Blinding Lights',
    artists: ['The Weeknd'],
    albumName: 'After Hours',
    albumArtUrl: null,
    durationMs: 200000,
    spotifyUri: 'spotify:track:sp-1',
    isrc: 'US-ISRC-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrackResolverService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts to the per-track resolution endpoint with normalized track fields', () => {
    service.resolve(track, 'interactive').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/tracks/sp-1/youtube-resolution`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      albumName: 'After Hours',
      durationMs: 200000,
      isrc: 'US-ISRC-1',
      mode: 'interactive',
    });
    req.flush({ status: 'resolved', videoId: 'vid-1', source: 'search', confidence: 0.9, retryAfter: null });
  });

  it('defaults to interactive mode when none is given', () => {
    service.resolve(track).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/api/tracks/sp-1/youtube-resolution`);
    expect(req.request.body.mode).toBe('interactive');
    req.flush({ status: 'resolved', videoId: 'vid-1', source: 'search', confidence: 0.9, retryAfter: null });
  });
});
