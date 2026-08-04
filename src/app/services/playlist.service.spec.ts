import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PlaylistService, DEFAULT_TRACK_PAGE_SIZE } from './playlist.service';
import { environment } from '../../environments/environment';

describe('PlaylistService', () => {
  let service: PlaylistService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlaylistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests the first page with default offset/limit', () => {
    service.getTracks('playlist-1').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/api/playlists/playlist-1/tracks`
    );
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.get('limit')).toBe(String(DEFAULT_TRACK_PAGE_SIZE));
    req.flush({ tracks: [], pagination: { offset: 0, limit: 50, total: 0, hasMore: false }, fromCache: false });
  });

  it('requests a specific page when offset/limit are given', () => {
    service.getTracks('playlist-1', 50, 25).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/api/playlists/playlist-1/tracks`
    );
    expect(req.request.params.get('offset')).toBe('50');
    expect(req.request.params.get('limit')).toBe('25');
    req.flush({ tracks: [], pagination: { offset: 50, limit: 25, total: 100, hasMore: true }, fromCache: false });
  });
});
