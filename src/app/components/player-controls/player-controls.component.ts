import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-controls.component.html',
  styleUrl: './player-controls.component.css',
})
export class PlayerControlsComponent {
  /* Playback state */
  @Input() isPlaying = false;
  @Input() isShuffle = false;
  @Input() isRepeat  = false;
  @Input() progress  = 0;
  @Input() volume    = 75;
  @Input() currentTime = '0:00';
  @Input() totalTime   = '0:00';

  /* Track metadata */
  @Input() trackName:    string      = '';
  @Input() artistName:   string      = '';
  @Input() albumArtUrl:  string|null = null;
  @Input() hasAlternatives = false;

  /* Events */
  @Output() togglePlay    = new EventEmitter<void>();
  @Output() prev          = new EventEmitter<void>();
  @Output() next          = new EventEmitter<void>();
  @Output() toggleShuffle = new EventEmitter<void>();
  @Output() toggleRepeat  = new EventEmitter<void>();
  @Output() seekTo        = new EventEmitter<number>();
  @Output() volumeChange  = new EventEmitter<number>();
  @Output() changeVideo   = new EventEmitter<void>();
  @Output() addToPlaylist = new EventEmitter<void>();

  onSeek(e: Event):   void { this.seekTo.emit(+(e.target as HTMLInputElement).value); }
  onVolume(e: Event): void { this.volumeChange.emit(+(e.target as HTMLInputElement).value); }
}
