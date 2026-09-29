# How to Add a Workspace — Developer Checklist

> **This is a do-this-only guide.** For *how/why* it works, see `WORKSPACE_ARCHITECTURE.md`.
> Worked example throughout: the **existing User Management** workspace (route segment `user-management`).
> Every file path below is real — open them in the repo to copy the pattern.

---

## 📑 Contents

| Step | Section | What you do |
|---|---|---|
| — | [The 2 naming rules](#️-the-2-naming-rules-you-must-not-break) | The must-match strings (read first) |
| 0 | [Define the spec first](#step-0--define-the-spec-first-fill-this-in-before-coding) | Capture identity, data, columns, actions, permissions |
| 1 | [Model](#step-1--model) | The row interface (`UserCase`) |
| 2 | [Data source](#step-2--data-source-load-rows-from-the-api) | Service that loads rows from the API |
| 3 | [Config](#step-3--config-columns--search--actions) | Columns, search, status, actions |
| 3b | [Advanced search](#step-3b--advanced-search-config-driven-modal) | Config-driven search modal (no search page) |
| 4 | [List component](#step-4--list-component) | Extends `BaseWorkspaceComponent` |
| 5 | [Detail components](#step-5--detail-components-the-right-side-panel) | The right-pane forms |
| 6 | [Register routes](#step-6--register-routes) | Parent + child routes |
| 6b | [Frontend registry](#step-6b--register-in-the-frontend-workspace-registry) | Master pages (new/search) + availability |
| 7 | [Register in the DB](#step-7--register-the-workspace-in-the-db-workbench-ui) | One-time SQL + Workbench UI |
| ✓ | [Final checklist](#-final-checklist) · [Verify](#verify) | Confirm + test end-to-end |

---

## ⚠️ The 2 naming rules you must not break

The system is glued together by **matching strings** (not shared constants). So two specific
values each have to be typed **identically** in every place they appear. If any copy differs —
even by case or a space — the link breaks **silently** (no compile error).

### RULE 1 — the workspace **NAME** must be identical in 2 places

```
DB       META_WORKSPACE.workspace_name   =   "User Management"
Config   getMeta().title                 =   'User Management'
```

- **Why:** the row-action system finds a workspace's actions by **matching on this name**
  (resolver's `workspaceName` vs config `title`).
- **If it differs:** the app looks up actions under the wrong name, finds none → **the row action
  menu is empty.** Page still loads, no error — it just quietly has no actions.
- **Case- & space-sensitive:** `User Management` ≠ `User management` ≠ `UserManagement`.

| Place | Good | Bad → result |
|---|---|---|
| DB `workspace_name` | `User Management` | |
| config `title` | `User Management` | `Users` → ❌ no actions load |

### RULE 2 — the route **SEGMENT** must be identical in 3 places

```
DB   META_WORKSPACE.home_identifier   =   "user-management"
Routing   feature.routing.ts  path    =   'user-management'
Config    routeSegment                =   'user-management'
```

- **Why:** clicking the workspace builds the URL as `/feature/ + home_identifier`
  (→ `/feature/user-management`). Angular needs a matching route `path:` to render it, and the
  config `routeSegment` is what detects when a detail panel is open.
- **If it differs:** the navbar navigates to `/feature/user-management`, but no route matches →
  **404 / blank page.**

| Place | Good | Bad → result |
|---|---|---|
| DB `home_identifier` | `user-management` | |
| routing `path` | `user-management` | `user-cases` → ❌ navigation 404s |

> **In short:** Rule 1 (the display name) wires the workspace to its **actions**;
> Rule 2 (the url segment) wires the navbar click to its **route**. These are the two mistakes
> that cause *"it doesn't work but there's no error."*

---

## Step 0 — Define the spec first (fill this in before coding)

Capture these inputs first; Steps 1–8 just implement this table. Values shown are the real
User Management ones.

### A. Identity
| Field | User Management | Becomes |
|---|---|---|
| Workspace Name | `User Management` | `workspaceName` (DB) + config `title` (**Rule 1**) |
| Route Segment | `user-management` | `home_identifier` (DB) + route `path` + `routeSegment` (**Rule 2**) |
| Home Selector | `app-user-cases` | DB `home_selector` |
| Description | Manage system users and access | navbar dropdown text |
| App ID / Display Order | `1` / `3` | DB `META_WORKSPACE` |
| Icon | (default) | DB-driven; default icon used unless overridden |

### B. Data source
| Field | User Management |
|---|---|
| List source | `MOCK_USERS` today → replace with an API service (Step 2) |
| Primary key field | `userId` |
| Row shape | `userId, fullName, email, department, role, stage, stageId` |

### C. Columns  (`USER_COLUMNS` in `user-management.config.ts`)
| Field | Header | Type | Align | Hide when narrow |
|---|---|---|---|---|
| userId | User ID | custom (id link) | left | no |
| fullName | Full Name | text | left | no |
| email | Email | text | left | < 55% |
| department | Department | text | left | < 50% |
| role | Role | text | left | no |
| stage | Stage | badge | left | no |

### D. Search & status
| Field | User Management |
|---|---|
| Search placeholder | `Search by User ID, Name, Email, Department...` |
| Searchable fields | `userId, fullName, email, department` |
| Status field | `stage` |
| Status → colour | From the DB (Workbench **Stage** tab colour → `META_STAGE.stage_colour`), e.g. Registered → Emerald · Submited → Slate · Mail Sent → Amber · Deactivated → Red · Activated → Blue. `STATUS_BADGES` in the config is only a fallback. |

### E. Stages & Actions (for the DB / action menu)
| Action (label) | Child route segment (Quick Route) | New form? |
|---|---|---|
| View | `case` | reuse quick-view |
| Edit User | `edit` | yes |
| Approve User | `approve` | yes |
| Assign Function | `assign-function` | yes |
| Assign Role | `assign-role` | yes |
| Assign Group | `assign-group` | yes |

### F. Permissions (who gets which actions — Workbench Grant tab)
| Role | Actions granted |
|---|---|
| User Admin | View, Edit User, Approve User, Assign Function, Assign Role, Assign Group |
| Officer | View |

> A–D drive the **frontend** (Steps 1–6). E–F drive the **DB / Workbench** (Step 7).

---

## Step 1 — Model

`src/app/feature/lc/models/user.model.ts`
```ts
export interface UserCase {
  userId: string;          // PRIMARY KEY — used in routing
  fullName: string;
  email: string;
  department: string;
  role: string;
  stage: string;           // drives the status filter tabs
  stageId: number | null;  // used to resolve per-row actions from Sentinel
  joinDate: string;
  lastLogin: string;
  branch?: string;
}
```

## Step 2 — Data source (load rows from the API)

User Management currently uses the mock array `MOCK_USERS` (`feature/lc/mock-data/users.data.ts`).
To load from a real API, add a service and call it in the component:

`src/app/feature/workspace/user-management/user.service.ts`
```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserCase } from '../../lc/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  getAll(): Observable<UserCase[]> {
    return this.http.get<UserCase[]>(`${environment.apiBaseUrl}/users`);
  }
}
```

## Step 3 — Config (columns + search + actions)

`src/app/feature/workspace/user-management/user-management.config.ts` (key parts)
```ts
const STATUS_BADGES: Record<string, string> = {
  Registered:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Submited:    'bg-slate-100 text-slate-600 border border-slate-200',
  'Mail Sent': 'bg-amber-50 text-amber-600 border border-amber-100',
  Deactivated: 'bg-red-50 text-red-600 border border-red-100',
  Activated:   'bg-blue-50 text-blue-600 border border-blue-100',
};

export const USER_COLUMNS: ColumnDefinition<UserCase>[] = [
  { field: 'userId',     header: 'User ID',    type: 'custom' },          // id link
  { field: 'fullName',   header: 'Full Name',  type: 'text' },
  { field: 'email',      header: 'Email',      type: 'text',
    hideCondition: (w, child) => child && w < 55 },
  { field: 'department', header: 'Department', type: 'text',
    hideCondition: (w, child) => child && w < 50 },
  { field: 'role',       header: 'Role',       type: 'text' },
  { field: 'stage',      header: 'Stage',      type: 'badge',
    badgeClassMap: (v: unknown) => STATUS_BADGES[String(v)] ?? 'bg-slate-50 text-slate-600' },
];

export const USER_META: WorkspaceMeta = {
  title: 'User Management',          // RULE 1
  subtitle: 'Manage system users and access',
  routeSegment: 'user-management',   // RULE 2
  panelOptions: [], panelSelected: 'All Users',
  includeAmountsAction: false, includeRecentActivityAction: false,
};

// FALLBACK ONLY (action name → segment). The real segment comes from the API's
// quickRoute — see mapUserActionDtos below. This map is used only when quickRoute is empty.
const ACTION_ROUTE_MAP: Record<string, string> = {
  'Approve User': 'approve', 'Assign Function': 'assign-function',
  'Assign Role': 'assign-role', 'Assign Group': 'assign-group',
  'Edit User': 'edit', 'View': 'case',
};

// Per-row actions resolved from Sentinel → the child segment comes from action.quickRoute
// (e.g. "/assign-function"); strip the leading slash so navigation stays relative.
export function mapUserActionDtos(dtos: ActionDto[], router: Router, route: ActivatedRoute) {
  return dtos.filter(a => a.isActive === 1).map(action => {
    const segment = action.quickRoute?.replace(/^\/+/, '').trim()   // ← from API
                 || ACTION_ROUTE_MAP[action.actionName]             // ← fallback
                 || 'case';
    return { label: action.actionName, actionName: action.actionName,
             onClick: (i: UserCase) => router.navigate([segment, i.userId], { relativeTo: route }) };
  });
}

export function buildUserConfig(o: {
  router: Router; route: ActivatedRoute;
  dynamicActions?: ActionDefinition<UserCase>[];
  resolveActionsForItem?: (i: UserCase) => Observable<ActionDefinition<UserCase>[]>;
  stageColourMap?: Record<string, string>;   // stageName → CSS class, from the API (META_STAGE.stage_colour)
}): WorkspaceConfig<UserCase> {
  const actions = o.dynamicActions?.length
    ? remapDynamicActions(o.dynamicActions, o.router, o.route)
    : buildUserActions(o.router, o.route);

  // Badge colour: API stage colour first, then the hardcoded fallback, then a default.
  const colourMap = o.stageColourMap ?? {};
  const columns = USER_COLUMNS.map(col => col.field === 'stage'
    ? { ...col, badgeClassMap: (v: unknown) =>
          colourMap[String(v)] || STATUS_BADGES[String(v)] || 'bg-slate-50 text-slate-600' }
    : col);

  return {
    title: USER_META.title, subtitle: USER_META.subtitle,
    searchPlaceholder: 'Search by User ID, Name, Email, Department...',
    searchFields: ['userId', 'fullName', 'email', 'department'],
    statusFilterField: 'stage', statusDefault: 'All',
    columns, actions,
    resolveActionsForItem: o.resolveActionsForItem,
    rowRoutePath: (i) => ['case', i.userId],
    rowActiveCondition: (i, url) =>
      url.includes(`/${USER_META.routeSegment}/`) && url.includes(`/${i.userId}`),
    childRouteActiveCondition: (url) => url.includes(`/${USER_META.routeSegment}/`),
  };
}
```

> **`STATUS_BADGES` is now a fallback.** The real badge colour comes from the API —
> `META_STAGE.stage_colour` → `StageDto.stageColour` → `resolver.getStageColourMap()`. The
> hardcoded map only applies to stages whose colour isn't set in the DB.

### Step 3b — Advanced search (config-driven modal)

The **Search** master-page button no longer navigates to a standalone search page — if the
config declares an `advancedSearch` list, the button opens a **modal built entirely from that
config** (rendered by `GenericWorkspace`). You define the fields; the modal, its inputs, and the
row filtering are all handled for you. No search component or route to build.

Add it inside the `WorkspaceConfig` you return from `buildUserConfig`:

```ts
advancedSearch: [
  { field: 'userId',     label: 'User ID',    type: 'text',   placeholder: 'e.g. USR-2025-001' },
  { field: 'fullName',   label: 'Full Name',  type: 'text',   placeholder: 'e.g. Rafiq Ahmed' },
  { field: 'email',      label: 'Email',      type: 'text',   placeholder: 'e.g. user@company.bd' },
  { field: 'department', label: 'Department', type: 'select', options: departmentOptions, optionsFromData: !departmentOptions },
  { field: 'role',       label: 'Role',       type: 'select', options: roleOptions,       optionsFromData: !roleOptions },
  { field: 'stage',      label: 'Stage',      type: 'select', options: stageOptions,      optionsFromData: stageOptions.length === 0 },
],
advancedSearchModalSize: 'lg',   // 'sm' | 'md' | 'lg' | 'xl' — default 'md'
```

**`AdvancedSearchField`** (`generic-workspace/workspace-config.model.ts`):

| Property | Purpose |
|---|---|
| `field` | property key of the row type `T` to filter on |
| `label` | display label above the input |
| `type` | `'text'` (default) or `'select'` |
| `placeholder` | text-input placeholder |
| `options` | static option list for a `'select'` field |
| `optionsFromData` | when `true`, a `'select'` field derives its options at runtime from the **distinct values in the loaded rows** (ignores `options`) |
| `match` | how the value is compared: `'equals'` (default for `select`) or `'includes'` (case-insensitive substring, default for `text`) |

> **Options: explicit vs. derived.** Pass an explicit `options` array (e.g. from meta/API) when you
> have one; otherwise set `optionsFromData: true` and the dropdown fills itself from whatever rows
> are loaded. In the User Management config, `buildUserConfig` accepts optional
> `departmentOptions` / `roleOptions` / `stageOptions` and falls back to `optionsFromData` when a
> list is omitted (the stage list additionally falls back to the API stage-colour map keys).

## Step 4 — List component

`src/app/feature/workspace/user-management/user-cases.ts`
```ts
@Component({
  selector: 'app-user-cases',
  standalone: true,
  imports: [CommonModule, GenericWorkspace],
  templateUrl: './user-cases.html',
  styleUrl: './user-cases.scss',
})
export class UserCases extends BaseWorkspaceComponent<UserCase> implements OnInit {
  private workspaceApi = inject(WorkspaceApiService);
  private userSvc  = inject(UserService);     // Step 2 service
  allCases: UserCase[] = [];

  getMeta(): WorkspaceMeta { return USER_META; }
  getItemKey(i: UserCase): string { return i.userId; }

  override ngOnInit(): void {
    super.ngOnInit();                          // MUST call first
    this.userSvc.getAll().subscribe(rows => this.allCases = rows);   // or MOCK_USERS
  }

  buildConfig(dynamicActions?: ActionDefinition<UserCase>[]): WorkspaceConfig<UserCase> {
    return buildUserConfig({
      router: this.router, route: this.route, dynamicActions,
      stageColourMap: this.resolver.getStageColourMap(USER_META.title),   // badge colours from the API
      // per-row actions resolved live from the user's assigned stage
      resolveActionsForItem: (item) => item.stageId != null
        ? this.workspaceApi.getActionsByStage(item.stageId).pipe(
            map(dtos => mapUserActionDtos(dtos, this.router, this.route)))
        : of([]),
    });
  }
}
```
`user-cases.html`
```html
<app-generic-workspace [config]="workspaceConfig" [items]="allCases"
  [customTemplates]="{ userId: userIdTemplate }">
</app-generic-workspace>
<ng-template #userIdTemplate let-item>
  <span class="font-bold text-blue-600 hover:underline">{{ item.userId }}</span>
</ng-template>
```

## Step 5 — Detail components (the right-side panel)

User Management's child components (all standalone, read the id from the route):

| Child segment | Component | File |
|---|---|---|
| `case/:userId` | `UserOutletComponent` | `feature/view/user-outlet/` |
| `edit/:userId` | `UserEditPageComponent` | `feature/pages/user-edit-page/` |
| `approve/:userId` | `UserApprovePageComponent` | `feature/pages/user-approve-page/` |
| `assign-function/:userId` | `UserFunctionPageComponent` | `feature/pages/user-function-page/` |
| `assign-role/:userId` | `UserAssignRolePageComponent` | `feature/pages/user-assign-role-page/` |
| `assign-group/:userId` | `UserGroupPageComponent` | `feature/pages/user-group-page/` |
| `role/:userId` | `UserRolePageComponent` | `feature/pages/user-role-page/` |

Each reads its id like:
```ts
this.route.params.subscribe(p => this.userId = p['userId']);
```

### Panel layout — always use the `app-panel-page` shell

**Don't hand-roll the panel scaffold.** Every detail page renders inside the right panel's scroll
container. Wrap its content in **`<app-panel-page>`**
(`src/app/shared/common-components/panel-page/panel-page.ts`) so you never repeat the
`h-full flex flex-col overflow-hidden` root + `flex-1 min-h-0 overflow-y-auto scrollbar-none`
body classes. The shell owns the **fixed-header / scrolling-body / fixed-footer** scaffold in one
place — the page scrolls for free, and scroll behaviour for *every* panel changes by editing this
one component.

```html
<app-panel-page title="Assign Function" [subtitle]="userData?.userId" (close)="onClose()">
  <!-- optional fixed bar under the header (stats / banner) -->
  <div panelSubheader class="… flex-shrink-0">…</div>

  <!-- default slot = the scrollable body -->
  …your content…

  <!-- optional fixed footer action bar; wrap in @if(...) to hide it conditionally -->
  <ng-container panelFooter>
    <button (click)="onClose()">Cancel</button>
    <button (click)="save()">Save</button>
  </ng-container>
</app-panel-page>
```

Component `imports`: `PanelPageComponent` (add `PanelFooterDirective` / `PanelSubheaderDirective`
only if you use those slots).

| Input / slot | Purpose | Default |
|---|---|---|
| `title` / `[subtitle]` | header text (renders `case-panel-header`) | — |
| `(close)` | fired by the header's close action | — |
| default slot | scrollable body content | — |
| `[bodyClass]` | padding/spacing for the body; scroll mechanics are always applied on top | `p-5 space-y-4 pb-20` |
| `[panelSubheader]` | optional fixed bar between header and body (keep `flex-shrink-0` on it) | — |
| `[panelFooter]` | optional footer bar — only renders when a `panelFooter` element is projected | — |
| `[footerClass]` | footer layout; base chrome (bg/border/padding) is always applied | `flex items-center justify-end gap-2.5` |
| `[closable]` | show the header close action | `true` |

> **Conditional footer:** wrap the `panelFooter` element in `@if (…)`. The footer bar is detected
> via a signal `contentChild`, so when the `@if` is false the whole bar disappears (see
> `user-approve-page`).
>
> All User Management detail pages already use this shell — copy any of them under
> `feature/pages/user-*-page/` as a template.

> **Where does the child segment come from?** The segment (`approve`, `assign-function`, …)
> is **driven by the API**: each action's **`quickRoute`** (from `META_ACTIONS.quick_route`,
> e.g. `"/assign-function"`) becomes the navigation target — the frontend strips the leading
> slash so it navigates relative to the workspace. **But** the route itself (`path` +
> component) is still **frontend** code — Angular routes are static in v1. So:
> - ✅ API decides *which* actions show and *which* segment each opens (`quickRoute`).
> - ❌ You must still create each detail component + register its child `path` here (Step 6).
> - 🔗 The API's `quickRoute` (minus the slash) **must equal** a child route `path` — same
>   string-match rule. `/assign-function` → `assign-function`.

## Step 6 — Register routes

`src/app/feature/feature.routing.ts`
```ts
// Full-screen master pages — BEFORE the list route
{ path: 'user-management/register-user', component: UserRegistrationComponent },
{ path: 'user-management/search-user',   component: SearchUserComponent },

// List + right-panel children
{
  path: 'user-management',                 // RULE 2: = routeSegment + DB home_identifier
  component: UserCases,
  children: [
    { path: 'case/:userId',            component: UserOutletComponent },
    { path: 'edit/:userId',            component: UserEditPageComponent },
    { path: 'approve/:userId',         component: UserApprovePageComponent },
    { path: 'assign-function/:userId', component: UserFunctionPageComponent },
    { path: 'assign-role/:userId',     component: UserAssignRolePageComponent },
    { path: 'assign-group/:userId',    component: UserGroupPageComponent },
    { path: 'role/:userId',            component: UserRolePageComponent },
  ]
}
```

## Step 6b — Register in the frontend workspace registry

`src/app/shared/services/workspace.service.ts` holds a `WORKSPACE_REGISTRY` — the frontend's
record of **which workspaces actually have an Angular route wired up**. Add an entry here whenever
you wire a new workspace into the router (Step 6). It does two jobs the API can't:

```ts
const WORKSPACE_REGISTRY: Record<string, WorkspaceRegistryEntry> = {
  'user-management': {
    icon:  ICON_USERS,
    route: '/feature/user-management',
    // The list-header "New" / "Search" buttons this workspace shows.
    masterPages: [
      { kind: 'new',    label: 'Register New User', icon: ICON_PLUS,   route: '/feature/user-management/register-user' },
      { kind: 'search', label: 'Search User',       icon: ICON_SEARCH, route: '/feature/user-management/search-user' },
    ],
  },
};
```

### Master pages (`kind: 'new' | 'search'`)

Master pages are the quick-action buttons in the workspace list header. Each has a **`kind`** that
decides which header slot it fills:

| `kind` | Slot | Typical use |
|---|---|---|
| `'new'` | left "create" button | opens the full-screen register/create master page |
| `'search'` | right "search" button | if the config also defines `advancedSearch` (Step 3b), this button opens the **modal** instead of navigating to `route` |

These are the values the API would supply via its `newPage*` / `search*` fields; the registry
provides them for the frontend-only fallback path. The full-screen master pages themselves are
registered as routes **before** the list route (Step 6, `register-user` / `search-user`).

### Workspace availability (the `available` flag)

The API can return workspaces whose Angular page **hasn't been built yet**. `Workspace.available`
marks whether a workspace's route is actually wired up:

- **Registry entry exists** → `available: true` (routes are declared here, so it's real).
- **No registry entry** → `available: false` — shown as a placeholder in the dropdown; selecting it
  can't strand the user.
- `undefined` is treated as available.

`openWorkspace` **navigates first and commits the active workspace only if navigation succeeds** —
there is no wildcard route, so navigating to an unbuilt workspace rejects and the router stays put.
This keeps the navbar label, the rendered page, and the persisted `localStorage` id consistent even
when a route doesn't exist yet.

> **Takeaway:** adding a workspace to the DB (Step 7) makes it *appear*; adding it to
> `WORKSPACE_REGISTRY` (with its route from Step 6) makes it *selectable and functional*.

## Step 7 — Register the workspace in the DB (Workbench UI)

### First-time only (per environment) — create the `META_*` tables

Run this **once** before using the Workbench. Adding a *new* workspace afterward does **not**
touch the schema — it only inserts rows (the Workbench UI below does that for you).

```sql
-- ── Tables ─────────────────────────────────────────────────────
create table META_WORKSPACE
(
  app_id              NUMBER(3) not null,
  workspace_id        NUMBER(3) not null,
  workspace_name      VARCHAR2(100) not null,
  workspace_desc      VARCHAR2(255),
  new_page_identifier VARCHAR2(255),
  new_page_selector   VARCHAR2(255),
  search_identifier   VARCHAR2(255),
  search_selector     VARCHAR2(255),
  display_order       NUMBER(3),
  is_active           NUMBER(1),
  home_identifier     VARCHAR2(255),
  home_selector       VARCHAR2(255)
);
alter table META_WORKSPACE
  add constraint PK_META_WORKSPACE primary key (WORKSPACE_ID)
  using index tablespace SENTINEL_TBS
  pctfree 10 initrans 2 maxtrans 255
  storage (initial 64K next 1M minextents 1 maxextents unlimited);

create table META_STAGE
(
  workspace_id  NUMBER(3) not null,
  stage_id      NUMBER(3) not null,
  stage_name    VARCHAR2(100) not null,
  display_order NUMBER(3),
  is_active     NUMBER(1),
  quick_route   VARCHAR2(100),
  stage_colour  VARCHAR2(100 CHAR)
);
alter table META_STAGE
  add constraint PK_META_STAGE primary key (STAGE_ID)
  using index tablespace SENTINEL_TBS
  pctfree 10 initrans 2 maxtrans 255
  storage (initial 64K next 1M minextents 1 maxextents unlimited);

create table META_ACTIONS
(
  stage_id      NUMBER(3) not null,
  action_id     NUMBER(3) not null,
  action_name   VARCHAR2(100) not null,
  action_type   VARCHAR2(254),
  display_order NUMBER(3),
  is_active     NUMBER(1),
  quick_route   VARCHAR2(100)
);
alter table META_ACTIONS
  add constraint PK_META_ACTIONS primary key (ACTION_ID)
  using index tablespace SENTINEL_TBS
  pctfree 10 initrans 2 maxtrans 255
  storage (initial 64K next 1M minextents 1 maxextents unlimited);
alter table META_ACTIONS
  add constraint FK_META_ACTIONS foreign key (STAGE_ID)
  references META_STAGE (STAGE_ID);

create table MREG_USER_GRANT_ACTIONS
(
  user_id      VARCHAR2(30 CHAR) not null,
  app_id       NUMBER(3) not null,
  workspace_id NUMBER(3) not null,
  stage_id     NUMBER(3) not null,
  action_id    NUMBER(3) not null
);
alter table MREG_USER_GRANT_ACTIONS
  add constraint FK_MREG_USER_GRANT_ACTIONS_02 foreign key (STAGE_ID)
  references META_STAGE (STAGE_ID);
alter table MREG_USER_GRANT_ACTIONS
  add constraint FK_MREG_USER_GRANT_ACTIONS_03 foreign key (ACTION_ID)
  references META_ACTIONS (ACTION_ID);

create table META_STAGE_COLOR
(
  color_id       NUMBER(3) not null,
  color_name     VARCHAR2(100) not null,
  css_class_name VARCHAR2(255) not null,
  color_allias   VARCHAR2(255)
);

-- ── Sequences ──────────────────────────────────────────────────
create sequence META_WORKSPACE_SEQ   minvalue 1 maxvalue 9999999999999999999999999999 start with 21 increment by 1 nocache;
create sequence META_STAGE_SEQ        minvalue 1 maxvalue 9999999999999999999999999999 start with 20 increment by 1 nocache;
create sequence META_ACTIONS_SEQ      minvalue 1 maxvalue 9999999999999999999999999999 start with 23 increment by 1 nocache;
create sequence META_STAGE_COLOR_SEQ  minvalue 1 maxvalue 9999999999999999999999999999 start with 1  increment by 1 nocache;

-- ── Stage-colour seed (Stage tab colour dropdown) ──────────────
insert into META_STAGE_COLOR (COLOR_ID, COLOR_NAME, CSS_CLASS_NAME, COLOR_ALLIAS)
values (1, 'Emerald', 'bg-emerald-50 text-emerald-700 border border-emerald-100', null);
insert into META_STAGE_COLOR (COLOR_ID, COLOR_NAME, CSS_CLASS_NAME, COLOR_ALLIAS)
values (2, 'Slate', 'bg-slate-100 text-slate-600 border border-slate-200', null);
insert into META_STAGE_COLOR (COLOR_ID, COLOR_NAME, CSS_CLASS_NAME, COLOR_ALLIAS)
values (3, 'Amber', 'bg-amber-50 text-amber-600 border border-amber-100', null);
insert into META_STAGE_COLOR (COLOR_ID, COLOR_NAME, CSS_CLASS_NAME, COLOR_ALLIAS)
values (4, 'Blue', 'bg-blue-50 text-blue-600 border border-blue-100', null);
insert into META_STAGE_COLOR (COLOR_ID, COLOR_NAME, CSS_CLASS_NAME, COLOR_ALLIAS)
values (5, 'Red', 'bg-red-50 text-red-600 border border-red-100', null);
commit;
```

### Register the workspace

Go to **`/workbench`** and fill in:

| Tab | What to enter for User Management |
|---|---|
| **Workspace** | Name = `User Management` (Rule 1) · **Home Identifier = `user-management`** (Rule 2) · Home Selector = `app-user-cases` · App = 1 · Display Order = 3 · Active = 1 |
| **Stage** | Add the user stages (Registered, Activated, Deactivated, …) |
| **Action** | Add actions (View, Edit User, Approve User, Assign Function/Role/Group) · set **Quick Route** = the child route segment (`case`, `edit`, `approve`, `assign-function`, …). This value is what the row action navigates to — it **must match** a child `path:` from Step 6 (a leading `/` is stripped automatically). |
| **Grant** | Assign the actions to the users/roles who should see them |


