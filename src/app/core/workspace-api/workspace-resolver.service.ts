import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { WorkspaceApiService } from './workspace-api.service';
import { AuthService } from '../auth/auth.service';
import { ActionDto, StageDto, ResolvedWorkspace } from './workspace-api.model';
import { ActionDefinition } from '../../shared/common-components/generic-workspace/workspace-config.model';
import { getRouteSegmentForWorkspaceName } from '../../shared/services/workspace.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WorkspaceResolverService {
  private workspaceApi = inject(WorkspaceApiService);
  private auth     = inject(AuthService);

  readonly resolvedWorkspaces = signal<ResolvedWorkspace[]>([]);
  readonly loading             = signal(false);
  private loaded               = false;

  /**
   * Drops the session-long caches and fetches the meta again. `load()` is a
   * one-shot per session, and the per-stage action lists are held by a
   * non-refCounted shareReplay, so without this a page reload was the only way
   * to see workspace/stage/action changes — anything edited on the workspace
   * config page stayed invisible in the workspace boards. Call this after
   * writing meta so the boards pick it up on the next navigation.
   */
  reload(): void {
    this.loaded = false;
    this.workspaceApi.clearActionsCache();
    this.load();
  }

  load(): void {
    if (this.loaded || this.loading()) return;

    const userId = this.auth.getStoredUserId();
    const appId  = this.auth.getStoredAppId() || environment.appId;

    console.log('[WorkspaceResolver] load() → userId:', userId, '| appId:', appId);

    if (!userId) {
      console.warn('[WorkspaceResolver] userId is empty — retrying in 1s');
      setTimeout(() => this.load(), 1000);
      return;
    }

    this.loading.set(true);

    // Prod: assignments are user-specific (get-by-user/{userId}).
    // Dev:  assignments come from the app-wide endpoint (retrieveActionsByAppId?appId=).
    const assignments$ = environment.production
      ? this.workspaceApi.getUserActionAssignments(userId)
      : this.workspaceApi.getAppActionAssignments(appId);

    forkJoin({
      workspaces:  this.workspaceApi.getWorkspacesByApp(appId).pipe(catchError(err => { console.error('[WorkspaceResolver] workspaces error:', err); return of([]); })),
      assignments: assignments$.pipe(catchError(err => { console.error('[WorkspaceResolver] assignments error:', err); return of([]); }))
    }).pipe(
      switchMap(({ workspaces, assignments }) => {
        const uniqueStageIds = [...new Set(assignments.map(a => a.stageId))];

        const actionEntries = Object.fromEntries(
          uniqueStageIds.map(id => [
            `a_${id}`,
            this.workspaceApi.getActionsByStage(id).pipe(catchError(() => of([] as ActionDto[])))
          ])
        );

        const wsStageEntries = Object.fromEntries(
          workspaces.map(ws => [
            `s_${ws.workspaceId}`,
            this.workspaceApi.getStagesByWorkspace(ws.workspaceId).pipe(catchError(() => of([] as StageDto[])))
          ])
        );

        const combined = { ...actionEntries, ...wsStageEntries };

        if (Object.keys(combined).length === 0) {
          return of({ workspaces, assignments, stageActionsMap: new Map<number, ActionDto[]>(), workspaceStagesMap: new Map<number, StageDto[]>() });
        }

        return forkJoin(combined as Record<string, any>).pipe(
          map((raw: Record<string, any>) => ({
            workspaces,
            assignments,
            stageActionsMap: new Map<number, ActionDto[]>(
              uniqueStageIds.map(id => [id, (raw[`a_${id}`] ?? []) as ActionDto[]])
            ),
            workspaceStagesMap: new Map<number, StageDto[]>(
              workspaces.map(ws => [ws.workspaceId, (raw[`s_${ws.workspaceId}`] ?? []) as StageDto[]])
            )
          })),
          catchError(err => { console.error('[WorkspaceResolver] combined fetch error:', err); return of({ workspaces, assignments, stageActionsMap: new Map<number, ActionDto[]>(), workspaceStagesMap: new Map<number, StageDto[]>() }); })
        );
      })
    ).subscribe({
      next: ({ workspaces, assignments, stageActionsMap, workspaceStagesMap }) => {
        const resolved: ResolvedWorkspace[] = workspaces.map(ws => {
          const wsAssignments = assignments.filter(a => a.workspaceId === ws.workspaceId);
          const stageIds      = [...new Set(wsAssignments.map(a => a.stageId))];
          const allStages     = (workspaceStagesMap.get(ws.workspaceId) ?? [])
            .filter(s => s.isActive === 1)
            .sort((a, b) => a.displayOrder - b.displayOrder);

          return {
            workspace: ws,
            allStages,
            stages: stageIds.map(stageId => {
              const allStageActions   = stageActionsMap.get(stageId) ?? [];
              const assignedActionIds = new Set(
                wsAssignments.filter(a => a.stageId === stageId).map(a => a.actionId)
              );
              const stageDto = allStages.find(s => s.stageId === stageId);
              return {
                stageId,
                stageName: stageDto?.stageName ?? '',
                actions: allStageActions
                  .filter(a => assignedActionIds.has(a.actionId))
                  .sort((a, b) => a.displayOrder - b.displayOrder)
              };
            })
          };
        });

        console.log('[WorkspaceResolver] resolved workspaces:', resolved);
        this.resolvedWorkspaces.set(resolved);
        this.loaded = true;
        this.loading.set(false);
      },
      error: (err) => { console.error('[WorkspaceResolver] fatal error:', err); this.loading.set(false); }
    });
  }

  getActionsForWorkspace(workspaceId: number): ActionDto[] {
    const resolved = this.resolvedWorkspaces().find(r => r.workspace.workspaceId === workspaceId);
    if (!resolved) return [];
    return resolved.stages.flatMap(s => s.actions);
  }

  /**
   * Find a resolved workspace by its route segment.
   *
   * Primary match: the API's `META_WORKSPACE.home_identifier`. Fallback match:
   * a frontend registry mapping for workspaces whose API payload leaves
   * `homeIdentifier` empty (e.g. Management Console → `admin-panel-user`),
   * keyed on `workspaceName`. Without the fallback, callers like
   * `BaseWorkspaceComponent.rebuildConfig` see `wsId = undefined` and the row
   * actions never load.
   */
  private findBySegment(routeSegment: string) {
    const seg = (routeSegment ?? '').toLowerCase();
    return this.resolvedWorkspaces().find(r => {
      const hi = (r.workspace.homeIdentifier ?? '').toLowerCase();
      if (hi === seg) return true;
      const regSeg = getRouteSegmentForWorkspaceName(r.workspace.workspaceName ?? '');
      return regSeg?.toLowerCase() === seg;
    });
  }

  getStageNamesForWorkspace(routeSegment: string): string[] {
    return this.findBySegment(routeSegment)?.allStages.map(s => s.stageName) ?? [];
  }

  /** Map of stageName → CSS class (from META_STAGE.stage_colour) for a workspace's badges. */
  getStageColourMap(routeSegment: string): Record<string, string> {
    const map: Record<string, string> = {};
    (this.findBySegment(routeSegment)?.allStages ?? []).forEach(s => {
      if (s.stageColour) map[s.stageName] = s.stageColour;
    });
    return map;
  }

  /**
   * Map of normalized stageName → stageId (from META_STAGE) for a workspace.
   * Lets a list that only carries the stage name (stage/status/role string) resolve
   * the numeric stageId needed for per-row actions. Keys are trimmed + lower-cased so
   * casing/whitespace differences between the list value and META_STAGE don't miss.
   */
  getStageIdMap(routeSegment: string): Record<string, number> {
    const map: Record<string, number> = {};
    (this.findBySegment(routeSegment)?.allStages ?? []).forEach(s => {
      if (s.stageName) map[s.stageName.trim().toLowerCase()] = s.stageId;
    });
    return map;
  }

  buildActionsForWorkspace<T>(
    workspaceId: number,
    getItemKey: (item: T) => string,
    router: Router,
    route: ActivatedRoute
  ): ActionDefinition<T>[] {
    return this.getActionsForWorkspace(workspaceId).map(action => ({
      label:      action.actionName,
      actionName: action.actionName,
      onClick: (item: T) => {
        // quickRoute from the API may have a leading slash (e.g. "/assign-function"); strip it
        // so navigation stays relative to the workspace route.
        const segment = action.quickRoute?.replace(/^\/+/, '').trim();
        const target = segment && segment !== 'string' ? segment : 'case';
        router.navigate([target, getItemKey(item)], { relativeTo: route });
      }
    }));
  }
}
