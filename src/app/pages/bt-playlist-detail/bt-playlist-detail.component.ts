import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BtPlaylistService } from '../../services/bt-playlist.service';
import { BtPlaylist, BtEntry } from '../../models/bt-playlist.model';
import { PlayerService } from '../../services/player.service';
import { QueueItem } from '../../models/queue-item.model';

@Component({
  selector: 'app-bt-playlist-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bt-playlist-detail.component.html',
  styleUrl: './bt-playlist-detail.component.css',
})
export class BtPlaylistDetailComponent implements OnInit, OnDestroy {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly btSvc  = inject(BtPlaylistService);
  private readonly player = inject(PlayerService);

  playlist: BtPlaylist | null = null;
  private playlistId = '';
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.playlistId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.playlistId) { this.router.navigate(['/dashboard']); return; }

    this.subs.push(
      this.btSvc.playlists$.subscribe(pls => {
        this.playlist = pls.find(p => p.id === this.playlistId) ?? null;
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  goBack(): void { this.router.navigate(['/dashboard']); }

  get coverSrc(): string | null {
    if (!this.playlist?.entries.length) return null;
    return this.playlist.entries[0].videoThumbnail
      ?? this.playlist.entries[0].track.albumArtUrl;
  }

  playAll(): void {
    if (!this.playlist?.entries.length) return;
    this.player.playItems(this.entriesToItems(this.playlist.entries));
  }

  shuffleAll(): void {
    if (!this.playlist?.entries.length) return;
    const shuffled = [...this.playlist.entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.player.playItems(this.entriesToItems(shuffled));
  }

  playFromEntry(entry: BtEntry): void {
    if (!this.playlist) return;
    const startIndex = this.playlist.entries.findIndex(e => e.id === entry.id);
    this.player.playItems(this.entriesToItems(this.playlist.entries), startIndex);
  }

  addEntryToQueue(entry: BtEntry, e: MouseEvent): void {
    e.stopPropagation();
    this.player.addQueueItem(this.entryToItem(entry));
  }

  removeEntry(entryId: string, e: MouseEvent): void {
    e.stopPropagation();
    if (!this.playlist) return;
    this.btSvc.removeEntry(this.playlist.id, entryId);
  }

  deletePlaylist(): void {
    if (!this.playlist) return;
    if (!confirm(`Delete "${this.playlist.name}"? This cannot be undone.`)) return;
    this.btSvc.deletePlaylist(this.playlist.id);
    this.router.navigate(['/dashboard']);
  }

  private entryToItem(entry: BtEntry): QueueItem {
    return { track: entry.track, youtubeVideoId: entry.videoId, status: 'ready' };
  }

  private entriesToItems(entries: BtEntry[]): QueueItem[] {
    return entries.map(e => this.entryToItem(e));
  }
}
