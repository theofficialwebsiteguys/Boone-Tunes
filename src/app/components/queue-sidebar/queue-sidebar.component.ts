import { Component, Input, Output, EventEmitter } from '@angular/core';
import { QueueItem } from '../../models/queue-item.model';

@Component({
  selector: 'app-queue-sidebar',
  standalone: true,
  templateUrl: './queue-sidebar.component.html',
  styleUrl: './queue-sidebar.component.css'
})
export class QueueSidebarComponent {
  @Input() queue: QueueItem[] = [];
  @Input() currentIndex = -1;
  @Output() playAtIndex = new EventEmitter<number>();
  @Output() clearQueue  = new EventEmitter<void>();
}
