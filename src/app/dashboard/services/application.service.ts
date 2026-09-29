import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

export interface Application {
  appId: number;
  appName: string;
  appDesc?: string;
  appBasePath: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private http = inject(HttpClient);
  private appList$: Observable<Application[]> | null = null;

  getApplications(): Observable<Application[]> {
    if (!this.appList$) {
      this.appList$ = this.http.get<Application[]>(`${environment.myBaseUrl}/appBaseList/retrieveAll`).pipe(
        catchError(() => of([])),
        shareReplay(1)
      );
    }
    return this.appList$;
  }
}
