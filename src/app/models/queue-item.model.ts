import { Track } from './track.model';

export type QueueItemStatus = 'ready' | 'loading' | 'error';

export interface QueueItem {
  track: Track;
  youtubeVideoId: string | null;
  status: QueueItemStatus;
  /** True when this item was explicitly queued ("play next") rather than added as part of a playlist. */
  isPlayNext?: boolean;
}
