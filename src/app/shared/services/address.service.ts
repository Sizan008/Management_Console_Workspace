import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AddressDto, AddressSearchResponse, AddressDisplayOption } from '../models/address.model';
import { LoaderService } from './loader.service';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private http = inject(HttpClient);
  private baseUrl = environment.centrinoUrl + '/AddressMv';
  private loader = inject(LoaderService);

  /**
   * Search addresses and return raw API response
   */
  searchAddress(query: string): Observable<AddressSearchResponse> {
    const params = new HttpParams().set('searchText', query);
    const token = sessionStorage.getItem('access_token');

    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Tell global interceptor to skip showing the loader for address searches
    headers['X-Skip-Loader'] = 'true';

    return this.http.get<AddressSearchResponse>(
      `${this.baseUrl}/RetrieveAddresses`,
      { params, headers }
    );
  }

  /**
   * Search addresses and transform to display format
   */
  searchAddressForDisplay(query: string): Observable<AddressDisplayOption[]> {
    return this.searchAddress(query).pipe(
      map(addresses => this.transformToDisplayOptions(addresses))
    );
  }

  /**
   * Transform API response to display-friendly format
   */
  private transformToDisplayOptions(addresses: AddressDto[]): AddressDisplayOption[] {
    return addresses.map(addr => ({
      id: addr.villWardId,
      displayText: this.formatDisplayText(addr),
      area: addr.villWardNm,
      thana: addr.thanaNm,
      district: addr.districtNm,
      division: addr.divisionNm,
      fullAddress: this.formatFullAddress(addr)
    }));
  }

  /**
   * Format address for dropdown display
   */
  private formatDisplayText(addr: AddressDto): string {
    return `${addr.villWardNm}, ${addr.unionMuniName}, ${addr.thanaNm}, ${addr.districtNm}`;
  }

  /**
   * Format complete address
   */
  private formatFullAddress(addr: AddressDto): string {
    const parts = [
      addr.villWardNm,
      addr.unionMuniName,
      addr.thanaNm,
      addr.districtNm,
      addr.divisionNm
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Get address by ID
   */
  getAddressById(id: string): Observable<AddressDto | undefined> {
    return this.searchAddress('').pipe(
      map(addresses => addresses.find(addr => addr.villWardId === id))
    );
  }
}
