export interface Playlist {
  id: number;
  spotifyPlaylistId: string;
  name: string;
  description: string | null;
  trackCount: number | null;
  imageUrl: string | null;
  isPublic: boolean;
}
