import { Track } from './track.model';

export type QueueItemStatus = 'ready' | 'loading' | 'no_match' | 'quota_blocked' | 'error';

export interface QueueItem {
  track: Track;
  youtubeVideoId: string | null;
  status: QueueItemStatus;
  /** True when this item was explicitly queued ("play next") rather than added as part of a playlist. */
  isPlayNext?: boolean;
}
