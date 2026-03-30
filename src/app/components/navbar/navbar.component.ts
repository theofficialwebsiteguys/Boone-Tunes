import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [SearchBarComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  @Input() user: User | null = null;
  @Input() showSearch = true;
  @Output() queryChange = new EventEmitter<string>();
  @Output() logoutClick = new EventEmitter<void>();

  private router = inject(Router);

  get avatarLetter(): string {
    if (!this.user) return '?';
    return (this.user.displayName || this.user.email).charAt(0).toUpperCase();
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
  }
}
