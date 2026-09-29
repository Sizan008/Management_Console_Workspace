// notification-detail-modal.component.ts
import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { InAppNotification } from '../../../services/novu.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-notification-detail-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
         (click)="close.emit()">
      <div class="detail-card bg-white w-full max-w-md rounded-2xl overflow-hidden"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[var(--n-border)]">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="status-dot" [ngClass]="dotClass()"></span>
            <h2 class="text-lg font-bold text-[var(--n-text)] truncate">Notification Details</h2>
          </div>
          <button (click)="close.emit()"
                  class="shrink-0 -mr-1 p-1.5 rounded-lg text-[var(--n-text-light)] hover:bg-gray-100 transition">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-[var(--n-text-light)] font-semibold">Subject</p>
            <p class="text-base font-semibold text-[var(--n-text)] mt-1">{{ notification.subject }}</p>
          </div>

          <div>
            <p class="text-xs uppercase tracking-wide text-[var(--n-text-light)] font-semibold">Message</p>
            <p class="text-sm text-[var(--n-text)] mt-1 whitespace-pre-wrap leading-relaxed">{{ notification.content }}</p>
          </div>

          @if (getStatus(); as status) {
            <div>
              <p class="text-xs uppercase tracking-wide text-[var(--n-text-light)] font-semibold">Status</p>
              <span class="status-label mt-1 inline-block" [ngClass]="'status-' + status">
                {{ status | titlecase }}
              </span>
            </div>
          }

          @if (notification.redirect?.url) {
            <div>
              <p class="text-xs uppercase tracking-wide text-[var(--n-text-light)] font-semibold">Link</p>
              <div class="flex gap-2 mt-1">
                <input
                  type="text"
                  [value]="notification.redirect?.url?.startsWith('http')
                    ? notification.redirect?.url
                    : (environment.apiBaseUrl + notification.redirect?.url)"
                  readonly
                  class="w-full px-3 py-2 border border-[var(--n-border)] rounded-lg text-sm bg-gray-50 cursor-pointer truncate"
                  (click)="openRedirect(notification.redirect)" />
                <button
                  (click)="openRedirect(notification.redirect)"
                  class="shrink-0 px-3 py-2 rounded-lg text-white transition hover:opacity-90"
                  style="background: var(--n-primary)">
                  <mat-icon>open_in_new</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-[var(--n-border)] bg-gray-50">
          <p class="text-xs text-[var(--n-text-light)]">{{ formatTime(notification.createdAt) }}</p>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full"
                [ngClass]="notification.read ? 'read-pill' : 'unread-pill'">
            {{ notification.read ? 'Read' : 'Unread' }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --n-border: var(--theme-border, #e5e7eb);
      --n-primary: var(--theme-primary, #086AD8);
      --n-text: var(--theme-text, #1f2937);
      --n-text-light: var(--theme-text-light, #6b7280);
      --n-amber: #d97706;
      --n-green: #16a34a;
      --n-red: #dc2626;
    }
    .detail-card {
      border: 1px solid var(--n-border);
      box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .status-dot {
      flex-shrink: 0;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #d1d5db;
    }
    .status-dot.dot-amber { background: var(--n-amber); }
    .status-dot.dot-green { background: var(--n-green); }
    .status-dot.dot-red { background: var(--n-red); }
    .status-dot.dot-primary { background: var(--n-primary); }

    .status-label { font-size: 13px; font-weight: 600; }
    .status-label.status-pending { color: var(--n-amber); }
    .status-label.status-approved { color: var(--n-green); }
    .status-label.status-rejected { color: var(--n-red); }

    .unread-pill { background: rgba(8, 106, 216, 0.12); color: var(--n-primary); }
    .read-pill { background: #f3f4f6; color: var(--n-text-light); }

    mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `]
})
export class NotificationDetailModalComponent {
  @Input() notification: InAppNotification;
  @Output() close = new EventEmitter<void>();
 environment = environment;

  /** Optional approval status from the payload (null when absent). */
  getStatus(): 'pending' | 'approved' | 'rejected' | null {
    const status = this.notification?.data?.status;
    return status === 'pending' || status === 'approved' || status === 'rejected'
      ? status
      : null;
  }

  dotClass(): string {
    const status = this.getStatus();
    if (status === 'pending') return 'dot-amber';
    if (status === 'approved') return 'dot-green';
    if (status === 'rejected') return 'dot-red';
    return this.notification?.read ? 'dot-green' : 'dot-primary';
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    return date.toLocaleDateString();
  }

        openRedirect(redirect?: { url?: string; target?: string }) {
          if (!redirect?.url) return;

          let finalUrl = redirect.url;

          // Only prepend base URL if it's relative
          if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `${environment.apiBaseUrl}${finalUrl}`;
          }

          const target = redirect.target || '_blank';

          window.open(finalUrl, target, 'noopener,noreferrer');
        }



}
