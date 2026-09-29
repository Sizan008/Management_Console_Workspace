// notification-popover.component.ts
import { Component, EventEmitter, Output, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { InAppNotification, NovuService } from '../../../services/novu.service';

type NotifTab = 'all' | 'unread' | 'approvals';
type NotifStatus = 'pending' | 'approved' | 'rejected';
interface NotifAction {
  label: string;
  /** free-form action key emitted back to the host (e.g. 'approve', 'view', 'review') */
  type: string;
  /** primary => filled button, otherwise a subtle outline button */
  variant?: 'primary' | 'ghost';
}

@Component({
  selector: 'app-notification-popover',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="popover">
      <!-- Header -->
      <div class="popover-header">
        <div class="header-text">
          <h3 class="header-title">Notifications</h3>
          <p class="header-meta">
            <span class="unread">{{ unreadCount }} unread</span>
            <span class="dot-sep">&middot;</span>
            <span>{{ notifications.length }} total</span>
          </p>
        </div>
        @if (unreadCount > 0) {
          <button (click)="markAllAsRead()" class="mark-all-btn" title="Mark all as read">
            Mark all read
          </button>
        }
      </div>

      <!-- Tabs -->
      <div class="tabs" role="tablist">
        @for (tab of tabs; track tab.key) {
          <button
            class="tab"
            role="tab"
            [class.active]="activeTab === tab.key"
            [attr.aria-selected]="activeTab === tab.key"
            (click)="activeTab = tab.key">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Body -->
      <div class="popover-body">
        @if (visibleNotifications().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">check_circle</mat-icon>
            <p class="empty-text">You're all caught up</p>
          </div>
        }

        @for (group of groupedNotifications(); track group.label) {
          @if (group.items.length) {
            <div class="group">
              <div class="group-label">{{ group.label }}</div>

              @for (notif of group.items; track notif._id) {
                <div class="notif-row"
                     [class.unread]="!notif.read"
                     (click)="openNotification(notif)">

                  <span class="status-dot" [ngClass]="dotClass(notif)"></span>

                  <div class="notif-main">
                    <div class="notif-line">
                      <span class="notif-title">{{ notif.subject || 'Notification' }}</span>
                      <span class="notif-time">{{ formatTime(notif.createdAt) }}</span>
                    </div>
                    @if (notif.content) {
                      <p class="notif-content">{{ notif.content }}</p>
                    }
                  </div>

                  <div class="notif-side">
                    @if (!notif.read) {
                      <button
                        class="read-btn"
                        title="Mark as read"
                        aria-label="Mark as read"
                        (click)="$event.stopPropagation(); markAsRead(notif._id)">
                        <mat-icon>done</mat-icon>
                      </button>
                    }

                    @if (getStatus(notif); as status) {
                      <span class="status-label" [ngClass]="'status-' + status">
                        {{ status | titlecase }}
                      </span>
                    }

                    @if (getActions(notif).length) {
                      <div class="actions">
                        @for (action of getActions(notif); track action.type) {
                          <button
                            class="action-btn"
                            [class.primary]="action.variant !== 'ghost'"
                            (click)="$event.stopPropagation(); runAction(notif, action)">
                            {{ action.label }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <!-- @if (notifications.length > 0) {
        <div class="popover-footer">
          <button class="view-all-btn" (click)="viewAllNotifications()">View all activity</button>
        </div>
      } -->
    </div>
  `,
  styles: [`
    :host {
      display: block;

      --n-border: var(--theme-border, #e5e7eb);
      --n-primary: var(--theme-primary, #086AD8);
      --n-text: var(--theme-text, #1f2937);
      --n-text-light: var(--theme-text-light, #6b7280);
      --n-amber: #d97706;
      --n-green: #16a34a;
      --n-red: #dc2626;
    }

    * { box-sizing: border-box; }

    .popover {
      width: 420px;
      max-width: 100vw;
      /* Cap well below the viewport so the whole popover (incl. footer) fits
         above the taskbar even when anchored near the top of the screen.
         The body scrolls; header/tabs/footer stay pinned. */
      max-height: min(480px, calc(100vh - 120px));
      display: flex;
      flex-direction: column;
      background: #fff;
      border: 1px solid var(--n-border);
      border-radius: 14px;
      box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.18);
      overflow: hidden;
    }

    /* Header */
    .popover-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 12px;
    }
    .header-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: var(--n-text);
      letter-spacing: -0.01em;
    }
    .header-meta {
      margin: 3px 0 0;
      font-size: 12px;
      color: var(--n-text-light);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-meta .unread {
      color: var(--n-primary);
      font-weight: 600;
    }
    .header-meta .dot-sep { opacity: 0.6; }

    .mark-all-btn {
      flex-shrink: 0;
      padding: 6px 12px;
      background: #fff;
      color: var(--n-text);
      border: 1px solid var(--n-border);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .mark-all-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 18px;
      padding: 0 18px;
      border-bottom: 1px solid var(--n-border);
    }
    .tab {
      position: relative;
      padding: 8px 0 10px;
      background: none;
      border: none;
      font-size: 13px;
      font-weight: 600;
      color: var(--n-text-light);
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .tab:hover { color: var(--n-text); }
    .tab.active { color: var(--n-text); }
    .tab.active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: var(--n-primary);
      border-radius: 2px 2px 0 0;
    }

    /* Body */
    .popover-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 4px 0 6px;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }
    .popover-body::-webkit-scrollbar { width: 6px; }
    .popover-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .group-label {
      padding: 12px 18px 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9ca3af;
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 48px 24px;
      text-align: center;
    }
    .empty-icon {
      font-size: 34px;
      width: 34px;
      height: 34px;
      color: var(--n-green);
    }
    .empty-text {
      margin: 0;
      font-size: 13px;
      color: var(--n-text-light);
    }

    /* Row */
    .notif-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 18px;
      cursor: pointer;
      border-top: 1px solid #f3f4f6;
      transition: background 0.12s ease;
    }
    .group-label + .notif-row { border-top: none; }
    .notif-row:hover { background: #f9fafb; }

    .status-dot {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      margin-top: 5px;
      border-radius: 50%;
      background: #d1d5db;
    }
    .status-dot.dot-amber { background: var(--n-amber); }
    .status-dot.dot-green { background: var(--n-green); }
    .status-dot.dot-red { background: var(--n-red); }
    .status-dot.dot-primary { background: var(--n-primary); }

    .notif-main {
      flex: 1;
      min-width: 0;
    }
    .notif-line {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .notif-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--n-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .notif-time {
      flex-shrink: 0;
      font-size: 11.5px;
      color: #9ca3af;
    }
    .notif-content {
      margin: 2px 0 0;
      font-size: 12.5px;
      color: var(--n-text-light);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Right side: status + actions */
    .notif-side {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 1px;
    }
    /* Mark-a-single-notification-as-read icon */
    .read-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: 1px solid var(--n-border);
      border-radius: 50%;
      background: #fff;
      color: var(--n-text-light);
      cursor: pointer;
      opacity: 0.65;
      transition: opacity 0.15s ease, color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
    }
    .notif-row:hover .read-btn { opacity: 1; }
    .read-btn:hover {
      color: var(--n-primary);
      border-color: var(--n-primary);
      background: #f3f8ff;
      opacity: 1;
    }
    .read-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .status-label {
      font-size: 12px;
      font-weight: 600;
    }
    .status-label.status-pending { color: var(--n-amber); }
    .status-label.status-approved { color: var(--n-green); }
    .status-label.status-rejected { color: var(--n-red); }

    .actions {
      display: flex;
      gap: 6px;
    }
    .action-btn {
      padding: 6px 12px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--n-border);
      background: #fff;
      color: var(--n-text);
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    .action-btn:hover { background: #f3f4f6; }
    .action-btn.primary {
      background: var(--n-primary);
      border-color: var(--n-primary);
      color: #fff;
    }
    .action-btn.primary:hover { opacity: 0.9; background: var(--n-primary); }

    /* Footer */
    .popover-footer {
      border-top: 1px solid var(--n-border);
      padding: 10px;
    }
    .view-all-btn {
      width: 100%;
      padding: 8px;
      background: none;
      border: none;
      color: var(--n-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .view-all-btn:hover { background: #f3f4f6; }

    @media (max-width: 480px) {
      .popover { width: 100vw; border-radius: 12px; }
    }
  `]
})
export class NotificationPopoverComponent implements OnInit, OnDestroy {
  private novuService = inject(NovuService);
  private destroy$ = new Subject<void>();

  notifications: InAppNotification[] = [];
  unreadCount = 0;

  activeTab: NotifTab = 'all';
  readonly tabs: { key: NotifTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'approvals', label: 'Approvals' },
  ];

  @Output() openDetail = new EventEmitter<InAppNotification>();
  @Output() closePopover = new EventEmitter<void>();
  @Output() viewAll = new EventEmitter<void>();
  /** Emitted when a per-notification action button (Approve / View / …) is clicked. */
  @Output() action = new EventEmitter<{ notification: InAppNotification; type: string }>();

  ngOnInit() {
    this.novuService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifs => {
        this.notifications = notifs;
      });

    this.novuService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });
  }

  /** Notifications filtered by the active tab. */
  visibleNotifications(): InAppNotification[] {
    switch (this.activeTab) {
      case 'unread':
        return this.notifications.filter(n => !n.read);
      case 'approvals':
        return this.notifications.filter(n => this.getStatus(n) || this.getActions(n).length);
      default:
        return this.notifications;
    }
  }

  /** Split the visible list into Today / Earlier groups. */
  groupedNotifications(): { label: string; items: InAppNotification[] }[] {
    const items = this.visibleNotifications();
    const today: InAppNotification[] = [];
    const earlier: InAppNotification[] = [];
    for (const n of items) {
      (this.isToday(n.createdAt) ? today : earlier).push(n);
    }
    return [
      { label: 'Today', items: today },
      { label: 'Earlier', items: earlier },
    ];
  }

  /**
   * Optional approval status carried on the notification payload.
   * Returns null when the backend doesn't provide one (so the label is hidden).
   */
  getStatus(notif: InAppNotification): NotifStatus | null {
    const status = notif.data?.status;
    return status === 'pending' || status === 'approved' || status === 'rejected'
      ? status
      : null;
  }

  /** Optional per-notification action buttons from the payload. */
  getActions(notif: InAppNotification): NotifAction[] {
    const actions = notif.data?.actions;
    return Array.isArray(actions) ? actions : [];
  }

  dotClass(notif: InAppNotification): string {
    const status = this.getStatus(notif);
    if (status === 'pending') return 'dot-amber';
    if (status === 'approved') return 'dot-green';
    if (status === 'rejected') return 'dot-red';
    return notif.read ? 'dot-green' : 'dot-primary';
  }

  runAction(notif: InAppNotification, action: NotifAction) {
    this.action.emit({ notification: notif, type: action.type });
  }

  /**
   * Row click: opening a notification counts as reading it, so mark it read
   * before handing it to the host for the detail modal.
   */
  openNotification(notif: InAppNotification) {
    if (!notif.read) {
      this.markAsRead(notif._id);
      // The service swaps in a new object, so emit an already-read copy —
      // otherwise the detail modal opens showing an "Unread" pill.
      this.openDetail.emit({ ...notif, read: true });
      return;
    }
    this.openDetail.emit(notif);
  }

  markAsRead(id: string) {
    this.novuService.markAsRead(id);
  }

  markAllAsRead() {
    this.novuService.markAllAsRead();
  }

  deleteNotification(id: string) {
    this.novuService.deleteNotification(id);
  }

  viewAllNotifications() {
    this.viewAll.emit();
    this.closePopover.emit();
  }

  private isToday(dateStr?: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  trackByNotificationId(index: number, notification: InAppNotification): string {
    return notification._id;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
