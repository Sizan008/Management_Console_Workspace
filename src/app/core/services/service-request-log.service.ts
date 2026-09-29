import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ServiceRequestLog {
  id?: number;
  requestId?: number;
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'VIEW'
  employeeId?: string;
  fullName: string;
  email: string;
  department: number;
  requestType: string;
  priority: string;
  remarks: string;
  fileName?: string | null;
  status?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServiceRequestLogService {
  private get logsApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequestLogs`;
  }

  private get logsByRequestIdUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequestLogs`;
  }

  private get allLogsUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequestLogs`;
  }

  constructor(private http: HttpClient) {}

  /**
   * Log a service request action to the backend
   * This runs silently without UI feedback
   */
  logServiceRequest(log: ServiceRequestLog): Observable<ServiceRequestLog> {
    return this.http.post<ServiceRequestLog>(this.logsApiUrl, log, {}).pipe(
      tap((newLog: ServiceRequestLog) =>
        console.log(`Logged service request action: ${log.action}`, newLog)
      ),
      catchError((error) => {
        console.error('Error logging service request:', error);
        return of({} as ServiceRequestLog);
      })
    );
  }

  /**
   * Get all logs for a specific service request
   * This can be used for audit purposes
   */
  getLogsByRequestId(requestId: number): Observable<ServiceRequestLog[]> {
    return this.http
      .get<ServiceRequestLog[]>(`${this.logsByRequestIdUrl}/${requestId}`, {})
      .pipe(
        tap((logs) =>
          console.log(`Fetched ${logs.length} logs for request ${requestId}`)
        ),
        catchError((error) => {
          console.error('Error fetching logs by request ID:', error);
          return of([]);
        })
      );
  }

  /**
   * Get all logs
   */
  getAllLogs(): Observable<ServiceRequestLog[]> {
    return this.http.get<ServiceRequestLog[]>(this.allLogsUrl).pipe(
      tap((logs) => console.log(`Fetched ${logs.length} total logs`)),
      catchError((error) => {
        console.error('Error fetching all logs:', error);
        return of([]);
      })
    );
  }
}
