import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BtPlaylist, BtEntry } from '../models/bt-playlist.model';

const STORAGE_KEY = 'bt-custom-playlists';

@Injectable({ providedIn: 'root' })
export class BtPlaylistService {
  private readonly playlistsS = new BehaviorSubject<BtPlaylist[]>(this.load());

  readonly playlists$ = this.playlistsS.asObservable();
  get playlists(): BtPlaylist[] { return this.playlistsS.value; }

  createPlaylist(name: string): BtPlaylist {
    const pl: BtPlaylist = {
      id: `bt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      createdAt: Date.now(),
      entries: [],
    };
    const updated = [...this.playlists, pl];
    this.playlistsS.next(updated);
    this.save(updated);
    return pl;
  }

  deletePlaylist(id: string): void {
    const updated = this.playlists.filter(p => p.id !== id);
    this.playlistsS.next(updated);
    this.save(updated);
  }

  renamePlaylist(id: string, name: string): void {
    const updated = this.playlists.map(p =>
      p.id === id ? { ...p, name: name.trim() } : p
    );
    this.playlistsS.next(updated);
    this.save(updated);
  }

  addEntry(playlistId: string, entry: BtEntry): void {
    const updated = this.playlists.map(p => {
      if (p.id !== playlistId) return p;
      const exists = p.entries.some(
        e => e.track.spotifyId === entry.track.spotifyId && e.videoId === entry.videoId
      );
      if (exists) return p;
      return { ...p, entries: [...p.entries, entry] };
    });
    this.playlistsS.next(updated);
    this.save(updated);
  }

  removeEntry(playlistId: string, entryId: string): void {
    const updated = this.playlists.map(p =>
      p.id === playlistId
        ? { ...p, entries: p.entries.filter(e => e.id !== entryId) }
        : p
    );
    this.playlistsS.next(updated);
    this.save(updated);
  }

  getById(id: string): BtPlaylist | undefined {
    return this.playlists.find(p => p.id === id);
  }

  hasEntry(playlistId: string, trackId: string, videoId: string): boolean {
    return this.getById(playlistId)?.entries
      .some(e => e.track.spotifyId === trackId && e.videoId === videoId) ?? false;
  }

  private load(): BtPlaylist[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private save(playlists: BtPlaylist[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists)); } catch {}
  }
}
