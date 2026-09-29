import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, IActiveSession } from '../models/active-session.model';

@Injectable({ providedIn: 'root' })
export class ActiveSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2;

  getUserActiveSession(userId: string): Observable<IActiveSession[]> {
    const params = new HttpParams().set('userId', userId);

    return this.http
      .get<ApiResponse<IActiveSession[]>>(
        `${this.baseUrl}/api/CombinedFeatures/GetUserActiveSession`,
        { params },
      )
      .pipe(
        map((response) => {
          if (
            String(response?.Status ?? '').trim().toUpperCase() === 'OK' &&
            Array.isArray(response.Result)
          ) {
            return response.Result;
          }
          return [];
        }),
      );
  }

  clearUserActiveSession(userId: string): Observable<ApiResponse<unknown>> {
    const params = new HttpParams().set('userId', userId);

    return this.http.post<ApiResponse<unknown>>(
      `${this.baseUrl}/api/CombinedFeatures/ClearUserActiveSession`,
      {},
      { params },
    );
  }
}
