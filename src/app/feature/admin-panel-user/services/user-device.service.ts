import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  RegisteredDevice,
  RemovedDevice,
  UserDeviceApiResponse,
  UserDeviceUser,
  UserDeviceUserResult,
} from '../models/user-device.model';

@Injectable({ providedIn: 'root' })
export class UserDeviceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
  private readonly findUserUrl = `${this.baseUrl}/api/UserManagement/FindUserInformation`;
  private readonly activeDeviceUrl = `${this.baseUrl}/api/CombinedFeatures/GetActiveDevice`;
  private readonly removedDeviceUrl = `${this.baseUrl}/api/CombinedFeatures/GetRemovedDevice`;
  private readonly removeRegisteredDeviceUrl = `${this.baseUrl}/api/CombinedFeatures/RemoveRegisteredDevice`;

  getUser(userId: string): Observable<UserDeviceUser> {
    const selectedUserId = userId.trim();
    const params = new HttpParams()
      .set('searchFlag', '0')
      .set('userId', selectedUserId)
      .set('customerId', '')
      .set('mobileNumber', '')
      .set('email', '');

    return this.http
      .get<UserDeviceApiResponse<UserDeviceUserResult>>(this.findUserUrl, { params })
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

  getActiveDevice(customerId: string): Observable<RegisteredDevice[]> {
    const params = new HttpParams().set('customerId', customerId.trim());

    return this.http
      .get<UserDeviceApiResponse<RegisteredDevice[]>>(this.activeDeviceUrl, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, 'Unable to load active devices.');
          return Array.isArray(response.Result) ? response.Result : [];
        }),
      );
  }

  getRemovedDevice(customerId: string): Observable<RemovedDevice[]> {
    const params = new HttpParams().set('customerId', customerId.trim());

    return this.http
      .get<UserDeviceApiResponse<RemovedDevice[]>>(this.removedDeviceUrl, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, 'Unable to load removed devices.');
          return Array.isArray(response.Result) ? response.Result : [];
        }),
      );
  }

  removeRegisteredDevice(customerId: string, deviceToken: string): Observable<string> {
    const params = new HttpParams()
      .set('customerId', customerId.trim())
      .set('deviceToken', deviceToken.trim());

    return this.http
      .post<UserDeviceApiResponse<unknown>>(this.removeRegisteredDeviceUrl, null, { params })
      .pipe(
        map((response) => {
          this.requireSuccess(response, 'Unable to remove the selected device.');
          return response.Message?.trim() || 'Device removed successfully.';
        }),
      );
  }

  private requireSuccess<T>(response: UserDeviceApiResponse<T>, fallback: string): void {
    if (response?.Status?.trim().toUpperCase() !== 'OK') {
      throw new Error(response?.Message?.trim() || fallback);
    }
  }
}
