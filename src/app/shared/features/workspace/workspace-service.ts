import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {environment} from '../../../../environments/environment';
import { MetaAppListItem } from './MetaAppListItem';


@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  constructor(private http: HttpClient) { }
  private cachedApplications: MetaAppListItem[] = [];
  private activeApplication: MetaAppListItem | null = null;
  private pendingApplicationId: number | null = null;

  private get workspaceUrl(): string {
    return `${this.getAppApiRoot()}/Workspace`;
  }

  private get stageUrl(): string {
    return `${this.getAppApiRoot()}/Workspace/Stage`;
  }

  private get actionUrl(): string {
    return `${this.getAppApiRoot()}/Workspace/Stage/Actions`;
  }

  private get assignUrl(): string {
    return `${this.getAppApiRoot()}/Workspace/Stage/Actions/Assign`;
  }

  private get stageColour(): string {
    return `${this.getAppApiRoot()}/Workspace/Stage/Color`;
  }

  private get columnUrl(): string {
    return `${this.getAppApiRoot()}/Workspace/Column`;
  }

  setActiveApplication(app: MetaAppListItem | number | string | null | undefined): void {
    if (app == null || app === '') {
      this.activeApplication = null;
      this.pendingApplicationId = null;
      return;
    }

    if (typeof app === 'object') {
      this.activeApplication = app;
      this.pendingApplicationId = this.toAppId(app.appId);
      return;
    }

    const appId = this.toAppId(app);
    const resolved = this.cachedApplications.find(item => item.appId === appId) ?? null;
    if (resolved) {
      this.activeApplication = resolved;
      this.pendingApplicationId = null;
      return;
    }

    this.activeApplication = null;
    this.pendingApplicationId = appId;
  }

  getActiveApplication(): MetaAppListItem | null {
    return this.activeApplication;
  }

  getActiveAppId(): number | null {
    return this.activeApplication?.appId ?? this.pendingApplicationId;
  }

  private toAppId(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizePathPart(value: string): string {
    return value.replace(/^\/+|\/+$/g, '');
  }

  private joinUrl(...parts: Array<string | null | undefined>): string {
    return parts
      .filter((part): part is string => !!part && part.trim().length > 0)
      .map((part, index) => index === 0 ? part.replace(/\/+$/g, '') : this.normalizePathPart(part))
      .join('/');
  }

  private getAppApiRoot(): string {
    const baseUrl = (environment.workSpaceSessionAppId ? environment.myBaseUrl : environment.apiBaseUrl).replace(/\/+$/g, '');

    if (environment.workSpaceSessionAppId) {
      return baseUrl;
    }

    const basePath = this.activeApplication?.appBasePath?.trim() ?? '';
    return basePath ? this.joinUrl(baseUrl, basePath) : baseUrl;
  }

  private hydrateActiveApplication(apps: MetaAppListItem[]): void {
    this.cachedApplications = apps ?? [];

    if (this.pendingApplicationId != null) {
      const pendingMatch = this.cachedApplications.find(item => item.appId === this.pendingApplicationId) ?? null;
      if (pendingMatch) {
        this.activeApplication = pendingMatch;
        this.pendingApplicationId = null;
        return;
      }
    }

    if (this.activeApplication?.appId != null) {
      const activeMatch = this.cachedApplications.find(item => item.appId === this.activeApplication?.appId) ?? null;
      if (activeMatch) {
        this.activeApplication = activeMatch;
        return;
      }
    }

    const configuredAppId = this.toAppId(environment.appId);
    const configuredMatch = configuredAppId == null
      ? null
      : this.cachedApplications.find(item => item.appId === configuredAppId) ?? null;

    this.activeApplication = configuredMatch ?? this.cachedApplications[0] ?? null;
    this.pendingApplicationId = this.activeApplication?.appId ?? this.pendingApplicationId;
  }


//--------------------work space-------------------------------//
  getAllWorkspace(): Observable<any> {
    return this.http.get<any>(`${this.workspaceUrl}/RetrieveWorkspaces`);
  }

  getWorkspaceById(workspaceId: number): Observable<any> {
    return this.http.get<any>(`${this.workspaceUrl}/RetrieveWorkspace/${workspaceId}`);
  }

  getWorkspaceByAppId(appId: number): Observable<any> {
    return this.http.get<any>(`${this.workspaceUrl}/RetrieveByAppId?appId=${appId}`);
  }
  saveWorkspace(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.workspaceUrl}/Register`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }
  updateWorkspace(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.workspaceUrl}/Update`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

//--------------------work space column-------------------------------//
/*  getAllTable(): Observable<any> {
    return this.http.get<any>(`${this.columnUrl}/RetrieveAllTableNames`);
  }

  getColumnByTable(tableName: string): Observable<any> {
    return this.http.get<any>(`${this.columnUrl}/RetrieveColumnByTableName/${tableName}`);
  }
  getColumnByWorkspace(workspaceId: number): Observable<any> {
    return this.http.get<any>(`${this.columnUrl}/Map/RetrieveByWorkspace/${workspaceId}`);
  }
  saveWorkspaceColumn(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.columnUrl}/Map/Register`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*!/!*'
        }
      }
    );
  }
  updateWorkspaceColumn(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.columnUrl}/Map/Update`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*!/!*'
        }
      }
    );
  }
  deleteWorkspaceColumn(id: any): Observable<any> {
    return this.http.post<any>(
      `${this.columnUrl}/Map/Delete/${id}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*!/!*'
        }
      }
    );
  }*/

  //--------------------Stage-------------------------------//
  getAllStage(): Observable<any> {
    return this.http.get<any>(`${this.stageUrl}/RetrieveStages`);
  }

  getStageById(stageId: number): Observable<any> {
    return this.http.get<any>(`${this.stageUrl}/RetrieveStage/${stageId}`);
  }

  getStageByWorkspaceId(workspaceId: number): Observable<any> {
    return this.http.get<any>(`${this.stageUrl}/RetrieveByWorkspace/${workspaceId}`);
  }
  getAllStageColour(): Observable<any> {
    return this.http.get<any>(`${this.stageColour}/RetrieveColors`);
  }

  getFilteredStage(request: any): Observable<any> {
    let params = new HttpParams();

    if (request?.app_id != null && request.app_id !== '') {
      params = params.append('appId', request.app_id);
    }

    if (request?.workspace_id != null && request.workspace_id !== '') {
      params = params.append('workspaceId', request.workspace_id);
    }

    return this.http.get<any>(
      `${this.stageUrl}/RetrieveFilteredStages`,
      { params }
    );
  }
  saveStage(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.stageUrl}/Register`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

  updateStage(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.stageUrl}/Update`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

  //-------------------- Action -------------------------------//
  getAllAction(): Observable<any> {
    return this.http.get<any>(`${this.actionUrl}/RetrieveActions`);
  }

  getActionById(actionId: number): Observable<any> {
    return this.http.get<any>(`${this.actionUrl}/RetrieveAction/${actionId}`);
  }

  getActionByStageId(stageId: number): Observable<any> {
    return this.http.get<any>(`${this.actionUrl}/RetrieveByStage/${stageId}`);
  }

  saveAction(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.actionUrl}/Register`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

  updateAction(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.actionUrl}/Update`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

  getFilteredAction(request: any): Observable<any> {
    let params = new HttpParams();

    if (request?.app_id != null && request.app_id !== '') {
      params = params.append('appId', request.app_id);
    }

    if (request?.workspace_id != null && request.workspace_id !== '') {
      params = params.append('workspaceId', request.workspace_id);
    }
    if (request?.stage_id != null && request.stage_id !== '') {
      params = params.append('stageId', request.stage_id);
    }

    return this.http.get<any>(
      `${this.actionUrl}/RetrieveFilteredActions`,
      { params }
    );
  }


  //-------------------- User Assign -------------------------------//

  getActionByUserId(userId: string): Observable<any> {
    return this.http.get<any>(`${this.assignUrl}/RetrieveByUser/${userId}`);
  }

  assignActionToUser(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.assignUrl}/Assign`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

  unassignActionFromUser(request: any): Observable<any> {
    return this.http.post<any>(
      `${this.assignUrl}/Unassign`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*'
        }
      }
    );
  }

  getApplicationList(): Observable<MetaAppListItem[]> {
    const url = `${environment.sentinelUrl}/AppBaseList/RetrieveAll`;

    return this.http.get<MetaAppListItem[]>(url).pipe(
      map(apps => {
        this.hydrateActiveApplication(Array.isArray(apps) ? apps : []);
        return apps;
      }),
      catchError(err => {
        console.error('Error fetching applications', err);
        return of([]);
      })
    );
  }
  getUserProfileById(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.sentinelUrl}/User/RetrieveByUserName/${userId}`);
  }
  getAllOffice(): Observable<any> {
    const url = `${environment.centrinoUrl}/XchangeOut/RetrieveAllOfficeInfoExc`;
    return this.http.get<any>(url);
  }

  getAllUser(officeId?: number): Observable<any> {
    console.log("OfficeId: ", officeId );
    const url = `${environment.sentinelUrl}/User/RetrieveUsersByOffice`;
    const params = officeId !== undefined && officeId !== null
      ? { params: { officeId: String(officeId) } }
      : {};
    return this.http.get<any>(url, params);
  }
}
