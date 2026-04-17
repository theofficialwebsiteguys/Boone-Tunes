import {
  Component, OnInit, OnDestroy, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { PlayerService } from '../../services/player.service';
import { environment } from '../../../environments/environment';

export type SettingsTab = 'profile' | 'playback' | 'connections' | 'appearance' | 'privacy' | 'support';
type SaveStatus    = 'idle' | 'saving' | 'saved' | 'error';
type ContactStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SettingsProfile {
  id: number;
  email: string;
  displayName: string | null;
  hasPassword: boolean;
  spotifyConnected: boolean;
  googleConnected: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly auth   = inject(AuthService);
  private readonly api    = inject(ApiService);
  readonly player         = inject(PlayerService);
  private readonly router = inject(Router);

  activeTab: SettingsTab = 'profile';

  profile: SettingsProfile | null = null;
  loadingProfile = true;

  readonly navItems: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'profile',     label: 'Profile',     icon: 'account_circle' },
    { id: 'playback',    label: 'Playback',    icon: 'graphic_eq'     },
    { id: 'connections', label: 'Connections', icon: 'link'           },
    { id: 'appearance',  label: 'Appearance',  icon: 'palette'        },
    { id: 'privacy',     label: 'Privacy',     icon: 'shield'         },
    { id: 'support',     label: 'Support',     icon: 'chat'           },
  ];

  // ── Profile tab ───────────────────────────────────────────────────────────
  editDisplayName = '';
  nameSaveStatus: SaveStatus = 'idle';
  nameSaveError = '';

  // Password change
  pwCurrent = '';
  pwNew     = '';
  pwConfirm = '';
  pwStatus: SaveStatus = 'idle';
  pwError = '';

  // ── Playback tab ──────────────────────────────────────────────────────────
  volumeValue = 75;
  private readonly subs: Subscription[] = [];

  // ── Delete account ────────────────────────────────────────────────────────
  showDeleteConfirm  = false;
  deletePassword     = '';
  deleteStatus: 'idle' | 'deleting' | 'error' = 'idle';
  deleteError = '';

  // ── Support / contact tab ─────────────────────────────────────────────────
  contactStatus: ContactStatus = 'idle';
  contactError = '';
  contactForm = { name: '', email: '', type: '', message: '' };

  // ── Computed ──────────────────────────────────────────────────────────────
  get avatarLetter(): string {
    if (!this.profile) return '?';
    return (this.profile.displayName || this.profile.email).charAt(0).toUpperCase();
  }

  get memberSince(): string {
    if (!this.profile) return '';
    return new Date(this.profile.createdAt).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric',
    });
  }

  get spotifyConnectUrl(): string {
    return `${environment.apiUrl}/api/auth/spotify`;
  }

  get googleConnectUrl(): string {
    return `${environment.apiUrl}/api/auth/google`;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProfile();
    this.subs.push(
      this.player.volume$.subscribe(v => (this.volumeValue = v)),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  setTab(tab: SettingsTab): void {
    this.activeTab = tab;
    if (tab === 'support' && this.profile) {
      this.contactForm.email = this.profile.email;
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.api.post<void>('/api/auth/logout', {}).subscribe({ complete: () => {} });
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  private loadProfile(): void {
    this.loadingProfile = true;
    this.api.get<SettingsProfile>('/api/users/profile').subscribe({
      next: p => {
        this.profile = p;
        this.editDisplayName = p.displayName ?? '';
        this.contactForm.email = p.email;
        this.loadingProfile = false;
      },
      error: () => (this.loadingProfile = false),
    });
  }

  saveDisplayName(): void {
    if (this.nameSaveStatus === 'saving') return;
    this.nameSaveStatus = 'saving';
    this.nameSaveError  = '';
    this.api.put<{ id: number; email: string; displayName: string | null; createdAt: string }>(
      '/api/users/profile',
      { displayName: this.editDisplayName },
    ).subscribe({
      next: p => {
        if (this.profile) {
          this.profile.displayName = p.displayName;
        }
        this.auth.currentUser$.next({ id: p.id, email: p.email, displayName: p.displayName, createdAt: p.createdAt });
        this.nameSaveStatus = 'saved';
        setTimeout(() => (this.nameSaveStatus = 'idle'), 2500);
      },
      error: err => {
        this.nameSaveStatus = 'error';
        this.nameSaveError  = err?.error?.error ?? 'Failed to save.';
        setTimeout(() => (this.nameSaveStatus = 'idle'), 2500);
      },
    });
  }

  changePassword(): void {
    this.pwError  = '';
    this.pwStatus = 'idle';

    if (this.pwNew !== this.pwConfirm) {
      this.pwError = 'New passwords do not match.'; return;
    }
    if (this.pwNew.length < 8) {
      this.pwError = 'Password must be at least 8 characters.'; return;
    }

    this.pwStatus = 'saving';
    this.api.put<{ message: string }>('/api/users/password', {
      currentPassword: this.pwCurrent,
      newPassword:     this.pwNew,
    }).subscribe({
      next: () => {
        this.pwStatus  = 'saved';
        this.pwCurrent = '';
        this.pwNew     = '';
        this.pwConfirm = '';
        setTimeout(() => (this.pwStatus = 'idle'), 2500);
      },
      error: err => {
        this.pwStatus = 'error';
        this.pwError  = err?.error?.error ?? 'Failed to update password.';
        setTimeout(() => (this.pwStatus = 'idle'), 2500);
      },
    });
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  onVolumeChange(): void {
    this.player.setVolume(this.volumeValue);
  }

  // ── Delete account ────────────────────────────────────────────────────────

  confirmDelete(): void {
    this.deleteStatus = 'deleting';
    this.deleteError  = '';
    const body = this.profile?.hasPassword ? { password: this.deletePassword } : {};
    this.api.delete<void>('/api/users/account', body).subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(['/']);
      },
      error: err => {
        this.deleteStatus = 'error';
        this.deleteError  = err?.error?.error ?? 'Failed to delete account.';
      },
    });
  }

  // ── Support ───────────────────────────────────────────────────────────────

  submitContact(): void {
    if (this.contactStatus === 'submitting') return;
    this.contactStatus = 'submitting';
    this.contactError  = '';
    this.api.post<{ message: string }>('/api/contact', this.contactForm).subscribe({
      next: () => {
        this.contactStatus = 'success';
        this.contactForm   = { name: '', email: this.profile?.email ?? '', type: '', message: '' };
      },
      error: err => {
        this.contactStatus = 'error';
        this.contactError  = err?.error?.error ?? 'Something went wrong. Please try again.';
      },
    });
  }

  resetContact(): void {
    this.contactStatus = 'idle';
    this.contactError  = '';
  }
}
