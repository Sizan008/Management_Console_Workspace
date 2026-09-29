import { Component, effect, inject, OnInit, signal, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DashboardApi } from '../../services/dashboard.api';
import { WidgetApi } from '../../services/widget.api';
import { LayoutStorageService } from '../../services/layout-storage.service';
import { Dashboard, WidgetLayoutPosition } from '../../models/dashboard.model';
import { resolveLayoutPositions } from '../../models/layout.util';
import { Widget, QueryResult, FilterDefinition, parseDataSourceConfig } from '../../models/widget.model';
import { WidgetCardComponent } from '../../components/widget-card/widget-card.component';
import { LayoutDesignerComponent } from '../../components/layout-designer/layout-designer.component';
import { environment } from '../../../../environments/environment';
import { BUTTON_VISIBILITY, ONCLICK_EXIT, ONCLICK_RESET } from '../../../shared/constant/button-signals.constant';

type DateRangeKey = 'ALL' | '24H' | '3D' | '7D' | '30D' | 'CUSTOM';

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, WidgetCardComponent, LayoutDesignerComponent],
  templateUrl: './dashboard-view.component.html',
  styleUrl: './dashboard-view.component.scss'
})
export class DashboardViewComponent implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private dashboardApi = inject(DashboardApi);
  private widgetApi    = inject(WidgetApi);
  private layoutStorage = inject(LayoutStorageService);
  private toastr       = inject(ToastrService);

  dashboard:           WritableSignal<Dashboard | null>                      = signal(null);
  widgets:             WritableSignal<Widget[]>                               = signal([]);
  widgetData:          WritableSignal<Map<number, QueryResult>>               = signal(new Map());
  filterValues:        WritableSignal<Map<number, Record<string, any>>>       = signal(new Map());
  loading:             WritableSignal<boolean>                                = signal(true);
  layoutDesignerOpen:  WritableSignal<boolean>                                = signal(false);

  // Layout persisted per-user in IndexedDB (LayoutStorageService) — never in the DB,
  // and never in localStorage (which logout wipes). Survives logout/login.
  private localLayoutConfig = signal<Record<number, WidgetLayoutPosition>>({});

  // Serialised layout JSON passed to the designer (null = use defaults).
  readonly localLayoutConfigJson = computed(() => {
    const lc = this.localLayoutConfig();
    return Object.keys(lc).length ? JSON.stringify(lc) : null;
  });

  // Complete, non-overlapping positions for exactly the permitted widgets:
  // saved positions kept, newly-permitted widgets placed in the first free slot,
  // removed/revoked widgets dropped. Same resolver the designer uses, so the
  // live grid and the designer agree.
  readonly resolvedLayout = computed(() =>
    resolveLayoutPositions(this.widgets().map(w => w.id), this.localLayoutConfig()));

  // ── Grid layout ──────────────────────────────────────────────────────────────
  getGridStyle(): Record<string, any> {
    return { 'gap': '16px', 'padding': '20px' };
  }

  getWidgetGridStyle(widgetId: number): Record<string, any> {
    const pos = this.resolvedLayout()[widgetId];
    if (pos) {
      return {
        'grid-column': `${pos.colStart} / span ${pos.colSpan}`,
        'grid-row':    `${pos.rowStart} / span ${pos.rowSpan}`,
      };
    }
    return { 'grid-column': 'span 6', 'grid-row': 'span 3' };
  }

  private async loadLocalLayout(dashboardId: number): Promise<void> {
    const layout = await this.layoutStorage.load(this.currentUserId, dashboardId);
    this.localLayoutConfig.set(layout);
  }

  // ── Per-widget date range ──────────────────────────────────────────────────

  readonly rangeOptions: Array<{key: DateRangeKey; label: string}> = [
    { key: 'ALL',    label: 'All'    },
    { key: '24H',    label: '24h'    },
    { key: '3D',     label: '3 days' },
    { key: '7D',     label: '7 days' },
    { key: '30D',    label: '30 days'},
    { key: 'CUSTOM', label: 'Custom' },
  ];

  widgetRanges     = signal<Record<number, DateRangeKey>>({});
  widgetCustomFrom = signal<Record<number, string>>({});
  widgetCustomTo   = signal<Record<number, string>>({});

  // ── Per-widget refresh ─────────────────────────────────────────────────────
  refreshingWidgets = signal<Set<number>>(new Set());

  // Roles and identity from token (localStorage / sessionStorage)
  private userRoles: string[] = [];
  private currentUserId = '';

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
    this.userRoles = this.extractRolesFromToken();
    this.currentUserId = this.extractUserIdFromToken();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDashboard(+id);
    } else {
      this.loadDefaultDashboard();
    }
  }

  private loadDefaultDashboard(): void {
    this.loading.set(true);
    const appId = parseInt(environment.appId, 10);
    this.dashboardApi.getDashboards().subscribe({
      next: (list) => {
        const appDashboards = list.filter(d => d.applicationId === appId);
        const active = appDashboards.find(d => d.isActive) ?? appDashboards[0];
        if (active) {
          this.loadDashboard(active.id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => { this.toastr.error('Failed to load dashboard'); this.loading.set(false); }
    });
  }

  private loadDashboard(id: number): void {
    this.loading.set(true);
    this.loadLocalLayout(id);
    this.dashboardApi.getDashboard(id).subscribe({
      next: (d) => {
        this.dashboard.set(d);
        this.loadPermittedWidgets(id);
      },
      error: () => { this.toastr.error('Failed to load dashboard'); this.loading.set(false); }
    });
  }

  private loadPermittedWidgets(dashboardId: number): void {
    this.widgetApi.getWidgetsByDashboard(dashboardId).subscribe({
      next: (all) => {
        const permitted = all.filter(w => this.hasAccess(w));
        this.widgets.set(permitted);
        this.loading.set(false);
        permitted.forEach(w => {
          this.initFilterDefaults(w);
          this.loadWidgetData(w, this.getFilterValues(w.id));
        });
      },
      error: () => this.loading.set(false)
    });
  }

  private loadWidgetData(widget: Widget, filters?: Record<string, any>): void {
    if (!widget.isConfigured) return;
    const config = parseDataSourceConfig(widget.queryConfig);
    const merged = { ...(filters ?? this.getFilterValues(widget.id)), ...this.buildWidgetDateParams(widget.id) };

    // API-type widgets: frontend calls the URL directly
    if (config?.sourceType === 'API' && config.apiUrl) {
      this.widgetApi.callApiWidget(config, merged).subscribe({
        next: (result) => {
          const map = new Map(this.widgetData());
          map.set(widget.id, result);
          this.widgetData.set(map);
        },
        error: () => {}
      });
      return;
    }

    // For other types, pass config.filters so session params can be resolved
    this.widgetApi.getWidgetData(widget.id, merged, config?.filters).subscribe({
      next: (result) => {
        const map = new Map(this.widgetData());
        map.set(widget.id, result);
        this.widgetData.set(map);
      },
      error: () => {}
    });
  }

  hasAccess(widget: Widget): boolean {
    // If no roles are specified, DENY access (widget is private by default)
    if (!widget.permittedRoles || widget.permittedRoles.length === 0) return false;
    // Otherwise, check if user has one of the permitted roles
    return widget.permittedRoles.some(r => this.userRoles.includes(r));
  }

  getWidgetData(widgetId: number): QueryResult | null {
    return this.widgetData().get(widgetId) ?? null;
  }

  getChartStyle(widgetId: number): string {
    try {
      const raw = localStorage.getItem(`wc_${widgetId}`);
      return raw ? (JSON.parse(raw)?.style ?? 'donut') : 'donut';
    } catch { return 'donut'; }
  }

  getChartConfig(widgetId: number): Record<string, any> {
    try {
      const raw = localStorage.getItem(`wc_${widgetId}`);
      return raw ? (JSON.parse(raw) ?? {}) : {};
    } catch { return {}; }
  }

  // ── Runtime filter helpers ─────────────────────────────────────────────────

  getFilterDefs(widget: Widget): FilterDefinition[] {
    return parseDataSourceConfig(widget.queryConfig)?.filters ?? [];
  }

  isDateSortingEnabled(widget: Widget): boolean {
    return parseDataSourceConfig(widget.queryConfig)?.enableRecordDtSort ?? false;
  }

  getFilterValues(widgetId: number): Record<string, any> {
    return this.filterValues().get(widgetId) ?? {};
  }

  updateFilter(widget: Widget, paramName: string, value: any): void {
    const map = new Map(this.filterValues());
    const current = map.get(widget.id) ?? {};
    map.set(widget.id, { ...current, [paramName]: value });
    this.filterValues.set(map);
    this.loadWidgetData(widget, map.get(widget.id)!);
  }

  private initFilterDefaults(widget: Widget): void {
    const defs = this.getFilterDefs(widget);
    if (defs.length === 0) return;
    const defaults: Record<string, any> = {};
    defs.forEach(fd => { if (fd.defaultValue !== null && fd.defaultValue !== undefined) defaults[fd.paramName] = fd.defaultValue; });
    if (Object.keys(defaults).length > 0) {
      const map = new Map(this.filterValues());
      map.set(widget.id, defaults);
      this.filterValues.set(map);
    }
  }

  getWidgetRange(id: number): DateRangeKey     { return this.widgetRanges()[id]     ?? 'ALL'; }
  getWidgetCustomFrom(id: number): string      { return this.widgetCustomFrom()[id]  ?? ''; }
  getWidgetCustomTo(id: number): string        { return this.widgetCustomTo()[id]    ?? ''; }

  setWidgetRange(widget: Widget, key: DateRangeKey): void {
    this.widgetRanges.update(m => ({ ...m, [widget.id]: key }));
    if (key !== 'CUSTOM') this.loadWidgetData(widget, this.getFilterValues(widget.id));
  }
  setWidgetCustomFrom(widget: Widget, val: string): void {
    this.widgetCustomFrom.update(m => ({ ...m, [widget.id]: val }));
  }
  setWidgetCustomTo(widget: Widget, val: string): void {
    this.widgetCustomTo.update(m => ({ ...m, [widget.id]: val }));
  }
  applyWidgetCustomRange(widget: Widget): void {
    if (this.getWidgetCustomFrom(widget.id) && this.getWidgetCustomTo(widget.id)) {
      this.loadWidgetData(widget, this.getFilterValues(widget.id));
    }
  }

  private buildWidgetDateParams(id: number): Record<string, string> {
    const key = this.getWidgetRange(id);
    if (key === 'ALL') return {};
    const now = new Date();
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    let from: string | null = null, to: string | null = null;
    switch (key) {
      case '24H':    from = toISO(new Date(now.getTime() - 86_400_000));    to = toISO(now); break;
      case '3D':     from = toISO(new Date(now.getTime() - 3*86_400_000));  to = toISO(now); break;
      case '7D':     from = toISO(new Date(now.getTime() - 7*86_400_000));  to = toISO(now); break;
      case '30D':    from = toISO(new Date(now.getTime() - 30*86_400_000)); to = toISO(now); break;
      case 'CUSTOM':
        from = this.getWidgetCustomFrom(id) || null;
        to   = this.getWidgetCustomTo(id)   || null;
        break;
    }
    const p: Record<string, string> = {};
    if (from) p['_drFrom'] = from;
    if (to)   p['_drTo']   = to;
    return p;
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  private resetDashboardPage(): void {
    this.layoutDesignerOpen.set(false);
    this.filterValues.set(new Map());
    this.widgetRanges.set({});
    this.widgetCustomFrom.set({});
    this.widgetCustomTo.set({});
    this.widgetData.set(new Map());

    const dashboardId = this.dashboard()?.id;
    if (dashboardId) {
      this.loadDashboard(dashboardId);
    } else {
      this.loadDefaultDashboard();
    }
  }

  private exit(): void {
    this.router.navigate(['/']);
  }

  isRefreshing(id: number): boolean { return this.refreshingWidgets().has(id); }

  refreshWidget(widget: Widget): void {
    if (this.isRefreshing(widget.id)) return;
    this.refreshingWidgets.update(s => new Set([...s, widget.id]));
    this.widgetApi.refreshWidgetCache(widget.id).subscribe({
      next: () => {
        this.refreshingWidgets.update(s => { const n = new Set(s); n.delete(widget.id); return n; });
        const map = new Map(this.widgetData()); map.delete(widget.id); this.widgetData.set(map);
        this.loadWidgetData(widget, this.getFilterValues(widget.id));
      },
      error: () => {
        this.refreshingWidgets.update(s => { const n = new Set(s); n.delete(widget.id); return n; });
      }
    });
  }

  private extractRolesFromToken(): string[] {
    try {
      const token = localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token');
      if (!token) return [];
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Try multiple possible locations for roles in JWT token
      const roles = payload?.realm_access?.roles
        ?? payload?.realmRoles
        ?? payload?.roles
        ?? payload?.resource_access?.['AcquireHub-BE']?.roles
        ?? [];
      console.log('Extracted user roles:', roles);
      return Array.isArray(roles) ? roles : [];
    } catch (e) {
      console.error('Failed to extract roles from token:', e);
      return [];
    }
  }

  private extractUserIdFromToken(): string {
    try {
      const token = localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token');
      if (!token) return 'anonymous';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.sub ?? payload?.preferred_username ?? payload?.email ?? 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // ── Layout Designer ──────────────────────────────────────────────────────────

  openLayoutDesigner(): void { this.layoutDesignerOpen.set(true); }
  closeLayoutDesigner(): void { this.layoutDesignerOpen.set(false); }

  onLayoutSaved(layoutConfigJson: string): void {
    const d = this.dashboard();
    if (!d) return;
    const parsed = JSON.parse(layoutConfigJson);
    this.localLayoutConfig.set(parsed);
    this.layoutStorage.save(this.currentUserId, d.id, parsed);
    this.toastr.success('Layout saved');
    this.layoutDesignerOpen.set(false);
  }
}
