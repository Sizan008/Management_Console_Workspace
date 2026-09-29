import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AuthorizationApiResponse,
  AuthorizationDecisionRequest,
  AuthorizationFeature,
  AuthorizationRequest,
  AuthorizationRequestDetails,
} from '../models/authorization.model';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  // Keep all Authorization endpoints inside this feature service. No separate
  // endpoint config is required in the current Demo01 structure.
  private readonly featureListByUserIdUrl = `${this.baseUrl}/api/Authorization/getFeatureListByUserId`;
  private readonly requestListByUserIdAndFeatureUrl = `${this.baseUrl}/api/Authorization/getAuthorizeRequestListByUserIdAndFeature`;
  private readonly requestDetailsUrl = `${this.baseUrl}/api/Authorization/getAuthorizeRequestDetails`;
  private readonly authorizeUrl = `${this.baseUrl}/api/Authorization/Authorize`;
  private readonly declineUrl = `${this.baseUrl}/api/Authorization/DeclineRequest`;

  getFeatureListByUserId(userId: string): Observable<AuthorizationFeature[]> {
    const params = new HttpParams().set('userId', userId.trim());

    return this.http
      .get<AuthorizationApiResponse<AuthorizationFeature[]>>(this.featureListByUserIdUrl, { params })
      .pipe(
        map((response) =>
          this.readListResponse(
            response,
            'Unable to load authorization feature list for the selected user.',
          ),
        ),
      );
  }

  getAuthorizationRequestListByUserIdAndFeature(
    userId: string,
    featureId: string,
  ): Observable<AuthorizationRequest[]> {
    const params = new HttpParams()
      .set('userId', userId.trim())
      .set('featureID', featureId.trim());

    return this.http
      .get<AuthorizationApiResponse<AuthorizationRequest[]>>(
        this.requestListByUserIdAndFeatureUrl,
        { params },
      )
      .pipe(
        map((response) =>
          this.readListResponse(
            response,
            'Unable to load authorization request list for the selected user.',
          ),
        ),
      );
  }

  getAuthorizationRequestDetails(queueId: string): Observable<AuthorizationRequestDetails> {
    const params = new HttpParams().set('queueID', queueId.trim());

    return this.http
      .get<AuthorizationApiResponse<AuthorizationRequestDetails>>(this.requestDetailsUrl, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, 'Unable to load authorization request details.');
          if (!response.Result) {
            throw new Error('Authorization request details were not found.');
          }
          return response.Result;
        }),
      );
  }

  authorizeRequest(request: AuthorizationDecisionRequest): Observable<string> {
    return this.processDecision(this.authorizeUrl, request, 'Authorization failed.');
  }

  declineRequest(request: AuthorizationDecisionRequest): Observable<string> {
    return this.processDecision(this.declineUrl, request, 'Decline request failed.');
  }

  private processDecision(
    endpoint: string,
    request: AuthorizationDecisionRequest,
    fallbackMessage: string,
  ): Observable<string> {
    // The reference backend accepts these values from the query string. Keep
    // the same values in the request body as well for parity with the old page.
    const params = new HttpParams()
      .set('queueID', request.queueID)
      .set('remakrs', request.remakrs);

    return this.http
      .post<AuthorizationApiResponse<null>>(endpoint, request, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, fallbackMessage);
          return response.Message?.trim() || 'Operation completed successfully.';
        }),
      );
  }

  private readListResponse<T>(
    response: AuthorizationApiResponse<T[]>,
    fallbackMessage: string,
  ): T[] {
    const status = String(response?.Status ?? '').trim().toUpperCase();
    const message = response?.Message?.trim() || '';

    if (status === 'OK') {
      return Array.isArray(response.Result) ? response.Result : [];
    }

    if (message.toUpperCase() === 'NO DATA FOUND') {
      return [];
    }

    throw new Error(message || fallbackMessage);
  }

  private requireSuccess<T>(response: AuthorizationApiResponse<T>, fallbackMessage: string): void {
    if (String(response?.Status ?? '').trim().toUpperCase() !== 'OK') {
      throw new Error(response?.Message?.trim() || fallbackMessage);
    }
  }
}
