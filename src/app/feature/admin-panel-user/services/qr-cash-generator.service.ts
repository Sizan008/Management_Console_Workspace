import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  QrCashApiResponse,
  QrCashBranch,
} from '../models/qr-cash-generator.model';

@Injectable({ providedIn: 'root' })
export class QrCashGeneratorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  private readonly branchListUrl = `${this.baseUrl}/api/UserManagement/getBranchList`;
  private readonly generateQrCodeUrl = `${this.baseUrl}/api/QRCash/GenerateQRCode`;

  getBranchList(): Observable<QrCashApiResponse<QrCashBranch[]>> {
    return this.http.get<QrCashApiResponse<QrCashBranch[]>>(this.branchListUrl);
  }

  generateQrCode(
    branchId: string,
    tellerId: string,
  ): Observable<QrCashApiResponse<string>> {
    // Keep branch and teller identifiers as strings so significant leading
    // zeroes are never lost before the request reaches the backend.
    const params = new HttpParams()
      .set('branchId', branchId.trim())
      .set('tellerId', tellerId.trim());

    return this.http.get<QrCashApiResponse<string>>(this.generateQrCodeUrl, {
      params,
    });
  }
}
