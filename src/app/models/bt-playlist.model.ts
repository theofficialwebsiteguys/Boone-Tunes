import { Track } from './track.model';

export interface BtEntry {
  id: string;
  addedAt: number;
  track: Track;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
}

export interface BtPlaylist {
  id: string;
  name: string;
  createdAt: number;
  entries: BtEntry[];
}
