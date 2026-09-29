import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkspaceDto, UserActionAssignment } from '../../core/workspace-api/workspace-api.model';
import { WorkspaceApiService } from '../../core/workspace-api/workspace-api.service';
import { scopedKey } from './persistent-preferences';


const STORAGE_KEY = 'activeWorkspaceId';
/**
 * Both default-workspace keys are prefixes, suffixed with the user id by
 * scopedKey(). They deliberately outlive logout (see PERSISTENT_PREFERENCE_PREFIXES),
 * so without the scope the next person to sign in on this browser would inherit
 * the previous user's landing page.
 *
 * The route is persisted next to the id because startup needs the landing target
 * before the workspace list has come back from the API.
 */
const DEFAULT_KEY = 'ws_default';
const DEFAULT_ROUTE_KEY = 'ws_default_route';

// ─── Workspace interfaces ───────────────────────────────────────────────────

export interface WorkspaceMasterPage {
  kind: 'new' | 'search';  // which header slot this page fills
  label: string;
  icon: string;    // inline SVG string
  route: string;   // absolute router path for [routerLink]
}

export interface Workspace {
  id: string;
  label: string;
  icon: string;              // inline SVG string
  route: string;             // absolute router path  e.g. '/feature/user-management'
  description: string;
  masterPages: WorkspaceMasterPage[];  // quick action links shown in sidebar
  /**
   * Whether this workspace's route is actually wired up in the router. The API
   * can return workspaces whose Angular page hasn't been built yet; those are
   * shown as unavailable in the dropdown so selecting them can't strand the user
   * on the previous workspace. `false` only when we know it's a placeholder;
   * `undefined` is treated as available.
   */
  available?: boolean;
}

const ICON_PLUS   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
const ICON_SEARCH = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/></svg>`;
const ICON_DEFAULT = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>`;

// ─── Workspace registry ──────────────────────────────────────────────────────
// Maps workspaceName (as returned by the API) to the things the API cannot
// provide: the Angular route segment, the sidebar icon SVG, and — when there is
// no backend — the list-header master pages (New / Search) that the API would
// otherwise supply via newPage*/search* fields.
// Add a new entry here whenever a new workspace is wired into the router.
interface WorkspaceRegistryEntry {
  id: string;
  route: string;
  icon: string;
  masterPages?: WorkspaceMasterPage[];
}

const WORKSPACE_REGISTRY: Record<string, WorkspaceRegistryEntry> = {
};


/**
 * Workspace name → route segment lookup, exposed for callers that need to find
 * a workspace whose API payload has `homeIdentifier === null`. The resolver
 * uses this to map a route segment (e.g. "admin-panel-user") back to the live
 * workspace even when the backend hasn't filled in `homeIdentifier`.
 */
export function getRouteSegmentForWorkspaceName(name: string): string | null {
  const reg = WORKSPACE_REGISTRY[name];
  if (!reg?.route) return null;
  // registry route is absolute ("/feature/admin-panel-user"); we want the
  // last segment ("admin-panel-user") to compare against homeIdentifier.
  return reg.route.split('/').filter(Boolean).pop() ?? null;
}

// ─── Static fallback ─────────────────────────────────────────────────────────
// Used only when the Sentinel API is unreachable.
export const STATIC_WORKSPACES: Workspace[] = Object.entries(WORKSPACE_REGISTRY).map(([name, reg]) => ({
  id:          reg.id,
  label:       name,
  icon:        reg.icon,
  route:       reg.route,
  description: '',
  masterPages: reg.masterPages ?? [],
  available:   true   // everything in the registry is, by definition, wired up
}));

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly router = inject(Router);
  private readonly workspaceApi = inject(WorkspaceApiService);

  // ── State signals ──────────────────────────────────────────────────────────
  readonly workspaces = signal<Workspace[]>([]);
  readonly loading    = signal(false);
  readonly loadError  = signal<string | null>(null);


  /** Set by refresh() to let the next loadWorkspaces() past its once-per-session guard. */
  private forceReload = false;

  /**
   * How many times loadWorkspaces() has backed off waiting for the signed-in
   * user id. The list is filtered per user, so loading before the id resolves
   * would cache an unfiltered list behind the once-per-session guard.
   */
  private userIdWaits = 0;
  private static readonly MAX_USER_ID_WAITS = 10;

  activeWorkspace = signal<Workspace | null>(null);
  activeLabel     = computed(() => this.activeWorkspace()?.label ?? '');

  /** Id of the single default workspace, or null. Persisted in localStorage. */
  readonly defaultWorkspaceId = signal<string | null>(this.loadDefault());

  /** The starred default workspace, shown in the top group (0 or 1 item). */
  readonly favouriteWorkspaces = computed(() => {
    const id = this.defaultWorkspaceId();
    return this.workspaces().filter(ws => ws.id === id);
  });

  readonly otherWorkspaces = computed(() => {
    const id = this.defaultWorkspaceId();
    return this.workspaces().filter(ws => ws.id !== id);
  });

  // ── Load ───────────────────────────────────────────────────────────────────
  // Called once from Navbar.ngOnInit().
  // Tries the API first. Falls back to STATIC_WORKSPACES on any error so
  // the app always works — even with no backend running.
  loadWorkspaces(): void {
    if (this.loading()) return;
    // Already resolved from an earlier init. The navbar lives inside the Layout
    // component, which the router re-creates on some navigations, so ngOnInit
    // (and this call) can run several times per session. Without this guard each
    // re-creation re-fires get-by-app-id. Callers that need a fresh list reset
    // the state first (e.g. WorkspaceConfigService.applyCustomConfig) or go
    // through refresh().
    const forced = this.forceReload;
    this.forceReload = false;
    if (!forced && this.workspaces().length && !this.loadError()) return;
    this.loading.set(true);
    this.loadError.set(null);

    // Admin-saved config takes highest priority (saved via WorkspaceConfigService)
    const savedConfig = localStorage.getItem('ws_admin_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as Array<Workspace & { isEnabled?: boolean }>;
        const enabled = parsed.filter(ws => ws.isEnabled !== false);
        console.info('[WorkspaceService] Loaded admin-saved workspace config.');
        this.applyList(enabled);
        return;
      } catch {
        localStorage.removeItem('ws_admin_config');
      }
    }

    const appId  = sessionStorage.getItem('appId') || environment.appId;
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId') || '';

    // The switcher must only offer workspaces this user is assigned to, so we
    // cannot load until we know who they are. This service is constructed at
    // bootstrap and the navbar can init before Keycloak has written userId;
    // loading anyway would cache the unfiltered app list behind the
    // once-per-session guard, so back off and retry instead.
    if (!userId && this.userIdWaits < WorkspaceService.MAX_USER_ID_WAITS) {
      this.userIdWaits++;
      this.loading.set(false);
      setTimeout(() => this.loadWorkspaces(), 500);
      return;
    }
    this.userIdWaits = 0;

    // Two calls, because neither endpoint alone is enough:
    //   RetrieveByAppId           → the workspace meta (name, route, master pages)
    //                               for the whole app, with no notion of the user.
    //   .../Assign/RetrieveByUser → the user's assignment rows
    //                               ({ userId, appId, workspaceId, stageId, actionId }),
    //                               which carry no meta.
    // So we fetch the app's workspaces and keep the ones the user actually has
    // an assignment for.
    const assignments$ = userId
      ? this.workspaceApi.getUserActionAssignments(userId).pipe(
          catchError(err => {
            // Distinguish "couldn't ask" from "assigned to nothing": on an error
            // emit null and leave the list unfiltered, rather than blanking the
            // switcher because the assignment endpoint was down.
            console.warn('[WorkspaceService] User assignments unavailable, falling back to the full app list.', err);
            return of(null as UserActionAssignment[] | null);
          })
        )
      : of(null as UserActionAssignment[] | null);

    forkJoin({
      dtos:        this.workspaceApi.getWorkspacesByApp(appId),
      assignments: assignments$
    }).subscribe({
      next: ({ dtos, assignments }) =>
        this.applyList(this.mapToWorkspaces(this.filterByAssignments(dtos, assignments))),
      error: () => {
        console.warn('[WorkspaceService] Sentinel API unavailable, using static workspace list.');
        this.applyList(STATIC_WORKSPACES);
      }
    });
  }

  /**
   * Narrow the app-wide workspace list to the ones the user is assigned to.
   *
   * `assignments === null` means we could not find out (no user id, or the
   * endpoint failed) — the list is left untouched. An empty array is a real
   * answer: the user is assigned to nothing, so the switcher shows nothing.
   *
   * workspaceId is compared as a number on both sides; assignment rows can come
   * back with it as a numeric string.
   */
  private filterByAssignments(dtos: WorkspaceDto[], assignments: UserActionAssignment[] | null): WorkspaceDto[] {
    if (!assignments) return dtos;

    const assigned = new Set(assignments.map(a => Number(a.workspaceId)));
    const allowed  = dtos.filter(dto => assigned.has(Number(dto.workspaceId)));

    if (!allowed.length) {
      console.info('[WorkspaceService] User has no workspace assignments; switcher will be empty.');
    }
    return allowed;
  }

  private mapToWorkspaces(dtos: WorkspaceDto[]): Workspace[] {
    return dtos
      .filter(dto => dto.isActive === 1)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(dto => {
        const reg       = WORKSPACE_REGISTRY[dto.workspaceName];
        // Route is DB-driven: prefer the backend's homeIdentifier, then the frontend
        // registry, then a derived fallback. The chosen value MUST match a `path:` in
        // feature.routing.ts or navigation will 404.
        const baseRoute = dto.homeIdentifier
          ? `/feature/${dto.homeIdentifier}`
          : reg?.route ?? `/feature/${dto.workspaceName.toLowerCase().replace(/\s+/g, '-')}-cases`;

        const masterPages: WorkspaceMasterPage[] = [];

        // "New" create pages: prefer the multi-page array; fall back to the
        // legacy single newPageIdentifier/newPageSelector pair. Inactive pages
        // are dropped and the rest are ordered by displayOrder.
        const newPages = dto.newPageIdentifiers?.length
          ? dto.newPageIdentifiers
          : (dto.newPageIdentifier && dto.newPageSelector
              ? [{ newPageIdentifier: dto.newPageIdentifier, newPageSelector: dto.newPageSelector, displayOrder: 1, isActive: 1 }]
              : []);

        // Rows with no usable order go last, not first: the API can send
        // displayOrder as null or '' for pages saved before it was captured, and
        // `?? 0` made those outrank every explicitly ordered page. Number() also
        // covers orders that arrive as numeric strings.
        const pageOrder = (p: { displayOrder?: number | null }): number => {
          if (p.displayOrder === null || p.displayOrder === undefined || (p.displayOrder as unknown) === '') return Number.MAX_SAFE_INTEGER;
          const parsed = Number(p.displayOrder);
          return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
        };

        newPages
          .filter(p => p.isActive !== 0 && p.newPageIdentifier && p.newPageSelector)
          .sort((a, b) => pageOrder(a) - pageOrder(b))
          .forEach(p => masterPages.push({
            kind: 'new',
            label: p.newPageIdentifier,
            icon: ICON_PLUS,
            route: `${baseRoute}/${p.newPageSelector}`
          }));

        if (dto.searchIdentifier && dto.searchSelector) {
          masterPages.push({ kind: 'search', label: dto.searchIdentifier,  icon: ICON_SEARCH, route: `${baseRoute}/${dto.searchSelector}` });
        }

        return {
          id:          reg?.id ?? String(dto.workspaceId),
          label:       dto.workspaceName,
          icon:        reg?.icon ?? ICON_DEFAULT,
          route:       baseRoute,
          description: dto.workspaceDesc,
          masterPages,
          // Every workspace the API returns is treated as available. The registry
          // is now only a source of route/icon overrides, not an allow-list — new
          // workspaces no longer need a manual entry here to show as enabled.
          available:   true
        };
      });
  }

  /**
   * Force a refetch of the workspace list, bypassing loadWorkspaces()'s
   * once-per-session guard. Call this after workspace meta is written (see the
   * Workspace's afterMetaWrite) — otherwise the navbar switcher, sidebar and
   * default-Workspace list keep serving the pre-write list until a page reload.
   *
   * A load already in flight wins: it isn't cancelled, so its result may predate
   * the write. The forced flag survives, so the next call refetches.
   */
  refresh(): void {
    this.forceReload = true;
    this.loadWorkspaces();
  }

  /** Called by WorkspaceConfigService after admin saves settings */
  applyCustomConfig(list: Workspace[]): void {
    this.applyList(list);
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  isWorkspaceRoute(url: string): boolean {
    const path = url.split('?')[0].toLowerCase();
    return this.workspaces().some(
      ws => path === ws.route.toLowerCase() ||
            path.startsWith(ws.route.toLowerCase() + '/')
    );
  }

  /** Keep activeWorkspace in sync with the URL (called on NavigationEnd in navbar) */
  syncFromUrl(url: string): void {
    const path  = url.split('?')[0].toLowerCase();
    const match = this.workspaces().find(
      ws => path === ws.route.toLowerCase() ||
            path.startsWith(ws.route.toLowerCase() + '/')
    );
    // On a workspace route, reflect it; on any non-workspace route (e.g.
    // settings/config, home) clear the selection so the navbar prompts the
    // user to pick a workspace. We don't touch the persisted id, so the last
    // choice is restored when navigating back into a workspace.
    if (match) this.setActive(match, false);
    else this.activeWorkspace.set(null);
  }

  setActive(ws: Workspace, persist = true): void {
    this.activeWorkspace.set(ws);
    if (persist) localStorage.setItem(STORAGE_KEY, ws.id);
  }

  setActiveById(id: string): void {
    const found = this.workspaces().find(w => w.id === id);
    if (found) this.setActive(found);
  }

  /** Switch workspace and navigate to its list page */
  selectWorkspace(ws: Workspace): void {
    const currentPath = this.router.url.split('?')[0];
    const alreadyAtRoot = currentPath.toLowerCase() === ws.route.toLowerCase();
    if (this.activeWorkspace()?.id === ws.id && alreadyAtRoot) return;

    // Commit the switch only AFTER navigation succeeds. There is no wildcard
    // route, so navigating to a workspace whose page isn't wired up rejects and
    // the router stays put — if we flipped the active workspace first, the
    // navbar would show the new label while the page stayed on the old one, and
    // we'd persist a broken id to localStorage. Guarding here keeps label, page,
    // and storage consistent whether or not the route exists.
    this.router.navigateByUrl(ws.route).then(
      ok => {
        if (ok) this.setActive(ws);
        else console.warn(`[WorkspaceService] Workspace "${ws.label}" is not available yet (${ws.route}).`);
      },
      () => console.warn(`[WorkspaceService] No route wired for workspace "${ws.label}" (${ws.route}).`)
    );
  }

  isDefault(id: string): boolean {
    return this.defaultWorkspaceId() === id;
  }

  /**
   * Toggle semantics, for the navbar star: starring a workspace makes it the
   * default (replacing any previous one), clicking the current default clears it.
   */
  setDefaultWorkspace(id: string): void {
    this.applyDefaultWorkspace(this.defaultWorkspaceId() === id ? null : id);
  }

  /**
   * Set the default workspace outright, or clear it with null.
   *
   * This is the single source of truth behind both the navbar star and the
   * "Default Workspace" list in user preferences — they are the same setting, so
   * neither surface keeps its own copy.
   */
  applyDefaultWorkspace(id: string | null): void {
    this.defaultWorkspaceId.set(id);
    if (id) {
      localStorage.setItem(scopedKey(DEFAULT_KEY), id);
      this.storeDefaultRoute(id);
    } else {
      localStorage.removeItem(scopedKey(DEFAULT_KEY));
      localStorage.removeItem(scopedKey(DEFAULT_ROUTE_KEY));
    }
  }

  /**
   * Route the app should open on startup, or null when the user has not starred
   * a default workspace. Read from localStorage so it is available before the
   * workspace list resolves.
   */
  defaultWorkspaceRoute(): string | null {
    if (!localStorage.getItem(scopedKey(DEFAULT_KEY))) return null;
    return localStorage.getItem(scopedKey(DEFAULT_ROUTE_KEY));
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private loadDefault(): string | null {
    return localStorage.getItem(scopedKey(DEFAULT_KEY));
  }

  /** Cache the starred workspace's route, if the list knows about it. */
  private storeDefaultRoute(id: string): void {
    // An empty list means we couldn't load one (API down, static fallback empty),
    // not that the workspace is gone — dropping the cache here would silently
    // undo the user's landing page.
    if (!this.workspaces().length) return;

    const route = this.workspaces().find(ws => ws.id === id)?.route;
    if (route) localStorage.setItem(scopedKey(DEFAULT_ROUTE_KEY), route);
    else localStorage.removeItem(scopedKey(DEFAULT_ROUTE_KEY));
  }

  private applyList(list: Workspace[]): void {
    this.workspaces.set(list);
    this.loading.set(false);

    // Re-read the stored default now that the user id is known. This service can
    // be constructed before Keycloak resolves (App injects it at bootstrap), and
    // on a fresh login the scoped key isn't readable that early.
    this.defaultWorkspaceId.set(this.loadDefault());

    // Keep the cached default route in step with the freshly loaded list, so a
    // workspace whose route changed server-side still lands correctly next time.
    // Also drops the cache when the starred workspace isn't in this user's list.
    const defaultId = this.defaultWorkspaceId();
    if (defaultId) this.storeDefaultRoute(defaultId);

    // Resolve the active workspace once the list is known. The current URL wins
    // (so a page refresh inside a workspace keeps that workspace selected).
    //
    // NOTE: we deliberately do NOT call syncFromUrl() here. On a hard refresh
    // this runs as soon as the list resolves (fast on the static fallback path),
    // which is often before Angular's initial navigation has settled — at that
    // point router.url is still '/', so syncFromUrl would find no match and null
    // out the selection, leaving the navbar stuck on "Select workspace". Genuine
    // in-app navigations still reconcile via the NavigationEnd → syncFromUrl call.
    const path      = this.router.url.split('?')[0].toLowerCase();
    const fromUrl   = list.find(
      ws => path === ws.route.toLowerCase() ||
            path.startsWith(ws.route.toLowerCase() + '/')
    );

    if (fromUrl) {
      this.activeWorkspace.set(fromUrl);
      return;
    }

    // Not on a workspace route. If the router has already settled somewhere real
    // (home, config, …) there is genuinely no active workspace — leave it null so
    // the navbar prompts "Select workspace". Only while the router is still at '/'
    // do we pre-fill from the default / last-active, to avoid a label flash on
    // refresh; NavigationEnd → syncFromUrl reconciles it either way.
    const routerSettled = path !== '/' && path !== '';
    if (routerSettled) {
      this.activeWorkspace.set(null);
      return;
    }

    const storedId = localStorage.getItem(STORAGE_KEY);
    this.activeWorkspace.set(
      list.find(w => w.id === defaultId) ??
      list.find(w => w.id === storedId) ??
      null
    );
  }
}
