export interface Track {
  spotifyId: string;
  name: string;
  artists: string[];
  albumName: string;
  albumArtUrl: string | null;
  durationMs: number;
  spotifyUri: string;
}
