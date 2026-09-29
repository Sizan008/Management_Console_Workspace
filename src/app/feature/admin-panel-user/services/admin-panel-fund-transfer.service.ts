import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

/*
  ============================================================
  GLOBAL RESPONSE
  ============================================================
*/

export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

/*
  ============================================================
  INDIVIDUAL FUND TRANSFER REQUEST
  ============================================================
*/

export interface IndividualFundTransferPayload {
  TransferType: string;

  MinAmountPerTrans: number;

  MaxAmountPerTrans: number;

  MaxAmountTransPerDay: number;

  MaxNumOfTransPerDay: number;

  UserId?: string;

  CustomerId?: string;

  MobileNumber?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminPanelFundTransferService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  /*
    ============================================================
    GET USER FROM ROUTE USER ID
    ============================================================
  */

  getUserByUserId(userId: string): Observable<GlobalResponse> {
    const params = new HttpParams()

      .set('searchFlag', '0')

      .set('userId', userId)

      .set('customerId', '')

      .set('mobileNumber', '')

      .set('email', '');

    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/UserManagement/FindUserInformation`,

      {
        params,
      },
    );
  }

  /*
    ============================================================
    AVAILABLE INTERNAL TRANSFER TYPES

    Individual dropdown populate করার জন্য।
    ============================================================
  */

  getInternalFundTransferPolicy(): Observable<GlobalResponse> {
    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/FundTransferLimit/GetInternalFundTrfPolicy`,
    );
  }

  /*
    ============================================================
    GET CURRENT USER-WISE POLICY
    ============================================================
  */

  getUserWiseFundTransferPolicy(userId: string): Observable<GlobalResponse> {
    const params = new HttpParams().set('userId', userId);

    return this.http.get<GlobalResponse>(
      `${this.baseUrl}/api/FundTransferLimit/GetUserWiseFundTrfPolicy`,

      {
        params,
      },
    );
  }

  /*
    ============================================================
    SAVE INDIVIDUAL USER POLICY
    ============================================================
  */

  saveIndividualFundTransferPolicy(
    payload: IndividualFundTransferPayload,
  ): Observable<GlobalResponse> {
    return this.http.post<GlobalResponse>(
      `${this.baseUrl}/api/Request/AddNewFundTrfPolicy`,

      payload,
    );
  }
}
