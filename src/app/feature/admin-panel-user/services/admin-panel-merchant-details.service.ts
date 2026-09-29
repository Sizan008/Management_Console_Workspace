import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { forkJoin, map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  GlobalResponse,
  MerchantBenefitType,
  MerchantDetail,
  MerchantPageInitialData,
  SaveMerchantBenefitRequest,
} from '../models/merchant-details.model';

type ApiRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class AdminPanelMerchantDetailsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.mcUrl.replace(/\/+$/, '');

  loadInitialPageData(): Observable<MerchantPageInitialData> {
    return forkJoin({
      merchantTypes: this.getMerchantTypes(),

      merchants: this.getMerchantDetails(),
    }).pipe(
      map((result) => {
        const typeMap = new Map(
          result.merchantTypes.map((item) => [item.id, item.name]),
        );

        return {
          merchantTypes: result.merchantTypes,

          merchants: result.merchants.map((merchant) => ({
            ...merchant,

            merchantType: typeMap.get(merchant.typeId) || merchant.typeId,
          })),
        };
      }),
    );
  }

  private getMerchantTypes(): Observable<MerchantBenefitType[]> {
    return this.http

      .get<GlobalResponse<unknown>>(
        `${this.baseUrl}/api/BenefitOrDiscount/GetBenefitOrDiscountTypes`,
      )

      .pipe(
        map((response) => {
          this.checkResponse(response, 'Merchant type load failed.');

          return this.toArray(response.Result)

            .map((item) => {
              const row = this.asRecord(item);

              return {
                id: this.firstText(row, ['id', 'Id', 'typeId', 'TypeId']),

                name: this.firstText(row, [
                  'name',
                  'Name',
                  'typeName',
                  'TypeName',
                ]),
              };
            })

            .filter((item) => Boolean(item.id));
        }),
      );
  }

  private getMerchantDetails(): Observable<MerchantDetail[]> {
    return this.http

      .get<GlobalResponse<unknown>>(
        `${this.baseUrl}/api/BenefitOrDiscount/GetBenefitOrDiscountDetailsWithQrCode`,
      )

      .pipe(
        map((response) => {
          this.checkResponse(response, 'Merchant details load failed.');

          return this.toArray(response.Result)

            .map((item) => {
              const row = this.asRecord(item);

              return {
                typeId: this.firstText(row, [
                  'typeid',
                  'Typeid',
                  'typeId',
                  'TypeId',
                ]),

                benefitId: this.firstText(row, [
                  'benefitid',
                  'Benefitid',
                  'benefitId',
                  'BenefitId',
                  'id',
                ]),

                merchantType: '',

                merchantName: this.firstText(row, [
                  'companyname',
                  'Companyname',
                  'companyName',
                ]),

                discountInfo: this.firstText(row, [
                  'discountinfo',
                  'Discountinfo',
                  'description',
                ]),

                discountAmount: this.firstText(row, [
                  'discountamount',
                  'Discountamount',
                ]),

                address: this.rawValue(row, ['address', 'Address']),

                webUrl: this.rawValue(row, ['webUrl', 'WebUrl', 'weburl']),

                contact: this.rawValue(row, [
                  'contact',
                  'Contact',
                  'mobileNumber',
                ]),

                branchId: this.rawValue(row, ['branchId', 'BranchId']),

                accountNo: this.rawValue(row, ['accountNo', 'AccountNo']),

                logo: this.rawValue(row, ['logo', 'Logo']),
              };
            })

            .filter((item) => Boolean(item.benefitId));
        }),
      );
  }

  saveOrUpdateMerchant(
    payload: SaveMerchantBenefitRequest,
  ): Observable<string> {
    return this.submit(
      payload,
      'Merchant update failed.',
      'Merchant updated successfully.',
    );
  }

  deleteMerchant(payload: SaveMerchantBenefitRequest): Observable<string> {
    return this.submit(
      payload,
      'Merchant delete failed.',
      'Merchant deleted successfully.',
    );
  }

  private submit(
    payload: SaveMerchantBenefitRequest,

    errorMessage: string,

    successMessage: string,
  ): Observable<string> {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, value == null ? '' : String(value));
      }
    });

    return this.http

      .post<GlobalResponse<unknown>>(
        `${this.baseUrl}/api/BenefitOrDiscount/AddOrEditOrChangeStatusOfBenefitOrDiscount`,

        formData,
      )

      .pipe(
        map((response) => {
          this.checkResponse(response, errorMessage);

          return response.Message || successMessage;
        }),
      );
  }

  private checkResponse<T>(
    response: GlobalResponse<T>,

    message: string,
  ): void {
    if (response?.Status?.toUpperCase() === 'OK') {
      return;
    }

    throw new Error(response.Message || message);
  }

  private asRecord(value: unknown): ApiRecord | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as ApiRecord;
    }

    return null;
  }

  private toArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private firstText(
    source: ApiRecord | null,

    keys: string[],
  ): string {
    if (!source) {
      return '';
    }

    for (const key of keys) {
      const value = source[key];

      if (value !== undefined && value !== null) {
        return String(value).trim();
      }
    }

    return '';
  }

  private rawValue(
    source: ApiRecord | null,

    keys: string[],
  ): string | null {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = source[key];

        return value == null ? null : String(value);
      }
    }

    return null;
  }
}
