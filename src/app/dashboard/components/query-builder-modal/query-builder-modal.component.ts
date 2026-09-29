import {
  Component, OnInit, inject, signal, computed, input, output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { WidgetApi } from '../../services/widget.api';
import { QueryBuilderConfig, QueryResult } from '../../models/widget.model';
import {
  MetaDashboardEntity,
  MetaDashboardEntityField,
  MetaDashboardEntityService
} from '../../services/meta-dashboard-entity.service';
import {
  MetaDashboardSessionDataService,
  SessionDataItem
} from '../../services/meta-dashboard-session-data.service';


type TabId = 'from' | 'joins' | 'select' | 'where' | 'groupby' | 'having' | 'orderby' | 'preview';
type JoinType = 'INNER' | 'LEFT' | 'RIGHT';

/**
 * A single JOIN row. The ON condition is captured as entity/field dropdown pairs;
 * it is serialized to the backend's `alias.COLUMN` string form only in buildConfig().
 */
interface JoinRow {
  entityId:      number | null;
  alias:         string;
  type:          JoinType;
  leftEntityId:  number | null;
  leftFieldId:   number | null;
  operator:      string;
  rightEntityId: number | null;
  rightFieldId:  number | null;
}

interface GroupByRow { entityId: number | null; fieldId: number | null; }
interface HavingRow  { entityId: number | null; fieldId: number | null; aggregate: string; operator: string; value: string; }

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];
const JOIN_OPERATORS = ['=', '!=', '>', '<', '>=', '<='];
const JOIN_TYPES: JoinType[] = ['INNER', 'LEFT', 'RIGHT'];
const AGGREGATES = ['', 'SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];
const HAVING_AGGREGATES = ['SUM', 'COUNT', 'AVG', 'MIN', 'MAX'];


@Component({
  selector: 'app-query-builder-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-builder-modal.component.html',
  styleUrl: './query-builder-modal.component.scss'
})
export class QueryBuilderModalComponent implements OnInit {
  private entityService = inject(MetaDashboardEntityService);
  private sessionDataService = inject(MetaDashboardSessionDataService);
  private widgetApi     = inject(WidgetApi);

  readonly initialConfig = input<QueryBuilderConfig | null>(null);
  readonly close         = output<void>();
  readonly configSaved   = output<QueryBuilderConfig>();

  // ── Lookup data ─────────────────────────────────────────────────────────────
  entities     = signal<MetaDashboardEntity[]>([]);
  entityFields = signal<Map<number, MetaDashboardEntityField[]>>(new Map());
  loadingEntities = signal(false);

  // ── Working config ───────────────────────────────────────────────────────────
  fromEntityId   = signal<number | null>(null);
  fromAlias      = signal<string>('t');
  joinRows       = signal<JoinRow[]>([]);
  selectRows     = signal<Array<{ entityId: number | null; fieldId: number | null; fieldName: string; alias: string; aggregate: string }>>([]);
  whereOp        = signal<'AND' | 'OR'>('AND');
  whereRows      = signal<Array<{
    entityId: number | null;
    fieldId: number | null;
    operator: string;
    value: string;
    valueMode: 'literal' | 'column' | 'session';
    rightEntityId: number | null;
    rightFieldId: number | null;
    sessionFieldName?: string;
    // NEW: Grouping support
    logicalOp?: 'AND' | 'OR';  // operator before this condition
    groupLevel?: number;        // nesting depth (0 = top level)
  }>>([]);
  groupByRows    = signal<GroupByRow[]>([]);
  havingOp       = signal<'AND' | 'OR'>('AND');
  havingRows     = signal<HavingRow[]>([]);
  orderByRows    = signal<Array<{ entityId: number | null; fieldId: number | null; direction: 'ASC' | 'DESC' }>>([]);
  limitVal       = signal<number>(100);

  // ── UI state ─────────────────────────────────────────────────────────────────
  activeTab      = signal<TabId>('from');
  previewResult  = signal<QueryResult | null>(null);
  previewLoading = signal(false);
  previewError   = signal<string | null>(null);
  selectAllEnabled = signal<boolean>(false);
  previewSessionParams = signal<Record<string, string>>({});

  // ── Derived ──────────────────────────────────────────────────────────────────
  readonly fromFields = computed(() => this.fieldsForClean(this.fromEntityId()));

  /** FROM entity plus every joined entity — drives the per-row table picker. */
  readonly usedEntities = computed(() => {
    const out: { id: number; label: string }[] = [];
    const fromId = this.fromEntityId();
    if (fromId) out.push({ id: fromId, label: this.entityName(fromId) });
    for (const j of this.joinRows()) {
      if (j.entityId != null && !out.some(e => e.id === j.entityId)) {
        out.push({ id: j.entityId, label: this.entityName(j.entityId) });
      }
    }
    return out;
  });

  /** True once at least one join brings a second table into play. */
  readonly hasJoins = computed(() => this.usedEntities().length > 1);

  /**
   * Warn when an explicit GROUP BY omits a non-aggregated SELECT column — Oracle
   * rejects that ("not a GROUP BY expression"). Only fires once you add explicit
   * GROUP BY rows; with none, the backend auto-groups and this stays silent.
   */
  readonly groupByWarning = computed<string | null>(() => {
    const gb = this.groupByRows().filter(r => r.entityId && r.fieldId);
    if (gb.length === 0) return null;
    const selects = this.selectRows().filter(r => r.entityId && r.fieldId);
    if (!selects.some(s => s.aggregate)) return null;
    const key = (e: number | null, f: number | null) => `${e}:${f}`;
    const grouped = new Set(gb.map(r => key(r.entityId, r.fieldId)));
    const missing = selects.filter(s => !s.aggregate && !grouped.has(key(s.entityId, s.fieldId)));
    if (missing.length === 0) return null;
    const names = missing.map(s => this.fieldDisplayName(s.entityId, s.fieldId)).join(', ');
    return `These SELECT columns are neither aggregated nor grouped, so Oracle will reject the query: ${names}. Add them to GROUP BY, or wrap them in an aggregate.`;
  });

  readonly operators        = OPERATORS;
  readonly joinOperators    = JOIN_OPERATORS;
  readonly joinTypes        = JOIN_TYPES;
  readonly aggregates       = AGGREGATES;
  readonly havingAggregates = HAVING_AGGREGATES;

  // Session parameters for the "Session Data" dropdown, loaded from
  // META_DASHBOARD_SESSION_DATA (key = bound at runtime, value = label).
  sessionFields = signal<SessionDataItem[]>([]);

  ngOnInit(): void {
    this.loadEntities();
    this.loadSessionFields();
    const init = this.initialConfig();
    if (init) this.patchFromConfig(init);
  }

  private loadSessionFields(): void {
    this.sessionDataService.getSessionData().subscribe({
      next: (list) => this.sessionFields.set(list),
      error: () => this.sessionFields.set([]),
    });
  }

  // ── Load entities / fields ─────────────────────────────────────────────────────

  private loadEntities(): void {
    this.loadingEntities.set(true);
    this.entityService.getAllActiveEntities().subscribe({
      next: (list) => { this.entities.set(list); this.loadingEntities.set(false); },
      error: () => { this.loadingEntities.set(false); }
    });
  }

  loadFieldsFor(entityId: number): void {
    if (!entityId || this.entityFields().has(entityId)) return;
    this.entityService.getEntityFields(entityId).subscribe({
      next: (fields) => {
        const map = new Map(this.entityFields());
        map.set(entityId, fields);
        this.entityFields.set(map);
      }
    });
  }

  /** Load fields for a batch of entities, then run `done` once all have arrived. */
  private loadFieldsForAllThen(entityIds: number[], done: () => void): void {
    const toLoad = [...new Set(entityIds)].filter(id => !!id && !this.entityFields().has(id));
    if (toLoad.length === 0) { done(); return; }
    forkJoin(toLoad.map(id => this.entityService.getEntityFields(id))).subscribe({
      next: (results) => {
        const map = new Map(this.entityFields());
        toLoad.forEach((id, i) => map.set(id, results[i]));
        this.entityFields.set(map);
        done();
      },
      error: () => done(),
    });
  }

  fieldsFor(entityId: number | null): MetaDashboardEntityField[] {
    if (!entityId) return [];
    return this.entityFields().get(entityId) ?? [];
  }

  /** Fields for an entity, deduped and with zero-id (Oracle NULL COLUMN_ID) rows removed. */
  fieldsForClean(entityId: number | null): MetaDashboardEntityField[] {
    const raw = entityId ? (this.entityFields().get(entityId) ?? []) : [];
    const seen = new Set<number>();
    return raw.filter(f => f.id > 0 && !seen.has(f.id) && seen.add(f.id) !== undefined);
  }

  entityName(entityId: number | null): string {
    if (!entityId) return '';
    return this.entities().find(e => e.id === entityId)?.entityAlias ?? String(entityId);
  }

  fieldDisplayName(entityId: number | null, fieldId: number | null): string {
    if (!entityId || !fieldId) return '';
    return this.fieldsFor(entityId).find(f => f.id === fieldId)?.displayName ?? String(fieldId);
  }

  // ── FROM selection ───────────────────────────────────────────────────────────

  onFromEntityChange(entityIdStr: string): void {
    const id = Number(entityIdStr);
    this.fromEntityId.set(id || null);
    if (id) {
      this.loadFieldsFor(id);
      const entity = this.entities().find(e => e.id === id);
      if (entity) this.fromAlias.set(entity.entityAlias.substring(0, 20).replace(/\s/g, '_').toLowerCase());
    }
  }

  // ── JOIN rows ──────────────────────────────────────────────────────────────────

  addJoinRow(): void {
    this.joinRows.update(rows => [...rows, {
      entityId: null, alias: '', type: 'INNER',
      leftEntityId: this.fromEntityId(), leftFieldId: null,
      operator: '=', rightEntityId: null, rightFieldId: null,
    }]);
  }

  removeJoinRow(i: number): void {
    const removed = this.joinRows()[i];
    this.joinRows.update(rows => rows.filter((_, idx) => idx !== i));
    if (removed?.entityId != null) {
      const stillPresent = removed.entityId === this.fromEntityId()
        || this.joinRows().some(r => r.entityId === removed.entityId);
      if (!stillPresent) this.detachEntity(removed.entityId);
    }
  }

  private updateJoin(i: number, patch: Partial<JoinRow>): void {
    this.joinRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  onJoinEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    const alias = id ? this.genJoinAlias(id, i) : '';
    this.joinRows.update(rows => rows.map((r, idx) => idx === i
      ? { ...r, entityId: id, alias, rightEntityId: id, rightFieldId: null,
          leftEntityId: r.leftEntityId ?? this.fromEntityId() }
      : r));
  }

  setJoinType(i: number, value: string): void { this.updateJoin(i, { type: (value as JoinType) }); }
  setJoinAlias(i: number, value: string): void { this.updateJoin(i, { alias: value }); }
  setJoinOperator(i: number, value: string): void { this.updateJoin(i, { operator: value }); }

  onJoinLeftEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.updateJoin(i, { leftEntityId: id, leftFieldId: null });
  }
  setJoinLeftField(i: number, fieldIdStr: string): void {
    this.updateJoin(i, { leftFieldId: Number(fieldIdStr) || null });
  }
  onJoinRightEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.updateJoin(i, { rightEntityId: id, rightFieldId: null });
  }
  setJoinRightField(i: number, fieldIdStr: string): void {
    this.updateJoin(i, { rightFieldId: Number(fieldIdStr) || null });
  }

  /** Generate a short, unique table alias for a newly-picked join entity. */
  private genJoinAlias(entityId: number, excludeIndex: number): string {
    const ent = this.entities().find(e => e.id === entityId);
    let base = this.sanitizeAlias((ent?.entityAlias ?? 'j').replace(/\s/g, '_').toLowerCase()).substring(0, 3) || 'j';
    if (!/^[a-zA-Z]/.test(base)) base = 'j';
    const taken = new Set<string>();
    taken.add(this.sanitizeAlias(this.fromAlias()).toLowerCase());
    this.joinRows().forEach((r, idx) => { if (idx !== excludeIndex && r.alias) taken.add(this.sanitizeAlias(r.alias).toLowerCase()); });
    if (!taken.has(base.toLowerCase())) return base;
    let n = 2;
    while (taken.has((base + n).toLowerCase())) n++;
    return base + n;
  }

  /** When an entity is removed from the query, reset any rows that referenced it. */
  private detachEntity(entityId: number): void {
    const from = this.fromEntityId();
    this.selectRows.update(rows => rows.map(r => r.entityId === entityId ? { ...r, entityId: from, fieldId: null, fieldName: '' } : r));
    this.whereRows.update(rows => rows.map(r => r.entityId === entityId ? { ...r, entityId: from, fieldId: null } : r));
    this.groupByRows.update(rows => rows.map(r => r.entityId === entityId ? { ...r, entityId: from, fieldId: null } : r));
    this.havingRows.update(rows => rows.map(r => r.entityId === entityId ? { ...r, entityId: from, fieldId: null } : r));
    this.orderByRows.update(rows => rows.map(r => r.entityId === entityId ? { ...r, entityId: from, fieldId: null } : r));
    this.joinRows.update(rows => rows.map(r => ({
      ...r,
      leftEntityId:  r.leftEntityId  === entityId ? null : r.leftEntityId,
      leftFieldId:   r.leftEntityId  === entityId ? null : r.leftFieldId,
      rightEntityId: r.rightEntityId === entityId ? null : r.rightEntityId,
      rightFieldId:  r.rightEntityId === entityId ? null : r.rightFieldId,
    })));
  }

  // ── SELECT rows ──────────────────────────────────────────────────────────────

  toggleSelectAll(): void {
    if (this.selectAllEnabled()) {
      // Disable: clear all rows
      this.selectRows.set([]);
      this.selectAllEnabled.set(false);
    } else {
      // Enable: populate all columns from FROM and joined entities
      const newRows: any[] = [];

      // Add all columns from the FROM entity
      const fromId = this.fromEntityId();
      if (fromId) {
        const fromFields = this.fieldsForClean(fromId);
        fromFields.forEach(field => {
          newRows.push({
            entityId: fromId,
            fieldId: field.id,
            fieldName: field.displayName || '',
            alias: '',
            aggregate: ''
          });
        });
      }

      // Add all columns from joined entities
      for (const join of this.joinRows()) {
        if (join.entityId) {
          const joinFields = this.fieldsForClean(join.entityId);
          joinFields.forEach(field => {
            newRows.push({
              entityId: join.entityId,
              fieldId: field.id,
              fieldName: field.displayName || '',
              alias: '',
              aggregate: ''
            });
          });
        }
      }

      this.selectRows.set(newRows);
      this.selectAllEnabled.set(true);
    }
  }

  addSelectRow(): void {
    this.selectRows.update(rows => [...rows, { entityId: this.fromEntityId(), fieldId: null, fieldName: '', alias: '', aggregate: '' }]);
  }

  removeSelectRow(i: number): void {
    this.selectRows.update(rows => rows.filter((_, idx) => idx !== i));
    this.selectAllEnabled.set(false);
  }

  onSelectEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.selectRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, entityId: id, fieldId: null, fieldName: '' } : r));
    this.selectAllEnabled.set(false);
  }

  onSelectFieldChange(i: number, fieldIdStr: string): void {
    const id = Number(fieldIdStr) || null;
    const entityId = this.selectRows()[i]?.entityId;
    const fieldName = id && entityId ? (this.fieldsFor(entityId).find(f => f.id === id)?.displayName ?? '') : '';
    this.selectRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, fieldId: id, fieldName } : r));
    this.selectAllEnabled.set(false);
  }

  // ── WHERE rows ───────────────────────────────────────────────────────────────

  addWhereRow(): void {
    this.whereRows.update(rows => [...rows, { entityId: this.fromEntityId(), fieldId: null, operator: '=', value: '', valueMode: 'literal', rightEntityId: null, rightFieldId: null }]);
  }

  removeWhereRow(i: number): void {
    this.whereRows.update(rows => rows.filter((_, idx) => idx !== i));
  }

  onWhereEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, entityId: id, fieldId: null } : r));
  }

  onWhereFieldChange(i: number, fieldIdStr: string): void {
    const id = Number(fieldIdStr) || null;
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, fieldId: id } : r));
  }

  isNullOperator(op: string): boolean {
    return op === 'IS NULL' || op === 'IS NOT NULL';
  }

  setSelectAggregate(i: number, value: string): void {
    this.selectRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, aggregate: value } : r));
  }

  setSelectAlias(i: number, value: string): void {
    this.selectRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, alias: value } : r));
  }

  setWhereOperator(i: number, value: string): void {
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, operator: value } : r));
  }

  setWhereValue(i: number, value: string): void {
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, value } : r));
  }

  setWhereValueMode(i: number, mode: string): void {
    const valueMode: 'literal' | 'column' | 'session' =
      mode === 'column' ? 'column' :
      mode === 'session' ? 'session' : 'literal';

    this.whereRows.update(rows => rows.map((r, idx) => {
      if (idx !== i) return r;
      // Default the RHS table to FROM so the field dropdown has something to show (for column mode).
      const rightEntityId = valueMode === 'column' ? (r.rightEntityId ?? this.fromEntityId()) : r.rightEntityId;
      return { ...r, valueMode, rightEntityId };
    }));

    const eid = this.whereRows()[i]?.rightEntityId;
    if (valueMode === 'column' && eid) this.loadFieldsFor(eid);
  }

  setWhereSessionField(i: number, fieldName: string): void {
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, sessionFieldName: fieldName || undefined } : r));
  }

  onWhereRightEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, rightEntityId: id, rightFieldId: null } : r));
  }

  setWhereRightField(i: number, fieldIdStr: string): void {
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, rightFieldId: Number(fieldIdStr) || null } : r));
  }

  // ── WHERE Grouping ────────────────────────────────────────────────────────────

  setWhereLogicalOp(i: number, op: string): void {
    const logicalOp: 'AND' | 'OR' = op === 'OR' ? 'OR' : 'AND';
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, logicalOp } : r));
  }

  increaseGroupLevel(i: number): void {
    const currentLevel = this.whereRows()[i]?.groupLevel ?? 0;
    this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, groupLevel: currentLevel + 1 } : r));
  }

  decreaseGroupLevel(i: number): void {
    const currentLevel = this.whereRows()[i]?.groupLevel ?? 0;
    if (currentLevel > 0) {
      this.whereRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, groupLevel: currentLevel - 1 } : r));
    }
  }

  // ── GROUP BY rows ────────────────────────────────────────────────────────────

  addGroupByRow(): void {
    this.groupByRows.update(rows => [...rows, { entityId: this.fromEntityId(), fieldId: null }]);
  }

  removeGroupByRow(i: number): void {
    this.groupByRows.update(rows => rows.filter((_, idx) => idx !== i));
  }

  onGroupByEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.groupByRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, entityId: id, fieldId: null } : r));
  }

  setGroupByField(i: number, fieldIdStr: string): void {
    this.groupByRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, fieldId: Number(fieldIdStr) || null } : r));
  }

  // ── HAVING rows ──────────────────────────────────────────────────────────────

  addHavingRow(): void {
    this.havingRows.update(rows => [...rows, { entityId: this.fromEntityId(), fieldId: null, aggregate: 'SUM', operator: '>', value: '' }]);
  }

  removeHavingRow(i: number): void {
    this.havingRows.update(rows => rows.filter((_, idx) => idx !== i));
  }

  onHavingEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.havingRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, entityId: id, fieldId: null } : r));
  }

  setHavingField(i: number, fieldIdStr: string): void {
    this.havingRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, fieldId: Number(fieldIdStr) || null } : r));
  }
  setHavingAggregate(i: number, value: string): void {
    this.havingRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, aggregate: value } : r));
  }
  setHavingOperator(i: number, value: string): void {
    this.havingRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, operator: value } : r));
  }
  setHavingValue(i: number, value: string): void {
    this.havingRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, value } : r));
  }

  // ── ORDER BY rows ────────────────────────────────────────────────────────────

  addOrderByRow(): void {
    this.orderByRows.update(rows => [...rows, { entityId: this.fromEntityId(), fieldId: null, direction: 'ASC' }]);
  }

  removeOrderByRow(i: number): void {
    this.orderByRows.update(rows => rows.filter((_, idx) => idx !== i));
  }

  onOrderByEntityChange(i: number, entityIdStr: string): void {
    const id = Number(entityIdStr) || null;
    if (id) this.loadFieldsFor(id);
    this.orderByRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, entityId: id, fieldId: null } : r));
  }

  setOrderByFieldId(i: number, value: string): void {
    const id = Number(value) || null;
    this.orderByRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, fieldId: id } : r));
  }

  setOrderByDirection(i: number, value: string): void {
    const dir = value as 'ASC' | 'DESC';
    this.orderByRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, direction: dir } : r));
  }

  // ── Preview ──────────────────────────────────────────────────────────────────

  getSessionParamsInUse(): string[] {
    const params = new Set<string>();
    for (const row of this.whereRows()) {
      if (row.valueMode === 'session' && row.sessionFieldName) {
        params.add(row.sessionFieldName);
      }
    }
    return Array.from(params).sort();
  }

  /** Value typed for a session parameter in the preview panel, '' when untouched. */
  previewSessionParam(paramName: string): string {
    return this.previewSessionParams()[paramName] ?? '';
  }

  setPreviewSessionParam(paramName: string, value: string): void {
    this.previewSessionParams.update(p => ({ ...p, [paramName]: value }));
  }

  runPreview(): void {
    const queryConfig = this.buildConfig();
    if (!queryConfig.from) { this.previewError.set('Select a FROM entity first'); return; }
    this.previewLoading.set(true);
    this.previewError.set(null);
    this.previewResult.set(null);

    // Wrap QueryBuilderConfig in a full DataSourceConfig
    const dataSourceConfig = {
      sourceType: 'BUILD_QUERY',
      queryConfig,
      filters: [],
      sessionParams: this.previewSessionParams()
    };

    this.widgetApi.previewQuery({ queryConfigJson: JSON.stringify(dataSourceConfig) }).subscribe({
      next: (r) => { this.previewResult.set(r); this.previewLoading.set(false); },
      error: (e) => {
        this.previewError.set(e?.error?.message ?? 'Preview failed');
        this.previewLoading.set(false);
      }
    });
  }

  // ── Apply ────────────────────────────────────────────────────────────────────

  apply(): void {
    const config = this.buildConfig();
    if (!config.from) return;
    this.configSaved.emit(config);
  }

  // ── Build QueryBuilderConfig ─────────────────────────────────────────────────

  private buildConfig(): QueryBuilderConfig {
    const fromId = this.fromEntityId();
    const alias  = this.sanitizeAlias(this.fromAlias());

    const config: QueryBuilderConfig = { limit: this.limitVal() };

    if (fromId) {
      config.from = { entityId: fromId, alias };
    }

    // JOINs — ON condition is emitted as backend-expected `alias.COLUMN` strings.
    const joins = this.joinRows()
      .filter(r => r.entityId && r.leftEntityId && r.leftFieldId && r.rightEntityId && r.rightFieldId)
      .map(r => ({
        entityId: r.entityId!,
        alias:    this.aliasOf(r.entityId!),
        type:     r.type,
        on: {
          leftField:  this.fieldRef(r.leftEntityId!, r.leftFieldId!),
          operator:   r.operator,
          rightField: this.fieldRef(r.rightEntityId!, r.rightFieldId!),
        }
      }));
    if (joins.length) config.joins = joins;

    const selects = this.selectRows()
      .filter(r => r.entityId && r.fieldId)
      .map(r => ({
        entityId:  r.entityId!,
        fieldId:   r.fieldId!,
        fieldName: r.fieldName || undefined,
        alias:     r.alias || undefined,
        aggregate: r.aggregate || undefined
      }));
    if (selects.length) config.select = selects;

    const conditions = this.whereRows()
      .filter(r => r.entityId && r.fieldId)
      .map(r => {
        const base: any = {
          entityId: r.entityId!,
          fieldId: r.fieldId!,
          operator: r.operator,
          logicalOp: r.logicalOp || undefined,  // NEW: Per-condition AND/OR
          groupLevel: r.groupLevel !== undefined ? r.groupLevel : undefined  // NEW: Nesting level
        };
        if (this.isNullOperator(r.operator)) return { ...base, value: null };
        if (r.valueMode === 'column' && r.rightEntityId && r.rightFieldId) {
          return { ...base, rightEntityId: r.rightEntityId, rightFieldId: r.rightFieldId };
        }
        if (r.valueMode === 'session' && r.sessionFieldName) {
          return { ...base, sessionFieldName: r.sessionFieldName, value: null };
        }
        return { ...base, value: r.value || null };
      });
    if (conditions.length) {
      config.where = { operator: this.whereOp(), conditions };
    }

    const groupBys = this.groupByRows()
      .filter(r => r.entityId && r.fieldId)
      .map(r => ({ entityId: r.entityId!, fieldId: r.fieldId! }));
    if (groupBys.length) config.groupBy = groupBys;

    const havingConds = this.havingRows()
      .filter(r => r.entityId && r.fieldId)
      .map(r => ({
        entityId:  r.entityId!,
        fieldId:   r.fieldId!,
        aggregate: r.aggregate || undefined,
        operator:  r.operator,
        value:     this.isNullOperator(r.operator) ? null : (r.value || null)
      }));
    if (havingConds.length) {
      config.having = { operator: this.havingOp(), conditions: havingConds };
    }

    const orderBys = this.orderByRows()
      .filter(r => r.entityId && r.fieldId)
      .map(r => ({ entityId: r.entityId!, fieldId: r.fieldId!, direction: r.direction }));
    if (orderBys.length) config.orderBy = orderBys;

    return config;
  }

  /** Alias for an entity: the FROM alias, or the matching join's alias. */
  private aliasOf(entityId: number): string {
    if (entityId === this.fromEntityId()) return this.sanitizeAlias(this.fromAlias());
    const j = this.joinRows().find(r => r.entityId === entityId);
    return this.sanitizeAlias(j?.alias || this.fromAlias());
  }

  private fieldNameOf(entityId: number, fieldId: number): string {
    return this.fieldsFor(entityId).find(f => f.id === fieldId)?.fieldName ?? '';
  }

  /** `alias.COLUMN` reference for a JOIN ON side. */
  private fieldRef(entityId: number, fieldId: number): string {
    return this.aliasOf(entityId) + '.' + this.fieldNameOf(entityId, fieldId);
  }

  // ── Restore from saved config ──────────────────────────────────────────────────

  private patchFromConfig(cfg: QueryBuilderConfig): void {
    if (cfg.from) {
      this.fromEntityId.set(cfg.from.entityId);
      this.fromAlias.set(cfg.from.alias);
    }
    if (cfg.joins?.length) this.patchJoins(cfg.joins);
    if (cfg.select?.length) {
      this.selectRows.set(cfg.select.map((s: any) => ({
        entityId: s.entityId, fieldId: s.fieldId,
        fieldName: s.fieldName ?? '', alias: s.alias ?? '', aggregate: s.aggregate ?? ''
      })));
    }
    if (cfg.where) {
      this.whereOp.set(cfg.where.operator ?? 'AND');
      this.whereRows.set((cfg.where.conditions ?? []).map((c: any) => ({
        entityId: c.entityId, fieldId: c.fieldId,
        operator: c.operator ?? '=', value: c.value ?? '',
        valueMode: c.rightFieldId != null ? 'column' : c.sessionFieldName ? 'session' : 'literal',
        rightEntityId: c.rightEntityId ?? null, rightFieldId: c.rightFieldId ?? null,
        sessionFieldName: c.sessionFieldName || undefined,
        logicalOp: c.logicalOp || 'AND',  // NEW: Per-condition AND/OR
        groupLevel: c.groupLevel ?? 0      // NEW: Nesting level
      })));
    }
    if (cfg.groupBy?.length) {
      this.groupByRows.set(cfg.groupBy.map((g: any) => ({ entityId: g.entityId, fieldId: g.fieldId })));
    }
    if (cfg.having) {
      this.havingOp.set(cfg.having.operator ?? 'AND');
      this.havingRows.set((cfg.having.conditions ?? []).map((c: any) => ({
        entityId: c.entityId, fieldId: c.fieldId,
        aggregate: c.aggregate ?? 'SUM', operator: c.operator ?? '>', value: c.value ?? ''
      })));
    }
    if (cfg.orderBy?.length) {
      this.orderByRows.set(cfg.orderBy.map((o: any) => ({
        entityId: o.entityId, fieldId: o.fieldId, direction: o.direction ?? 'ASC'
      })));
    }
    if (cfg.limit) this.limitVal.set(cfg.limit);

    // Load fields for every referenced entity, then resolve JOIN ON dropdown selections
    // (which need the physical column names before they can be mapped back to field ids).
    const ids = new Set<number>();
    if (cfg.from) ids.add(cfg.from.entityId);
    (cfg.joins ?? []).forEach((j: any) => j?.entityId && ids.add(j.entityId));
    (cfg.select ?? []).forEach((s: any) => s?.entityId && ids.add(s.entityId));
    (cfg.where?.conditions ?? []).forEach((c: any) => {
      if (c?.entityId) ids.add(c.entityId);
      if (c?.rightEntityId) ids.add(c.rightEntityId);
    });
    (cfg.groupBy ?? []).forEach((g: any) => g?.entityId && ids.add(g.entityId));
    (cfg.having?.conditions ?? []).forEach((c: any) => c?.entityId && ids.add(c.entityId));
    (cfg.orderBy ?? []).forEach((o: any) => o?.entityId && ids.add(o.entityId));
    this.loadFieldsForAllThen([...ids], () => {
      if (cfg.joins?.length) this.resolveJoinOnRefs(cfg.joins);
    });
  }

  private patchJoins(joins: any[]): void {
    this.joinRows.set(joins.map((j: any) => {
      const t = String(j.type ?? 'INNER').toUpperCase() as JoinType;
      return {
        entityId: j.entityId ?? null,
        alias: j.alias ?? '',
        type: JOIN_TYPES.includes(t) ? t : 'INNER',
        leftEntityId: null, leftFieldId: null,
        operator: j.on?.operator ?? '=',
        rightEntityId: null, rightFieldId: null,
      };
    }));
  }

  /** Map each join's stored `alias.COLUMN` ON strings back to entity/field dropdown ids. */
  private resolveJoinOnRefs(joins: any[]): void {
    this.joinRows.update(rows => rows.map((r, i) => {
      const on = joins[i]?.on ?? {};
      const [lA, lC] = String(on.leftField ?? '').split('.');
      const [rA, rC] = String(on.rightField ?? '').split('.');
      const le = this.entityIdForAlias(lA);
      const re = this.entityIdForAlias(rA);
      return {
        ...r,
        leftEntityId:  le, leftFieldId:  le != null ? this.fieldIdForColumn(le, lC) : null,
        rightEntityId: re, rightFieldId: re != null ? this.fieldIdForColumn(re, rC) : null,
      };
    }));
  }

  private entityIdForAlias(alias: string): number | null {
    if (!alias) return null;
    const a = alias.trim().toLowerCase();
    if (this.sanitizeAlias(this.fromAlias()).toLowerCase() === a) return this.fromEntityId();
    const j = this.joinRows().find(r => r.alias && this.sanitizeAlias(r.alias).toLowerCase() === a);
    return j?.entityId ?? null;
  }

  private fieldIdForColumn(entityId: number, col: string): number | null {
    if (!col) return null;
    const c = col.trim().toUpperCase();
    return this.fieldsFor(entityId).find(f => (f.fieldName ?? '').toUpperCase() === c)?.id ?? null;
  }

  private sanitizeAlias(alias: string): string {
    const cleaned = alias.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9_]+/, 't');
    return cleaned.substring(0, 20) || 't';
  }

  // ── Helpers for template ─────────────────────────────────────────────────────

  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'from',    label: 'FROM' },
    { id: 'joins',   label: 'JOINS' },
    { id: 'select',  label: 'SELECT' },
    { id: 'where',   label: 'WHERE' },
    { id: 'groupby', label: 'GROUP BY' },
    { id: 'having',  label: 'HAVING' },
    { id: 'orderby', label: 'ORDER BY' },
    { id: 'preview', label: '▶ Preview' },
  ];

  selectTab(id: TabId): void { this.activeTab.set(id); }

  configValid(): boolean { return this.fromEntityId() !== null; }

  previewCols(): string[] { return this.previewResult()?.columns ?? []; }
  previewRows(): Record<string, any>[] { return this.previewResult()?.rows ?? []; }
  previewSql(): string { return this.previewResult()?.generatedSql ?? ''; }
}
