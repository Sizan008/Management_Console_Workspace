import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/** One entry from get-office-day-status-list. */
export interface OfficeDayStatus {
  businessDt: string;   // "2026-07-12"
  dayStatusId: number;
}

@Injectable({ providedIn: 'root' })
export class OfficeDayService {
  private http = inject(HttpClient);
  private base = environment.centrinoUrl;

  /**
   * Cached per office+app key. The navbar is re-created by the router on some
   * navigations, so without this the list is re-fetched on every ngOnInit.
   */
  private cache = new Map<string, Observable<OfficeDayStatus[]>>();

  /**
   * Business days for the office, newest first.
   * The navbar uses these as the only selectable transaction dates.
   */
  getOfficeDayStatusList(officeId: number | string, appId: number | string): Observable<OfficeDayStatus[]> {
    const key = `${officeId}:${appId}`;
    let cached = this.cache.get(key);
    if (!cached) {
      cached = this.http
        .get<OfficeDayStatus[]>(`${this.base}/XchangeOut/RetrieveOfficeDayStatusList`, {
          params: { officeId: String(officeId), appId: String(appId) }
        })
        .pipe(
          map(list =>
            [...(list ?? [])].sort((a, b) => b.businessDt.localeCompare(a.businessDt))
          ),
          shareReplay(1)
        );
      this.cache.set(key, cached);
    }
    return cached;
  }
}
