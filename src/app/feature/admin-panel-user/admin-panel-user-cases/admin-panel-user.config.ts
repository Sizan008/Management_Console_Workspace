import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ActionDefinition, ColumnDefinition, WorkspaceConfig } from '../../../shared/common-components/generic-workspace/workspace-config.model';
import { AdminPanelUserCase } from './admin-panel-user.model';
import { ActionDto } from '../../../core/workspace-api/workspace-api.model';
import { WorkspaceMeta } from '../../../shared/models/workspace-meta.model';
import { resolveStageBadge, NEUTRAL_STAGE_BADGE } from '../../../shared/common-components/generic-workspace/stage-badge';

export const ADMIN_PANEL_COLUMNS: ColumnDefinition<AdminPanelUserCase>[] = [
  { field: 'userId',     header: 'User ID',    type: 'custom', sortable: true },
  { field: 'fullName',   header: 'Full Name',  type: 'text',   sortable: true },
  {
    field: 'emailAddress',
    header: 'Email',
    type: 'text',
    sortable: true,
    hideCondition: (leftWidth, isChildActive) => isChildActive && leftWidth < 55,
  },
  {
    field: 'mobileNumber',
    header: 'Mobile',
    type: 'text',
    sortable: true,
    hideCondition: (leftWidth, isChildActive) => isChildActive && leftWidth < 45,
  },
  {
    field: 'branch',
    header: 'Branch',
    type: 'text',
    sortable: true,
    hideCondition: (leftWidth, isChildActive) => isChildActive && leftWidth < 40,
  },
  { field: 'role',   header: 'Role',  type: 'text',   sortable: true },
  {
    field: 'stage',
    header: 'Stage',
    type: 'badge',
    badgeClassMap: () => NEUTRAL_STAGE_BADGE,
  },
];

export const ADMIN_PANEL_META: WorkspaceMeta = {
  title: 'Admin Panel User',
  subtitle: 'Manage users credentials',
  routeSegment: 'admin-panel-user',
  panelOptions: [],
  panelSelected: 'All Users',
  includeAmountsAction: false,
  includeRecentActivityAction: false,
};

export function mapAdminPanelActionDtos(
  dtos: ActionDto[],
  router: Router,
  route: ActivatedRoute
): ActionDefinition<AdminPanelUserCase>[] {
  return dtos
    .filter(a => a.isActive === 1)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(action => {
      const segment = (action.quickRoute ?? '').replace(/^\/+/, '').trim();
      return {
        label:      action.actionName,
        actionName: action.actionName,
        onClick:    (item: AdminPanelUserCase) =>
          router.navigate([segment, item.userId], { relativeTo: route }),
      } satisfies ActionDefinition<AdminPanelUserCase>;
    });
}

export function buildAdminPanelConfig(options: {
  router: Router;
  route: ActivatedRoute;
  dynamicActions?: ActionDefinition<AdminPanelUserCase>[];
  resolveActionsForItem?: (item: AdminPanelUserCase) => Observable<ActionDefinition<AdminPanelUserCase>[]>;
  stageColourMap?: Record<string, string>;
  roleOptions?: string[];
  stageOptions?: string[];
}): WorkspaceConfig<AdminPanelUserCase> {
  const stageColour: Record<string, string> = options.stageColourMap ?? {};

  const roleOptions       = options.roleOptions ?? [];
  const stageOptions      = options.stageOptions ?? Object.keys(stageColour);

  const columns: ColumnDefinition<AdminPanelUserCase>[] = ADMIN_PANEL_COLUMNS.map(col =>
    col.field === 'stage'
      ? { ...col, badgeClassMap: (val: unknown) => resolveStageBadge(val, stageColour[String(val)]) }
      : col,
  );

  return {
    title:               ADMIN_PANEL_META.title,
    subtitle:            ADMIN_PANEL_META.subtitle,
    searchPlaceholder:   'Search by User ID, Name, Email, Mobile, Branch...',
    searchFields:        ['userId', 'fullName', 'emailAddress', 'mobileNumber', 'branch'],
    advancedSearch: [
      { field: 'userId',        label: 'User ID',    type: 'text',   placeholder: 'e.g. APU-2026-001' },
      { field: 'fullName',      label: 'Full Name',  type: 'text',   placeholder: 'e.g. Sara Khan' },
      { field: 'emailAddress',  label: 'Email',      type: 'text',   placeholder: 'e.g. user@company.bd' },
      { field: 'mobileNumber',  label: 'Mobile',     type: 'text',   placeholder: 'e.g. 017XXXXXXXX' },
      { field: 'branch',        label: 'Branch',     type: 'text',   placeholder: 'e.g. Ashulia Branch' },
      { field: 'role',       label: 'Role',       type: 'select', options: roleOptions,       optionsFromData: roleOptions.length === 0 },
      { field: 'stage',      label: 'Stage',      type: 'select', options: stageOptions,      optionsFromData: stageOptions.length === 0 },
    ],
    advancedSearchModalSize: 'lg',
    statusFilterField:   'stage',
    statusDefault:       'All',
    statusLabelField:    'stage',
    statusTabLimit:      6,
    columns,
    actions: options.dynamicActions ?? [],
    resolveActionsForItem: options.resolveActionsForItem,
    rowRoutePath: (item) => ['case', item.userId],
    rowActiveCondition: (item, url) =>
      url.includes(`/${ADMIN_PANEL_META.routeSegment}/`) && url.includes(`/${item.userId}`),
    childRouteActiveCondition: (url) =>
      url.includes(`/${ADMIN_PANEL_META.routeSegment}/`),
    managedPanelHeader: true,
  };
}
