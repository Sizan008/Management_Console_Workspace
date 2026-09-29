import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dashboard, CreateDashboardCommand, UpdateDashboardCommand } from '../models/dashboard-designer.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private apiUrl = `${environment.apiBaseUrl}/sentinel/api/Entity/`;

  constructor(private http: HttpClient) { }

  /**
   * Get all dashboards
   */
  getDashboards(): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(this.apiUrl);
  }

  /**
   * Get dashboard by id
   */
  getDashboard(id: number): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.apiUrl}${id}`);
  }

  /**
   * Get dashboards by module code
   */
  getDashboardsByModule(moduleCode: string): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(`${this.apiUrl}module/${moduleCode}`);
  }

  /**
   * Create new dashboard
   */
  createDashboard(command: CreateDashboardCommand): Observable<any> {
    return this.http.post(this.apiUrl, command);
  }

  /**
   * Update dashboard
   */
  updateDashboard(id: number, command: UpdateDashboardCommand): Observable<any> {
    return this.http.put(`${this.apiUrl}${id}`, command);
  }
}
