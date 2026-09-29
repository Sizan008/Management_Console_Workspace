import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ResetPasswordApiResponse,
  ResetPasswordUser,
  ResetPasswordUserResult,
} from '../models/reset-password.model';

@Injectable({ providedIn: 'root' })
export class ResetPasswordService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
  // Keep these endpoints with this feature, using the reference API contract.
  private readonly findUserUrl = `${this.baseUrl}/api/UserManagement/FindUserInformation`;
  private readonly resetPasswordUrl = `${this.baseUrl}/api/Request/ResetPassword`;

  getUser(userId: string): Observable<ResetPasswordUser> {
    const params = new HttpParams()
      .set('searchFlag', '0')
      .set('userId', userId.trim())
      .set('customerId', '')
      .set('mobileNumber', '')
      .set('email', '');

    return this.http.get<ResetPasswordApiResponse<ResetPasswordUserResult>>(
      this.findUserUrl, { params },
    ).pipe(map(response => {
      this.requireSuccess(response, 'Unable to load the selected user.');
      const user = response.Result?.regCustUser;
      if (!user || typeof user.userId !== 'string' || !user.userId.trim()) {
        throw new Error('The server did not return user information.');
      }
      if (user.userId.trim().toLowerCase() !== userId.trim().toLowerCase()) {
        throw new Error('The returned user does not match the selected user.');
      }
      return { ...user, userId: user.userId.trim() };
    }));
  }

  resetPassword(userId: string): Observable<string> {
    const params = new HttpParams().set('UserID', userId);
    return this.http.post<ResetPasswordApiResponse<unknown>>(
      this.resetPasswordUrl, {}, { params },
    ).pipe(map(response => {
      this.requireSuccess(response, 'Unable to submit the password reset request.');
      return response.Message?.trim() || 'Password reset request submitted successfully.';
    }));
  }

  private requireSuccess<T>(response: ResetPasswordApiResponse<T>, fallback: string): void {
    if (response?.Status?.trim().toUpperCase() !== 'OK') {
      throw new Error(response?.Message?.trim() || fallback);
    }
  }
}
