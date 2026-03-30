import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent implements OnDestroy {
  @Output() queryChange = new EventEmitter<string>();

  value = '';

  private input$ = new Subject<string>();
  private sub: Subscription = this.input$
    .pipe(debounceTime(400), distinctUntilChanged())
    .subscribe(q => this.queryChange.emit(q));

  onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.input$.next(this.value);
  }

  clear(): void {
    this.value = '';
    this.input$.next('');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
