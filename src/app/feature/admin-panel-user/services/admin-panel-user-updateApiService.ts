import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';


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
  UPDATE CONTACT PAYLOAD
  ============================================================
*/

export interface UpdateContactInfoPayload {

  UserID: string;

  CustomerId: string;

  Address1: string;

  Address2: string;

  Mobile: string;

  Email: string;

}


/*
  ============================================================
  CUSTOMER ID UPDATE PAYLOAD
  ============================================================
*/

export interface UpdateCustomerIdPayload {

  UserID: string;

  CurrentCustomerId: string;

  NewCustomerId: string;

}


@Injectable({
  providedIn: 'root'
})
export class AdminPanelUserUpdateService {

  private readonly http =
    inject(HttpClient);


  /*
    environment.ts:

    mcUrl: 'http://localhost:8201'
  */

  private readonly baseUrl =
    environment.mcUrl.replace(
      /\/+$/,
      ''
    );


  /*
    ============================================================
    GET USER BY ROUTE USER ID
    ============================================================
  */

  getUserByUserId(
    userId: string
  ): Observable<GlobalResponse> {

    const params =
      new HttpParams()

        .set(
          'searchFlag',
          '0'
        )

        .set(
          'userId',
          userId
        )

        .set(
          'customerId',
          ''
        )

        .set(
          'mobileNumber',
          ''
        )

        .set(
          'email',
          ''
        );


    return this.http
      .get<GlobalResponse>(

        `${this.baseUrl}/api/UserManagement/FindUserInformation`,

        {
          params
        }

      );

  }


  /*
    ============================================================
    UPDATE CONTACT INFO
    ============================================================
  */

  updateContactInfo(
    payload:
      UpdateContactInfoPayload
  ): Observable<GlobalResponse> {

    return this.http
      .post<GlobalResponse>(

        `${this.baseUrl}/api/Request/AddressUpdate`,

        payload

      );

  }


  /*
    ============================================================
    UPDATE CUSTOMER ID
    ============================================================
  */

  updateCustomerId(
    payload:
      UpdateCustomerIdPayload
  ): Observable<GlobalResponse> {

    return this.http
      .post<GlobalResponse>(

        `${this.baseUrl}/api/Request/CustomerIdUpdate`,

        payload

      );

  }

}