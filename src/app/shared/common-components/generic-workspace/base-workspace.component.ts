import { Directive, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceResolverService } from '../../../core/workspace-api/workspace-resolver.service';
import { ActionDefinition, WorkspaceConfig } from './workspace-config.model';
import { WorkspaceMeta } from '../../models/workspace-meta.model';
import { getRouteSegmentForWorkspaceName } from '../../services/workspace.service';

@Directive()
export abstract class BaseWorkspaceComponent<T> implements OnInit {
  protected readonly router   = inject(Router);
  protected readonly route    = inject(ActivatedRoute);
  protected readonly resolver = inject(WorkspaceResolverService);

  abstract allCases: T[];
  workspaceConfig!: WorkspaceConfig<T>;

  private _ready = false;

  constructor() {
    effect(() => {
      this.resolver.resolvedWorkspaces(); // track signal
      if (this._ready) this.workspaceConfig = this.rebuildConfig();
    });
    this.resolver.load();
  }

  ngOnInit(): void {
    this._ready = true;
    this.workspaceConfig = this.rebuildConfig();
  }

  // ── Subclass contract ──────────────────────────────────────────────────────

  abstract getMeta(): WorkspaceMeta;
  abstract getItemKey(item: T): string;
  abstract buildConfig(dynamicActions?: ActionDefinition<T>[]): WorkspaceConfig<T>;

  // ── Shared logic ───────────────────────────────────────────────────────────

  private rebuildConfig(): WorkspaceConfig<T> {
    // Identify this workspace by its route segment. Primary: the DB
    // `home_identifier`. Fallback: the frontend registry maps a workspace
    // name → segment for workspaces whose API payload leaves
    // `homeIdentifier` empty (Management Console → `admin-panel-user`),
    // so row actions still resolve to that workspace.
    const segment = this.getMeta().routeSegment;
    const segLower = segment.toLowerCase();
    const wsId = this.resolver.resolvedWorkspaces()
      .find(r => {
        const hi = (r.workspace.homeIdentifier ?? '').toLowerCase();
        if (hi === segLower) return true;
        const regSeg = getRouteSegmentForWorkspaceName(r.workspace.workspaceName ?? '');
        return regSeg?.toLowerCase() === segLower;
      })
      ?.workspace.workspaceId;

    const dynamicActions = wsId !== undefined
      ? this.resolver.buildActionsForWorkspace<T>(wsId, i => this.getItemKey(i), this.router, this.route)
      : [];

    return this.buildConfig(dynamicActions.length ? dynamicActions : undefined);
  }

  protected navigateToTab(tab: string, itemKey: string): void {
    this.router.navigate(['case', itemKey], {
      relativeTo: this.route,
      queryParams: { tab }
    });
  }
}
