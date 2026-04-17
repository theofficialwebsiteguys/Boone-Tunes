import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, SearchBarComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  @Input() user: User | null = null;
  @Input() showSearch = true;
  @Output() queryChange  = new EventEmitter<string>();
  @Output() logoutClick  = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly el     = inject(ElementRef);

  dropdownOpen = false;

  get avatarLetter(): string {
    if (!this.user) return '?';
    return (this.user.displayName || this.user.email).charAt(0).toUpperCase();
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goToSettings(): void {
    this.dropdownOpen = false;
    this.router.navigate(['/settings']);
  }

  onLogout(): void {
    this.dropdownOpen = false;
    this.logoutClick.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }
}
