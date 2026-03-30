import { Component, Input } from '@angular/core';
import { Track } from '../../models/track.model';

@Component({
  selector: 'app-track-list',
  standalone: true,
  templateUrl: './track-list.component.html',
  styleUrl: './track-list.component.css'
})
export class TrackListComponent {
  @Input() tracks: Track[] = [];

  formatDuration(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
}
