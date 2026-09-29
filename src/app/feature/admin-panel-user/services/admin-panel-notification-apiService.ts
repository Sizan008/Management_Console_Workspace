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
  NOTIFICATION REQUEST
  ============================================================
*/

export interface NotificationRequest {
  CustomerId: string;
  NotifiDesc: string;
  NotifiTitle: string;
}


@Injectable({
  providedIn: 'root'
})
export class AdminPanelNotificationService {

  private readonly http =
    inject(HttpClient);


  /*
    environment.ts

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


    return this.http.get<GlobalResponse>(

      `${this.baseUrl}/api/UserManagement/FindUserInformation`,

      {
        params
      }

    );

  }


  /*
    ============================================================
    CREATE INDIVIDUAL NOTIFICATION
    ============================================================
  */

  createNotification(
    payload: NotificationRequest
  ): Observable<GlobalResponse> {

    return this.http.post<GlobalResponse>(

      `${this.baseUrl}/api/CombinedFeatures/CreateNotification`,

      payload

    );

  }

}