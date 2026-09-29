import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AboutApiResponse,
  AboutApiResult,
  AboutInformation,
  AboutUpdateRequest,
} from '../models/about.model';

@Injectable({ providedIn: 'root' })
export class AboutService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  getAboutDetails(): Observable<AboutInformation> {
    return this.http
      .get<AboutApiResponse<AboutApiResult>>(`${this.baseUrl}/api/About/getDetail`)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Unable to load About information.');

          if (!response.Result) {
            throw new Error('About information was not returned by the server.');
          }

          return {
            aboutId: this.toNumber(response.Result.aboutId),
            internationalNumber: String(response.Result.international ?? '').trim(),
            localNumber: String(response.Result.localNumber ?? '').trim(),
            mailAddress: String(response.Result.mailAddress ?? '').trim(),
            officeAddress: String(response.Result.officeAddress ?? '').trim(),
          };
        }),
      );
  }

  updateAboutDetails(payload: AboutUpdateRequest): Observable<void> {
    return this.http
      .post<AboutApiResponse<unknown>>(`${this.baseUrl}/api/About/editDetail`, payload)
      .pipe(
        map((response) => {
          this.throwIfApiFailed(response, 'Unable to update About information.');
          return void 0;
        }),
      );
  }

  private throwIfApiFailed<T>(response: AboutApiResponse<T>, fallback: string): void {
    if (String(response?.Status ?? '').trim().toUpperCase() === 'OK') {
      return;
    }

    throw new Error(response?.Message?.trim() || fallback);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
