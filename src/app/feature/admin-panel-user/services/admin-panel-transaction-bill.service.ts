import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  GlobalResponse,
  TransactionBillStatusRequest,
} from '../models/transaction-bill-service.model';

@Injectable({
  providedIn: 'root',
})
export class AdminPanelTransactionBillService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  getAllTransactionBillServices(): Observable<GlobalResponse> {
    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/TransactionOrBillService/GetAllTransactionOrBillServiceType`,
    );
  }

  changeServiceStatus(
    payload: TransactionBillStatusRequest,
  ): Observable<GlobalResponse> {
    const params = new HttpParams()

      .set('key', String(payload.key))

      .set('index', String(payload.index))

      .set('serviceId', String(payload.serviceId))

      .set('serviceName', payload.serviceName || '')

      .set('status', String(payload.status))

      .set('pvCode', String(payload.pvCode))

      .set('serviceShName', payload.serviceShName || '')

      .set('serviceTypeName', payload.serviceTypeName || '')

      .set('allowedForIndividual', String(payload.allowedForIndividual))

      .set('allowedForCorporate', String(payload.allowedForCorporate))

      .set('allowedForGroup', String(payload.allowedForGroup))

      .set('groupId', String(payload.groupId))

      .set('isEnableBeneficiary', String(payload.isEnableBeneficiary))

      .set('isEnableAutopay', String(payload.isEnableAutopay))

      .set('isEnableSSL', String(payload.isEnableSSL))

      .set('allowedForIndividualShow', payload.allowedForIndividualShow || '');

    return this.http.post<GlobalResponse>(
      `${this.baseUrl}/api/TransactionOrBillService/ActiveinactiveTransactionOrBillService`,

      {},

      {
        params,
      },
    );
  }
}
