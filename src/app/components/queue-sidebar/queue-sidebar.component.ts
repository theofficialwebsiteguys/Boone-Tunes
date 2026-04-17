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

  /** Tracks after the current track. */
  get upNext(): QueueItem[] {
    return this.queue.slice(this.currentIndex + 1);
  }

  onDrop(event: CdkDragDrop<QueueItem[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    // Convert relative upNext indices to absolute queue indices
    const fromAbs = this.currentIndex + 1 + event.previousIndex;
    const toAbs   = this.currentIndex + 1 + event.currentIndex;
    this.reorderQueue.emit({ from: fromAbs, to: toAbs });
  }

  onRemove(event: MouseEvent, absoluteIndex: number): void {
    event.stopPropagation();
    this.removeAtIndex.emit(absoluteIndex);
  }
}
