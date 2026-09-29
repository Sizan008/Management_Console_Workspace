# Server-Side Pagination — `GenericWorkspace`

`GenericWorkspace` supports two data modes. Which one you get depends on a single
config field, `fetchPage`.

| | Client-side (default) | Server-side |
|---|---|---|
| Enabled by | nothing — this is the default | setting `WorkspaceConfig.fetchPage` |
| Data source | the `[items]` input | one `fetchPage` call per page |
| Rows the browser holds | the entire dataset | one page |
| Search / filter / status tabs | applied in memory | sent to the server with the request |
| Row totals | `items.length` | `totalCount` from the response |
| Status tab counts | counted from `items` | `statusCounts` from the response |

Client-side mode is unchanged and remains the default. Existing workspaces need no
edits. Reach for server-side mode when a workspace's dataset is too large to ship
to the browser in one response.

---

## Quick start

### 1. Write the endpoint call

Your service takes a `WorkspacePageRequest` and returns a `WorkspacePageResult<T>`.

```ts
// user-api.service.ts
@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private base = environment.myBaseUrl;

  getUserPage(req: WorkspacePageRequest): Observable<WorkspacePageResult<UserCase>> {
    return this.http.post<WorkspacePageResult<UserCase>>(`${this.base}/user/search`, {
      page:     req.page,           // 1-based
      pageSize: req.pageSize,
      search:   req.search,         // quick-search text
      fields:   req.searchFields,   // which columns it targets
      stage:    req.status,         // undefined when the "All" tab is selected
      ...req.columnFilters,
      ...req.advancedFilters,
    });
  }
}
```

Shape the payload however your endpoint expects — the request object is just the
workspace's current state. If the response envelope differs, `map` it into shape:

```ts
.pipe(map(res => ({
  rows:         res.content,
  totalCount:   res.totalElements,
  statusCounts: res.stageCounts,
})))
```

### 2. Expose it as a stable reference on the workspace component

```ts
export class UserCases extends BaseWorkspaceComponent<UserCase> {
  private userApi = inject(UserApiService);

  allCases: UserCase[] = [];   // unused in server-side mode

  /** Class field, NOT an arrow inside buildConfig() — see "Stable references" below. */
  private readonly fetchUserPage = (req: WorkspacePageRequest) =>
    this.userApi.getUserPage(req);

  buildConfig(dynamicActions?: ActionDefinition<UserCase>[]): WorkspaceConfig<UserCase> {
    return buildUserConfig({
      router:    this.router,
      route:     this.route,
      dynamicActions,
      fetchPage: this.fetchUserPage,
    });
  }
}
```

### 3. Add it to the config, and drop `[items]` from the template

```ts
// user-management.config.ts
return {
  // ...existing config
  fetchPage:        options.fetchPage,
  pageSize:         10,
  pageSizeOptions:  [10, 25, 50, 100],
  searchDebounceMs: 350,
};
```

```html
<!-- No [items]: rows arrive one page at a time. -->
<app-generic-workspace
  [config]="workspaceConfig"
  [customTemplates]="{ userId: userIdTemplate }">
</app-generic-workspace>
```

That's the whole wiring. Quick search, status tabs, column filters, advanced
search, the pager and the record counts all route through `fetchPage` from here.

---

## Contracts

### `WorkspacePageRequest` — what the workspace sends

| Field | Type | Notes |
|---|---|---|
| `page` | `number` | **1-based**, not zero-based |
| `pageSize` | `number` | current selection in the footer dropdown |
| `search` | `string` | quick-search text, trimmed; `''` when the box is empty |
| `searchFields` | `string[]` | the config's `searchFields` — which columns the search targets |
| `status` | `string \| undefined` | the active status tab; **`undefined` when "All" is selected** |
| `columnFilters` | `Record<string, string>` | enabled column filters, field → trimmed value. `{}` when none |
| `advancedFilters` | `Record<string, string>` | committed advanced-search values, field → trimmed value. `{}` when none |

### `WorkspacePageResult<T>` — what you return

| Field | Type | Required | Notes |
|---|---|---|---|
| `rows` | `T[]` | yes | the requested page, rendered verbatim |
| `totalCount` | `number` | yes | rows matching the filters **across all pages** — drives the pager |
| `statusCounts` | `Record<string, number>` | see below | rows per status key, for the tab bar |
| `statusLabels` | `Record<string, string>` | no | status key → display label |

```json
{
  "rows": [ ... ],
  "totalCount": 1284,
  "statusCounts": { "All": 1284, "3": 412, "7": 190 },
  "statusLabels": { "3": "Pending Approval", "7": "Active" }
}
```

### Status tabs need `statusCounts`

If your config sets `statusFilterField`, the response **must** include
`statusCounts` — a single page can't reveal how many rows each status has. Omit it
and only an "All" tab renders.

- Include an `All` key for the unfiltered total, or it's summed from the other entries.
- Count over the **whole** dataset, ignoring the active filters. That matches
  client-side behaviour, where the tab counts hold steady as you filter.
- `statusLabels` is the remote equivalent of `statusLabelField`: it lets you group
  by a stable id (`stageId`) while showing a readable name (`Pending Approval`).
- When the response omits `statusCounts`, the tabs keep their previous values
  rather than emptying out.

---

## Behaviour you get for free

**Debounced search.** Quick-search keystrokes are debounced (`searchDebounceMs`,
default 300ms) so one request goes out per typing pause. Every other filter fires
immediately.

**Request cancellation.** Each new request cancels the one in flight, and a
sequence guard drops any response that arrives after a newer request was issued.
Fast typing or rapid page clicks can't leave stale rows on screen.

**Loading states.** On first load, or any load with no rows to keep on screen, the
table shows a "Loading records…" row. When rows are already visible — a page change
— they stay put behind a dimmed spinner overlay instead of flashing empty. Pager
controls disable while a request is in flight.

**Error state with retry.** A failed request shows an inline message and a Retry
button that re-issues the same request, filters and page intact.

**Page clamping.** If a filter shrinks the result set so the current page no longer
exists, the workspace clamps to the last page and refetches.

**Filter reset.** Any filter change resets to page 1 before the request goes out.

### What triggers a fetch

- Page change or page-size change
- Quick search (debounced)
- Status tab selection
- Column filter toggled, edited, or removed
- Advanced search applied, a chip removed, or cleared
- "Clear All" filters
- `reload()`, or the `fetchPage` reference changing

---

## Refreshing after a create, update, or delete

Grab the workspace with `@ViewChild` and call `reload()` — back to page 1, filters
preserved. It's a no-op in client-side mode, where you re-pass `items` instead.

```ts
@ViewChild(GenericWorkspace) workspace!: GenericWorkspace;

onUserSaved(): void {
  this.workspace.reload();
}
```

---

## Config reference

| Field | Type | Default | Notes |
|---|---|---|---|
| `fetchPage` | `(req) => Observable<WorkspacePageResult<T>>` | — | **Presence of this field enables server-side mode.** |
| `pageSize` | `number` | `10` | initial rows per page |
| `pageSizeOptions` | `number[]` | `[10, 25, 50, 100]` | footer dropdown choices |
| `searchDebounceMs` | `number` | `300` | quick-search debounce; ignored client-side |

`pageSize`, `pageSizeOptions` and `searchDebounceMs` are independent of
`fetchPage` — the first two also apply in client-side mode.

### Useful public members on `GenericWorkspace`

| Member | Notes |
|---|---|
| `reload()` | refetch from page 1; no-op client-side |
| `retry()` | refetch the current page |
| `remote` | `true` when running in server-side mode |
| `rows` | rows in memory — all of them client-side, the current page otherwise |
| `totalRecords` | filtered total across all pages |
| `rowsLoading` / `loadError` | request state |

---

## Gotchas

**The server must honour every filter.** The workspace applies nothing locally in
this mode — it renders `rows` verbatim. An ignored `columnFilters` entry silently
shows unfiltered data rather than raising an error.

**Stable references.** Declare `fetchPage` as a class field or bound method, not
an arrow created inside `buildConfig()`. `BaseWorkspaceComponent` rebuilds the
config when the resolver loads dynamic actions; the workspace refetches whenever
the `fetchPage` reference changes, so a fresh closure per rebuild costs an extra
request. Config changes that leave `fetchPage` alone never refetch.

**`optionsFromData` sees one page.** Advanced-search selects with
`optionsFromData: true` derive their options from rows in memory — the current page
only. Pass explicit `options` instead, ideally from a lookup endpoint. See
`distinctValues()` in
[`user-cases.ts`](../../../feature/user-management/user-cases/user-cases.ts) for
how the mock-backed example handles it.

**`[items]` is ignored.** Leave the input off entirely rather than passing a stale
array — it won't render, and keeping it invites confusion about where rows come
from. Subclasses of `BaseWorkspaceComponent` must still declare `allCases` (it's
abstract); `[]` is fine.

**`statusDefault` is included in the first request.** If a workspace defaults to a
specific status rather than "All", that value ships with the initial fetch.

---

## Migration checklist

1. Add the endpoint method returning `Observable<WorkspacePageResult<T>>`.
2. Confirm the response includes `totalCount`, plus `statusCounts` if the config
   sets `statusFilterField`.
3. Add `fetchPage` as a stable class field on the workspace component and thread it
   into the config builder.
4. Set `pageSize` / `pageSizeOptions` / `searchDebounceMs` if the defaults don't fit.
5. Remove `[items]` from the template.
6. Replace any `optionsFromData: true` advanced-search fields with explicit option lists.
7. Call `reload()` from wherever records are created, updated, or deleted.
8. Verify the server honours `search`, `status`, `columnFilters` and
   `advancedFilters` — paging that ignores a filter looks like working code.
