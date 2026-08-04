import {
  Component, Input, ElementRef, ViewChild,
  OnChanges, AfterViewInit, OnDestroy,
} from '@angular/core';

/** Scrolls its text back and forth when it doesn't fit its container;
 *  stays static (no clipping change) when it already fits. */
@Component({
  selector: 'app-marquee-text',
  standalone: true,
  templateUrl: './marquee-text.component.html',
  styleUrl: './marquee-text.component.css',
})
export class MarqueeTextComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() text = '';

  @ViewChild('viewport') viewportRef!: ElementRef<HTMLDivElement>;
  @ViewChild('track') trackRef!: ElementRef<HTMLSpanElement>;

  isOverflowing = false;
  distancePx = 0;
  durationS = 8;

  private resizeObserver?: ResizeObserver;
  private measureTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.scheduleMeasure();
    this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());
    this.resizeObserver.observe(this.viewportRef.nativeElement);
  }

  ngOnChanges(): void {
    if (this.viewportRef) this.scheduleMeasure();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.measureTimer) clearTimeout(this.measureTimer);
  }

  /** Defer to the next tick so the DOM reflects the latest text before measuring. */
  private scheduleMeasure(): void {
    if (this.measureTimer) clearTimeout(this.measureTimer);
    this.measureTimer = setTimeout(() => this.measure(), 0);
  }

  private measure(): void {
    const viewport = this.viewportRef?.nativeElement;
    const track = this.trackRef?.nativeElement;
    if (!viewport || !track) return;

    const overflow = track.scrollWidth - viewport.clientWidth;
    this.isOverflowing = overflow > 4; // tolerance for sub-pixel rounding
    this.distancePx = Math.max(0, overflow);
    // Reading-speed heuristic — longer overflow gets a longer cycle, within sane bounds.
    this.durationS = Math.min(18, Math.max(5, this.distancePx / 35 + 3));
  }
}
