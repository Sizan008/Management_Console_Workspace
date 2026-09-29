import { Component, effect, inject, OnInit, signal, computed, WritableSignal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DashboardApi } from '../../services/dashboard.api';
import { KeycloakRoleOption, WidgetApi } from '../../services/widget.api';
import { ApplicationService, Application } from '../../services/application.service';
import { ApiBaseService } from '../../services/api-base.service';
import { Dashboard, CreateDashboardCommand, UpdateDashboardCommand } from '../../models/dashboard.model';
import {
  Widget, AddWidgetCommand, UpdateWidgetCommand, QueryResult,
  DataSourceConfig, FilterDefinition, ProcedureParam, ApiParam,
  isDataSourceConfigured, parseDataSourceConfig
} from '../../models/widget.model';
import { MetaDashboardSessionDataService, SessionDataItem }
  from '../../services/meta-dashboard-session-data.service';
import { MetaWidgetTypeService, MetaWidgetType } from '../../services/meta-widget-type.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GenericButton } from '../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericModal } from '../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../shared/common-components/input-types/input-text-area/input-text-area';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { WidgetPreviewComponent } from '../../components/widget-preview/widget-preview.component';
import { WidgetCardComponent } from '../../components/widget-card/widget-card.component';
import { QueryBuilderModalComponent } from '../../components/query-builder-modal/query-builder-modal.component';
import { QueryBuilderConfig } from '../../models/widget.model';
import { BUTTON_VISIBILITY, ONCLICK_EXIT, ONCLICK_RESET } from '../../../shared/constant/button-signals.constant';

type DateRangeKey = 'ALL' | '24H' | '3D' | '7D' | '30D' | 'CUSTOM';

export interface PreviewCard {
  uid: number;
  widgetType: string;
  widgetTypeName: string;
  name: string;
  dataSource: DataSourceConfig;
  permittedRoles: string[];
  cacheTtlMinutes: number;
  renderConfig: Record<string, any>;
  existingWidgetId?: number;
}

@Component({
  selector: 'app-dashboard-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    GenericButton, GenericModal, InputTextBox, InputTextArea, InputSelectOptionField,
    QueryBuilderModalComponent, WidgetCardComponent
  ],
  templateUrl: './dashboard-list.component.html',
  styleUrl: './dashboard-list.component.scss'
})
export class DashboardListComponent implements OnInit {
  private dashboardApi = inject(DashboardApi);
  private widgetApi = inject(WidgetApi);
  private widgetTypeService = inject(MetaWidgetTypeService);
  private sessionDataService = inject(MetaDashboardSessionDataService);
  private applicationService = inject(ApplicationService);
  private apiBase = inject(ApiBaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  dashboards: WritableSignal<Dashboard[]> = signal([]);
  applications: WritableSignal<Application[]> = signal([]);
  selectedApplicationId: WritableSignal<number | ''> = signal('');
  filteredDashboards: WritableSignal<Dashboard[]> = signal([]);
  dashboardWidgets: WritableSignal<Map<number, Widget[]>> = signal(new Map());
  widgetData: WritableSignal<Map<number, QueryResult>> = signal(new Map());
  widgetTypeOptions: WritableSignal<Array<{ key: string; value: string }>> = signal([]);
  previewCards: WritableSignal<PreviewCard[]> = signal([]);
  selectedCard: WritableSignal<PreviewCard | null> = signal(null);
  panelOpen: WritableSignal<boolean> = signal(false);
  panelSaving: WritableSignal<boolean> = signal(false);
  showModal: WritableSignal<boolean> = signal(false);
  isEditMode: WritableSignal<boolean> = signal(false);
  editingDashboardId: WritableSignal<number | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(false);
  queryBuilderOpen: WritableSignal<boolean> = signal(false);

  // ── Design-page date range + filter state (mirrors live dashboard) ────────
  readonly rangeOptions: Array<{ key: DateRangeKey; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: '24H', label: '24h' },
    { key: '3D', label: '3 days' },
    { key: '7D', label: '7 days' },
    { key: '30D', label: '30 days' },
    { key: 'CUSTOM', label: 'Custom' },
  ];
  designRanges = signal<Record<number, DateRangeKey>>({});
  designCustomFrom = signal<Record<number, string>>({});
  designCustomTo = signal<Record<number, string>>({});
  designFilters = signal<Map<number, Record<string, any>>>(new Map());

  // ── Layout columns (1-4) — mirrors the same resolution the live dashboard
  // uses for its single active dashboard, since this page pools all dashboards
  // into one flat grid. Persisted on the dashboard record. Keys are strings to
  // match input-select-option-field's key===value matching (like widgetType).
  readonly applicationOptions = computed<Array<{ key: string; value: string }>>(() =>
    this.applications().map(app => ({ key: String(app.appId), value: app.appName }))
  );
  readonly isApplicationSelected = computed<boolean>(() => this.selectedApplicationId() !== '');
  readonly primaryDashboard = computed<Dashboard | null>(() =>
    this.dashboards().find(d => d.isActive) ?? this.dashboards()[0] ?? null);

  availableRoles = signal<KeycloakRoleOption[]>([]);
  rolesLoading = signal(false);
  rolesDropdownOpen = false;

  // Session storage fields available for parameter linkage, loaded from
  // META_DASHBOARD_SESSION_DATA (key = bound at runtime, value = label).
  sessionFields = signal<SessionDataItem[]>([]);

  filterForm: FormGroup = this.fb.group({ applicationId: [''], widgetType: [''] });
  dashboardForm: FormGroup = this.fb.group({ name: [''], description: [''] });

  constructor() {
    effect(() => {
      if (ONCLICK_RESET()) {
        this.resetDashboardPage();
        ONCLICK_RESET.set(false);
      }
    });

    effect(() => {
      if (ONCLICK_EXIT()) {
        this.exit();
        ONCLICK_EXIT.set(false);
      }
    });
  }

  /** Icon used in the configure panel header only. Card grid icons are handled by WidgetCardComponent. */
  getPanelIcon(widgetType: string): SafeHtml {
    const mk = (body: string, vb = '0 0 1024 1024') =>
      this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
    const icons: Record<string, SafeHtml> = {
      BAR_CHART:     mk(`<path d="M405.333333 469.333333h213.333334v426.666667H405.333333zM128 256h213.333333v640H128zM682.666667 128h213.333333v768H682.666667z" fill="#00BCD4"/>`),
      LINE_CHART:    mk(`<path d="M170.666667 810.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#3F51B5"/><path d="M853.333333 170.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#00BCD4"/>`),
      PIE_CHART:     mk(`<path d="M877.387 523.945c-1.663 198.958-163.571 360.868-362.532 362.531-198.991 1.661-360.885-166.07-362.526-362.531-0.697-83.354-130.015-83.42-129.318 0 1.064 127.401 49.851 247.752 136.97 340.531 86.427 92.047 208.144 143.457 333.116 150.77 127.267 7.454 251.374-40.885 347.279-122.774 96.086-82.04 150.659-201.304 164.166-325.296 1.565-14.352 2.04-28.805 2.16-43.23 0.697-83.421-128.618-83.355-129.315-0.001z" fill="#4A5699"/><path d="M152.329 500.646c1.662-198.965 163.563-360.875 362.526-362.537 83.354-0.697 83.419-130.013 0-129.317-129.524 1.081-252.396 51.567-345.385 141.68C75.465 241.564 24.097 370.538 23.011 500.646c-0.697 83.421 128.62 83.349 129.318 0z" fill="#C45FA0"/>`),
      KPI_CARD:      mk(`<path d="M7.6667,27.5027,2,22.4484l1.3311-1.4927,5.6411,5.0316,7.6906-7.4449a1.9282,1.9282,0,0,1,2.6736-.0084L22.96,21.9983l5.5791-5.9735L30,17.3905l-5.5812,5.9758a1.996,1.996,0,0,1-2.8379.08l-3.5765-3.4191-7.666,7.4206A1.9629,1.9629,0,0,1,7.6667,27.5027Z"/>`, '0 0 32 32'),
      DATA_TABLE:    mk(`<path d="M941.26 234.723H328.964c-28.867 0-52.263 23.4-52.263 52.268v3.734c0 28.868 23.396 52.269 52.263 52.269H941.26c28.869 0 52.269-23.401 52.269-52.269v-3.734c-0.001-28.868-23.4-52.268-52.269-52.268z" fill="#F0D043"/>`),
      APPROVAL_LIST: mk(`<path d="M512 64l100.266667 76.8 123.733333-17.066667 46.933333 117.333334 117.333334 46.933333-17.066667 123.733333L960 512l-76.8 100.266667 17.066667 123.733333-117.333334 46.933333-46.933333 117.333334-123.733333-17.066667L512 960l-100.266667-76.8-123.733333 17.066667-46.933333-117.333334-117.333334-46.933333 17.066667-123.733333L64 512l76.8-100.266667-17.066667-123.733333 117.333334-46.933333 46.933333-117.333334 123.733333 17.066667z" fill="#8BC34A"/>`)
    };
    return icons[widgetType] ?? mk(`<rect x="128" y="128" width="768" height="768" rx="80" fill="#94a3b8"/>`);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.rolesDropdownOpen = false;
  }

  ngOnInit(): void {
    BUTTON_VISIBILITY.set({
      save: false,
      saveNext: false,
      update: false,
      updateNext: false,
      view: false,
      delete: false,
      exit: true,
      reset: true,
      customAction: false
    });
    this.loadWidgetTypes();
    this.loadApplications();
    this.loadSessionFields();
    this.loadKcRoles();
    this.filterForm.get('widgetType')?.valueChanges.subscribe(() => this.applyFilter());
  }

  private loadKcRoles(): void {
    this.rolesLoading.set(true);
    this.widgetApi.getKcRoles().subscribe({
      next: (roles) => {
        this.availableRoles.set(
          roles
            .filter(role => !!role?.roleName)
            .map(role => ({
              keycloakRoleId: role.keycloakRoleId || role.roleName,
              roleName: role.roleName
            }))
        );
        this.rolesLoading.set(false);
      },
      error: () => { this.rolesLoading.set(false); this.toastr.warning('Could not load roles'); },
    });
  }

  private loadSessionFields(): void {
    this.sessionDataService.getSessionData().subscribe({
      next: (list) => this.sessionFields.set(list),
      error: () => this.sessionFields.set([]),
    });
  }

  private loadWidgetTypes(): void {
    this.widgetTypeService.getAllActiveWidgetTypes().subscribe({
      next: (types: MetaWidgetType[]) => {
        this.widgetTypeOptions.set(
          types.filter(t => t.isActive === 'Y' && !['CUSTOM', 'APPROVAL_LIST'].includes(t.widgetTypeCode)).map(t => ({ key: t.widgetTypeCode, value: t.widgetTypeName }))
        );
      },
      error: () => this.toastr.warning('Could not load widget types')
    });
  }

  private loadApplications(): void {
    this.applicationService.getApplications().subscribe({
      next: (apps) => this.applications.set(apps),
      error: (err) => { this.toastr.warning('Could not load applications'); console.error(err); }
    });
  }

  private clearPage(): void {
    this.dashboards.set([]);
    this.filteredDashboards.set([]);
    this.dashboardWidgets.set(new Map());
    this.widgetData.set(new Map());
    this.previewCards.set([]);
    this.selectedCard.set(null);
    this.designRanges.set({});
    this.designCustomFrom.set({});
    this.designCustomTo.set({});
    this.designFilters.set(new Map());
  }

  private resetDashboardPage(): void {
    this.closeModal();
    this.panelOpen.set(false);
    this.queryBuilderOpen.set(false);
    this.selectedCard.set(null);
    this.filterForm.get('widgetType')?.setValue('', { emitEvent: false });
    this.clearPage();
    this.reloadDashboards();
  }

  private exit(): void {
    this.router.navigate(['/']);
  }

  onApplicationChanged(event: any): void {
    const appId = event.selectedKey || '';
    this.selectedApplicationId.set(appId === '' ? '' : Number(appId));

    // Clear page immediately when application changes
    this.clearPage();

    if (appId !== '') {
      const selectedApp = this.applications().find(a => a.appId === Number(appId));
      if (selectedApp) {
        this.apiBase.setAppUrl(selectedApp.appBasePath);
        this.loadDashboardsForApplication(Number(appId));
      }
    } else {
      this.apiBase.setAppUrl('');
    }
  }

  private loadDashboardsForApplication(appId: number): void {
    this.isLoading.set(true);
    this.dashboardApi.getDashboardsByApplication(appId).subscribe({
      next: (list) => {
        this.dashboards.set(list);
        this.applyFilter();
        this.isLoading.set(false);
        this.loadDashboardWidgets(list);
      },
      error: (err) => { this.toastr.error('Failed to load dashboards'); console.error(err); this.isLoading.set(false); }
    });
  }

  private loadDashboards(): void {
    this.isLoading.set(true);
    this.dashboardApi.getDashboards().subscribe({
      next: (list) => {
        this.dashboards.set(list);
        this.applyFilter();
        this.isLoading.set(false);
        this.loadDashboardWidgets(list);
      },
      error: (err) => { this.toastr.error('Failed to load dashboards'); console.error(err); this.isLoading.set(false); }
    });
  }
  // Reload after a mutation WITHOUT losing the selected-application scope.
  // Using the global loadDashboards() here would repopulate `dashboards` with
  // every application's dashboards, flip `primaryDashboard()` to a different
  // record (whose layoutConfig differs/absent), and reset the grid to the
  // default 3-column view. Staying app-scoped preserves the saved layout.
  private reloadDashboards(): void {
    const appId = this.selectedApplicationId();
    if (appId !== '') {
      this.loadDashboardsForApplication(Number(appId));
    } else {
      this.loadDashboards();
    }
  }

  private loadDashboardWidgets(dashboards: Dashboard[]): void {
    dashboards.forEach(d => {
      this.widgetApi.getWidgetsByDashboard(d.id).subscribe({
        next: (widgets) => {
          this.dashboardWidgets.update(map => {
            const next = new Map(map);
            next.set(d.id, widgets);
            return next;
          });
          widgets.forEach(w => {
            this.widgetApi.getWidgetData(w.id).subscribe({
              next: (result) => {
                this.widgetData.update(map => {
                  const next = new Map(map);
                  next.set(w.id, result);
                  return next;
                });
              },
              error: () => { }
            });
          });
        },
        error: () => { }
      });
    });
  }

  getWidgetsFor(dashboardId: number): Widget[] {
    return this.dashboardWidgets().get(dashboardId) ?? [];
  }

  getWidgetDataFor(widgetId: number): QueryResult | null {
    return this.widgetData().get(widgetId) ?? null;
  }

  loadWidgetPreview(widgetId: number, filterParams: Record<string, any> = {}): void {
    this.widgetApi.getWidgetData(widgetId, filterParams).subscribe({
      next: (result) => {
        this.widgetData.update(map => { const n = new Map(map); n.set(widgetId, result); return n; });
      },
      error: () => { }
    });
  }

  // ── Design date range helpers ─────────────────────────────────────────────

  getDesignRange(id: number): DateRangeKey { return this.designRanges()[id] ?? 'ALL'; }
  getDesignFrom(id: number): string { return this.designCustomFrom()[id] ?? ''; }
  getDesignTo(id: number): string { return this.designCustomTo()[id] ?? ''; }
  getDesignFilterVals(id: number): Record<string, any> { return this.designFilters().get(id) ?? {}; }

  isDesignDateSortingEnabled(widget: Widget): boolean {
    return parseDataSourceConfig(widget.queryConfig)?.enableRecordDtSort ?? false;
  }

  setDesignRange(w: Widget, key: DateRangeKey): void {
    this.designRanges.update(m => ({ ...m, [w.id]: key }));
    if (key !== 'CUSTOM') this.reloadDesign(w);
  }
  setDesignFrom(w: Widget, val: string): void { this.designCustomFrom.update(m => ({ ...m, [w.id]: val })); }
  setDesignTo(w: Widget, val: string): void { this.designCustomTo.update(m => ({ ...m, [w.id]: val })); }

  applyDesignCustom(w: Widget): void {
    if (this.getDesignFrom(w.id) && this.getDesignTo(w.id)) this.reloadDesign(w);
  }

  updateDesignFilter(w: Widget, paramName: string, value: any): void {
    const map = new Map(this.designFilters());
    map.set(w.id, { ...(map.get(w.id) ?? {}), [paramName]: value });
    this.designFilters.set(map);
    this.reloadDesign(w);
  }

  private buildDesignDateParams(id: number): Record<string, string> {
    const key = this.getDesignRange(id);
    if (key === 'ALL') return {};
    const now = new Date(), toISO = (d: Date) => d.toISOString().split('T')[0];
    let from: string | null = null, to: string | null = null;
    switch (key) {
      case '24H': from = toISO(new Date(now.getTime() - 86_400_000)); to = toISO(now); break;
      case '3D': from = toISO(new Date(now.getTime() - 3 * 86_400_000)); to = toISO(now); break;
      case '7D': from = toISO(new Date(now.getTime() - 7 * 86_400_000)); to = toISO(now); break;
      case '30D': from = toISO(new Date(now.getTime() - 30 * 86_400_000)); to = toISO(now); break;
      case 'CUSTOM': from = this.getDesignFrom(id) || null; to = this.getDesignTo(id) || null; break;
    }
    const p: Record<string, string> = {};
    if (from) p['_drFrom'] = from;
    if (to) p['_drTo'] = to;
    return p;
  }

  private reloadDesign(w: Widget): void {
    this.loadWidgetPreview(w.id, { ...this.getDesignFilterVals(w.id), ...this.buildDesignDateParams(w.id) });
  }

  getChartStyle(widgetId: number): string {
    return this.loadRenderConfig(widgetId)?.['style'] ?? 'donut';
  }

  getRenderConfig(widgetId: number): Record<string, any> {
    return this.loadRenderConfig(widgetId) ?? {};
  }

  previewGridClass(dashboardId: number): string {
    const n = this.getWidgetsFor(dashboardId).length;
    return n <= 1 ? 'count-1' : n === 2 ? 'count-2' : 'count-many';
  }

  private applyFilter(): void {
    const appId = this.selectedApplicationId();
    const widgetType = this.filterForm.get('widgetType')?.value;

    let filtered = this.dashboards();

    // Filter by application
    if (appId !== '') {
      filtered = filtered.filter(d => d.applicationId === appId);
    }

    // Filter by widget type
    if (widgetType) {
      filtered = filtered.filter(d =>
        !d.widgets?.length || d.widgets.some(w => (w.widgetType as string) === widgetType)
      );
    }

    this.filteredDashboards.set(filtered);
  }

  // ── Create preview card ───────────────────────────────────────────────────
  onCreate(): void {
    const type = this.filterForm.get('widgetType')?.value as string;
    const typeMeta = this.widgetTypeOptions().find(o => o.key === type);
    if (!type || !typeMeta) { this.openCreateModal(); return; }

    // Append (not prepend) so a new widget lands at the END and never reshuffles
    // the existing widgets' positions.
    this.previewCards.update(cards => [...cards, {
      uid: Date.now(),
      widgetType: type,
      widgetTypeName: typeMeta.value,
      name: typeMeta.value,
      dataSource: { sourceType: 'VIEW', viewName: '', filters: [] },
      permittedRoles: [],
      cacheTtlMinutes: 5,
      renderConfig: {}
    }]);
  }

  deletePreviewCard(uid: number): void {
    this.previewCards.update(cards => cards.filter(c => c.uid !== uid));
    if (this.selectedCard()?.uid === uid) this.closePanel();
  }

  // ── Configure an existing saved widget via the right panel ───────────────
  openWidgetConfigure(widget: Widget): void {
    const typeMeta = this.widgetTypeOptions().find(o => o.key === widget.widgetType);
    const renderConfig = this.inferRenderConfig(widget);
    const card: PreviewCard = {
      uid: -widget.id,
      widgetType: widget.widgetType,
      widgetTypeName: typeMeta?.value ?? widget.widgetType,
      name: widget.name,
      dataSource: parseDataSourceConfig(widget.queryConfig) ?? { sourceType: 'VIEW', viewName: '', filters: [] },
      permittedRoles: [...(widget.permittedRoles ?? [])],
      cacheTtlMinutes: widget.cacheTtlMinutes,
      renderConfig,
      existingWidgetId: widget.id
    };
    this.openPanel(card);
  }

  private renderConfigKey(widgetId: number): string {
    return `wc_${widgetId}`;
  }

  private saveRenderConfig(widgetId: number, config: Record<string, any>): void {
    try { localStorage.setItem(this.renderConfigKey(widgetId), JSON.stringify(config)); } catch { }
  }

  private loadRenderConfig(widgetId: number): Record<string, any> | null {
    try {
      const raw = localStorage.getItem(this.renderConfigKey(widgetId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private inferRenderConfig(widget: Widget): Record<string, any> {
    // Prefer previously saved user choices
    const saved = this.loadRenderConfig(widget.id);
    if (saved) return saved;

    // Fall back to auto-detection from live data
    const config: Record<string, any> = {};
    const data = this.getWidgetDataFor(widget.id);
    if (!data || data.rows.length === 0) return config;

    const sample = data.rows[0];
    const strCol = data.columns.find(c => typeof sample[c] === 'string') ?? data.columns[0];
    const numCols = data.columns.filter(c => typeof sample[c] === 'number');
    const numCol = numCols[0] ?? data.columns[1];

    switch (widget.widgetType) {
      case 'PIE_CHART':
        config['labelField'] = strCol;
        config['valueField'] = numCol;
        config['style'] = 'donut';
        break;
      case 'BAR_CHART':
      case 'LINE_CHART':
        config['xField'] = strCol;
        config['yField'] = numCol;
        break;
      case 'KPI_CARD':
        config['metricField'] = numCol;
        break;
      case 'DATA_TABLE':
        config['rowsPerPage'] = 10;
        config['sortable'] = true;
        config['paginate'] = true;
        break;
    }
    return config;
  }

  deleteExistingWidget(w: Widget): void {
    if (!confirm(`Delete "${w.name}"?`)) return;
    this.widgetApi.removeWidget(w.id).subscribe({
      next: () => { this.toastr.success('Deleted'); this.reloadDashboards(); },
      error: () => this.toastr.error('Delete failed')
    });
  }


  // ── Configure panel ───────────────────────────────────────────────────────
  openPanel(card: PreviewCard): void {
    this.selectedCard.set(card);
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.selectedCard.set(null);
  }

  toggleRole(role: string): void {
    const c = this.selectedCard();
    if (!c) return;
    c.permittedRoles = c.permittedRoles.includes(role)
      ? c.permittedRoles.filter(r => r !== role)
      : [...c.permittedRoles, role];
  }

  roleNameById(roleId: string): string {
    return this.availableRoles().find(role => role.keycloakRoleId === roleId)?.roleName ?? roleId;
  }

  trackRoleById(_index: number, role: KeycloakRoleOption): string {
    return role.keycloakRoleId;
  }

  saveFromPanel(): void {
    const card = this.selectedCard();
    if (!card) return;
    if (!card.name.trim()) { this.toastr.error('Widget name is required'); return; }
    if (!isDataSourceConfigured(card.dataSource)) {
      this.toastr.error('Data source is not configured'); return;
    }

    const queryConfig = JSON.stringify(card.dataSource);
    this.panelSaving.set(true);

    if (card.existingWidgetId) {
      this.saveRenderConfig(card.existingWidgetId, card.renderConfig);
      const cmd: UpdateWidgetCommand = {
        name: card.name,
        widgetType: card.widgetType,
        queryConfig: queryConfig,
        permittedRoles: card.permittedRoles,
        cacheTtlMinutes: card.cacheTtlMinutes,
        isConfigured: 1
      };
      this.widgetApi.updateWidget(card.existingWidgetId, cmd).subscribe({
        next: () => {
          this.toastr.success('Widget updated');
          this.closePanel();
          this.reloadDashboards();
          this.panelSaving.set(false);
        },
        error: () => { this.toastr.error('Failed to update widget'); this.panelSaving.set(false); }
      });
    } else {
      const cmd: AddWidgetCommand = {
        name: card.name,
        widgetType: card.widgetType,
        queryConfig: queryConfig,
        permittedRoles: card.permittedRoles,
        cacheTtlMinutes: card.cacheTtlMinutes,
        posX: 0, posY: 0, width: 4, height: 3
      };
      this.widgetApi.addWidget(cmd).subscribe({
        next: () => {
          this.toastr.success('Widget saved');
          this.deletePreviewCard(card.uid);
          this.reloadDashboards();
          this.panelSaving.set(false);
        },
        error: () => { this.toastr.error('Failed to add widget'); this.panelSaving.set(false); }
      });
    }
  }

  // ── Data source helpers ────────────────────────────────────────────────────
  addFilter(): void {
    const c = this.selectedCard();
    if (!c) return;
    c.dataSource.filters = [...(c.dataSource.filters ?? []), {
      paramName: '', label: '', inputType: 'TEXT',
      dataType: 'VARCHAR', defaultValue: null, options: [],
      paramSource: 'LITERAL'  // Default to literal
    }];
  }

  removeFilter(filter: FilterDefinition): void {
    const c = this.selectedCard();
    if (!c) return;
    c.dataSource.filters = c.dataSource.filters.filter(f => f !== filter);
  }

  addProcParam(): void {
    const c = this.selectedCard();
    if (!c) return;
    c.dataSource.procedureParams = [...(c.dataSource.procedureParams ?? []), {
      name: '', dataType: 'VARCHAR', defaultValue: null
    }];
  }

  removeProcParam(param: ProcedureParam): void {
    const c = this.selectedCard();
    if (!c) return;
    c.dataSource.procedureParams = (c.dataSource.procedureParams ?? []).filter(p => p !== param);
  }

  addApiParam(): void {
    const c = this.selectedCard();
    if (!c) return;
    c.dataSource.apiParams = [...(c.dataSource.apiParams ?? []), {
      type: 'QUERY', name: '', paramSource: 'LITERAL', defaultValue: '', description: ''
    }];
  }

  removeApiParam(param: ApiParam): void {
    const c = this.selectedCard();
    if (!c) return;
    c.dataSource.apiParams = (c.dataSource.apiParams ?? []).filter(p => p !== param);
  }

  // ── Runtime filter helpers ────────────────────────────────────────────────

  /** SELECT columns from the current card's queryConfig, as key/label pairs for the column picker. */
  querySelectColumns(): Array<{ key: string; label: string }> {
    const qc = this.selectedCard()?.dataSource?.queryConfig;
    if (!qc?.select?.length) return [];
    return (qc.select as any[]).map(s => ({
      key: `${s.entityId}:${s.fieldId}`,
      label: s.alias || s.fieldName || `Field #${s.fieldId}`
    }));
  }

  filterColumnKey(fd: FilterDefinition): string {
    return (fd.entityId && fd.fieldId) ? `${fd.entityId}:${fd.fieldId}` : '';
  }

  setFilterColumn(fd: FilterDefinition, key: string): void {
    const [eid, fid] = key.split(':').map(Number);
    (fd as any).entityId = eid || null;
    (fd as any).fieldId = fid || null;
    // Auto-set paramName from the column alias so the user doesn't have to type it separately
    const col = this.querySelectColumns().find(c => c.key === key);
    if (col) fd.paramName = col.label.replace(/\s+/g, '_').toLowerCase();
  }

  filterOptionsStr(fd: FilterDefinition): string {
    return (fd.options ?? []).join(', ');
  }

  setFilterOptionsStr(fd: FilterDefinition, val: string): void {
    fd.options = val.split(',').map(s => s.trim()).filter(Boolean);
  }

  getCardFilters(card: PreviewCard): FilterDefinition[] {
    return card.dataSource?.filters ?? [];
  }

  getWidgetFilters(w: Widget): FilterDefinition[] {
    return parseDataSourceConfig(w.queryConfig)?.filters ?? [];
  }

  // ── Widget action buttons (design page) ──────────────────────────────────

  refreshingDesign = signal<Set<number>>(new Set());

  isRefreshingDesign(id: number): boolean { return this.refreshingDesign().has(id); }

  refreshWidgetDesign(w: Widget): void {
    if (this.isRefreshingDesign(w.id)) return;
    this.refreshingDesign.update(s => new Set([...s, w.id]));
    this.widgetApi.refreshWidgetCache(w.id).subscribe({
      next: () => {
        this.refreshingDesign.update(s => { const n = new Set(s); n.delete(w.id); return n; });
        const map = new Map(this.widgetData()); map.delete(w.id); this.widgetData.set(map);
        this.loadWidgetPreview(w.id);
      },
      error: () => this.refreshingDesign.update(s => { const n = new Set(s); n.delete(w.id); return n; })
    });
  }

  exportWidgetCsv(w: Widget): void {
    const result = this.getWidgetDataFor(w.id);
    if (!result || result.rows.length === 0) return;
    const cols = result.columns;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.map(esc).join(','), ...result.rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${w.name ?? 'export'}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  dataSourceLabel(card: PreviewCard): string {
    const ds = card.dataSource;
    switch (ds.sourceType) {
      case 'VIEW': return ds.viewName ? `View: ${ds.viewName}` : '';
      case 'STORED_PROCEDURE': return ds.procedureName ? `Proc: ${ds.procedureName}` : '';
      case 'API': return ds.apiUrl ? `API: ${ds.apiUrl}` : '';
      case 'BUILD_QUERY': return ds.queryConfig?.from ? 'Query Builder configured' : '';
      default: return '';
    }
  }

  openQueryBuilder(): void { this.queryBuilderOpen.set(true); }
  closeQueryBuilder(): void { this.queryBuilderOpen.set(false); }

  applyQueryBuilderConfig(cfg: QueryBuilderConfig): void {
    const c = this.selectedCard();
    if (c) {
      c.dataSource = { ...c.dataSource, queryConfig: cfg };
    }
    this.queryBuilderOpen.set(false);
  }


  // ── Design page grid styling — 12-col auto-reflow grid (mirrors live view) ──
  // Fixed 90px rows so a widget's height = rowSpan × 90px + gaps, identical to
  // the live dashboard. Cards fill their grid area exactly (no fixed height),
  // so they never overflow into — and overlap — the row below.
  getDesignGridStyle(): Record<string, any> {
    return {
      'display': 'grid',
      'grid-template-columns': 'repeat(12, 1fr)',
      'grid-auto-rows': '90px',
      'grid-auto-flow': 'dense',
      'gap': '16px'
    };
  }

  getCardGridStyle(_widgetId: number): Record<string, any> {
    // Design page always uses a fixed 2-per-row layout (colSpan 6 of 12).
    // layoutConfig is only respected in the live dashboard.
    return {
      'grid-column': 'span 6',
      'grid-row': 'span 3'
    };
  }

  // New (unsaved) preview cards. A high `order` places them after every saved
  // widget (whose orders are a small 0..n-1 range), and `grid-column-start: 1`
  // forces each onto a fresh row — so adding a widget appends it at the end on a
  // new line instead of pushing the existing widgets around.
  getPreviewCardGridStyle(index: number): Record<string, any> {
    return {
      'grid-column': '1 / span 6',
      'grid-row': 'span 3',
      'order': 10000 + index
    };
  }

  // ── Existing dashboard CRUD ───────────────────────────────────────────────
  openCreateModal(): void {
    this.isEditMode.set(false); this.editingDashboardId.set(null);
    this.dashboardForm.reset(); this.showModal.set(true);
  }

  openEditModal(dashboard: Dashboard): void {
    this.isEditMode.set(true); this.editingDashboardId.set(dashboard.id);
    this.dashboardForm.patchValue({ name: dashboard.name, description: dashboard.description });
    this.showModal.set(true);
  }

  saveDashboard(): void {
    if (!this.dashboardForm.get('name')?.value) { this.toastr.error('Name required'); return; }
    this.isLoading.set(true);
    if (this.isEditMode()) {
      const currentDashboard = this.dashboards().find(d => d.id === this.editingDashboardId());
      const cmd: UpdateDashboardCommand = {
        name: this.dashboardForm.get('name')?.value,
        description: this.dashboardForm.get('description')?.value ?? '',
        isActive: true,
        applicationId: currentDashboard?.applicationId || 151
      };
      this.dashboardApi.updateDashboard(this.editingDashboardId()!, cmd).subscribe({
        next: () => { this.toastr.success('Updated'); this.closeModal(); this.reloadDashboards(); this.isLoading.set(false); },
        error: (err) => { this.toastr.error('Failed'); console.error(err); this.isLoading.set(false); }
      });
    } else {
      const cmd: CreateDashboardCommand = {
        name: this.dashboardForm.get('name')?.value,
        description: this.dashboardForm.get('description')?.value ?? '',
        applicationId: this.selectedApplicationId() === '' ? 151 : (this.selectedApplicationId() as number)
      };
      this.dashboardApi.createDashboard(cmd).subscribe({
        next: () => { this.toastr.success('Created'); this.closeModal(); this.reloadDashboards(); this.isLoading.set(false); },
        error: (err) => { this.toastr.error('Failed'); console.error(err); this.isLoading.set(false); }
      });
    }
  }

  deleteDashboard(dashboard: Dashboard): void {
    if (!confirm(`Delete "${dashboard.name}"?`)) return;
    const cmd: UpdateDashboardCommand = { name: dashboard.name, description: dashboard.description, isActive: false, applicationId: dashboard.applicationId };
    this.isLoading.set(true);
    this.dashboardApi.updateDashboard(dashboard.id, cmd).subscribe({
      next: () => { this.toastr.success('Deleted'); this.reloadDashboards(); this.isLoading.set(false); },
      error: (err) => { this.toastr.error('Failed'); console.error(err); this.isLoading.set(false); }
    });
  }

  editDashboard(dashboard: Dashboard): void {
    this.router.navigate(['editor', dashboard.id], { relativeTo: this.route });
  }

  closeModal(): void { this.showModal.set(false); this.dashboardForm.reset(); }
  get modalTitle(): string { return this.isEditMode() ? 'Edit Dashboard' : 'Create Dashboard'; }
}
