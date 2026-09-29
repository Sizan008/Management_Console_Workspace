import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  GlobalResponse,
  MerchantTypeModel,
} from '../models/merchant-type.model';

@Injectable({
  providedIn: 'root',
})
export class AdminPanelMerchantTypeService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  getMerchantTypes(): Observable<GlobalResponse> {
    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/BenefitOrDiscount/GetBenefitOrDiscountTypes`,
    );
  }

  addOrEditOrChangeStatus(
    payload: MerchantTypeModel,
  ): Observable<GlobalResponse> {
    return this.http.post<GlobalResponse>(
      `${this.baseUrl}/api/BenefitOrDiscount/AddOrEditOrChangeStatusOfBenefitOrDiscountType`,

      payload,
    );
  }
}
