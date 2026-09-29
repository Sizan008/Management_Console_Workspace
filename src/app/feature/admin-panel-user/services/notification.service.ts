import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  CreateNotificationPayload
} from '../models/notification.model';

/**
 * NotificationService
 * ────────────────────
 * Hosts the /CombinedFeatures/CreateNotification endpoint used by the
 * demo `Notification.vue` when `isOldVersion === true` (which is the only
 * branch actually rendered in the demo).
 *
 * The base URL matches the sibling fund-transfer-limit service: the demo's
 * CNMAPIURL host + `/api/CombinedFeatures/...`.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.myBaseUrl2}/api`;

  /**
   * POST /CombinedFeatures/CreateNotification
   *
   * Body shape matches the demo's `BusinessData` for the old-version flow:
   * `{ NotifiTitle, NotifiDesc, CustomerId }`.
   */
  createNotification(payload: CreateNotificationPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/CombinedFeatures/CreateNotification`,
      payload
    );
  }
}
