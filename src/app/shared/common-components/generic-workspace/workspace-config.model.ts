import { TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';

export interface ColumnDefinition<T> {
  field: string; // The property key of T (or nested path)
  header: string; // Display header text
  type?: 'text' | 'number' | 'date' | 'badge' | 'custom';
  alignment?: 'left' | 'right' | 'center';
  
  // Custom class mapping for status badges
  badgeClassMap?: (val: any) => string | Record<string, boolean>;
  
  // Dynamic column hiding based on panel sizing (premium responsiveness)
  hideCondition?: (leftWidth: number, isChildActive: boolean) => boolean;

  /**
   * Makes the header clickable, cycling ascending -> descending -> unsorted.
   * Off by default, so each workspace opts in per column. In server-side mode
   * (`WorkspaceConfig.fetchPage`) the active sort travels on the request as
   * `WorkspacePageRequest.sort` and the server does the ordering.
   */
  sortable?: boolean;

  /**
   * Value used for ordering when `sortable` is set; defaults to the raw `field`
   * value. Supply it for 'badge'/'custom' columns whose display order differs
   * from the stored value (e.g. a stage name that should sort by stage number).
   * Client-side only — with `fetchPage` the server decides the ordering.
   */
  sortValue?: (item: T) => string | number | Date | null | undefined;
}

export interface ActionDefinition<T> {
  label: string;
  icon?: string; // HTML string / inline SVG
  actionName: string;
  onClick: (item: T) => void;
}

/**
 * A single field in the advanced-search modal. When a workspace declares
 * `advancedSearch`, the Search master-page button opens a modal built from
 * these fields instead of navigating to a standalone search route.
 */
export interface AdvancedSearchField {
  field: string;                    // property key of T to filter on
  label: string;                    // display label
  // Input control rendered for this field (default 'text'). Each maps to one of
  // the shared custom input-types components in the advanced-search modal.
  type?:
    | 'text'         // input-text-box
    | 'select'       // input-select-option-field
    | 'number'       // input-number (integer)
    | 'amount'       // input-amount (decimal)
    | 'date'         // input-date
    | 'time'         // input-time
    | 'month-year'   // month-year-picker
    | 'textarea';    // input-text-area
  placeholder?: string;             // input placeholder
  options?: string[];               // static options for 'select' type
  // When true, a 'select' field's options are derived at runtime from the
  // distinct values present in the loaded rows, ignoring `options`.
  // In server-side mode (`WorkspaceConfig.fetchPage`) only the current page is
  // in memory, so the list covers that page alone — prefer static `options` there.
  optionsFromData?: boolean;
  // How the value is matched against the item. Defaults to 'equals' for
  // 'select' fields and 'includes' (case-insensitive substring) otherwise.
  match?: 'includes' | 'equals';
  // Optional passthroughs for the specific control types.
  decimalPlaces?: number;           // 'amount' — decimal precision (default 2)
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' | 'DD MMM, YYYY'; // 'date'
}

/**
 * The full filter/paging state handed to `WorkspaceConfig.fetchPage`. Everything
 * the workspace would otherwise apply in memory is expressed here, so the server
 * can do the filtering, sorting and slicing itself.
 */
export interface WorkspacePageRequest {
  page: number;                              // 1-based page number
  pageSize: number;
  /** Quick-search text (empty string when the box is cleared). */
  search: string;
  /** The workspace's `searchFields` — which fields the quick search targets. */
  searchFields: string[];
  /** Active status tab, or undefined when "All" is selected. */
  status?: string;
  /** Enabled column filters, field → value. Empty when none are active. */
  columnFilters: Record<string, string>;
  /** Committed advanced-search values, field → value. Empty when none are active. */
  advancedFilters: Record<string, string>;
  /** Active column sort, or undefined when the list is unsorted. */
  sort?: { field: string; dir: 'asc' | 'desc' };
}

/** One page of rows plus the totals the workspace can't compute locally. */
export interface WorkspacePageResult<T> {
  rows: T[];
  /** Total rows matching the request across all pages — drives the pager. */
  totalCount: number;
  /**
   * Row count per status key, for the status tab bar. Required when the
   * workspace declares `statusFilterField`: a single page can't reveal the
   * counts, so without this only an "All" tab renders. Include an `All` key
   * for the unfiltered total, or it is summed from the other entries.
   */
  statusCounts?: Record<string, number>;
  /** Status key → display label, the remote equivalent of `statusLabelField`. */
  statusLabels?: Record<string, string>;
}

export interface WorkspaceConfig<T> {
  title: string;
  subtitle: string;

  // ── Server-side mode ───────────────────────────────────────────────────────
  /**
   * Supply this to move paging, searching and filtering to the server. The
   * workspace then ignores its `items` input and calls `fetchPage` whenever the
   * page, page size, quick search (debounced), status tab, column filters or
   * advanced-search filters change. Leave it unset for the default behaviour:
   * the parent passes the whole dataset via `items` and everything is done in
   * memory.
   *
   * The workspace keeps only the latest response — earlier in-flight requests
   * are cancelled, so out-of-order results can't overwrite the current page.
   * Call `GenericWorkspace.reload()` to refresh after a create/update/delete.
   *
   * Prefer a stable reference (a bound class method or a field assigned once)
   * over an arrow function created inside `buildConfig()`: the workspace refetches
   * whenever this reference changes, so a fresh closure on every config rebuild
   * costs an extra request.
   */
  fetchPage?: (req: WorkspacePageRequest) => Observable<WorkspacePageResult<T>>;

  /** Initial rows per page. Defaults to 10. */
  pageSize?: number;
  /** Choices in the page-size selector. Defaults to [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  /**
   * How long to wait after the last keystroke before the quick search triggers
   * a `fetchPage` call. Defaults to 300ms. Ignored in client-side mode, where
   * filtering is instant.
   */
  searchDebounceMs?: number;
  
  // Dynamic panel selector configuration
  panelSelector?: {
    label: string;
    options: string[];
    selected: string;
    onChanged: (selected: string) => void;
  };
  
  // Table search filtering targets
  searchPlaceholder?: string;
  searchFields: string[];
  
  // Filtering status field mapping
  statusFilterField?: string;
  statusDefault?: string;
  // Optional field whose value is shown as the tab label, while grouping/filtering
  // still happens on statusFilterField. Use to group by a stable id (e.g. stageId)
  // but display a human-readable name (e.g. stage). Falls back to the key itself.
  statusLabelField?: string;
  // How many status tabs render inline in the segment bar. Any beyond this move
  // into a "More" dropdown at the end of the bar, so workspaces with many stages
  // don't overflow the toolbar. "All" counts toward the total. Defaults to 5.
  statusTabLimit?: number;
  
  // Advanced-search modal fields. When present, the Search master-page button
  // opens a modal built from these fields and filters items in place, rather
  // than navigating to a standalone search route.
  advancedSearch?: AdvancedSearchField[];

  // Width of the advanced-search modal. Defaults to 'md'. Lets each workspace
  // size its modal independently of the shared GenericWorkspace defaults.
  advancedSearchModalSize?: 'sm' | 'md' | 'lg' | 'xl';

  // Column list configurations
  columns: ColumnDefinition<T>[];
  
  // Floating dropdown actions (static list)
  actions?: ActionDefinition<T>[];

  // Fetch actions dynamically per row (takes priority over static actions)
  resolveActionsForItem?: (item: T) => Observable<ActionDefinition<T>[]>;
  
  // Dynamic routing helpers
  rowRoutePath: (item: T) => any[];
  rowActiveCondition: (item: T, currentUrl: string) => boolean;
  childRouteActiveCondition: (currentUrl: string) => boolean;

  /**
   * When true, the workspace renders a persistent detail-panel header (title +
   * fullscreen toggle + close) above the detail `<router-outlet>`, so individual
   * detail pages never repeat it. Title comes from each child route's `data.title`;
   * an optional subtitle only from an explicit `data.subtitle` (record ids are not shown).
   */
  managedPanelHeader?: boolean;
}
