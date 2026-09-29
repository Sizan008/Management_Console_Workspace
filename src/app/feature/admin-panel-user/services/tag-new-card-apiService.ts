import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';

/*
  ============================================================
  GLOBAL RESPONSE
  ============================================================
*/

export interface GlobalResponse<T = any> {
  Status: string;
  Message: string;
  Result: T;
}

/*
  ============================================================
  CUSTOMER
  ============================================================
*/

export interface TagNewCardCustomer {
  userId: string;
  customerId: string;
  customerName: string;
}

export interface TagNewCardGridRow {
  id: string;
  cardNumber: string;
  mobileNumber: string;
  emailAddress: string;
  expiryMmyy: string;
}

/*
  ============================================================
  NEW CARD TAG REQUEST
  ============================================================
*/

export interface NewCardTagRequest {
  cardNo: string;
  ownerName: string;
  customerId: string;
  reason: string;
  mobileNumber: string;
  userId: string;
  clientId: string;
  tpin: string;
  otp: string;
}

/*
  Backend exact payload
*/

export interface RequestCardTagPayload {
  CardNo: string;
  OwnerName: string;
  CustomerID: string;
  CardTagUntag: 'TAG';
  Reason: string;
  MobileNumber: string;
  UserID: string;
  ClientId: string;
  TPIN: string;
  OTP: string;
}

/*
  ============================================================
  UNTAG REQUEST
  ============================================================
*/

export interface NewCardUntagRequest {
  userId: string;
  customerId: string;
  taggedCardId: string;
}

export interface RequestCardUntagPayload {
  UserID: string;
  CardNo: string;
  CardTagUntag: 'UNTAG';
  CustomerID: string;
}

/*
  ============================================================
  BANGLA QR REQUEST
  ============================================================
*/

export interface BanglaQrCardRegistrationRequest {
  userId: string;
  fullPan: string;
  expireMmyy: string;
  mobileNumber: string;
  emailAddress: string;
}

/*
  Backend response property casing inconsistent হতে পারে।
*/

type ApiRecord = Record<string, unknown>;

/*
  ============================================================
  SERVICE
  ============================================================
*/

@Injectable({
  providedIn: 'root',
})
export class TagNewCardApiService {
  private readonly http = inject(HttpClient);

  /*
    environment.ts

    mcUrl: 'http://localhost:8201'
  */

  private readonly apiUrl = environment.mcUrl.replace(/\/+$/, '');

  /*
    ============================================================
    FIND USER INFORMATION
    ============================================================
  */

  findUserInformation(userId: string): Observable<TagNewCardCustomer> {
    const params = new HttpParams()

      .set('searchFlag', '0')

      .set('userId', userId)

      .set('customerId', '')

      .set('mobileNumber', '')

      .set('email', 'undefined');

    return this.http
      .get<GlobalResponse<any>>(
        `${this.apiUrl}/api/UserManagement/FindUserInformation`,
        {
          params,
        },
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Customer information could not be found.',
          );

          const result = this.asRecord(response.Result);

          const customerInfo = this.asRecord(result?.['customerInfo']);

          const registeredUser = this.asRecord(result?.['regCustUser']);

          const resolvedUserId =
            this.readText(registeredUser?.['userId']) || userId;

          /*
            Original API response অনুযায়ী
            customerInfo থেকে নিচের field নেওয়া হচ্ছে।
          */

          const customerId = this.readText(customerInfo?.['customeR_ID']);

          const customerName = this.readText(
            customerInfo?.['customeR_FULL_NM'],
          );

          if (!resolvedUserId) {
            throw new Error('User ID was not returned by the server.');
          }

          return {
            userId: resolvedUserId,

            customerId: customerId,

            customerName: customerName,
          };
        }),
      );
  }

  /*
    ============================================================
    NEW CARD TAGGED LIST
    ============================================================
  */

  getNewCardTaggedList(userId?: string): Observable<TagNewCardGridRow[]> {
    const params = new HttpParams().set('userId', String(userId));

    return this.http
      .get<GlobalResponse<any>>(
        `${this.apiUrl}/api/Request/GetTaggedCardList`,
        {
          params,
        },
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Tagged card list could not be loaded.',
          );

          return this.toArray(response.Result).map((item) => {
            const row = this.asRecord(item);

            return {
              id: this.readText(row?.['id']),

              /*
                  Backend:

                  name =
                  masked card number
                */

              cardNumber: this.readText(row?.['name']),

              mobileNumber: '',

              emailAddress: '',

              expiryMmyy: '',
            };
          });
        }),
      );
  }

  /*
    ============================================================
    TAG NEW CARD
    ============================================================
  */

  tagNewCard(request: NewCardTagRequest): Observable<string> {
    const payload: RequestCardTagPayload = {
      CardNo: request.cardNo,

      OwnerName: request.ownerName,

      CustomerID: request.customerId,

      CardTagUntag: 'TAG',

      Reason: request.reason,

      MobileNumber: request.mobileNumber,

      UserID: request.userId,

      ClientId: request.clientId,

      TPIN: request.tpin,

      OTP: request.otp,
    };

    return this.http
      .post<
        GlobalResponse<any>
      >(`${this.apiUrl}/api/Request/RequestCardTagUntag`, payload)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'New Card tag request failed.');

          return this.getSuccessMessage(
            response.Message,
            'Card Tag Request has been added successfully.',
          );
        }),
      );
  }

  /*
    ============================================================
    UNTAG NEW CARD
    ============================================================
  */

  untagNewCard(request: NewCardUntagRequest): Observable<string> {
    const payload: RequestCardUntagPayload = {
      UserID: request.userId,

      /*
        এখানে masked cardNumber না।

        GetTaggedCardList API-এর
        row.id যাবে।
      */

      CardNo: request.taggedCardId,

      CardTagUntag: 'UNTAG',

      CustomerID: request.customerId,
    };

    return this.http
      .post<
        GlobalResponse<any>
      >(`${this.apiUrl}/api/Request/RequestCardTagUntag`, payload)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Card UnTag request failed.');

          return this.getSuccessMessage(
            response.Message,
            'Card UnTag Request has been added successfully.',
          );
        }),
      );
  }

  /*
    ============================================================
    BANGLA QR REGISTERED CARD LIST
    ============================================================
  */

  getBanglaQrRegisteredCards(
    userId: string
  ): Observable<TagNewCardGridRow[]> {

    const params =
      new HttpParams()
        .set(
          'userId',
          userId
        );

    return this.http
      .get<GlobalResponse<any>>(
        `${this.apiUrl}/api/BanglaQR/GetRegisteredCardsList`,
        {
          params
        }
      )
      .pipe(

        map(response => {

          this.throwIfApiFailed(
            response,
            'Bangla QR registered card list could not be loaded.'
          );

          return this
            .toArray(
              response.Result
            )
            .map(item => {

              const row =
                this.asRecord(item);

              return {

                id:
                  this.firstText(
                    row,
                    [
                      'id',
                      'cardId',
                      'card_ID',
                      'requestId',
                      'fullPAN',
                      'cardNo',
                      'cardNumber'
                    ]
                  ),

                cardNumber:
                  this.firstText(
                    row,
                    [
                      'name',
                      'fullPAN',
                      'fulL_PAN',
                      'cardNo',
                      'cardNumber'
                    ]
                  ),

                mobileNumber:
                  this.firstText(
                    row,
                    [
                      'mobileNumber',
                      'mobilE_NUMBER',
                      'mobileNo'
                    ]
                  ),

                emailAddress:
                  this.firstText(
                    row,
                    [
                      'emailAddress',
                      'email',
                      'emaiL_ADDRESS'
                    ]
                  ),

                expiryMmyy:
                  this.firstText(
                    row,
                    [
                      'expiryMmyy',
                      'expireMMYY',
                      'expiryDate',
                      'expirY_DATE'
                    ]
                  )

              };

            });

        })

      );
  }

  /*
    ============================================================
    BANGLA QR CARD REGISTRATION
    ============================================================
  */

  registerBanglaQrCard(
    request: BanglaQrCardRegistrationRequest,
  ): Observable<string> {
    const expiry = request.expireMmyy.trim();

    const expireMM = expiry.slice(0, 2);

    const expireYY = expiry.slice(2, 4);

    const params = new HttpParams()

      .set('userId', request.userId)

      .set('fullPAN', request.fullPan)

      .set('expireMM', expireMM)

      .set('expireYY', expireYY)

      .set('mobileNumber', request.mobileNumber)

      .set('emailAddress', request.emailAddress);

    return this.http
      .post<GlobalResponse<any>>(
        `${this.apiUrl}/api/BanglaQR/CardRegistration`,
        null,
        {
          params,
        },
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(
            response,
            'Bangla QR card registration failed.',
          );

          return this.getSuccessMessage(
            response.Message,
            'Bangla QR card registered successfully.',
          );
        }),
      );
  }

  /*
    ============================================================
    API STATUS CHECK
    ============================================================
  */

  private throwIfApiFailed<T>(
    response: GlobalResponse<T>,

    fallbackMessage: string,
  ): void {
    const isSuccess = response?.Status?.trim().toUpperCase() === 'OK';

    if (isSuccess) {
      return;
    }

    throw new Error(
      this.getMeaningfulMessage(response?.Message, fallbackMessage),
    );
  }

  /*
    ============================================================
    SUCCESS MESSAGE
    ============================================================
  */

  private getSuccessMessage(message: unknown, fallbackMessage: string): string {
    return this.getMeaningfulMessage(message, fallbackMessage);
  }

  private getMeaningfulMessage(
    message: unknown,
    fallbackMessage: string,
  ): string {
    if (typeof message !== 'string') {
      return fallbackMessage;
    }

    const cleanMessage = message.trim();

    const meaningfulText = cleanMessage.replace(/[\s,.;:!?]+/g, '');

    return meaningfulText ? cleanMessage : fallbackMessage;
  }

  /*
    ============================================================
    RESPONSE MAPPING HELPERS
    ============================================================
  */

  private asRecord(value: unknown): ApiRecord | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as ApiRecord;
    }

    return null;
  }

  private toArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private readText(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  private firstText(row: ApiRecord | null, keys: string[]): string {
    if (!row) {
      return '';
    }

    for (const key of keys) {
      const value = this.readText(row[key]);

      if (value) {
        return value;
      }
    }

    return '';
  }
}
