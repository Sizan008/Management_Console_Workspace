import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  DashboardCount,
  DashboardDetailsPayload,
  DashboardSummaryPayload
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = `${environment.myBaseUrl2}/api`;

  getDashboardSummary(p: DashboardSummaryPayload): Observable<ApiResponse<DashboardCount>> {
    const params = new HttpParams().set('pDATE', p.pDATE);
    return this.http.get<ApiResponse<DashboardCount>>(
      `${this.base}/Dashboard/GetDashboardSummary`,
      { params }
    );
  }

  getDashboardDetails(p: DashboardDetailsPayload): Observable<ApiResponse<Array<Record<string, any>>>> {
    const params = new HttpParams()
      .set('pKPI',     String(p.pKPI))
      .set('pDATE',    p.pDATE)
      .set('pUSER_ID', p.pUSER_ID);
    return this.http.get<ApiResponse<Array<Record<string, any>>>>(
      `${this.base}/Dashboard/GetDashboardDetails`,
      { params }
    );
  }
}
