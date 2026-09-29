// message-popover.component.ts
import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatPreview, ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-message-popover',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="popover">
      <!-- Header -->
      <div class="popover-header">
        <h3 class="header-title">Messages</h3>
        @if (unreadCount > 0) {
          <span class="header-count">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        }
        @if (unreadCount > 0) {
          <button type="button" class="mark-all-btn" (click)="markAllAsRead()" title="Mark all as read">
            Mark all read
          </button>
        }
      </div>

      <!-- Body -->
      <div class="popover-body">
        @if (chats.length === 0) {
          <div class="empty-state">
            <p class="empty-text">No messages yet</p>
          </div>
        }

        @for (chat of chats; track chat.chatId) {
          <button type="button" class="msg-row" [class.unread]="chat.unread > 0" (click)="selectChat(chat)">
            <span class="msg-avatar">{{ initials(chat.partner) }}</span>

            <span class="msg-main">
              <span class="msg-partner">{{ chat.partner }}</span>
              <span class="msg-last">{{ chat.lastMessage || 'No messages yet' }}</span>
            </span>

            <span class="msg-side">
              <span class="msg-time">{{ chat.time }}</span>
              @if (chat.unread > 0) {
                <span class="msg-dot" [attr.aria-label]="chat.unread + ' unread'"></span>
              }
            </span>
          </button>
        }
      </div>

      <!-- Footer -->
      @if (chats.length > 0) {
        <div class="popover-footer">
          <button type="button" class="view-all-btn" (click)="viewAllMessages()">View all messages</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;

      --m-border: var(--theme-border, #e5e7eb);
      --m-primary: var(--theme-primary, #086AD8);
      --m-text: var(--theme-text, #1f2937);
      --m-text-light: var(--theme-text-light, #6b7280);
    }

    * { box-sizing: border-box; }

    .popover {
      width: 380px;
      max-width: 100vw;
      /* Body scrolls; header and footer stay pinned. Capped so the whole
         popover fits below the navbar without running off-screen. */
      max-height: min(440px, calc(100vh - 120px));
      display: flex;
      flex-direction: column;
      background: #fff;
      border: 1px solid var(--m-border);
      border-radius: 14px;
      box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.18);
      overflow: hidden;
    }

    /* Header */
    .popover-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 18px 10px;
    }
    .header-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: var(--m-text);
      letter-spacing: -0.01em;
    }
    .header-count {
      font-size: 13px;
      font-weight: 700;
      color: var(--m-primary);
    }
    .mark-all-btn {
      margin-left: auto;
      padding: 0;
      background: none;
      border: none;
      color: var(--m-primary);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .mark-all-btn:hover { text-decoration: underline; }

    /* Body */
    .popover-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 2px 0 4px;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }
    .popover-body::-webkit-scrollbar { width: 6px; }
    .popover-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .empty-state {
      padding: 44px 24px;
      text-align: center;
    }
    .empty-text {
      margin: 0;
      font-size: 13px;
      color: var(--m-text-light);
    }

    /* Row */
    .msg-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 18px;
      background: none;
      border: none;
      border-top: 1px solid #f3f4f6;
      text-align: left;
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .msg-row:first-child { border-top: none; }
    .msg-row:hover { background: #f9fafb; }

    .msg-avatar {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #1e293b;
      color: #fff;
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .msg-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .msg-partner {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--m-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .msg-last {
      font-size: 12.5px;
      color: var(--m-text-light);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .msg-side {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      align-self: flex-start;
      padding-top: 3px;
    }
    .msg-time {
      font-size: 11px;
      color: #9ca3af;
      white-space: nowrap;
    }
    .msg-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--m-primary);
    }

    /* Footer */
    .popover-footer {
      border-top: 1px solid var(--m-border);
      padding: 8px;
    }
    .view-all-btn {
      width: 100%;
      padding: 8px;
      background: none;
      border: none;
      color: var(--m-primary);
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
export class MessagePopoverComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private destroy$ = new Subject<void>();

  chats: ChatPreview[] = [];
  unreadCount = 0;

  /** A conversation was picked — the host opens the chat window for it. */
  @Output() openChat = new EventEmitter<ChatPreview>();
  @Output() closePopover = new EventEmitter<void>();
  @Output() viewAll = new EventEmitter<void>();

  ngOnInit(): void {
    this.chatService.getChatPreviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe(chats => (this.chats = chats));

    this.chatService.getUnreadTotal()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => (this.unreadCount = count));
  }

  /** Up to two initials from the partner's name, e.g. "Rafiq Ahmed" -> "RA". */
  initials(partner: string): string {
    const parts = (partner || '').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts.slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  selectChat(chat: ChatPreview): void {
    this.chatService.markChatAsRead(chat.chatId);
    this.openChat.emit(chat);
  }

  markAllAsRead(): void {
    this.chatService.markAllChatsAsRead();
  }

  viewAllMessages(): void {
    this.viewAll.emit();
    this.closePopover.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
