import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ActiveProductApiItem,
  ActiveProductApiResponse,
  ActiveProductType,
  ProductPayload,
} from '../models/active-product.model';

@Injectable({ providedIn: 'root' })
export class ActiveProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  // Keep Active Product endpoints inside the feature service. No separate
  // endpoint constant/config file is needed in the current Demo01 structure.
  private readonly productListUrl = `${this.baseUrl}/api/CombinedFeatures/GetProductsList`;
  private readonly productTypeUrl = `${this.baseUrl}/api/CombinedFeatures/GetProductsTypes`;
  private readonly saveProductUrl = `${this.baseUrl}/api/CombinedFeatures/AddOrEditOrDeleteProducts`;

  getActiveProductsList(
    producttypeID: number,
  ): Observable<ActiveProductApiResponse<ActiveProductApiItem[]>> {
    const params = new HttpParams().set('producttypeID', String(producttypeID || 0));
    return this.http.get<ActiveProductApiResponse<ActiveProductApiItem[]>>(
      this.productListUrl,
      { params },
    );
  }

  getProductTypes(
    parentID: number,
  ): Observable<ActiveProductApiResponse<ActiveProductType[]>> {
    const params = new HttpParams().set('parentID', String(parentID || 0));
    return this.http.get<ActiveProductApiResponse<ActiveProductType[]>>(
      this.productTypeUrl,
      { params },
    );
  }

  saveProduct(
    payload: ProductPayload,
  ): Observable<ActiveProductApiResponse<unknown>> {
    return this.http.post<ActiveProductApiResponse<unknown>>(
      this.saveProductUrl,
      payload,
    );
  }
}
