import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class ApiService {

  protected http = inject(HttpClient);
  public readonly baseUrl: string = environment.apiBaseUrl;

  private url(path: string): string {
    return path.startsWith('http') ? path : `${this.baseUrl}/${path}`;
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.url(path));
  }

  post<T>(path: string, data: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), data);
  }

  put<T>(path: string, data: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), data);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  postMultipart<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<T>(this.url(path), formData);
  }

  getBlob(path: string): Observable<Blob> {
    return this.http.get(this.url(path), { responseType: 'blob' });
  }
}
