import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { UserService } from '../../../../../../../core/user/user.service';
import { User } from '../../../../../../../core/user/user.types';
import { ChatMessage, NovuService } from '../../../../../../../shared/services/novu.service';
import { environment } from '../../../../../../../../environments/environment';



@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-box.html',
  styleUrls: ['./chat-box.scss'],
})
export class ChatBox implements AfterViewInit, OnChanges, OnDestroy {
  @Input() chatId!: string;
  @Input() partner!: string;
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [];
  messageText = '';

  // UI states
  isSearchOpen = false;
  searchQuery = '';
  isTyping = false;

  private messagesSub?: Subscription;
  private userSub?: Subscription;
  private novuSub?: Subscription;
  private userService = inject(UserService);
  private currentUserId = '';

  constructor(private novuService: NovuService, private http: HttpClient) {
    this.syncCurrentUserId(this.novuService.getActiveSubscriberId() ?? undefined);

    this.userSub = this.userService.user$.subscribe((user: User) => {
      this.syncCurrentUserId(user?.username);
    });

    this.novuSub = this.novuService.onSubscriberIdChanged().subscribe((id) => {
      this.syncCurrentUserId(id ?? undefined);
    });
  }

  private syncCurrentUserId(id?: string) {
    if (!id) return;
    if (this.currentUserId === id) return;
    this.currentUserId = id;
  }

  ngAfterViewInit() {
    // small delay to ensure DOM ready
    setTimeout(() => this.scrollToBottom(), 50);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chatId'] && this.chatId) {
      // Re-subscribe whenever chatId changes to show the
      // correct conversation without needing a second click.
      this.messagesSub?.unsubscribe();
      this.messagesSub = this.novuService
        .getChatMessages()
        .pipe(
          map((msgs) =>
            msgs
              .filter((m) => m.chatId === this.chatId)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          )
        )
        .subscribe((msgs) => {
          this.messages = msgs;
          setTimeout(() => this.scrollToBottom(), 50);
        });
    }
  }

  ngOnDestroy(): void {
    this.messagesSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.novuSub?.unsubscribe();
  }

  sendMessage() {
    const text = this.messageText.trim();
    if (!text || !this.partner || !this.currentUserId) return;

    const chatId = [this.currentUserId, this.partner].sort().join('_');

    // Generate unique clientId for reconciliation
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticMsg: ChatMessage = {
      chatId,
      senderUserId: this.currentUserId,
      receiverUserId: this.partner,
      notificationBody: text,
      timestamp: new Date().toISOString(),
      status: 'pending',
      clientId,
    };

    // push optimistic immediately
    this.novuService.pushLocalChatMessage(optimisticMsg);

    // clear input & scroll
    this.messageText = '';
    setTimeout(() => this.scrollToBottom(), 50);

    // Dedicated chat endpoint expects a simple ChatRequest body
    const body = {
      from: this.currentUserId,
      to: this.partner,
      message: text,
      clientId,
    };

    const url = `${environment.apiBaseUrl}/Notify/chat`;

    // send to your Notify endpoint (application/json by default)
    this.http.post(url, body).subscribe({
      next: (resp: any) => {
        // If backend acknowledges the trigger, optimistically mark as sent.
        if (resp && (resp.acknowledged === true || !resp.errorMessage)) {
          this.novuService.markPendingMessageSent(chatId, text, undefined, clientId);
        }
      },
      error: (err) => {
        console.error('Send message failed:', err);
        // mark optimistic as failed
        this.novuService.markPendingMessageFailed(chatId, text);
      },
    });
  }

  // UI helpers
  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;
    this.searchQuery = '';
  }

  closeSearch() {
    this.isSearchOpen = false;
    this.searchQuery = '';
  }

  onSearchEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      console.log('Searching for:', this.searchQuery);
    }
  }

  onEnterKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onCloseClick() {
    this.isSearchOpen = false;
    this.closeChat.emit();
  }

  getSender(msg: ChatMessage): 'me' | 'other' {
    return msg.senderUserId === this.currentUserId ? 'me' : 'other';
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr`;
    return date.toLocaleDateString();
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (e) {
      // ignore
    }
  }
}
