import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { WorkspaceDto, StageDto, ActionDto, UserActionAssignment } from './workspace-api.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  private http = inject(HttpClient);
  private base = environment.myBaseUrl;

  /**
   * Cache of per-stage action lists. A stage's actions don't change within a
   * session, so the action popup re-uses the shared result instead of firing a
   * new request every time it opens.
   */
  private actionsByStageCache = new Map<number, Observable<ActionDto[]>>();

  getWorkspacesByApp(appId: number | string): Observable<WorkspaceDto[]> {
    return this.http.get<WorkspaceDto[]>(`${this.base}/Workspace/RetrieveByAppId`, {
      params: { appId: String(appId) }
    });
  }

  getUserActionAssignments(userId: string): Observable<UserActionAssignment[]> {
    return this.http.get<UserActionAssignment[]>(
      `${this.base}/Workspace/Stage/Actions/Assign/RetrieveByUser/${userId}`
    );
  }

  /** Dev-mode fallback: all action assignments for an app (not filtered per user). */
  getAppActionAssignments(appId: number | string): Observable<UserActionAssignment[]> {
    return this.http.get<UserActionAssignment[]>(
      `${this.base}/Workspace/Stage/Actions/RetrieveActionsByAppId`,
      { params: { appId: String(appId) } }
    );
  }

  getActionsByStage(stageId: number): Observable<ActionDto[]> {
    let cached = this.actionsByStageCache.get(stageId);
    if (!cached) {
        console.log('Cached stage IDs:', [...this.actionsByStageCache.keys()]);

      cached = this.http
        .get<ActionDto[]>(`${this.base}/Workspace/Stage/Actions/RetrieveByStage/${stageId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.actionsByStageCache.set(stageId, cached);
    }
    return cached;
  }

  /** Clears the cached per-stage action lists (e.g. after actions are reconfigured). */
  clearActionsCache(): void {
    this.actionsByStageCache.clear();
  }

  getStagesByWorkspace(workspaceId: number): Observable<StageDto[]> {
    return this.http.get<StageDto[]>(
      `${this.base}/Workspace/Stage/RetrieveByWorkspace/${workspaceId}`
    );
  }
}
