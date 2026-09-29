import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { WidgetService } from '../../services/widget.service';
import { MetaDashboardEntityService, MetaDashboardEntity } from '../../services/meta-dashboard-entity.service';
import { MetaWidgetTypeService, MetaWidgetType } from '../../services/meta-widget-type.service';
import { Dashboard } from '../../models/dashboard-designer.model';
import { Widget, AddWidgetCommand, UpdateWidgetCommand } from '../../models/widget-designer.model';
import { QueryDefinition, FilterDefinition, JoinDefinition } from '../../models/query-definition.model';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputNumber } from '../../../shared/common-components/input-types/input-number/input-number';
import { GenericButton } from '../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { ExpansionPanelHeader } from '../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { ToastHelperService } from '../../../shared/services/toast-helper.service';

type DropdownOption = { key: string; value: string };

@Component({
  selector: 'app-dashboard-designer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField,
    InputNumber,
    GenericButton,
    ExpansionPanelHeader
  ],
  templateUrl: './dashboard-designer.component.html',
  styleUrls: ['./dashboard-designer.component.scss']
})
export class DashboardDesignerComponent implements OnInit {
  private toastr: ToastHelperService = inject(ToastHelperService);

  // Signals for state management
  dashboard = signal<Dashboard | null>(null);
  widgets = signal<Widget[]>([]);
  selectedWidget = signal<Widget | null>(null);
  selectedEntity = signal<string>('');
  entityProperties = signal<string[]>([]);
  isLoadingEntities = signal(false);
  isLoadingProperties = signal(false);
  isSaving = signal(false);
  showWidgetForm = signal(false);
  editingWidgetId = signal<number | null>(null);
  hasUnsavedChanges = signal(false);
  dashboardHeaderPanel = signal(true);
  widgetListPanel = signal(true);

  // Properties of joined (target) entities, keyed by technical entity name
  joinEntityProperties = signal<Record<string, string[]>>({});

  // Data from backend
  entities: MetaDashboardEntity[] = [];
  widgetTypes: MetaWidgetType[] = [];
  entityOptions: DropdownOption[] = [];
  widgetTypeOptions: DropdownOption[] = [];

  // Static option lists for the query builder
  readonly operatorOptions: DropdownOption[] = [
    { key: '=', value: 'Equals (=)' },
    { key: '!=', value: 'Not equals (≠)' },
    { key: '>', value: 'Greater than (>)' },
    { key: '<', value: 'Less than (<)' },
    { key: '>=', value: 'Greater or equal (≥)' },
    { key: '<=', value: 'Less or equal (≤)' },
    { key: 'LIKE', value: 'Contains (LIKE)' },
    { key: 'IN', value: 'In list (IN)' },
    { key: 'BETWEEN', value: 'Between' }
  ];
  readonly logicOptions: DropdownOption[] = [
    { key: 'AND', value: 'AND' },
    { key: 'OR', value: 'OR' }
  ];
  readonly joinTypeOptions: DropdownOption[] = [
    { key: 'INNER', value: 'Inner join' },
    { key: 'LEFT', value: 'Left join' },
    { key: 'RIGHT', value: 'Right join' },
    { key: 'FULL', value: 'Full join' }
  ];

  // Forms
  dashboardForm!: FormGroup;
  widgetForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private dashboardService: DashboardService,
    private widgetService: WidgetService,
    private entityService: MetaDashboardEntityService,
    private widgetTypeService: MetaWidgetTypeService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  /**
   * Initialize forms
   */
  private initializeForms(): void {
    this.dashboardForm = this.fb.group({
      moduleCode: [''],
      name: [''],
      description: ['']
    });

    this.widgetForm = this.fb.group({
      widgetType: ['', Validators.required],
      title: ['', Validators.required],
      entity: ['', Validators.required],
      selectedColumns: [[], Validators.required],
      filters: this.fb.array([]),
      joins: this.fb.array([]),
      groupBy: [[]],
      aggregations: [[]],
      row: [1, Validators.required],
      col: [1, Validators.required],
      width: [6, Validators.required],
      height: [3, Validators.required]
    });
  }

  get frmGroup(): FormGroup {
    return this.widgetForm;
  }

  /** Column options for the currently selected (main) entity */
  get columnOptions(): DropdownOption[] {
    return this.entityProperties().map(p => ({ key: p, value: p }));
  }

  /** FormArray of WHERE-condition rows */
  get filters(): FormArray {
    return this.widgetForm.get('filters') as FormArray;
  }

  /** FormArray of JOIN rows */
  get joins(): FormArray {
    return this.widgetForm.get('joins') as FormArray;
  }

  /** Template helper: treat an AbstractControl as a FormGroup */
  asGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  ngOnInit(): void {
    this.loadEntities();
    this.loadWidgetTypes();
    this.loadDashboard();
  }

  // ───────────────────────────── Data loading ─────────────────────────────

  private loadEntities(): void {
    this.isLoadingEntities.set(true);
    this.entityService.getAllActiveEntities().subscribe({
      next: (entities) => {
        this.entities = entities;
        this.entityOptions = entities.map(e => ({
          key: e.entityName,
          value: e.entityAlias
        }));
        this.isLoadingEntities.set(false);
      },
      error: (err) => {
        console.error('Error loading entities:', err);
        this.toastr.error('Failed to load entities', 'Error');
        this.isLoadingEntities.set(false);
      }
    });
  }

  private loadWidgetTypes(): void {
    this.widgetTypeService.getAllActiveWidgetTypes().subscribe({
      next: (types) => {
        this.widgetTypes = types;
        this.widgetTypeOptions = types.map(t => ({
          key: t.widgetTypeCode,
          value: t.widgetTypeName
        }));
      },
      error: (err) => {
        console.error('Error loading widget types:', err);
        this.toastr.error('Failed to load widget types', 'Error');
      }
    });
  }

  private loadDashboard(): void {
    const dashboardId = this.route.snapshot.paramMap.get('id');
    if (dashboardId) {
      this.dashboardService.getDashboard(Number(dashboardId)).subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.dashboardForm.patchValue(dashboard);
          this.loadWidgets(dashboard.id);
        },
        error: (err) => console.error('Error loading dashboard:', err)
      });
    }
  }

  private loadWidgets(dashboardId: number): void {
    this.widgetService.getWidgetsByDashboard(dashboardId).subscribe({
      next: (widgets) => this.widgets.set(widgets),
      error: (err) => console.error('Error loading widgets:', err)
    });
  }

  // ───────────────────────────── Entity / columns ─────────────────────────

  /**
   * Handle main entity selection. Loads its properties and resets the query
   * builder (columns / filters / joins) because they reference the old entity.
   */
  onEntityChange(entityName: string): void {
    this.selectedEntity.set(entityName);
    this.entityProperties.set([]);
    this.filters.clear();
    this.joins.clear();
    this.widgetForm.patchValue({ selectedColumns: [] });

    if (entityName) {
      this.isLoadingProperties.set(true);
      this.entityService.getEntityProperties(entityName).subscribe({
        next: (properties) => {
          this.entityProperties.set(properties);
          this.isLoadingProperties.set(false);
        },
        error: (err) => {
          console.error('Error loading properties:', err);
          this.isLoadingProperties.set(false);
        }
      });
    }
  }

  onPropertyChecked(event: Event, property: string): void {
    const checkbox = event.target as HTMLInputElement;
    const selectedColumns: string[] = [...(this.widgetForm.get('selectedColumns')?.value || [])];

    if (checkbox.checked) {
      if (!selectedColumns.includes(property)) selectedColumns.push(property);
    } else {
      const index = selectedColumns.indexOf(property);
      if (index > -1) selectedColumns.splice(index, 1);
    }

    this.widgetForm.patchValue({ selectedColumns });
  }

  // ───────────────────────────── Filters (WHERE) ──────────────────────────

  private createFilterGroup(raw?: {
    logicOperator?: string;
    column?: string;
    operator?: string;
    value?: any;
    value2?: any;
  }): FormGroup {
    return this.fb.group({
      logicOperator: [raw?.logicOperator || 'AND'],
      column: [raw?.column || '', Validators.required],
      operator: [raw?.operator || '=', Validators.required],
      value: [raw?.value ?? '', Validators.required],
      value2: [raw?.value2 ?? '']
    });
  }

  addFilter(): void {
    if (!this.selectedEntity()) {
      this.toastr.error('Select an entity first', 'Error');
      return;
    }
    this.filters.push(this.createFilterGroup());
  }

  removeFilter(index: number): void {
    this.filters.removeAt(index);
  }

  /** True when the filter at the given index uses the BETWEEN operator */
  isBetween(control: AbstractControl): boolean {
    return this.asGroup(control).get('operator')?.value === 'BETWEEN';
  }

  /** True when the filter needs a comma-separated list (IN) */
  isInList(control: AbstractControl): boolean {
    return this.asGroup(control).get('operator')?.value === 'IN';
  }

  // ───────────────────────────── Joins ────────────────────────────────────

  private createJoinGroup(raw?: {
    joinType?: string;
    targetEntity?: string;
    sourceColumn?: string;
    targetColumn?: string;
  }): FormGroup {
    return this.fb.group({
      joinType: [raw?.joinType || 'INNER', Validators.required],
      targetEntity: [raw?.targetEntity || '', Validators.required],
      sourceColumn: [raw?.sourceColumn || '', Validators.required],
      targetColumn: [raw?.targetColumn || '', Validators.required]
    });
  }

  addJoin(): void {
    if (!this.selectedEntity()) {
      this.toastr.error('Select an entity first', 'Error');
      return;
    }
    this.joins.push(this.createJoinGroup());
  }

  removeJoin(index: number): void {
    this.joins.removeAt(index);
  }

  /**
   * When a join's target entity changes, reset its target column and load the
   * target entity's properties so the user can pick the join key.
   */
  onJoinTargetEntityChange(entityName: string, joinIndex: number): void {
    this.asGroup(this.joins.at(joinIndex)).patchValue({ targetColumn: '' });
    this.loadJoinEntityProperties(entityName);
  }

  private loadJoinEntityProperties(entityName: string): void {
    if (!entityName || this.joinEntityProperties()[entityName]) return;
    this.entityService.getEntityProperties(entityName).subscribe({
      next: (props) => {
        this.joinEntityProperties.update(m => ({ ...m, [entityName]: props }));
      },
      error: (err) => console.error('Error loading join entity properties:', err)
    });
  }

  /** Column options for a joined entity (used by the target-column dropdown) */
  getJoinColumnOptions(entityName: string): DropdownOption[] {
    return (this.joinEntityProperties()[entityName] || []).map(p => ({ key: p, value: p }));
  }

  /** Friendly alias for an entity's technical name */
  getEntityAlias(entityName: string): string {
    return this.entities.find(e => e.entityName === entityName)?.entityAlias || entityName;
  }

  // ───────────────────────────── Widget form open/close ───────────────────

  openAddWidgetForm(): void {
    this.editingWidgetId.set(null);
    this.selectedWidget.set(null);
    this.filters.clear();
    this.joins.clear();
    this.widgetForm.reset({
      widgetType: '',
      title: '',
      entity: '',
      selectedColumns: [],
      groupBy: [],
      aggregations: [],
      row: 1,
      col: 1,
      width: 6,
      height: 3
    });
    this.selectedEntity.set('');
    this.entityProperties.set([]);
    this.showWidgetForm.set(true);
  }

  openEditWidgetForm(widget: Widget): void {
    this.editingWidgetId.set(widget.id);
    this.selectedWidget.set(widget);
    this.selectedEntity.set(widget.queryDefinition.entity);

    // Reset query-builder arrays before repopulating
    this.filters.clear();
    this.joins.clear();

    this.widgetForm.patchValue({
      widgetType: widget.widgetType,
      title: widget.title,
      entity: widget.queryDefinition.entity,
      selectedColumns: widget.queryDefinition.selectedColumns,
      groupBy: widget.queryDefinition.groupBy || [],
      aggregations: widget.queryDefinition.aggregations || [],
      row: widget.layoutConfig.row,
      col: widget.layoutConfig.col,
      width: widget.layoutConfig.width,
      height: widget.layoutConfig.height
    });

    this.rebuildFilters(widget.queryDefinition.filters || []);
    this.rebuildJoins(widget.queryDefinition.joins || []);

    // Load the main entity's properties (for column checkboxes + filter fields)
    this.loadPropertiesForEdit(widget.queryDefinition.entity);

    this.showWidgetForm.set(true);
  }

  private rebuildFilters(filters: FilterDefinition[]): void {
    filters.forEach(f => {
      const isBetween = f.operator === 'BETWEEN';
      let value: any = f.value;
      let value2: any = '';
      if (Array.isArray(f.value)) {
        if (isBetween) {
          value = f.value[0] ?? '';
          value2 = f.value[1] ?? '';
        } else {
          value = f.value.join(', ');
        }
      }
      this.filters.push(this.createFilterGroup({
        logicOperator: f.logicOperator || 'AND',
        column: f.column,
        operator: f.operator,
        value,
        value2
      }));
    });
  }

  private rebuildJoins(joins: JoinDefinition[]): void {
    joins.forEach(j => {
      const parsed = this.parseOnCondition(j.onCondition);
      this.joins.push(this.createJoinGroup({
        joinType: j.joinType,
        targetEntity: j.targetEntity,
        sourceColumn: parsed.sourceColumn,
        targetColumn: parsed.targetColumn
      }));
      this.loadJoinEntityProperties(j.targetEntity);
    });
  }

  /** Parse "MainEntity.colA = TargetEntity.colB" → { sourceColumn, targetColumn } */
  private parseOnCondition(onCondition: string): { sourceColumn: string; targetColumn: string } {
    const match = /\.([A-Za-z0-9_]+)\s*=\s*[A-Za-z0-9_]+\.([A-Za-z0-9_]+)/.exec(onCondition || '');
    return {
      sourceColumn: match?.[1] || '',
      targetColumn: match?.[2] || ''
    };
  }

  private loadPropertiesForEdit(entityName: string): void {
    this.isLoadingProperties.set(true);
    this.entityService.getEntityProperties(entityName).subscribe({
      next: (properties) => {
        this.entityProperties.set(properties);
        this.isLoadingProperties.set(false);
      },
      error: (err) => {
        console.error('Error loading properties:', err);
        this.isLoadingProperties.set(false);
      }
    });
  }

  // ───────────────────────────── Save / delete ────────────────────────────

  private buildQueryDefinition(): QueryDefinition {
    const formValue = this.widgetForm.value;
    const mainEntity: string = formValue.entity;

    const filters: FilterDefinition[] = this.filters.controls.map((ctrl, index) => {
      const v = ctrl.value;
      let value: string | number | string[] = v.value;
      if (v.operator === 'BETWEEN') {
        value = [String(v.value), String(v.value2)];
      } else if (v.operator === 'IN') {
        value = String(v.value).split(',').map((s: string) => s.trim()).filter(Boolean);
      }
      const filter: FilterDefinition = {
        column: v.column,
        operator: v.operator,
        value
      };
      if (index > 0) filter.logicOperator = v.logicOperator;
      return filter;
    });

    const joins: JoinDefinition[] = this.joins.controls.map((ctrl) => {
      const v = ctrl.value;
      return {
        joinType: v.joinType,
        targetEntity: v.targetEntity,
        onCondition: `${mainEntity}.${v.sourceColumn} = ${v.targetEntity}.${v.targetColumn}`
      };
    });

    return {
      entity: mainEntity,
      selectedColumns: formValue.selectedColumns,
      filters,
      joins,
      groupBy: (formValue.groupBy || []).filter((g: any) => g),
      aggregations: (formValue.aggregations || []).filter((a: any) => a?.column)
    };
  }

  saveWidget(): void {
    if (!this.widgetForm.valid || !this.dashboard()) {
      this.widgetForm.markAllAsTouched();
      this.toastr.error('Please complete all required fields', 'Error');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.widgetForm.value;
    const queryDefinition = this.buildQueryDefinition();
    const layoutConfig = {
      row: formValue.row,
      col: formValue.col,
      width: formValue.width,
      height: formValue.height
    };

    if (this.editingWidgetId()) {
      const updateCommand: UpdateWidgetCommand = {
        widgetType: formValue.widgetType,
        title: formValue.title,
        queryDefinition,
        layoutConfig,
        displayOrder: this.selectedWidget()?.displayOrder || 0,
        isActive: true
      };

      this.widgetService.updateWidget(this.editingWidgetId()!, updateCommand).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showWidgetForm.set(false);
          this.hasUnsavedChanges.set(false);
          this.toastr.success(`Widget "${formValue.title}" updated`, 'Success');
          this.loadWidgets(this.dashboard()!.id);
        },
        error: (err) => {
          console.error('Error updating widget:', err);
          this.toastr.error('Failed to update widget', 'Error');
          this.isSaving.set(false);
        }
      });
    } else {
      const addCommand: AddWidgetCommand = {
        dashboardId: this.dashboard()!.id,
        widgetType: formValue.widgetType,
        title: formValue.title,
        queryDefinition,
        layoutConfig,
        displayOrder: this.widgets().length + 1
      };

      this.widgetService.addWidget(addCommand).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showWidgetForm.set(false);
          this.hasUnsavedChanges.set(false);
          this.toastr.success(`Widget "${formValue.title}" created successfully`, 'Success');
          this.loadWidgets(this.dashboard()!.id);
        },
        error: (err) => {
          console.error('Error adding widget:', err);
          this.toastr.error('Failed to create widget', 'Error');
          this.isSaving.set(false);
        }
      });
    }
  }

  deleteWidget(widget: Widget): void {
    if (!confirm(`Delete widget "${widget.title}"?`)) return;

    this.widgetService.removeWidget(widget.id).subscribe({
      next: () => {
        this.toastr.success(`Widget "${widget.title}" deleted successfully`, 'Success');
        this.loadWidgets(this.dashboard()!.id);
        if (this.selectedWidget()?.id === widget.id) {
          this.selectedWidget.set(null);
        }
      },
      error: (err) => {
        console.error('Error deleting widget:', err);
        this.toastr.error('Failed to delete widget', 'Error');
      }
    });
  }

  closeWidgetForm(): void {
    this.showWidgetForm.set(false);
    this.selectedWidget.set(null);
    this.editingWidgetId.set(null);
    this.filters.clear();
    this.joins.clear();
    this.widgetForm.reset();
    this.hasUnsavedChanges.set(false);
  }

  getWidgetTypeName(code: string): string {
    return this.widgetTypes.find(t => t.widgetTypeCode === code)?.widgetTypeName || code;
  }
}
