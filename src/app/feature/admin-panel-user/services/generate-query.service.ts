import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  SavedQuery,
  QueryResultRow,
  SaveQueryPayload,
  GetDataByQueryPayload,
  TransferTypeOption
} from '../models/generate-query.model';

@Injectable({ providedIn: 'root' })
export class GenerateQueryService {
  private http = inject(HttpClient);
  private base = environment.myBaseUrl2;

  readonly transferTypes: TransferTypeOption[] = [
    { serviceId: '3',  serviceName: 'Fund Transfer - Own' },
    { serviceId: '24', serviceName: 'Fund Transfer - Within Bank' },
    { serviceId: '25', serviceName: 'Fund Transfer - Other Bank' },
    { serviceId: '26', serviceName: 'Fund Transfer - NEFT' },
    { serviceId: '28', serviceName: 'Fund Transfer - RTGS' },
    { serviceId: '31', serviceName: 'Fund Transfer - IMPS' },
    { serviceId: '32', serviceName: 'Fund Transfer - UPI' },
    { serviceId: '49', serviceName: 'Bill Payment - Utility' },
    { serviceId: '50', serviceName: 'Bill Payment - Credit Card' }
  ];

  getAllQuery(): Observable<ApiResponse<SavedQuery[]>> {
    return this.http.get<ApiResponse<SavedQuery[]>>(
      `${this.base}/api/QueryBuilder/GetAllQuery`
    ).pipe(
      map(res => {
        if (res?.Status === 'OK' && Array.isArray(res.Result)) {
          return res;
        }
        return { Status: 'OK' as const, Message: '', Result: [] };
      })
    );
  }

  getDataByQuery(payload: GetDataByQueryPayload): Observable<ApiResponse<QueryResultRow[]>> {
    return this.http.post<ApiResponse<QueryResultRow[]>>(
      `${this.base}/api/QueryBuilder/GetDataByQuery`,
      payload
    ).pipe(
      map(res => {
        if (res?.Status === 'OK' && Array.isArray(res.Result)) {
          return res;
        }
        return { Status: 'OK' as const, Message: '', Result: [] };
      })
    );
  }

  saveQuery(payload: SaveQueryPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.base}/api/QueryBuilder/SaveQuery`,
      payload
    ).pipe(
      map(res => {
        if (res?.Status === 'OK') {
          return res;
        }
        return { Status: 'OK' as const, Message: res?.Message ?? '', Result: null };
      })
    );
  }

  getTransferTypes(): Observable<TransferTypeOption[]> {
    return of(this.transferTypes);
  }
}
