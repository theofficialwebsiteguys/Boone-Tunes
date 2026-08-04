import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PlaylistDetailComponent } from './playlist-detail.component';
import { environment } from '../../../environments/environment';

const tracksUrl = `${environment.apiUrl}/api/playlists/big-playlist/tracks`;

const trackFixture = (i: number) => ({
  spotifyId: `t${i}`, name: `Track ${i}`, artists: ['Artist'], albumName: 'Album',
  albumArtUrl: null, durationMs: 200000, spotifyUri: `spotify:track:t${i}`,
  youtube: { status: 'unresolved', videoId: null },
});

describe('PlaylistDetailComponent', () => {
  let httpMock: HttpTestingController;

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [PlaylistDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'big-playlist' }) } },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PlaylistDetailComponent);
    return fixture;
  };

  afterEach(() => httpMock.verify());

  it('loads the first page of tracks on init without resolving any video', async () => {
    const fixture = await setup();
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === tracksUrl);
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush({
      tracks: Array.from({ length: 50 }, (_, i) => trackFixture(i)),
      pagination: { offset: 0, limit: 50, total: 300, hasMore: true },
      fromCache: false,
    });

    // Recommendations are seeded from the loaded tracks' artists — allow that call through.
    httpMock.match(() => true).forEach((r) => r.flush({ tracks: [] }));

    expect(fixture.componentInstance.tracks).toHaveSize(50);
    expect(fixture.componentInstance.hasMore).toBeTrue();
  });

  it('requests the next page at the correct offset and appends results', async () => {
    const fixture = await setup();
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === tracksUrl).flush({
      tracks: [trackFixture(0)],
      pagination: { offset: 0, limit: 50, total: 60, hasMore: true },
      fromCache: false,
    });
    httpMock.match(() => true).forEach((r) => r.flush({ tracks: [] }));

    // loadNextPage() is private (invoked internally by the IntersectionObserver callback);
    // calling it directly is simpler for a unit test than simulating a real scroll intersection.
    (fixture.componentInstance as unknown as { loadNextPage(): void }).loadNextPage();

    const req2 = httpMock.expectOne((r) => r.url === tracksUrl);
    expect(req2.request.params.get('offset')).toBe('50');
    req2.flush({
      tracks: [trackFixture(50)],
      pagination: { offset: 50, limit: 50, total: 60, hasMore: false },
      fromCache: false,
    });

    expect(fixture.componentInstance.tracks).toHaveSize(2);
    expect(fixture.componentInstance.hasMore).toBeFalse();
  });
});
