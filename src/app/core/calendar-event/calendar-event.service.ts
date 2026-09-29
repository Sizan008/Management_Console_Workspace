import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export type CalendarEventType = 'business' | 'holiday' | 'event';

/** A marker shown on its actual date in the navbar calendar. */
export interface CalendarEvent {
  /** ISO day, "2026-07-04". */
  date: string;
  type: CalendarEventType;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarEventService {
  private http = inject(HttpClient);

  /**
   * Holidays and events used to annotate the navbar transaction-date calendar.
   *
   * Currently served from a static mock JSON. When the backend endpoint is
   * ready, swap `source` for the API URL (and adjust the `map` if the shape
   * differs) — no changes are needed in the calendar component.
   */
  private source = '/asset/mock/calendar-events.json';

  /**
   * Cached so the navbar (re-created by the router on some navigations) reuses
   * one fetch instead of re-hitting the endpoint on every ngOnInit.
   * shareReplay(1) replays the last emission to late subscribers and, with
   * refCount omitted, keeps the result even after all subscribers unsubscribe.
   */
  private events$?: Observable<CalendarEvent[]>;

  getCalendarEvents(): Observable<CalendarEvent[]> {
    if (!this.events$) {
      this.events$ = this.http
        .get<{ events: CalendarEvent[] }>(this.source)
        .pipe(
          map(res => res?.events ?? []),
          shareReplay(1)
        );
    }
    return this.events$;
  }
}
