import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';
import {environment} from '../../../environments/environment';

/** A selectable session parameter: `key` is bound at runtime, `value` is the label. */
export interface SessionDataItem {
  id: number;
  key: string;
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetaDashboardSessionDataService {

  private http = inject(HttpClient);
  private apiBase = inject(ApiBaseService);
  private baseApi = `${environment.myBaseUrl}/SessionData/`;

  /** All session parameters from META_DASHBOARD_SESSION_DATA, ordered by label. */
  getSessionData(): Observable<SessionDataItem[]> {
    return this.http.get<SessionDataItem[]>(this.apiBase.getApiUrl('/SessionData/'));
  }
}
