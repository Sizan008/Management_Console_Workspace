export enum WidgetType {
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  LINE_CHART = 'LINE_CHART',
  KPI_CARD = 'KPI_CARD',
  STAT_CARD = 'STAT_CARD',
  DATA_TABLE = 'DATA_TABLE',
  APPROVAL_LIST = 'APPROVAL_LIST'
}

// ── Data source types ─────────────────────────────────────────────────────────

export type DataSourceType  = 'VIEW' | 'STORED_PROCEDURE' | 'API' | 'BUILD_QUERY';
export type FilterInputType = 'DATE' | 'TEXT' | 'SELECT';
export type ParamSource     = 'LITERAL' | 'RUNTIME_FILTER' | 'SESSION';

// Session parameter keys are sourced at runtime from META_DASHBOARD_SESSION_DATA
// (see MetaDashboardSessionDataService), so they are plain strings here.

export interface FilterDefinition {
  paramName:        string;
  label:            string;
  inputType:        FilterInputType;
  dataType:         'DATE' | 'VARCHAR' | 'NUMBER';
  defaultValue:     any;
  options:          string[];
  entityId?:        number;   // BUILD_QUERY: matches WHERE condition
  fieldId?:         number;
  procParamName?:   string;   // STORED_PROCEDURE: IN param name

  // NEW: Parameter source (LITERAL, RUNTIME_FILTER, SESSION)
  paramSource:      ParamSource;

  // NEW: For SESSION mode, which session field to use
  sessionFieldName?: string;
}

export interface ProcedureParam {
  name:              string;
  dataType:          'DATE' | 'VARCHAR' | 'NUMBER' | 'SESSION';
  defaultValue?:     any;
  sessionFieldName?: string;  // For SESSION dataType
}

export type ApiParamType = 'QUERY' | 'PATH';

export interface ApiParam {
  type:              ApiParamType;  // QUERY → appended as ?key=val; PATH → substituted into URL as {key}
  name:              string;        // key name (also the {placeholder} name for PATH)
  paramSource?:      ParamSource;   // LITERAL | RUNTIME_FILTER | SESSION (default: LITERAL)
  defaultValue?:     string;        // For LITERAL
  sessionFieldName?: string;  // For SESSION
  description?:      string;
}

// Mirrors Java QueryConfig / QueryBuilderService input structure
export interface QueryBuilderConfig {
  from?:    { entityId: number; alias: string };
  joins?:   any[];
  select?:  any[];
  where?:   any;
  groupBy?: any[];
  having?:  any;
  orderBy?: any[];
  limit?:   number;
}

export interface DataSourceConfig {
  sourceType:        DataSourceType;
  viewName?:         string;
  dateRangeColumn?:  string;        // column for _drFrom/_drTo date range filter (VIEW + BUILD_QUERY)
  procedureName?:    string;
  procedureParams?:  ProcedureParam[];
  apiUrl?:           string;
  apiMethod?:        'GET' | 'POST';
  apiParams?:        ApiParam[];
  apiBody?:          string;
  queryConfig?:      QueryBuilderConfig;
  filters:           FilterDefinition[];
  enableRecordDtSort?: boolean;     // Enable date-wise sorting by RecordDt
  recordDtColumn?:   string;        // RecordDt column name (defaults to RECORD_DT)
}

// ── Core models ───────────────────────────────────────────────────────────────

export interface Widget {
  id: number;
  dashboardId: number;
  name: string;
  widgetType: WidgetType;
  queryConfig: string | null;
  /** Absent/null for widgets the API returns without a role restriction. */
  permittedRoles: string[] | null;
  cacheTtlMinutes: number;
  isConfigured: number;
  isActive: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  generatedSql: string;
}

export interface AddWidgetCommand {
  dashboardId?: number;
  name: string;
  widgetType: string;
  queryConfig: string | null;
  permittedRoles: string[];
  cacheTtlMinutes: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface UpdateWidgetCommand {
  name: string;
  widgetType: string;
  queryConfig: string | null;
  permittedRoles: string[];
  cacheTtlMinutes: number;
  isConfigured: number;
}

export interface UpdateWidgetLayoutCommand {
  posX: number;
  posY: number;
  width: number;
  height: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a widget's queryConfig string into a DataSourceConfig.
 *  Returns null if blank; wraps plain view names (legacy) as a VIEW config. */
export function parseDataSourceConfig(raw: string | null): DataSourceConfig | null {
  if (!raw || !raw.trim()) return null;
  if (raw.trim().startsWith('{')) {
    try { return JSON.parse(raw) as DataSourceConfig; } catch { return null; }
  }
  // Legacy: bare view name
  return { sourceType: 'VIEW', viewName: raw.trim(), filters: [] };
}

/** Returns true when the config has enough info to fetch data. */
export function isDataSourceConfigured(cfg: DataSourceConfig): boolean {
  switch (cfg.sourceType) {
    case 'VIEW':             return !!cfg.viewName?.trim();
    case 'STORED_PROCEDURE': return !!cfg.procedureName?.trim();
    case 'API':              return !!cfg.apiUrl?.trim();
    case 'BUILD_QUERY':      return !!cfg.queryConfig?.from;
    default: return false;
  }
}
