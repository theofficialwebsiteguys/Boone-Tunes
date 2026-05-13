import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { QueueItem } from '../../models/queue-item.model';

@Component({
  selector: 'app-queue-sidebar',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './queue-sidebar.component.html',
  styleUrl: './queue-sidebar.component.css'
})
export class QueueSidebarComponent {
  @Input() queue: QueueItem[] = [];
  @Input() currentIndex = -1;

  @Output() playAtIndex   = new EventEmitter<number>();
  @Output() clearQueue    = new EventEmitter<void>();
  /** Emits the absolute queue index to remove. */
  @Output() removeAtIndex = new EventEmitter<number>();
  /** Emits absolute {from, to} indices after a drag-drop reorder. */
  @Output() reorderQueue  = new EventEmitter<{ from: number; to: number }>();

  get currentItem(): QueueItem | null {
    return this.currentIndex >= 0 && this.currentIndex < this.queue.length
      ? this.queue[this.currentIndex]
      : null;
  }

  /** Explicitly-queued tracks that play before the regular queue. */
  get playNextItems(): QueueItem[] {
    const result: QueueItem[] = [];
    for (let i = this.currentIndex + 1; i < this.queue.length; i++) {
      if (this.queue[i].isPlayNext) result.push(this.queue[i]);
      else break;
    }
    return result;
  }

  /** Regular playlist tracks after the play-next section. */
  get queueItems(): QueueItem[] {
    return this.queue.slice(this.currentIndex + 1 + this.playNextItems.length);
  }

  onDropPlayNext(event: CdkDragDrop<QueueItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const offset = this.currentIndex + 1;
    this.reorderQueue.emit({ from: offset + event.previousIndex, to: offset + event.currentIndex });
  }

  onDropQueue(event: CdkDragDrop<QueueItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const offset = this.currentIndex + 1 + this.playNextItems.length;
    this.reorderQueue.emit({ from: offset + event.previousIndex, to: offset + event.currentIndex });
  }

  onRemove(event: MouseEvent, absoluteIndex: number): void {
    event.stopPropagation();
    this.removeAtIndex.emit(absoluteIndex);
  }
}
