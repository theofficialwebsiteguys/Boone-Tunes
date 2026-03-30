import { Track } from './track.model';

export type QueueItemStatus = 'ready' | 'loading' | 'error';

export interface QueueItem {
  track: Track;
  youtubeVideoId: string | null;
  status: QueueItemStatus;
}
