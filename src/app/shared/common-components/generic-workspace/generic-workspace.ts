import { Component, OnInit, OnChanges, OnDestroy, SimpleChanges, Input, inject, HostListener, TemplateRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, FormGroup } from '@angular/forms';
import { Router, RouterOutlet, RouterLink, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subject, Subscription, timer } from 'rxjs';
import { debounce, filter } from 'rxjs/operators';
import {
  WorkspaceConfig, ActionDefinition, AdvancedSearchField, ColumnDefinition,
  WorkspacePageRequest, WorkspacePageResult,
} from './workspace-config.model';
import { WorkspaceStateService } from './workspace-state.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { WorkspaceService, WorkspaceMasterPage } from '../../services/workspace.service';
import { CasePanelHeaderComponent } from '../case-quick-view/case-panel-header/case-panel-header.component';
import { InputTextBox } from '../input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../input-types/input-select-option-field/input-select-option-field';
import { InputNumber } from '../input-types/input-number/input-number';
import { InputAmount } from '../input-types/input-amount/input-amount';
import { InputDate } from '../input-types/input-date/input-date';
import { InputTime } from '../input-types/input-time/input-time';
import { MonthYearPickerComponent } from '../input-types/month-year-picker/month-year-picker';
import { InputTextArea } from '../input-types/input-text-area/input-text-area';

@Component({
  selector: 'app-generic-workspace',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterOutlet, CasePanelHeaderComponent,
    InputTextBox, InputSelectOptionField, InputNumber, InputAmount,
    InputDate, InputTime, MonthYearPickerComponent, InputTextArea,
  ],
  templateUrl: './generic-workspace.html',
  styleUrl: './generic-workspace.scss'
})
export class GenericWorkspace implements OnInit, OnChanges, OnDestroy {
  router = inject(Router);
  route = inject(ActivatedRoute);
  workspaceState = inject(WorkspaceStateService);
  private readonly userPrefs = inject(UserPreferencesService);
  private readonly workspaceService = inject(WorkspaceService);

  @Input() config: WorkspaceConfig<any> | null = null;
  @Input() items: any[] = [];
  @Input() customTemplates: Record<string, TemplateRef<any>> = {};

  /** Detail panel's scroll container. It outlives route changes, so its scroll must be reset. */
  @ViewChild('panelScroll') panelScroll?: ElementRef<HTMLElement>;

  // Resizable split-pane widths
  leftWidth = 50;  // Percentage
  rightWidth = 50; // Percentage
  isResizing = false;
  isSmallScreen = false;

  // Search query
  searchQuery = '';

  // Active status tab filter
  activeStatusFilter = 'All';
  statusCounts: Record<string, number> = { All: 0 };
  // Maps a status key (from statusFilterField, e.g. stageId) to its display label
  // (from statusLabelField, e.g. stage name). Empty when no statusLabelField is set.
  statusLabels: Record<string, string> = {};
  // Render order for the status tabs — "All" first, then the rest by label.
  statusTabs: { key: string; value: number }[] = [];
  // Open state of the collapsed status dropdown (used past statusTabLimit).
  statusMenuOpen = false;

  filteredItems: any[] = [];

  // ── Column sort ────────────────────────────────────────────────────────────
  /** Field of the column currently sorted on, or null when unsorted. */
  sortField: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  activeActionMenuId: string | null = null;
  activeItem: any = null;   // the row whose action popup is open (popup lives at component root)
  activeActionMenuPos: { top: number; left: number; upward: boolean } | null = null;
  activeItemActions: ActionDefinition<any>[] = [];
  actionsLoading = false;
  private actionSub?: Subscription;
  private menuButtonRect: DOMRect | null = null;

  // Pagination
  currentPage = 1;
  pageSize    = 10;

  // ── Server-side mode state (only used when config.fetchPage is set) ─────────
  /** Rows returned for the current page. */
  remoteRows: any[] = [];
  /** Total matching rows reported by the server — drives the pager. */
  totalCount = 0;
  /** True while a page request is in flight. */
  rowsLoading = false;
  /** Set when the last page request failed, so the table can offer a retry. */
  loadError: string | null = null;
  /** Guards against a stale response overwriting a newer one. */
  private requestSeq = 0;
  private fetchSub?: Subscription;
  private searchSub?: Subscription;
  /** Quick-search keystrokes, debounced before they hit the server. */
  private readonly searchInput$ = new Subject<void>();
  /** ngOnChanges runs before ngOnInit — suppresses a duplicate first fetch. */
  private initialized = false;
  /** The fetchPage reference the current rows came from; a change means refetch. */
  private lastFetchRef?: WorkspaceConfig<any>['fetchPage'];

  // Column-specific filters
  isFilterPopupOpen = false;
  activeFilters: Record<string, { enabled: boolean; value: string }> = {};

  // Advanced-search modal state
  advancedSearchOpen = false;
  // Committed advanced-search filter values (field → value), applied to items.
  advancedFilters: Record<string, string> = {};
  // Reactive form backing the modal inputs (custom input controls bind to it),
  // committed to advancedFilters on Search. One control per advancedSearch field.
  advancedForm: FormGroup = new FormGroup({});

  // Persistent detail-panel header (rendered only when config.managedPanelHeader is set)
  panelTitle = '';
  panelSubtitle?: string;

  ngOnInit(): void {
    console.log(this.items)
    this.updateScreenSize();

    if (this.config?.statusFilterField) {
      this.activeStatusFilter = this.config.statusDefault || 'All';
    }
    this.pageSize = this.config?.pageSize ?? this.pageSize;
    this.initializeActiveFilters();
    this.rebuildAdvancedSelectOptions();

    // Debounced quick search — one request per typing pause instead of per keystroke.
    this.searchSub = this.searchInput$
      .pipe(debounce(() => timer(this.config?.searchDebounceMs ?? 300)))
      .subscribe(() => this.applyFilters());

    this.initialized = true;
    this.refreshCountsAndFilters();
    this.updatePanelHeader();

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (!this.isChildRouteActive() && this.workspaceState.isFullscreen()) {
        this.workspaceState.isFullscreen.set(false);
      }
      this.updatePanelHeader();
      this.resetPanelScroll();
    });
  }

  /** Reads the active detail route's `data.title` (and optional `data.subtitle`) for the managed panel header. */
  private updatePanelHeader(): void {
    const snap = this.route.firstChild?.snapshot;
    this.panelTitle = snap?.data?.['title'] ?? '';
    // The record id is deliberately not surfaced — only an explicit route subtitle shows.
    this.panelSubtitle = snap?.data?.['subtitle'];
  }

  /** Closes the detail panel by deactivating the active child route. */
  closePanel(): void {
    const child = this.route.firstChild;
    if (child) this.router.navigate(['../../'], { relativeTo: child });
  }

  // ── Workspace master pages (New / Search) ────────────────────────────────────
  // Rendered as header buttons from the active workspace's config, so any
  // workspace that declares a New/Search page gets them automatically.

  /** Open/collapsed state of the "New" split-button dropdown (multi create-page workspaces). */
  newMenuOpen = false;

  /** All "New" master pages for the active workspace — several render as a split dropdown. */
  get newMasterPages(): WorkspaceMasterPage[] {
    return this.workspaceService.activeWorkspace()?.masterPages.filter(p => p.kind === 'new') ?? [];
  }

  /** The primary "New" master page (first one), shown as the main header button. */
  get newMasterPage(): WorkspaceMasterPage | null {
    return this.newMasterPages[0] ?? null;
  }

  /** Toggles the "New" dropdown; stops propagation so the document-click handler doesn't immediately close it. */
  toggleNewMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.newMenuOpen = !this.newMenuOpen;
  }

  /** The "Search" master page (advanced search), shown in the header controls row. */
  get searchMasterPage(): WorkspaceMasterPage | null {
    return this.workspaceService.activeWorkspace()?.masterPages.find(p => p.kind === 'search') ?? null;
  }

  /** Navigates to a master page (Register / Search) — its own standalone full page. */
  openMasterPage(page: WorkspaceMasterPage): void {
    this.newMenuOpen = false;
    this.router.navigateByUrl(page.route);
  }

  // ── Advanced search modal ────────────────────────────────────────────────────
  // When the workspace config declares `advancedSearch` fields, the Search
  // master-page button opens an in-place filter modal instead of navigating.

  /** True when the workspace opts into the modal-based advanced search. */
  get hasAdvancedSearch(): boolean {
    return (this.config?.advancedSearch?.length ?? 0) > 0;
  }

  /** Tailwind max-width class for the advanced-search modal (config-driven, defaults to 'md'). */
  get advancedSearchModalWidthClass(): string {
    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
    } as const;
    return sizes[this.config?.advancedSearchModalSize ?? 'md'];
  }

  /** True when any committed advanced-search filter is currently narrowing the list. */
  get advancedFilterActive(): boolean {
    return Object.values(this.advancedFilters).some(v => v != null && String(v).trim() !== '');
  }

  /**
   * Search master-page button handler: opens the modal when the workspace
   * declares advanced-search fields, otherwise falls back to navigating to the
   * standalone search page.
   */
  onSearchMasterPage(page: WorkspaceMasterPage): void {
    if (this.hasAdvancedSearch) {
      this.openAdvancedSearch();
    } else {
      this.openMasterPage(page);
    }
  }

  /**
   * (Re)builds the reactive form backing the advanced-search modal — one control
   * per configured field, seeded from the given values (committed filters by default).
   */
  private buildAdvancedForm(seed: Record<string, string> = {}): void {
    const controls: Record<string, FormControl> = {};
    (this.config?.advancedSearch ?? []).forEach(f => {
      controls[f.field] = new FormControl(seed[f.field] ?? '');
    });
    this.advancedForm = new FormGroup(controls);
  }

  /** Opens the advanced-search modal, seeding the form from committed filters. */
  openAdvancedSearch(): void {
    this.buildAdvancedForm(this.advancedFilters);
    // Refresh here too: option lists fetched from an API may have landed after
    // the last config/items change.
    this.rebuildAdvancedSelectOptions();
    this.advancedSearchOpen = true;
  }

  /** Closes the modal without committing draft changes. */
  closeAdvancedSearch(): void {
    this.advancedSearchOpen = false;
  }

  /** Commits the form values as active filters, closes the modal, and re-filters. */
  applyAdvancedSearch(): void {
    const committed: Record<string, string> = {};
    const raw = this.advancedForm.value as Record<string, any>;
    Object.keys(raw).forEach(field => {
      const value = raw[field];
      if (value != null && String(value).trim() !== '') committed[field] = String(value);
    });
    this.advancedFilters = committed;
    this.advancedSearchOpen = false;
    this.applyFilters();
  }

  /** Clears just the form values inside the open modal (does not affect results). */
  resetAdvancedDraft(): void {
    Object.keys(this.advancedForm.controls).forEach(field =>
      this.advancedForm.get(field)?.setValue('')
    );
  }

  /** Clears all committed advanced-search filters and re-filters the list. */
  clearAdvancedSearch(): void {
    this.advancedFilters = {};
    this.resetAdvancedDraft();
    this.applyFilters();
  }

  /** Active advanced-search filters as a list, for rendering chips. */
  get activeAdvancedFilters(): { field: string; label: string; value: string }[] {
    if (!this.config?.advancedSearch) return [];
    return this.config.advancedSearch
      .filter(f => {
        const v = this.advancedFilters[f.field];
        return v != null && String(v).trim() !== '';
      })
      .map(f => ({ field: f.field, label: f.label, value: this.advancedFilters[f.field] }));
  }

  /** Removes a single committed advanced-search filter and re-filters. */
  removeAdvancedFilter(field: string): void {
    delete this.advancedFilters[field];
    this.advancedForm.get(field)?.setValue('');
    this.applyFilters();
  }

  /**
   * Options for an advanced-search select field: derived from the loaded rows
   * when `optionsFromData` is set, otherwise the static `options` list.
   */
  advancedFieldOptions(f: AdvancedSearchField): string[] {
    return f.optionsFromData ? this.getUniqueValues(f.field) : (f.options ?? []);
  }

  /**
   * Select options in the `{ key, value }` shape expected by
   * `input-select-option-field`. Key and value are the same raw string so the
   * committed filter value matches the item field it is compared against.
   */
  advancedFieldSelectOptions(f: AdvancedSearchField): { key: any; value: string }[] {
    return this.advancedFieldOptions(f).map(o => ({ key: o, value: o }));
  }

  /**
   * Prebuilt select options per advanced-search field, read directly by the modal
   * template.
   *
   * This map exists so the template never calls a method in the `[options]`
   * binding. `input-select-option-field` takes signal inputs and runs an effect on
   * every options change that writes its own signals; a binding returning a fresh
   * array each change-detection cycle would retrigger that effect indefinitely and
   * the dropdown would never settle on a stable list. Rebuilt only when the inputs
   * that feed it actually change — see rebuildAdvancedSelectOptions().
   */
  advancedSelectOptions: Record<string, { key: any; value: string }[]> = {};

  /**
   * Recomputes `advancedSelectOptions`. Called when the config or the loaded rows
   * change and whenever the modal opens, so API-supplied option lists that arrive
   * after first render are picked up.
   */
  private rebuildAdvancedSelectOptions(): void {
    const options: Record<string, { key: any; value: string }[]> = {};
    (this.config?.advancedSearch ?? [])
      .filter(f => f.type === 'select')
      .forEach(f => { options[f.field] = this.advancedFieldSelectOptions(f); });
    this.advancedSelectOptions = options;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateScreenSize();
  }

  private updateScreenSize(): void {
    this.isSmallScreen = window.innerWidth < 1024;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['items'] && !changes['config']) return;

    this.initializeActiveFilters();
    // Both inputs can change a select's options: `config` carries the static
    // lists, `items` feeds any field using optionsFromData.
    this.rebuildAdvancedSelectOptions();

    // Server-side mode ignores `items`; only a new fetchPage reference means the
    // data source itself changed. Column/action-only config rebuilds (the
    // resolver swapping in dynamic actions, for one) must not refetch.
    if (this.remote) {
      if (this.config!.fetchPage !== this.lastFetchRef) this.reload();
      return;
    }

    this.refreshCountsAndFilters();
  }

  // ── Server-side paging ───────────────────────────────────────────────────────

  /** True when the workspace is configured to page/filter on the server. */
  get remote(): boolean {
    return !!this.config?.fetchPage;
  }

  /** The rows currently in memory — one page in server-side mode, all of them otherwise. */
  get rows(): any[] {
    return this.remote ? this.remoteRows : (this.items ?? []);
  }

  /**
   * Reloads the first page from the server. Public so a parent can refresh the
   * list after creating, updating or deleting a record. No-op in client-side
   * mode, where the parent owns the data and re-passes `items` instead.
   */
  reload(): void {
    if (!this.remote) return;
    this.currentPage = 1;
    this.requestPage();
  }

  /** Re-runs the last failed request, keeping the current page and filters. */
  retry(): void {
    this.requestPage();
  }

  /** The current filter/paging state, as sent to `config.fetchPage`. */
  private buildPageRequest(): WorkspacePageRequest {
    const columnFilters: Record<string, string> = {};
    Object.keys(this.activeFilters).forEach(field => {
      const f = this.activeFilters[field];
      if (f.enabled && f.value.trim() !== '') columnFilters[field] = f.value.trim();
    });

    const advancedFilters: Record<string, string> = {};
    Object.keys(this.advancedFilters).forEach(field => {
      const v = this.advancedFilters[field];
      if (v != null && String(v).trim() !== '') advancedFilters[field] = String(v).trim();
    });

    return {
      page:            this.currentPage,
      pageSize:        this.pageSize,
      search:          this.searchQuery.trim(),
      searchFields:    this.config?.searchFields ?? [],
      status:          this.activeStatusFilter !== 'All' ? this.activeStatusFilter : undefined,
      columnFilters,
      advancedFilters,
      sort: this.sortField ? { field: this.sortField, dir: this.sortDir } : undefined,
    };
  }

  /**
   * Fetches the current page. The previous request is cancelled and a sequence
   * check drops any response that arrives after a newer one was issued, so fast
   * typing or page clicking can't leave the table showing stale rows.
   */
  private requestPage(): void {
    const fetchPage = this.config?.fetchPage;
    if (!fetchPage || !this.initialized) return;

    const seq = ++this.requestSeq;
    this.lastFetchRef = fetchPage;
    this.rowsLoading  = true;
    this.loadError    = null;
    this.fetchSub?.unsubscribe();

    this.fetchSub = fetchPage(this.buildPageRequest()).subscribe({
      next: res => {
        if (seq !== this.requestSeq) return;
        this.remoteRows   = res?.rows ?? [];
        this.totalCount   = res?.totalCount ?? this.remoteRows.length;
        this.filteredItems = this.remoteRows;   // server already applied the filters
        this.rowsLoading  = false;
        this.applyRemoteStatusCounts(res);
        // A shrinking result set can leave the pager past the last page.
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
          this.requestPage();
        }
      },
      error: () => {
        if (seq !== this.requestSeq) return;
        this.remoteRows    = [];
        this.filteredItems = [];
        this.totalCount    = 0;
        this.rowsLoading   = false;
        this.loadError     = 'Could not load records. Please try again.';
      },
    });
  }

  /**
   * Status tab counts in server-side mode come from the response — a single page
   * can't reveal them. When the server omits them the tabs keep their previous
   * values, falling back to an "All" tab on the very first response.
   */
  private applyRemoteStatusCounts(res: WorkspacePageResult<any> | null): void {
    if (res?.statusCounts) {
      const counts = { ...res.statusCounts };
      if (counts['All'] === undefined) {
        counts['All'] = Object.values(res.statusCounts).reduce((sum, n) => sum + n, 0);
      }
      this.statusCounts = counts;
      if (res.statusLabels) this.statusLabels = { ...res.statusLabels };
      this.buildStatusTabs();
    } else if (!this.statusTabs.length) {
      this.statusCounts = { All: this.totalCount };
      this.buildStatusTabs();
    }
  }

  initializeActiveFilters(): void {
    if (!this.config?.columns) return;
    this.config.columns.forEach(col => {
      if (!this.activeFilters[col.field]) {
        this.activeFilters[col.field] = { enabled: false, value: '' };
      }
    });
  }

  onPanelChanged(value: string): void {
    if (this.config?.panelSelector?.onChanged) {
      this.config.panelSelector.onChanged(value);
    }
  }

  setStatusFilter(status: string): void {
    this.activeStatusFilter = status;
    this.statusMenuOpen = false;
    this.applyFilters();
  }

  /** How many statuses stay inline before the rest move into the "More" dropdown. */
  private get statusTabLimit(): number {
    return this.config?.statusTabLimit ?? 5;
  }

  /**
   * With the detail panel open the left column is too narrow for a tab strip, so
   * every status moves into the dropdown and only the ellipsis button stays.
   */
  get statusTabsCollapsed(): boolean {
    return this.isChildRouteActive();
  }

  /** The statuses rendered as inline tabs — "All" first, capped at statusTabLimit. */
  get visibleStatusTabs(): { key: string; value: number }[] {
    return this.statusTabsCollapsed ? [] : this.statusTabs.slice(0, this.statusTabLimit);
  }

  /**
   * Everything past the limit. Rendered in a dropdown beside the segment bar so
   * a workspace with 10-20 stages keeps its toolbar on one line.
   */
  get overflowStatusTabs(): { key: string; value: number }[] {
    return this.statusTabsCollapsed ? this.statusTabs : this.statusTabs.slice(this.statusTabLimit);
  }

  /** True when the selected status sits in the overflow — the "More" button then shows it. */
  get isOverflowStatusActive(): boolean {
    return !this.statusTabsCollapsed &&
      this.overflowStatusTabs.some(tab => tab.key === this.activeStatusFilter);
  }

  /**
   * Highlights the ellipsis button. Collapsed it stands in for the whole strip, so
   * it only lights up once the filter moves off the default status.
   */
  get isStatusMenuActive(): boolean {
    return this.statusTabsCollapsed
      ? this.activeStatusFilter !== (this.config?.statusDefault || 'All')
      : this.isOverflowStatusActive;
  }

  /**
   * Classes for the ellipsis button. Inside the segment bar it sits on the strip's
   * own inset background; standing alone it needs the toolbar's button chrome —
   * white fill, border and shadow — or it reads as a stray icon.
   */
  get statusMenuButtonClass(): string {
    if (this.isStatusMenuActive) {
      return this.statusTabsCollapsed ? 'status-filter-active shadow-sm' : 'status-filter-active';
    }
    return this.statusTabsCollapsed
      ? 'bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60';
  }

  /** Stops propagation so the document-click handler doesn't immediately close it. */
  toggleStatusMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.statusMenuOpen = !this.statusMenuOpen;
  }

  refreshCountsAndFilters(): void {
    // In server-side mode both counts and rows come from the same response.
    if (this.remote) {
      this.applyFilters();
      return;
    }
    this.calculateStatusCounts();
    this.applyFilters();
  }

  calculateStatusCounts(): void {
    if (!this.config?.statusFilterField || !this.items) {
      this.statusCounts = { All: this.items ? this.items.length : 0 };
      this.buildStatusTabs();
      return;
    }

    const field = this.config.statusFilterField;
    const labelField = this.config.statusLabelField;
    const counts: Record<string, number> = { All: this.items.length };
    const labels: Record<string, string> = {};

    this.items.forEach(item => {
      const val = item[field];
      if (val !== undefined && val !== null) {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
        if (labelField && labels[key] === undefined) {
          const label = item[labelField];
          if (label !== undefined && label !== null) labels[key] = String(label);
        }
      }
    });

    this.statusCounts = counts;
    this.statusLabels = labels;
    this.buildStatusTabs();
  }

  /**
   * Tab order for the status segment bar: "All" is pinned first, every other
   * status follows sorted by its display label. Built once per count refresh
   * (rather than in a template getter) so *ngFor keeps its DOM between checks.
   */
  private buildStatusTabs(): void {
    const rest = Object.keys(this.statusCounts)
      .filter(key => key !== 'All')
      .sort((a, b) => this.statusLabel(a).localeCompare(this.statusLabel(b)));

    this.statusTabs = ['All', ...rest]
      .filter(key => this.statusCounts[key] !== undefined)
      .map(key => ({ key, value: this.statusCounts[key] }));
  }

  trackStatusTab(_: number, tab: { key: string }): string {
    return tab.key;
  }

  /** Display label for a status tab key (name when statusLabelField is set, else the key). */
  statusLabel(key: string): string {
    return this.statusLabels[key] ?? key;
  }

  // ── Pagination helpers ─────────────────────────────────────────────────────

  /** Rows on screen — the server's page as-is, or a local slice. */
  get pagedItems(): any[] {
    if (this.remote) return this.remoteRows;
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  /** Rows matching the active filters across all pages — the pager's denominator. */
  get totalRecords(): number {
    return this.remote ? this.totalCount : this.filteredItems.length;
  }

  /** Unfiltered workspace size, shown as the badge beside the title. */
  get headerCount(): number {
    return this.remote ? (this.statusCounts['All'] ?? this.totalCount) : (this.items?.length ?? 0);
  }

  /** Page-size choices for the footer selector. */
  get pageSizeOptions(): number[] {
    return this.config?.pageSizeOptions ?? [10, 25, 50, 100];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get startRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    if (this.remote) this.requestPage();
  }

  onPageSizeChange(size: number): void {
    if (size === this.pageSize) return;
    this.pageSize    = size;
    this.currentPage = 1;
    if (this.remote) this.requestPage();
  }

  getPageNumbers(): (number | string)[] {
    const total   = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    if (current <= 4)        return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  // ── Column sort ────────────────────────────────────────────────────────────

  /**
   * Header click for a `sortable` column: cycles ascending -> descending ->
   * unsorted. Goes through applyFilters() so both modes are covered — it resets
   * to page 1 and either re-sorts in memory or re-requests with the new sort.
   */
  toggleSort(col: ColumnDefinition<any>): void {
    if (!col.sortable) return;

    if (this.sortField !== col.field) {
      this.sortField = col.field;
      this.sortDir   = 'asc';
    } else if (this.sortDir === 'asc') {
      this.sortDir = 'desc';
    } else {
      this.sortField = null;   // third click clears the sort
    }

    this.applyFilters();
  }

  /** Orders the filtered rows by the active sort. No-op when nothing is sorted. */
  private applySort(rows: any[]): any[] {
    const col = this.config?.columns.find(c => c.field === this.sortField);
    if (!col) return rows;   // covers "unsorted" and a sort on a column that's gone

    const dir     = this.sortDir === 'desc' ? -1 : 1;
    const valueOf = (item: any) => (col.sortValue ? col.sortValue(item) : item[col.field]);

    return [...rows].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);

      // Blanks sink to the bottom in both directions, so a click never fills the
      // first page with empty cells.
      const aEmpty = av === null || av === undefined || av === '';
      const bEmpty = bv === null || bv === undefined || bv === '';
      if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : (aEmpty ? 1 : -1);

      if (col.type === 'number') return (Number(av) - Number(bv)) * dir;
      if (col.type === 'date')   return (this.toTime(av) - this.toTime(bv)) * dir;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;

      // numeric: true keeps ids like LC-2 before LC-10.
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  /** Millis for a date cell; unparseable values fall to the end of the order. */
  private toTime(val: any): number {
    const t = val instanceof Date ? val.getTime() : Date.parse(String(val));
    return isNaN(t) ? Number.POSITIVE_INFINITY : t;
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  /**
   * Quick-search keystroke handler. Client-side filtering is instant; server-side
   * mode debounces so one request goes out per typing pause.
   */
  onSearchChange(): void {
    if (this.remote) this.searchInput$.next();
    else this.applyFilters();
  }

  applyFilters(): void {
    this.currentPage = 1;   // reset to first page on every filter change

    // Server-side mode: the filters travel with the request instead.
    if (this.remote) {
      this.requestPage();
      return;
    }

    if (!this.items) {
      this.filteredItems = [];
      return;
    }

    let result = [...this.items];

    // Status filter
    if (this.config?.statusFilterField && this.activeStatusFilter !== 'All') {
      const field = this.config.statusFilterField;
      result = result.filter(item => String(item[field]) === this.activeStatusFilter);
    }

    // Search query filter
    if (this.searchQuery.trim() && this.config?.searchFields) {
      const q = this.searchQuery.toLowerCase().trim();
      const fields = this.config.searchFields;
      result = result.filter(item =>
        fields.some(field => {
          const val = item[field];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Column field-specific filters
    Object.keys(this.activeFilters).forEach(field => {
      const filter = this.activeFilters[field];
      if (filter.enabled && filter.value.trim() !== '') {
        const q = filter.value.toLowerCase().trim();
        result = result.filter(item => {
          const val = item[field];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        });
      }
    });

    // Advanced-search modal filters
    if (this.config?.advancedSearch) {
      this.config.advancedSearch.forEach(f => {
        const raw = this.advancedFilters[f.field];
        if (raw != null && String(raw).trim() !== '') {
          const q = String(raw).toLowerCase().trim();
          const match = f.match ?? (f.type === 'select' ? 'equals' : 'includes');
          result = result.filter(item => {
            const val = item[f.field];
            if (val === undefined || val === null) return false;
            const s = String(val).toLowerCase();
            return match === 'equals' ? s === q : s.includes(q);
          });
        }
      });
    }

    this.filteredItems = this.applySort(result);
  }

  getRowId(item: any): string {
    // Unique ID for tracking action menu popup states (normally LC number or DB primary key ID)
    return item.lcNumber || item.id || JSON.stringify(item);
  }

  isRowActive(item: any): boolean {
    if (!this.config) return false;
    return this.config.rowActiveCondition(item, this.router.url);
  }

  isChildRouteActive(): boolean {
    if (!this.config) return false;
    return this.config.childRouteActiveCondition(this.router.url);
  }

  /**
   * Send the detail panel back to the top on every panel navigation.
   *
   * Two things keep a stale scroll position without this: the wrapper below
   * outlives route changes, and pages routed by id only (row A → row B) reuse
   * the same component instance, so their own scroll container survives too.
   * Both are reset here — any already-scrolled descendant, so pages that own
   * their scroll body are covered as well as those scrolling in the wrapper.
   */
  resetPanelScroll(): void {
    const pane = this.panelScroll?.nativeElement;
    if (!pane) return;

    pane.scrollTop = 0;
    pane.querySelectorAll<HTMLElement>('*').forEach(el => {
      if (el.scrollTop) el.scrollTop = 0;
    });
  }

  onRowClick(item: any): void {
    if (!this.config) return;
    this.workspaceState.selectedRow.set(item);
    const route = this.config.rowRoutePath(item);
    this.router.navigate(route, { relativeTo: this.route }).then(navigated => {
      if (navigated && this.userPrefs.prefs().rowOpenBehavior === 'fullpage') {
        this.workspaceState.isFullscreen.set(true);
      }
    });
  }

  getRowRoute(item: any): any[] {
    if (!this.config) return [];
    return this.config.rowRoutePath(item);
  }

  private computeMenuPos(rect: DOMRect, actionCount: number): { top: number; left: number; upward: boolean } {
    const POPUP_W  = 192;
    const popupH   = 40 + actionCount * 36;
    const spaceBelow = window.innerHeight - rect.bottom;
    const upward   = spaceBelow < popupH + 8;
    const top      = upward
      ? Math.max(4, rect.top - popupH - 4)
      : rect.bottom + 4;
    const left = Math.max(4, Math.min(rect.right - POPUP_W, window.innerWidth - POPUP_W - 4));
    return { top, left, upward };
  }

  toggleActionMenu(item: any, event: MouseEvent): void {
    event.stopPropagation();
    const rowId = this.getRowId(item);
    if (this.activeActionMenuId === rowId) {
      this.closeActionMenu();
      return;
    }

    this.activeActionMenuId  = rowId;
    this.activeItem          = item;
    this.menuButtonRect      = (event.currentTarget as HTMLElement).getBoundingClientRect();

    if (this.config?.resolveActionsForItem) {
      // Open immediately with a loading spinner; recompute position once action count is known
      this.activeActionMenuPos = this.computeMenuPos(this.menuButtonRect, 3);
      this.actionsLoading      = true;
      this.activeItemActions   = [];
      this.actionSub?.unsubscribe();
      this.actionSub = this.config.resolveActionsForItem(item).subscribe({
        next: actions => {
          this.activeItemActions   = actions;
          this.actionsLoading      = false;
          // Recalculate now that we know the real count
          if (this.menuButtonRect) {
            this.activeActionMenuPos = this.computeMenuPos(this.menuButtonRect, actions.length);
          }
        },
        error: () => { this.actionsLoading = false; }
      });
    } else {
      this.activeItemActions   = this.config?.actions ?? [];
      this.activeActionMenuPos = this.computeMenuPos(this.menuButtonRect, this.activeItemActions.length);
    }
  }

  closeActionMenu(): void {
    this.activeActionMenuId  = null;
    this.activeItem          = null;
    this.activeActionMenuPos = null;
    this.activeItemActions   = [];
    this.menuButtonRect      = null;
    this.actionSub?.unsubscribe();
  }

  ngOnDestroy(): void {
    this.actionSub?.unsubscribe();
    this.fetchSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.isFilterPopupOpen = false;
    this.newMenuOpen = false;
    this.statusMenuOpen = false;
  }

  onActionClick(action: ActionDefinition<any>, item: any): void {
    this.closeActionMenu();
    action.onClick(item);
  }

  toggleFilterPopup(event: MouseEvent): void {
    event.stopPropagation();
    this.isFilterPopupOpen = !this.isFilterPopupOpen;
  }

  toggleColumnFilter(field: string): void {
    if (this.activeFilters[field]) {
      this.activeFilters[field].enabled = !this.activeFilters[field].enabled;
      if (!this.activeFilters[field].enabled) {
        this.activeFilters[field].value = '';
      }
      this.applyFilters();
    }
  }

  onFilterValueChange(field: string, value: string): void {
    if (this.activeFilters[field]) {
      this.activeFilters[field].value = value;
      this.applyFilters();
    }
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.activeStatusFilter = this.config?.statusDefault || 'All';
    Object.keys(this.activeFilters).forEach(field => {
      this.activeFilters[field].enabled = false;
      this.activeFilters[field].value = '';
    });
    this.applyFilters();
  }

  removeFilter(field: string): void {
    if (this.activeFilters[field]) {
      this.activeFilters[field].enabled = false;
      this.activeFilters[field].value = '';
      this.applyFilters();
    }
  }

  getUniqueValues(field: string): string[] {
    // Reads whatever is in memory: every row client-side, the current page only
    // in server-side mode (see `optionsFromData`).
    const values = this.rows.map(item => item[field]).filter(val => val !== undefined && val !== null && val !== '');
    return Array.from(new Set(values)).sort();
  }

  getActiveFilterCount(): number {
    return Object.keys(this.activeFilters).filter(field => this.activeFilters[field].enabled && this.activeFilters[field].value.trim() !== '').length;
  }

  /** colspan for the full-width table rows (empty / loading / error states). */
  get columnSpan(): number {
    const cols = this.config?.columns?.length ?? 0;
    return cols + (this.hasActions ? 1 : 0);
  }

  get hasActions(): boolean {
    return (this.config?.actions?.length ?? 0) > 0 || !!this.config?.resolveActionsForItem;
  }

  getColumnHeader(field: string): string {
    const col = this.config?.columns.find(c => c.field === field);
    return col ? col.header : field;
  }

  // Interactive Resizer Drag Handler
  startResizing(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;

    const startX = event.clientX;
    const containerWidth = window.innerWidth - 220; // Excluding Sidebar width
    const startLeftWidth = this.leftWidth;

    const mouseMoveListener = (moveEvent: MouseEvent) => {
      if (!this.isResizing) return;

      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;

      let newLeftWidth = startLeftWidth + deltaPercent;

      // Constrain split pane between 30% and 75% widths
      if (newLeftWidth < 30) newLeftWidth = 30;
      if (newLeftWidth > 75) newLeftWidth = 75;

      this.leftWidth = newLeftWidth;
      this.rightWidth = 100 - newLeftWidth;
    };

    const mouseUpListener = () => {
      this.isResizing = false;
      window.removeEventListener('mousemove', mouseMoveListener);
      window.removeEventListener('mouseup', mouseUpListener);
    };

    window.addEventListener('mousemove', mouseMoveListener);
    window.addEventListener('mouseup', mouseUpListener);
  }
}
