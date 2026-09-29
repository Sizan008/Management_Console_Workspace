import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ContactApiResponse,
  ContactApiResult,
  ContactInformation,
  ContactUpdateRequest,
} from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  getContactDetails(): Observable<ContactInformation> {
    return this.http
      .get<ContactApiResponse<ContactApiResult>>(
        `${this.baseUrl}/api/About/getContactDetails`,
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Unable to load Contact information.');

          if (!response.Result) {
            throw new Error('Contact information was not returned by the server.');
          }

          return {
            callCenterHotlineNumber: String(
              response.Result.callCenterHotLine ?? '',
            ).trim(),
            emailAddress: String(response.Result.contactEmailAddress ?? '').trim(),
          };
        }),
      );
  }

  updateContactDetails(payload: ContactUpdateRequest): Observable<void> {
    return this.http
      .post<ContactApiResponse<unknown>>(
        `${this.baseUrl}/api/About/editContactDetails`,
        payload,
      )
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Unable to update Contact information.');
          return void 0;
        }),
      );
  }

  private throwIfApiFailed<T>(response: ContactApiResponse<T>, fallback: string): void {
    if (String(response?.Status ?? '').trim().toUpperCase() === 'OK') {
      return;
    }

    throw new Error(response?.Message?.trim() || fallback);
  }
}
