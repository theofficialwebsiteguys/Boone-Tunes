import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Playlist } from '../../models/playlist.model';

@Component({
  selector: 'app-playlist-list',
  standalone: true,
  templateUrl: './playlist-list.component.html',
  styleUrl: './playlist-list.component.css'
})
export class PlaylistListComponent {
  @Input() playlists: Playlist[] = [];
  @Input() selectedId: string | null = null;
  @Output() selected = new EventEmitter<Playlist>();

  select(playlist: Playlist): void {
    this.selected.emit(playlist);
  }
}
