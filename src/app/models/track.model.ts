export type YoutubeResolutionStatus =
  | 'resolved' | 'unresolved' | 'resolving' | 'no_match'
  | 'temporarily_failed' | 'quota_blocked' | 'unavailable' | 'manual_override';

export interface Track {
  spotifyId: string;
  name: string;
  artists: string[];
  albumName: string;
  albumArtUrl: string | null;
  durationMs: number;
  spotifyUri: string;
  isrc?: string | null;
  /** Cached YouTube mapping status as reported by the playlist-tracks endpoint — informational only, never triggers a search. */
  youtube?: { status: YoutubeResolutionStatus; videoId: string | null };
}

export interface TrackPage {
  tracks: Track[];
  pagination: { offset: number; limit: number; total: number; hasMore: boolean };
  fromCache: boolean;
}
