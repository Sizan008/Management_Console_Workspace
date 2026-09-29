import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  ActivityLogPayload,
  GlobalResponse,
} from '../models/activity-log.model';

@Injectable({
  providedIn: 'root',
})
export class AdminPanelActivityLogService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  getActivityLog(payload: ActivityLogPayload): Observable<GlobalResponse> {
    const params = new HttpParams()

      .set('activityType', payload.activityType || '')

      .set('userType', payload.userType)

      .set('UserID', payload.UserID || '')

      .set('startDate', payload.startDate || '')

      .set('endTime', payload.endTime || '');

    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/ActivityLog/getActivirtLog`,

      {
        params,
      },
    );
  }
}
