import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ActionDefinition, ColumnDefinition, WorkspaceConfig } from '../../../shared/common-components/generic-workspace/workspace-config.model';
import { UserCase } from '../shared/models/user.model';
import { ActionDto } from '../../../core/workspace-api/workspace-api.model';
import { WorkspaceMeta } from '../../../shared/models/workspace-meta.model';
import { resolveStageBadge, NEUTRAL_STAGE_BADGE } from '../../../shared/common-components/generic-workspace/stage-badge';

export const USER_COLUMNS: ColumnDefinition<UserCase>[] = [
  { field: 'userId',     header: 'User ID',    type: 'custom', sortable: true },
  { field: 'fullName',   header: 'Full Name',  type: 'text',   sortable: true },
  {
    field: 'email',
    header: 'Email',
    type: 'text',
    sortable: true,
    hideCondition: (leftWidth, isChildActive) => isChildActive && leftWidth < 55
  },
  {
    field: 'department',
    header: 'Department',
    type: 'text',
    sortable: true,
    hideCondition: (leftWidth, isChildActive) => isChildActive && leftWidth < 50
  },
  { field: 'role', header: 'Role', type: 'text', sortable: true },
  {
    field: 'stage',
    header: 'Stage',
    type: 'badge',
    // Real colour is injected from the API in buildUserConfig (stageColourMap).
    badgeClassMap: () => NEUTRAL_STAGE_BADGE
  }
];

export const USER_META: WorkspaceMeta = {
  title: 'User Management',
  subtitle: 'Manage system users and access',
  routeSegment: 'user-management',
  panelOptions: [],
  panelSelected: 'All Users',
  includeAmountsAction: false,
  includeRecentActivityAction: false
};

// Maps the API's actions (for a stage) to row actions. The route segment comes straight from
// the action's quickRoute (leading slash stripped so it navigates relative to the workspace).
export function mapUserActionDtos(
  dtos: ActionDto[],
  router: Router,
  route: ActivatedRoute
): ActionDefinition<UserCase>[] {
  return dtos
    .filter(a => a.isActive === 1)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(action => {
      const segment = (action.quickRoute ?? '').replace(/^\/+/, '').trim();
      return {
        label:      action.actionName,
        actionName: action.actionName,
        onClick:    (item: UserCase) => router.navigate([segment, item.userId], { relativeTo: route })
      };
    });
}

export function buildUserConfig(options: {
  router: Router;
  route: ActivatedRoute;
  dynamicActions?: ActionDefinition<UserCase>[];
  resolveActionsForItem?: (item: UserCase) => Observable<ActionDefinition<UserCase>[]>;
  stageColourMap?: Record<string, string>;   // stageName → CSS class, from the API (META_STAGE.stage_colour)
  // Advanced-search dropdown option lists (e.g. fetched from meta/API). When a
  // list is omitted, that field derives its options from the loaded rows.
  departmentOptions?: string[];
  roleOptions?: string[];
  stageOptions?: string[];
}): WorkspaceConfig<UserCase> {
  // Badge colour comes from the API; resolveStageBadge supplies a sharp, legible
  // fallback chip when the API value is missing or lacks a background colour.
  const colourMap = options.stageColourMap ?? {};

  // Prefer explicitly-supplied option lists. A list that is absent *or* still
  // empty (API request in flight, or it came back with nothing) falls back to
  // deriving that select's options from the loaded rows (optionsFromData), so a
  // slow endpoint shows row-derived values rather than an empty dropdown. The
  // stage list additionally falls back to the API-resolved colour map keys.
  const departmentOptions = options.departmentOptions ?? [];
  const roleOptions       = options.roleOptions ?? [];
  const stageOptions      = options.stageOptions ?? Object.keys(colourMap);
  const columns: ColumnDefinition<UserCase>[] = USER_COLUMNS.map(col =>
    col.field === 'stage'
      ? { ...col, badgeClassMap: (val: unknown) => resolveStageBadge(val, colourMap[String(val)]) }
      : col
  );

  return {
    title:               USER_META.title,
    subtitle:            USER_META.subtitle,
    searchPlaceholder:   'Search by User ID, Name, Email, Department...',
    searchFields:        ['userId', 'fullName', 'email', 'department'],
    advancedSearch: [
      { field: 'userId',     label: 'User ID',    type: 'text',   placeholder: 'e.g. USR-2025-001' },
      { field: 'fullName',   label: 'Full Name',  type: 'text',   placeholder: 'e.g. Rafiq Ahmed' },
      { field: 'email',      label: 'Email',      type: 'text',   placeholder: 'e.g. user@company.bd' },
      { field: 'department', label: 'Department', type: 'select', options: departmentOptions, optionsFromData: departmentOptions.length === 0 },
      { field: 'role',       label: 'Role',       type: 'select', options: roleOptions,       optionsFromData: roleOptions.length === 0 },
      { field: 'stage',      label: 'Stage',      type: 'select', options: stageOptions,      optionsFromData: stageOptions.length === 0 }
    ],
    // Advanced-search modal width: 'sm' | 'md' | 'lg' | 'xl' (default 'md').
    advancedSearchModalSize: 'lg',
    statusFilterField:   'stage',
    statusDefault:       'All',
    columns,
    actions:             options.dynamicActions ?? [],
    resolveActionsForItem: options.resolveActionsForItem,
    rowRoutePath:        (item) => ['case', item.userId],
    rowActiveCondition:  (item, url) =>
      url.includes(`/${USER_META.routeSegment}/`) && url.includes(`/${item.userId}`),
    childRouteActiveCondition: (url) =>
      url.includes(`/${USER_META.routeSegment}/`),
    // Workspace owns the detail-panel header; detail pages supply body + footer only.
    managedPanelHeader: true
  };
}
