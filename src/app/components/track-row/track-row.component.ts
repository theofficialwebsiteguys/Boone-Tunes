import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Track } from '../../models/track.model';

@Component({
  selector: 'app-track-row',
  standalone: true,
  templateUrl: './track-row.component.html',
  styleUrl: './track-row.component.css'
})
export class TrackRowComponent {
  @Input() track!: Track;
  @Input() index = 0;
  @Output() play  = new EventEmitter<Track>();
  @Output() queue = new EventEmitter<Track>();

  hovered = false;

  formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }
}
