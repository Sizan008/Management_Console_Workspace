import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ResetTPinApiResponse,
  ResetTPinUser,
  ResetTPinUserResult,
} from '../models/reset-tpin.model';

@Injectable({ providedIn: 'root' })
export class ResetTPinService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
  private readonly findUserUrl = `${this.baseUrl}/api/UserManagement/FindUserInformation`;
  private readonly resetTPinUrl = `${this.baseUrl}/api/Request/ResetTPIN`;

  getUser(userId: string): Observable<ResetTPinUser> {
    const selectedUserId = userId.trim();
    const params = new HttpParams()
      .set('searchFlag', '0')
      .set('userId', selectedUserId)
      .set('customerId', '')
      .set('mobileNumber', '')
      .set('email', '');

    return this.http
      .get<ResetTPinApiResponse<ResetTPinUserResult>>(this.findUserUrl, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, 'Unable to load the selected user.');

          const user = response.Result?.regCustUser;
          if (!user || typeof user.userId !== 'string' || !user.userId.trim()) {
            throw new Error('The server did not return user information.');
          }

          if (user.userId.trim().toLowerCase() !== selectedUserId.toLowerCase()) {
            throw new Error('The returned user does not match the selected user.');
          }

          return { ...user, userId: user.userId.trim() };
        }),
      );
  }

  resetTPin(userId: string): Observable<string> {
    const params = new HttpParams().set('UserID', userId.trim());

    return this.http
      .post<ResetTPinApiResponse<unknown>>(this.resetTPinUrl, {}, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, 'Unable to submit the T-PIN reset request.');
          return response.Message?.trim() || 'T-PIN reset request submitted successfully.';
        }),
      );
  }

  private requireSuccess<T>(response: ResetTPinApiResponse<T>, fallback: string): void {
    if (response?.Status?.trim().toUpperCase() !== 'OK') {
      throw new Error(response?.Message?.trim() || fallback);
    }
  }
}
