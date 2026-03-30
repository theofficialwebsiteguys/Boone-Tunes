import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Playlist } from '../../models/playlist.model';

@Component({
  selector: 'app-playlist-card',
  standalone: true,
  templateUrl: './playlist-card.component.html',
  styleUrl: './playlist-card.component.css'
})
export class PlaylistCardComponent {
  @Input() playlist!: Playlist;
  @Output() selected = new EventEmitter<Playlist>();
}
