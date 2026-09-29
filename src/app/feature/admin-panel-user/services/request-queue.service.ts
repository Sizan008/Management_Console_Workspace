import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  RequestQueueApiResponse,
  RequestQueueBranch,
  RequestQueueRow,
  RequestQueueSearchRequest,
  RequestQueueStatus,
  RequestQueueType,
} from '../models/request-queue.model';

@Injectable({ providedIn: 'root' })
export class RequestQueueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  // Endpoints stay local to the feature, following the current Demo01 pattern.
  private readonly branchListUrl = `${this.baseUrl}/api/UserManagement/getBranchList`;
  private readonly appSettingUrl = `${this.baseUrl}/api/Configuration/getAppSettingsbykey`;
  private readonly requestTypesUrl = `${this.baseUrl}/api/Authorization/GetRequestTypes`;
  private readonly requestStatusesUrl = `${this.baseUrl}/api/Authorization/GetUserRequestStatuses`;
  private readonly requestQueueUrl = `${this.baseUrl}/api/Authorization/GetUserRequests`;

  getBranchList(): Observable<RequestQueueBranch[]> {
    return this.http
      .get<RequestQueueApiResponse<RequestQueueBranch[]>>(this.branchListUrl)
      .pipe(
        map((response) =>
          this.isOk(response) && Array.isArray(response.Result) ? response.Result : [],
        ),
      );
  }

  getHeadOfficeBranchId(): Observable<string> {
    const params = new HttpParams().set('Key', 'HEAD_OFFICE_BRANCH_ID');

    return this.http
      .get<RequestQueueApiResponse<unknown>>(this.appSettingUrl, { params })
      .pipe(
        map((response) => {
          if (!this.isOk(response) || response.Result === null || response.Result === undefined) {
            return '0001';
          }
          return String(response.Result).trim();
        }),
      );
  }

  getRequestTypes(): Observable<RequestQueueType[]> {
    return this.http
      .get<RequestQueueApiResponse<RequestQueueType[]>>(this.requestTypesUrl)
      .pipe(
        map((response) =>
          this.isOk(response) && Array.isArray(response.Result) ? response.Result : [],
        ),
      );
  }

  getRequestStatuses(): Observable<RequestQueueStatus[]> {
    return this.http
      .get<RequestQueueApiResponse<RequestQueueStatus[]>>(this.requestStatusesUrl)
      .pipe(
        map((response) =>
          this.isOk(response) && Array.isArray(response.Result) ? response.Result : [],
        ),
      );
  }

  getRequestQueue(
    request: RequestQueueSearchRequest,
  ): Observable<RequestQueueApiResponse<RequestQueueRow[]>> {
    // Keep BranchId as the exact string selected in the dropdown. Do not use
    // Number(), parseInt(), unary +, etc. That would turn 0031 into 31.
    let params = new HttpParams()
      .set('BranchId', this.normalizeBranchId(request.branchId))
      .set('UserID', request.userId.trim())
      .set('requestType', request.requestType || '')
      .set('statusType', request.statusType || '');

    if (request.startDate) {
      params = params.set('startDate', request.startDate);
    }
    if (request.endTime) {
      params = params.set('endTime', request.endTime);
    }

    return this.http.get<RequestQueueApiResponse<RequestQueueRow[]>>(
      this.requestQueueUrl,
      { params },
    );
  }

  private normalizeBranchId(value: string | null | undefined): string {
    const branchId = String(value ?? '').trim();
    return branchId.toLowerCase() === 'all' ? '' : branchId;
  }

  private isOk<T>(response: RequestQueueApiResponse<T>): boolean {
    return response?.Status?.trim().toUpperCase() === 'OK';
  }
}
