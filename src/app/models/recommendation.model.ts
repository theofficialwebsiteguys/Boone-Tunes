export interface SpotifyEditorialPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
}

export interface TrendingVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
  viewCount: number | null;
}
