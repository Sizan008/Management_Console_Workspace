import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Dashboard, DashboardCreated, DashboardUpdated, CreateDashboardCommand, UpdateDashboardCommand } from '../models/dashboard.model';
import { ApiBaseService } from './api-base.service';


@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private http = inject(HttpClient);
  private apiBase = inject(ApiBaseService);

  private getApiUrl(): string {
    return this.apiBase.getApiUrl('/Dashboard');
  }

  getDashboards(): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(this.getApiUrl());
  }

  getDashboard(id: number): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.getApiUrl()}/${id}`);
  }

  getDashboardsByModule(moduleCode: string): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(`${this.getApiUrl()}/module/${moduleCode}`);
  }

  getDashboardsByApplication(appId: number): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(`${this.getApiUrl()}/application/${appId}`);
  }

  createDashboard(command: CreateDashboardCommand): Observable<DashboardCreated> {
    return this.http.post<DashboardCreated>(this.getApiUrl(), command);
  }

  updateDashboard(id: number, command: UpdateDashboardCommand): Observable<DashboardUpdated> {
    return this.http.put<DashboardUpdated>(`${this.getApiUrl()}/${id}`, command);
  }

  renderDashboard(id: number): Observable<any> {
    return this.http.get<any>(`${this.getApiUrl()}/${id}/render`);
  }
}
