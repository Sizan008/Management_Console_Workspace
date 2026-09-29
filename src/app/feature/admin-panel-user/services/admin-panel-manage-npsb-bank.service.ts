import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  GlobalResponse,
  ChangeNpsbBankStatusRequest,
} from '../models/manage-npsb-bank.model';

@Injectable({
  providedIn: 'root',
})
export class AdminPanelManageNpsbBankService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  getAllNpsbBank(): Observable<GlobalResponse> {
    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/CombinedFeatures/GetAllNPSBBank`,
    );
  }

  changeBankStatus(
    payload: ChangeNpsbBankStatusRequest,
  ): Observable<GlobalResponse> {
    const params = new HttpParams()

      .set('npsbBankId', payload.npsbBankId)

      .set('isEnabled', String(payload.isEnabled));

    return this.http.post<GlobalResponse>(
      `${this.baseUrl}/api/CombinedFeatures/ManageNPSBBank`,

      {},

      {
        params,
      },
    );
  }
}
