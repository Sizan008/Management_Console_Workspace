import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Observable, of, tap} from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppFunctionsRequest } from '../utils/model/common.model';

@Injectable({
  providedIn: 'root'
})
export class AuthResourceService {

  constructor(private http: HttpClient) {}

  getFilteredFunction(request: AppFunctionsRequest): Observable<any> {
    let params = new HttpParams();

    if (request.appId != null) {
      params = params.set('appId', request.appId.toString());
    }
    if (request.moduleId) {
      params = params.set('moduleId', request.moduleId);
    }
    if (request.functionType) {
      params = params.set('functionType', request.functionType);
    }

    const url = `${environment.sentinelUrl}/Resource/RetrieveResources`;
    return this.http.get<any>(url, { params });
  }

}
