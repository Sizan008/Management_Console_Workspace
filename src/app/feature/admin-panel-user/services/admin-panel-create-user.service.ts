import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse, Branch, CustomerInfo, AuthLevel,
  CustomerAccount, FundTransferType, CreateUserPayload
} from '../models/admin-panel-create-user.model';

@Injectable({ providedIn: 'root' })
export class AdminPanelCreateUserService {
  private http = inject(HttpClient);

  /** Base URL the demo uses for these endpoints. */
  private base = environment.myBaseUrl2;

  getBranchList(): Observable<ApiResponse<Branch[]>> {
    return this.http.get<ApiResponse<Branch[]>>(`${this.base}/api/UserManagement/getBranchList`);
  }

  isValidUserId(userId: string): Observable<ApiResponse<string>> {
    const params = new HttpParams().set('UserID', userId);
    return this.http.get<ApiResponse<string>>(`${this.base}/api/UserManagement/isValidUserID`, { params });
  }

  getCustomerId(branchId: string, accountNumber: string): Observable<ApiResponse<string>> {
    const params = new HttpParams().set('branchID', branchId).set('accountNumber', accountNumber);
    return this.http.get<ApiResponse<string>>(`${this.base}/api/UserManagement/getCustomerID`, { params });
  }

  getCustomerInfo(customerId: string): Observable<ApiResponse<CustomerInfo>> {
    const params = new HttpParams().set('customerID', customerId);
    return this.http.get<ApiResponse<CustomerInfo>>(`${this.base}/api/UserManagement/getCustomerInfo`, { params });
  }

  getOrgAuthLevels(): Observable<ApiResponse<AuthLevel[]>> {
    return this.http.get<ApiResponse<AuthLevel[]>>(`${this.base}/api/UserManagement/GetOrgAuthLvlName`);
  }

  getCustomerAccountList(customerId: string, pnamevalue: string): Observable<ApiResponse<CustomerAccount[]>> {
    const params = new HttpParams().set('customerID', customerId).set('pnamevalue', pnamevalue);
    return this.http.get<ApiResponse<CustomerAccount[]>>(
      `${this.base}/api/UserManagement/getCustomerAccountList`, { params }
    );
  }

  getFundTransferTypes(customerId: string): Observable<ApiResponse<FundTransferType[]>> {
    const params = new HttpParams().set('customerID', customerId);
    return this.http.get<ApiResponse<FundTransferType[]>>(
      `${this.base}/api/UserManagement/GetFundTransferTypes`, { params }
    );
  }

  createUser(payload: CreateUserPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/api/UserManagement/UserCreation`, payload);
  }
}
