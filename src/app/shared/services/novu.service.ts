// src/app/shared/services/novu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Novu } from '@novu/js';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InAppNotification {
  _id: string;
  subject: string;
  content: string;
  data?: any;
  read: boolean;
  createdAt: string;
   redirect?: {
    url?: string;
    target?: string;
  };

}

export interface ChatMessage {
  chatId: string;
  senderUserId: string;
  receiverUserId: string;
  notificationBody: string;
  timestamp: string;
  status?: 'pending' | 'sent' | 'failed';
  clientId?: string;
}

@Injectable({ providedIn: 'root' })
export class NovuService {
  private novu: Novu | null = null;
  private notifications$ = new BehaviorSubject<InAppNotification[]>([]);
  private chatMessages$ = new BehaviorSubject<ChatMessage[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);
  private backendUrl = environment.apiBaseUrl;
  private RECONCILE_WINDOW_MS = 15000; // 15s
  private currentSubscriberHash?: string;
  private subscriberId$ = new BehaviorSubject<string | null>(null);
  private mapNotification(result: any): InAppNotification | null {
    if (!result) return null;
    const identifier = result?.workflow?.identifier;
    if (identifier === 'chat-message') return null;

    return {
      _id: result.id,
      subject: result.subject ?? 'Notification',
      content: result.body ?? '',
      data: result.data,
      read: !!result.isRead,
      createdAt: result.createdAt ?? new Date().toISOString(),
      redirect: result.redirect
    };
  }

  private sanitizeChatBody(
    body: string | undefined | null,
    senderId: string | undefined | null,
    receiverId: string | undefined | null
  ): string {
    if (!body) return '';
    let text = body.trim();

    const prefixes = [senderId, receiverId]
      .map((p) => (p ?? '').trim())
      .filter((p) => p.length > 0);

    for (const prefix of prefixes) {
      // Allow separators like spaces, nb-space, colon, dash, etc.
      const pattern = new RegExp(
        `^${this.escapeRegExp(prefix)}[\\s\\u00A0:_-]+`,
        'i'
      );
      if (pattern.test(text)) {
        text = text.replace(pattern, '').trim();
        break;
      }
    }

    return text;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private resolveChatPayload(source: any): any | null {
    if (!source) return null;

    const candidates = [
      source?.data,
      source?.payload,
      source,
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate?.chatId) {
        return candidate;
      }

      if (candidate?.data?.chatId) {
        return candidate.data;
      }
    }

    return null;
  }

  constructor(private http: HttpClient) {}

  private attachDiagnosticLogging(instance: Novu) {
    instance.on('session.initialize.pending', () => {
      console.log('NOVU DEBUG: session.initialize.pending');
    });

    instance.on('session.initialize.resolved', (payload: any) => {
      if (payload?.error) {
        console.error('NOVU DEBUG: session.initialize.resolved error', payload.error);
      } else {
        console.log('NOVU DEBUG: session.initialize.resolved ok', {
          applicationIdentifier: payload?.data?.applicationIdentifier,
        });
      }
    });

    instance.on('socket.connect.pending', (payload: any) => {
      console.log('NOVU DEBUG: socket.connect.pending', {
        socketUrl: payload?.args?.socketUrl,
      });
    });

    instance.on('socket.connect.resolved', (payload: any) => {
      if (payload?.error) {
        console.error('NOVU DEBUG: socket.connect.resolved error', payload.error);
      } else {
        console.log('NOVU DEBUG: socket.connect.resolved ok');
      }
    });
  }

  // -------------------------
  // Local operations (UI)
  // -------------------------
  public pushLocalChatMessage(msg: ChatMessage) {
    const current = this.chatMessages$.value;
    const exists = current.some(
      (c) =>
        c.chatId === msg.chatId &&
        c.notificationBody === msg.notificationBody &&
        c.timestamp === msg.timestamp
    );

    console.log('NOVU: pushLocalChatMessage →', {
      chatId: msg.chatId,
      senderUserId: msg.senderUserId,
      receiverUserId: msg.receiverUserId,
      notificationBody: msg.notificationBody,
      clientId: msg.clientId,
      timestamp: msg.timestamp,
      status: msg.status,
      alreadyExists: exists,
      totalMessages: current.length,
    });

    if (!exists) {
      const toPush: ChatMessage = {
        chatId: msg.chatId,
        senderUserId: msg.senderUserId,
        receiverUserId: msg.receiverUserId,
        notificationBody: msg.notificationBody,
        timestamp: msg.timestamp,
        status: msg.status,
        clientId: msg.clientId,
      };
      this.chatMessages$.next([...current, toPush]);
    }
  }

  public markPendingMessageFailed(chatId: string, notificationBody: string) {
    const updated = this.chatMessages$.value.map((c) =>
      c.chatId === chatId &&
      c.notificationBody === notificationBody &&
      c.status === 'pending'
        ? { ...c, status: 'failed' as const }
        : c
    );

    console.log('NOVU: markPendingMessageFailed →', {
      chatId,
      notificationBody,
    });
    this.chatMessages$.next(updated);
  }

  public markPendingMessageSent(
    chatId: string,
    notificationBody: string,
    serverTimestamp?: string,
    clientId?: string
  ) {
    const updated = this.chatMessages$.value.map((c) => {
      const matches = c.chatId === chatId && c.status === 'pending';
      const byClientId = !!(clientId && c.clientId === clientId);
      const byText = !clientId && c.notificationBody === notificationBody;

      if (matches && (byClientId || byText)) {
        return {
          ...c,
          status: 'sent' as const,
          timestamp: serverTimestamp ?? c.timestamp,
        };
      }
      return c;
    });

    console.log('NOVU: markPendingMessageSent →', {
      chatId,
      notificationBody,
      clientId,
      serverTimestamp,
    });

    this.chatMessages$.next(updated);
  }

  private reconcileIncomingMessage(incoming: ChatMessage) {
    const current = [...this.chatMessages$.value];

    console.log('NOVU: reconcileIncomingMessage START →', {
      incomingChatId: incoming.chatId,
      incomingSender: incoming.senderUserId,
      incomingReceiver: incoming.receiverUserId,
      incomingBody: incoming.notificationBody,
      incomingTimestamp: incoming.timestamp,
      incomingClientId: incoming.clientId,
      pendingCount: current.filter((c) => c.status === 'pending').length,
      totalMessages: current.length,
    });

    // PRIORITY 1: Match by clientId
    if (incoming.clientId) {
      let idx = current.findIndex(
        (c) => c.clientId === incoming.clientId && c.status === 'pending'
      );

      if (idx === -1) {
        idx = current.findIndex((c) => c.clientId === incoming.clientId);
      }

      if (idx !== -1) {
        console.log('NOVU: RECONCILE BY clientId HIT →', {
          clientId: incoming.clientId,
          oldTimestamp: current[idx].timestamp,
          newTimestamp: incoming.timestamp,
          body: current[idx].notificationBody,
        });

        current[idx] = {
          ...current[idx],
          timestamp: incoming.timestamp,
          status: 'sent' as const,
        };
        this.chatMessages$.next(current);
        return;
      }
    }

    // FALLBACK: Timestamp + body
    const now = Date.now();
    const idx = current.findIndex(
      (c) =>
        c.chatId === incoming.chatId &&
        c.notificationBody === incoming.notificationBody &&
        c.status === 'pending' &&
        Math.abs(new Date(c.timestamp).getTime() - now) <=
          this.RECONCILE_WINDOW_MS
    );

    if (idx !== -1) {
      console.log('NOVU: RECONCILE BY TIMESTAMP+BODY HIT →', {
        chatId: incoming.chatId,
        notificationBody: incoming.notificationBody,
        oldTimestamp: current[idx].timestamp,
        newTimestamp: incoming.timestamp,
      });

      current[idx] = {
        ...current[idx],
        timestamp: incoming.timestamp,
        status: 'sent' as const,
      };
      this.chatMessages$.next(current);
      return;
    }

    // APPEND if new
    const exists = current.some(
      (c) =>
        c.chatId === incoming.chatId &&
        c.notificationBody === incoming.notificationBody &&
        c.timestamp === incoming.timestamp
    );

    if (!exists) {
      console.log('NOVU: RECONCILE APPEND NEW MESSAGE →', incoming);

      const newMsg: ChatMessage = { ...incoming, status: 'sent' as const };
      this.chatMessages$.next([...current, newMsg]);
    }
  }

  private isSameMessage(a: ChatMessage, b: ChatMessage): boolean {
    if (a.clientId && b.clientId && a.clientId === b.clientId) {
      return true;
    }

    if (a.chatId !== b.chatId) return false;
    if (a.notificationBody !== b.notificationBody) return false;

    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();

    return Math.abs(aTime - bTime) <= this.RECONCILE_WINDOW_MS;
  }

  private mergeChatCollections(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    if (!incoming.length) {
      return [...existing];
    }

    const merged = [...incoming];

    for (const msg of existing) {
      const hasMatch = merged.some((candidate) => this.isSameMessage(candidate, msg));
      if (!hasMatch) {
        merged.push({ ...msg });
      }
    }

    merged.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return merged;
  }

  // -------------------------
  // Parse __CHAT__ markers
  // Format:
  // __CHAT__<senderUserId>|<receiverUserId>|<chatId>|<clientId>
  // -------------------------
  private parseChatMetaFromBody(body: string | undefined | null) {
    if (!body) return null;
    const m = body.match(/__CHAT__([^\r\n]+)/);
    if (!m) return null;

    const payloadStr = m[1].trim();
    const parts = payloadStr.split('|');

    if (parts.length < 3) return null;

    return {
      senderUserId: parts[0] ?? '',
      receiverUserId: parts[1] ?? '',
      chatId: parts[2] ?? '',
      clientId: parts[3] ?? undefined,
    };
  }

  // -------------------------
  // Novu initialization
  // -------------------------
  async init(subscriberId: string, appId: string, subscriberHash?: string): Promise<void> {
    const normalizedHash = subscriberHash ?? '';

    if (
      this.novu &&
      this.novu.subscriberId === subscriberId &&
      this.currentSubscriberHash === normalizedHash
    ) {
      this.subscriberId$.next(subscriberId);
      await this.refresh();
      return;
    }

    if (this.novu) {
      // Different subscriber or hash: disconnect and reset local state
      this.novu.socket?.disconnect();
      this.novu = null;
      this.currentSubscriberHash = undefined;
      this.subscriberId$.next(null);
      this.notifications$.next([]);
      this.chatMessages$.next([]);
      this.unreadCount$.next(0);
    }

    if (!normalizedHash) {
      console.warn('NOVU: subscriber hash missing – realtime sockets may fail to authenticate.');
    }

    console.log('NOVU: init START for:', subscriberId);
    localStorage.setItem('userId',subscriberId);
    const novuOptions: any = {
      applicationIdentifier: appId,
      subscriberId,
      backendUrl: environment.novu_api,
      socketUrl: environment.novu_socket,
    };

    if (normalizedHash) {
      novuOptions.subscriberHash = normalizedHash;
    }

    this.novu = new Novu(novuOptions);
    this.currentSubscriberHash = normalizedHash;
    this.subscriberId$.next(subscriberId);

    this.attachDiagnosticLogging(this.novu);

    if (this.novu.socket) {
      console.log('NOVU: requesting websocket connection...');
      try {
        const connectResult = await this.novu.socket.connect();
        if (connectResult?.error) {
          console.error('NOVU: socket.connect failed', connectResult.error);
        } else {
          console.log('NOVU: socket.connect resolved successfully.');
        }
      } catch (err) {
        console.error('NOVU: socket.connect threw', err);
      }
    } else {
      console.warn('NOVU: socket instance missing; realtime channel unavailable.');
    }

    this.novu.on(
      'notifications.notification_received',
      (payload: any) => {
        const result = payload?.result;
        if (!result) return;
        console.log('NOVU DEBUG: notification_received raw payload', payload);
        const workflowId = result?.workflow?.identifier;

        // Novu Notification object carries custom payload under `data`.
        // In case of different shapes, fall back to `payload` or root.
        const chatData: any = this.resolveChatPayload(result);

        console.log('NOVU DEBUG: notification_received', {
          id: result?.id,
          workflowId,
          hasChatPayload: !!chatData?.chatId,
        });

        // CASE 1: structured
        if (chatData?.chatId) {
          const sender = String(chatData.senderUserId ?? '');
          const receiver = String(chatData.receiverUserId ?? '');
          const chatMsg: ChatMessage = {
            chatId: String(chatData.chatId),
            senderUserId: sender,
            receiverUserId: receiver,
            notificationBody: this.sanitizeChatBody(
              String(chatData.notificationBody ?? ''),
              sender,
              receiver
            ),
            timestamp:
              chatData.timestamp ?? new Date().toISOString(),
            status: 'sent',
            clientId: chatData.clientId,
          };
          this.reconcileIncomingMessage(chatMsg);
          return;
        }

        // CASE 2: parse marker
        const parsed = this.parseChatMetaFromBody(result.body);
        if (parsed) {
          const chatMsg: ChatMessage = {
            chatId: parsed.chatId,
            senderUserId: parsed.senderUserId,
            receiverUserId: parsed.receiverUserId,
            notificationBody: this.sanitizeChatBody(
              (result.body || '')
                .replace(/__CHAT__[^\r\n]+/, '')
                .trim(),
              parsed.senderUserId,
              parsed.receiverUserId
            ),
            timestamp: new Date().toISOString(),
            status: 'sent',
            clientId: parsed.clientId,
          };
          this.reconcileIncomingMessage(chatMsg);
          return;
        }

        const mappedNotification = this.mapNotification(result);
        if (mappedNotification) {
          const current = this.notifications$.value;
          const updated = [mappedNotification, ...current];
          this.notifications$.next(updated);
          this.unreadCount$.next(updated.filter((n) => !n.read).length);
        }
      }
    );

    this.novu.on('notifications.unread_count_changed', (payload: any) => {
      const resultValue = payload?.result;
      const count =
        typeof resultValue === 'number'
          ? resultValue
          : Number(
              typeof resultValue === 'object' && resultValue !== null
                ? resultValue?.count ?? resultValue?.data ?? resultValue
                : resultValue
            );
      console.log('NOVU DEBUG: unread_count_changed', {
        raw: resultValue,
        computed: count,
      });
      if (!Number.isNaN(count)) {
        this.unreadCount$.next(count);
      }
    });

    await this.refresh();
  }

  // -------------------------
  // Refresh historical messages
  // -------------------------
  private async refresh(): Promise<void> {
    if (!this.novu) return;

    try {
      console.log('NOVU DEBUG: refresh start...');
      const result = await this.novu.notifications.list({
        limit: 50,
      });

        const raw = result.data?.notifications ?? [];

        // Filter out pure chat workflow notifications from the general
        // notifications list, so chat messages do not appear under the
        // bell/notification center. We identify chat items by the
        // workflow identifier "chat-message".
        const notifications: InAppNotification[] = raw
          .filter((n: any) => n?.workflow?.identifier !== 'chat-message')
          .map((n: any) => ({
            _id: n.id,
            subject: n.subject ?? 'Notification',
            content: n.body ?? '',
            data: n.data,
            read: n.isRead,
            createdAt: n.createdAt,
            redirect: n.redirect  
          }));

      notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      const unreadCount = notifications.filter((n) => !n.read).length;
      this.notifications$.next(notifications);
      this.unreadCount$.next(unreadCount);

      const chatMsgs: ChatMessage[] = raw
        .map((n: any) => {
          const chatData = this.resolveChatPayload(n);

          if (chatData?.chatId) {
            const sender = String(chatData.senderUserId ?? '');
            const receiver = String(chatData.receiverUserId ?? '');
            return {
              chatId: chatData.chatId,
              senderUserId: sender,
              receiverUserId: receiver,
              notificationBody: this.sanitizeChatBody(
                chatData.notificationBody ?? '',
                sender,
                receiver
              ),
              timestamp: chatData.timestamp ?? n.createdAt,
              status: 'sent',
              clientId: chatData.clientId,
            } as ChatMessage;
          }

          const parsed = this.parseChatMetaFromBody(n.body);
          if (parsed) {
            return {
              chatId: parsed.chatId,
              senderUserId: parsed.senderUserId,
              receiverUserId: parsed.receiverUserId,
              notificationBody: this.sanitizeChatBody(
                (n.body || '').replace(
                  /__CHAT__[^\r\n]+/,
                  ''
                ).trim(),
                parsed.senderUserId,
                parsed.receiverUserId
              ),
              timestamp: n.createdAt,
              status: 'sent',
              clientId: parsed.clientId,
            } as ChatMessage;
          }

          return null;
        })
        .filter((x) => x !== null) as ChatMessage[];

      chatMsgs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() -
          new Date(b.timestamp).getTime()
      );

      const mergedChatMessages = this.mergeChatCollections(this.chatMessages$.value, chatMsgs);
      this.chatMessages$.next(mergedChatMessages);

      console.log('NOVU DEBUG: refresh success', {
        notificationCount: notifications.length,
        unreadCount,
        chatMessageCount: mergedChatMessages.length,
      });
    } catch (err) {
      console.error('NOVU: refresh error:', err);
    }
  }

  // -------------------------
  // Public API
  // -------------------------
  getNotifications(): Observable<InAppNotification[]> {
    return this.notifications$.asObservable();
  }

  getChatMessages(): Observable<ChatMessage[]> {
    return this.chatMessages$.asObservable();
  }

  getUnreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  async markAsRead(id: string): Promise<void> {
    if (!this.novu) return;

    try {
      await this.novu.notifications.read({
        notificationId: id,
      });

      const notifs = this.notifications$.value.map((n) =>
        n._id === id ? { ...n, read: true } : n
      );

      this.notifications$.next(notifs);
      this.unreadCount$.next(
        notifs.filter((n) => !n.read).length
      );
    } catch {
      await this.refresh();
    }
  }

  async refreshNow(): Promise<void> {
    await this.refresh();
  }

  async markAllAsRead(): Promise<void> {
    if (!this.novu) return;
    try {
      await this.novu.notifications.readAll();
      const updated = this.notifications$.value.map((n) => ({
        ...n,
        read: true,
      }));
      this.notifications$.next(updated);
      this.unreadCount$.next(0);
    } catch {
      await this.refresh();
    }
  }

  async deleteNotification(id: string): Promise<void> {
    if (!this.novu) return;

    try {
      await firstValueFrom(
        this.http.delete(`${this.backendUrl}/Notify/Notification/${id}`)
      );
      const updated = this.notifications$.value.filter(
        (n) => n._id !== id
      );
      this.notifications$.next(updated);
      this.unreadCount$.next(
        updated.filter((n) => !n.read).length
      );
    } catch (err) {
      console.error('NOVU: deleteNotification → failed', err);
    }
  }

  getActiveSubscriberId(): string | null {
    return this.subscriberId$.value;
  }

  onSubscriberIdChanged(): Observable<string | null> {
    return this.subscriberId$.asObservable();
  }
}
