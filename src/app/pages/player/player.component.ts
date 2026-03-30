import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { QueueItem } from '../../models/queue-item.model';
import { PlayerControlsComponent } from '../../components/player-controls/player-controls.component';
import { QueueSidebarComponent } from '../../components/queue-sidebar/queue-sidebar.component';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [PlayerControlsComponent, QueueSidebarComponent],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css'
})
export class PlayerComponent implements OnInit, OnDestroy {
  readonly playerSvc = inject(PlayerService);
  private router    = inject(Router);

  queue: QueueItem[] = [];
  index = -1;
  isPlaying = false;
  isShuffle = false;
  isRepeat  = false;
  progress  = 0;
  volume    = 75;

  private subs: Subscription[] = [];

  get currentItem(): QueueItem | null {
    return this.index >= 0 && this.index < this.queue.length
      ? this.queue[this.index]
      : null;
  }

  get currentTimeStr(): string { return this.msToTime(this.progress, 330000); }
  get totalTimeStr():   string { return '5:30'; }

  ngOnInit(): void {
    this.subs.push(
      this.playerSvc.queue$.subscribe(q => (this.queue = q)),
      this.playerSvc.index$.subscribe(i => (this.index = i)),
      this.playerSvc.playing$.subscribe(v => (this.isPlaying = v)),
      this.playerSvc.shuffle$.subscribe(v => (this.isShuffle = v)),
      this.playerSvc.repeat$.subscribe(v => (this.isRepeat = v)),
      this.playerSvc.progress$.subscribe(v => (this.progress = v)),
      this.playerSvc.volume$.subscribe(v => (this.volume = v)),
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  goBack(): void { this.router.navigate(['/dashboard']); }

  private msToTime(progress: number, totalMs: number): string {
    const elapsed = Math.floor((progress / 100) * (totalMs / 1000));
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
