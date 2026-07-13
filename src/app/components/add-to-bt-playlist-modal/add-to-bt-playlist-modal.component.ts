import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BtPlaylistService } from '../../services/bt-playlist.service';
import { BtPlaylist, BtEntry } from '../../models/bt-playlist.model';
import { Track } from '../../models/track.model';

@Component({
  selector: 'app-add-to-bt-playlist-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-to-bt-playlist-modal.component.html',
  styleUrl: './add-to-bt-playlist-modal.component.css',
})
export class AddToBtPlaylistModalComponent {
  private readonly btSvc = inject(BtPlaylistService);

  @Input({ required: true }) track!: Track;
  @Input({ required: true }) videoId!: string;
  @Input() videoTitle = '';
  @Input() videoThumbnail: string | null = null;

  @Output() closed = new EventEmitter<void>();

  newPlaylistName = '';
  savedToId: string | null = null;

  get playlists(): BtPlaylist[] { return this.btSvc.playlists; }

  isAlreadySaved(pl: BtPlaylist): boolean {
    return this.btSvc.hasEntry(pl.id, this.track.spotifyId, this.videoId);
  }

  saveToPlaylist(pl: BtPlaylist): void {
    if (this.isAlreadySaved(pl)) return;
    const entry: BtEntry = {
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: Date.now(),
      track: this.track,
      videoId: this.videoId,
      videoTitle: this.videoTitle || this.track.name,
      videoThumbnail: this.videoThumbnail,
    };
    this.btSvc.addEntry(pl.id, entry);
    this.savedToId = pl.id;
    setTimeout(() => this.closed.emit(), 900);
  }

  createAndSave(): void {
    const name = this.newPlaylistName.trim();
    if (!name) return;
    const pl = this.btSvc.createPlaylist(name);
    this.newPlaylistName = '';
    this.saveToPlaylist(pl);
  }

  close(): void { this.closed.emit(); }
}
