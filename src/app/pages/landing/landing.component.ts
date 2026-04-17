import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';

type ContactStatus = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  private readonly api = inject(ApiService);

  connect(): void {
    globalThis.location.href = `${environment.apiUrl}/api/auth/spotify`;
  }

  readonly currentYear = new Date().getFullYear();

  /* ── Contact form ────────────────────────────────────────────── */

  contactStatus: ContactStatus = 'idle';
  contactError = '';

  form = {
    name:    '',
    email:   '',
    type:    '',
    message: '',
  };

  get isSubmitting(): boolean { return this.contactStatus === 'submitting'; }

  submitContact(): void {
    if (this.isSubmitting) return;
    this.contactStatus = 'submitting';
    this.contactError  = '';

    this.api.post<{ message: string }>('/api/contact', this.form).subscribe({
      next: () => {
        this.contactStatus = 'success';
        this.form = { name: '', email: '', type: '', message: '' };
      },
      error: err => {
        this.contactStatus = 'error';
        this.contactError  =
          err?.error?.error ?? 'Something went wrong. Please try again.';
      },
    });
  }

  resetContact(): void {
    this.contactStatus = 'idle';
    this.contactError  = '';
  }
}
