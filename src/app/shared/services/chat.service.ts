// src/app/shared/services/chat.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { NovuService, ChatMessage } from './novu.service';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserService } from '../../core/user/user.service';
import { User } from '../../core/user/user.types';



export interface ChatPreview {
  chatId: string;
  partner: string;
  lastMessage: string;
  time: string;
  unread: number;
}

/** Helper – deterministic chatId (sorted) */
function buildChatId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  // Notification service base (same API used for chat send)
  private readonly api = environment.apiBaseUrl;
  public previews$ = new BehaviorSubject<ChatPreview[]>([]);
  private currentUserId = '';

  private searchTerm$ = new BehaviorSubject<string>('');
  public searchResults$ = this.searchTerm$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term) =>
      term.trim() === ''
        ? of([] as string[])
        : this.http
            .get<string[]>(`${this.api}/Notify/Subscribers/Search?q=${encodeURIComponent(term)}`)
            .pipe(
              catchError((err) => {
                console.error('Subscriber search failed:', err);
                return of([] as string[]);
              })
            )
    )
  );

  constructor(
    private novuService: NovuService,
    private http: HttpClient,
    private userService: UserService
  ) {
    this.syncCurrentUserId(this.novuService.getActiveSubscriberId() ?? undefined);

    this.userService.user$.subscribe((user: User) => {
      this.syncCurrentUserId(user?.username);
    });

    this.novuService.onSubscriberIdChanged().subscribe((id) => {
      this.syncCurrentUserId(id ?? undefined);
    });

    this.novuService.getChatMessages().subscribe((messages) => {
      this.buildPreviews(messages);
    });
  }

  private syncCurrentUserId(id?: string) {
    if (!id) return;
    if (this.currentUserId === id) return;
    this.currentUserId = id;
  }

  private buildPreviews(messages: ChatMessage[]) {
    const previewMap = new Map<string, ChatPreview>();

    // Ensure chronological order so the lastMessage/time
    // reflect the most recent message per conversation.
    const sorted = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sorted.forEach((msg) => {
      if (!msg || !msg.chatId) return;
      const chatId = msg.chatId;

      // determine partner (the other participant)
      let partner = msg.senderUserId === this.currentUserId ? msg.receiverUserId : msg.senderUserId;

      // If partner still equals current user (parsing / bad data), try to infer the other from chatId
      if (!partner || partner === this.currentUserId) {
        const parts = chatId.split('_');
        const other = parts.find((p) => p && p !== this.currentUserId);
        if (other) partner = other;
        else {
          // it's a self-chat (a_user_user) or invalid, skip unless explicit desired
          return;
        }
      }

      // now safe to add
      if (!previewMap.has(chatId)) {
        previewMap.set(chatId, {
          chatId,
          partner,
          lastMessage: msg.notificationBody,
          time: this.formatTime(msg.timestamp),
          unread: 0,
        });
      }

      const preview = previewMap.get(chatId)!;
      preview.lastMessage = msg.notificationBody;
      preview.time = this.formatTime(msg.timestamp);

      if (msg.receiverUserId === this.currentUserId) {
        preview.unread += 1;
      }
    });

    this.previews$.next(Array.from(previewMap.values()));
  }

  // PUBLIC API
  getChatPreviews(): Observable<ChatPreview[]> {
    return this.previews$.asObservable();
  }

  getCombinedList(): Observable<ChatPreview[]> {
    return combineLatest([this.previews$, this.searchResults$]).pipe(
      map(([previews, results]) => {
        if (!results.length) return previews;
        return results.map((user) => ({
          chatId: buildChatId(this.currentUserId, user),
          partner: user,
          lastMessage: '',
          time: '',
          unread: 0,
        }));
      })
    );
  }

  setSearchTerm(term: string) {
    this.searchTerm$.next(term);
  }

  markChatAsRead(chatId: string) {
    const previews = this.previews$.value.map((p) => (p.chatId === chatId ? { ...p, unread: 0 } : p));
    this.previews$.next(previews);
  }

  markAllChatsAsRead() {
    this.previews$.next(this.previews$.value.map((p) => ({ ...p, unread: 0 })));
  }

  /** Total unread across all conversations — drives the navbar message badge. */
  getUnreadTotal(): Observable<number> {
    return this.previews$.pipe(map((previews) => previews.reduce((sum, p) => sum + p.unread, 0)));
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr`;
    return date.toLocaleDateString();
  }
}
