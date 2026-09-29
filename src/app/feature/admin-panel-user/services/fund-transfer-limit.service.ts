import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse, Branch, IFundTransferLimitInfoBody,
  InternalFundTrfPolicy, UpdateFundTrfPolicyPayload
} from '../models/fund-transfer-limit.model';

@Injectable({ providedIn: 'root' })
export class FundTransferLimitService {
  private http = inject(HttpClient);

  /** Base URL for these endpoints (same host as UserManagement). */
  private base = environment.myBaseUrl2;

  /** /UserManagement/getBranchList — branch dropdowns. */
  getBranchList(): Observable<ApiResponse<Branch[]>> {
    return this.http.get<ApiResponse<Branch[]>>(`${this.base}/api/UserManagement/getBranchList`);
  }

  /** /FundTransferLimit/GetInternalFundTrfPolicy — list of per-transfer-type policies. */
  getInternalFundTrfPolicy(): Observable<ApiResponse<InternalFundTrfPolicy[]>> {
    return this.http.get<ApiResponse<InternalFundTrfPolicy[]>>(
      `${this.base}/api/FundTransferLimit/GetInternalFundTrfPolicy`
    );
  }

  /** /FundTransferLimit/GetGlobalFundTrfPolicy — full 67-field global body. */
  getGlobalFundTrfPolicy(): Observable<ApiResponse<IFundTransferLimitInfoBody>> {
    return this.http.get<ApiResponse<IFundTransferLimitInfoBody>>(
      `${this.base}/api/FundTransferLimit/GetGlobalFundTrfPolicy`
    );
  }

  /** /Request/UpdateFundTrfPolicy — update one internal-transfer-type row. */
  updateFundTrfPolicy(payload: UpdateFundTrfPolicyPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/api/Request/UpdateFundTrfPolicy`,
      [payload]
    );
  }

  /** /Request/UpdateGlobalFundTrfPolicy — update full global policy body. */
  updateGlobalFundTrfPolicy(payload: IFundTransferLimitInfoBody): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/api/Request/UpdateGlobalFundTrfPolicy`,
      payload
    );
  }
}
