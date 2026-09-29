import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {environment } from '../../../../environments/environment'

export interface UserSearchPayload {
  searchFlag: number;
  userId?: string;
  customerId?: string;
  mobileNumber?: string;
  email?: string;
}

export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPanelUserStatusChangeService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.mcUrl;

  getUserByUserId(
    userId: string
  ): Observable<GlobalResponse> {

    const params = {
      searchFlag: 0,
      userId: userId,
      customerId: '',
      mobileNumber: '',
      email: ''
    };
    return this.http.get<GlobalResponse>(
      `${this.apiUrl}/api/UserManagement/FindUserInformation`,
      { params }
    );
  }

  inactivateUser(
    userId: string
  ): Observable<GlobalResponse> {

    const params = new HttpParams()
      .set('UserID', userId);

    return this.http.post<GlobalResponse>(
      `${this.apiUrl}/api/Request/InactivateUser`,
      null,
      { params }
    );
  }

  lockUser(
    userId: string,
    lockReason: boolean
  ): Observable<GlobalResponse> {

    const params = new HttpParams()
      .set('UserID', userId)
      .set('lockReason', String(lockReason));

    return this.http.post<GlobalResponse>(
      `${this.apiUrl}/api/Request/LockUser`,
      null,
      { params }
    );
  }

  deRegisterUser(
    userId: string,
    lockReason: boolean
  ): Observable<GlobalResponse> {
    const params = new HttpParams()
      .set('UserID', userId)
      .set('lockReason', String(lockReason));

    return this.http.post<GlobalResponse>(
      `${this.apiUrl}/api/Request/DeRegisterUser`,
      null,
      { params }
    );
  }
}