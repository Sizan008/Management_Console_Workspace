// shared/services/notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications = new BehaviorSubject<number>(3); // default example
  private _messages = new BehaviorSubject<number>(2);      // default example

  // <-- explicit typed observables
  readonly notifications$: Observable<number> = this._notifications.asObservable();
  readonly messages$: Observable<number> = this._messages.asObservable();

  // Get current value
  get notifications(): number { return this._notifications.value; }
  get messages(): number { return this._messages.value; }

  // Setters
  setNotifications(count: number) { this._notifications.next(count); }
  setMessages(count: number) { this._messages.next(count); }

  // Convenience
  incrementNotifications(by = 1) { this._notifications.next(this.notifications + by); }
  decrementNotifications(by = 1) { this._notifications.next(Math.max(0, this.notifications - by)); }
  clearNotifications() { this._notifications.next(0); }

  incrementMessages(by = 1) { this._messages.next(this.messages + by); }
  decrementMessages(by = 1) { this._messages.next(Math.max(0, this.messages - by)); }
  clearMessages() { this._messages.next(0); }
}
