import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Widget, AddWidgetCommand, UpdateWidgetCommand, GrantPermissionCommand } from '../models/widget-designer.model';

@Injectable({
  providedIn: 'root'
})
export class WidgetService {

  private apiUrl = `${environment.apiBaseUrl}/sentinel/api/Widget/`;

  constructor(private http: HttpClient) { }

  /**
   * Get widgets by dashboard id
   */
  getWidgetsByDashboard(dashboardId: number): Observable<Widget[]> {
    return this.http.get<Widget[]>(`${this.apiUrl}dashboard/${dashboardId}`);
  }

  /**
   * Add widget to dashboard
   */
  addWidget(command: AddWidgetCommand): Observable<any> {
    return this.http.post(this.apiUrl, command);
  }

  /**
   * Update widget
   */
  updateWidget(id: number, command: UpdateWidgetCommand): Observable<any> {
    return this.http.put(`${this.apiUrl}${id}`, command);
  }

  /**
   * Remove widget
   */
  removeWidget(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}`);
  }

  /**
   * Grant permission to widget
   */
  grantPermission(widgetId: number, command: GrantPermissionCommand): Observable<any> {
    return this.http.post(`${this.apiUrl}${widgetId}/Permission`, command);
  }

  /**
   * Revoke permission from widget
   */
  revokePermission(widgetId: number, permissionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${widgetId}/Permission/${permissionId}`);
  }
}
