import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  ViewChild, ElementRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { PlayerService } from '../../services/player.service';
import { VideoPortalService } from '../../services/video-portal.service';
import { QueueItem } from '../../models/queue-item.model';

@Component({
  selector: 'app-mini-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-player.component.html',
  styleUrl: './mini-player.component.css',
})
export class MiniPlayerComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly playerSvc = inject(PlayerService);
  private readonly portalSvc = inject(VideoPortalService);
  private readonly router    = inject(Router);

  @ViewChild('videoSlot') videoSlotRef?: ElementRef<HTMLDivElement>;

  isPlaying        = false;
  currentItem: QueueItem | null = null;
  isOnPlayerPage   = false;
  isOnLandingPage  = false;
  isOnSettingsPage = false;
  hasVideo         = false;

  private readonly subs: Subscription[] = [];
  private slotRegistered = false;

  get show(): boolean {
    return !this.isOnPlayerPage && !this.isOnLandingPage && !this.isOnSettingsPage && this.currentItem !== null;
  }

  private updateRouteFlags(url: string): void {
    this.isOnPlayerPage   = url.startsWith('/player');
    this.isOnLandingPage  = url === '/' || url === '';
    this.isOnSettingsPage = url.startsWith('/settings');
  }

  ngOnInit(): void {
    this.updateRouteFlags(this.router.url);

    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => this.updateRouteFlags(e.urlAfterRedirects)),

      this.playerSvc.playing$.subscribe(v  => (this.isPlaying    = v)),
      this.playerSvc.index$.subscribe(()   => (this.currentItem  = this.playerSvc.currentItem)),
      this.playerSvc.queue$.subscribe(()   => (this.currentItem  = this.playerSvc.currentItem)),
      this.playerSvc.currentVideoId$.subscribe(id => (this.hasVideo = !!id)),
    );
  }

  ngAfterViewChecked(): void { this.syncSlot(); }

  ngOnDestroy(): void {
    this.portalSvc.clearMiniSlot();
    this.subs.forEach(s => s.unsubscribe());
  }

  openPlayer(): void { this.router.navigate(['/player']); }

  togglePlay(e: Event): void {
    e.stopPropagation();
    this.playerSvc.togglePlay();
  }

  private syncSlot(): void {
    if (this.show && this.hasVideo && this.videoSlotRef && !this.slotRegistered) {
      this.portalSvc.setMiniSlot(this.videoSlotRef.nativeElement);
      this.slotRegistered = true;
    } else if (this.slotRegistered && !(this.show && this.hasVideo)) {
      this.portalSvc.clearMiniSlot();
      this.slotRegistered = false;
    }
  }
}
