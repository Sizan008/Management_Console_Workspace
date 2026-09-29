import { CommonModule } from '@angular/common';
import {Component, EventEmitter, Input, OnInit, Output, inject, WritableSignal, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WorkspaceService } from '../workspace-service';
import {GenericSwitch} from '../../../common-components/generic-component-type/generic-switch/generic-switch';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {InputTextBox} from '../../../common-components/input-types/input-text-box/input-text-box';
import {GenericButton} from '../../../common-components/generic-component-type/generic-button/generic-button';
import {ExpansionPanelHeader} from '../../../common-components/expansion-panel-header/expansion-panel-header';
export interface WorkspaceEditorTableRow {
  tableName: string;
}

export interface WorkspaceEditorColumnRow {
  id?: number | null;
  workspaceId?: number | null;
  tableName?: string;
  columnId: number | null;
  columnName: string;
  columnLabel: string;
  columnType: string;
  displayOrder: number | null;
  isActive: number;
  isIdColumn: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-workspace-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextBox, GenericButton, GenericSwitch, GenericDataGrid,ExpansionPanelHeader],
  templateUrl: './workspace-editor-modal.html',
  styleUrl: './workspace-editor-modal.scss',
})
export class WorkspaceEditorModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();
  @Output() modalClosed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private workspaceService = inject(WorkspaceService);
  readonly workspaceHeaderPanel: WritableSignal<boolean> = signal(true);
  form = this.fb.group({
    workspace_id: [''],
    workspace_name: ['', [Validators.required]],
    workspace_desc: [''],
    search_identifier: [''],
    search_selector: [''],
    home_identifier: [''],
    home_selector: [''],
    display_order: [null],
    is_active: [1],
  });

  readonly newPageIdentifierRows = signal<any[]>([]);
  readonly npiEditingIdentifier = signal<string | null>(null);
  readonly npiEntryForm = this.fb.group({
    new_page_identifier: [''],
    new_page_selector: [''],
    display_order: [null],
    is_active: [1],
  });

  get isActiveNpi(): boolean {
    return this.npiEntryForm.get('is_active')?.value === 1;
  }
  tables: WorkspaceEditorTableRow[] = [];
  columns: WorkspaceEditorColumnRow[] = [];
  selectedTableName = '';
  selectedTableLabel = '';
  loadingTables = false;
  loadingColumns = false;
  private existingColumnMap = new Map<string, WorkspaceEditorColumnRow>();
  private originalAssignedColumns: WorkspaceEditorColumnRow[] = [];
  private originalTableName = '';

  ngOnInit(): void {
    const data = this.modalComponentData?.initialData ?? {};
    const workspaceId = this.toNumber(data.workspace_id ?? data.workspaceId);
    this.form.patchValue({
      workspace_id: workspaceId != null ? String(workspaceId) : '',
      workspace_name: data.workspace_name ?? data.workspaceName ?? '',
      workspace_desc: data.workspace_desc ?? data.workspaceDesc ?? '',
      search_identifier: data.search_identifier ?? data.searchIdentifier ?? '',
      search_selector: data.search_selector ?? data.searchSelector ?? '',
      home_identifier: data.home_identifier ?? data.homeIdentifier ?? '',
      home_selector: data.home_selector ?? data.homeSelector ?? '',
      display_order: data.display_order ?? data.displayOrder ?? null,
      is_active: data.is_active ?? data.isActive ?? 1,
    });

    const npiList = data.newPageIdentifiers ?? data.new_page_identifiers ?? [];
    if (Array.isArray(npiList) && npiList.length > 0) {
      this.newPageIdentifierRows.set(npiList.map((item: any) => ({
        newPageIdentifier: item.newPageIdentifier ?? item.new_page_identifier ?? '',
        newPageSelector: item.newPageSelector ?? item.new_page_selector ?? '',
        displayOrder: item.displayOrder ?? item.display_order ?? null,
        isActive: item.isActive ?? item.is_active ?? 1,
      })));
    }

    // this.loadTables();
    // if (workspaceId != null) {
    //   this.loadExistingColumns(workspaceId);
    // }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const selectedColumns = this.columns
      .filter(column => column.isSelected)
      .map((column, index) => ({
        ...column,
        displayOrder: index + 1,
      }));

    this.modalResult.emit({
      workspace: this.form.getRawValue(),
      newPageIdentifiers: this.orderedNewPageIdentifiers(),
      tableName: this.selectedTableName,
      columns: this.columns,
      originalColumns: this.originalAssignedColumns,
    });
  }

  /**
   * The create-page rows, renumbered 1..n in the order the header dropdown should
   * show them. Two reasons not to just pass `displayOrder` through:
   *   - A row left blank used to fall back to `index + 1`, which could duplicate an
   *     order the user typed on another row (blank, then Order=1 → both become 1).
   *     Duplicates make the dropdown's order arbitrary, so a typed Order looked
   *     ignored — the grid's insertion order won the tie instead.
   *   - Blanks now sort last rather than counting as 0, which put them first.
   * Ties fall back to grid position; Array#sort is stable, so that is the order
   * the user sees in the grid above.
   */
  private orderedNewPageIdentifiers(): any[] {
    return this.newPageIdentifierRows()
      .map((row, index) => ({ row, index, order: this.sortableOrder(row.displayOrder) }))
      .sort((a, b) => (a.order - b.order) || (a.index - b.index))
      .map(({ row }, index) => ({
        newPageIdentifier: row.newPageIdentifier,
        newPageSelector: row.newPageSelector,
        displayOrder: index + 1,
        isActive: row.isActive ?? 1,
      }));
  }

  /** Blank / non-numeric orders sort last. Not toNumber(), which turns '' and null into 0. */
  private sortableOrder(value: unknown): number {
    if (value === null || value === undefined || value === '') return Number.MAX_SAFE_INTEGER;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }

  addNewPageIdentifier(): void {
    const identifier = (this.npiEntryForm.get('new_page_identifier')?.value || '').trim();
    const selector = (this.npiEntryForm.get('new_page_selector')?.value || '').trim();
    if (!identifier || !selector) return;

    const editingId = this.npiEditingIdentifier();
    const duplicate = this.newPageIdentifierRows().some(
      r => r.newPageIdentifier === identifier && identifier !== editingId
    );
    if (duplicate) return;

    const row = {
      newPageIdentifier: identifier,
      newPageSelector: selector,
      displayOrder: this.npiEntryForm.get('display_order')?.value ?? null,
      isActive: this.npiEntryForm.get('is_active')?.value ?? 1,
    };

    this.newPageIdentifierRows.set([...this.newPageIdentifierRows(), row]);
    this.npiEntryForm.reset({ new_page_identifier: '', new_page_selector: '', display_order: null, is_active: 1 });
    this.npiEditingIdentifier.set(null);
  }

  editNewPageIdentifier(rowJson: string): void {
    const row = JSON.parse(rowJson);
    this.newPageIdentifierRows.set(
      this.newPageIdentifierRows().filter(r => r.newPageIdentifier !== row.newPageIdentifier)
    );
    this.npiEntryForm.patchValue({
      new_page_identifier: row.newPageIdentifier,
      new_page_selector: row.newPageSelector,
      display_order: row.displayOrder,
      is_active: row.isActive,
    });
    this.npiEditingIdentifier.set(row.newPageIdentifier);
  }

  removeNewPageIdentifier(rowJson: string): void {
    const row = JSON.parse(rowJson);
    this.newPageIdentifierRows.set(
      this.newPageIdentifierRows().filter(r => r.newPageIdentifier !== row.newPageIdentifier)
    );
  }

  close(): void {
    this.modalClosed.emit();
  }

  onTableSelect(rowJson: string): void {
    const row = this.parseRow(rowJson);
    const tableName = this.toString(row.tableName ?? row.table_name ?? row.name);

    if (!tableName) {
      return;
    }

    this.selectedTableName = tableName;
    this.selectedTableLabel = tableName;
    // void this.loadColumnsForTable(tableName);
  }

  onColumnGridChanged(rows: WorkspaceEditorColumnRow[]): void {
    this.columns = Array.isArray(rows) ? rows : [];
  }

  /*private loadTables(): void {
    this.loadingTables = true;
    this.workspaceService.getAllTable().subscribe({
      next: (res) => {
        const tables = this.unwrapListResponse(res).map((item: any) => ({
          tableName: this.toString(item.tableName ?? item.table_name ?? item.name),
        })).filter((item: WorkspaceEditorTableRow) => !!item.tableName);

        this.tables = tables;
        this.loadingTables = false;

        if (this.selectedTableName) {
          const current = this.tables.find(table => table.tableName === this.selectedTableName);
          if (current) {
            this.selectedTableLabel = current.tableName;
          }
        }
      },
      error: (err) => {
        console.error('Failed to load tables', err);
        this.tables = [];
        this.loadingTables = false;
      }
    });
  }

  private loadExistingColumns(workspaceId: number): void {
    this.loadingColumns = true;
    this.workspaceService.getColumnByWorkspace(workspaceId).subscribe({
      next: (res) => {
        const existing = this.unwrapListResponse(res)
          .map((item: any) => this.normalizeColumnRow(item, true))
          .filter((item: WorkspaceEditorColumnRow | null): item is WorkspaceEditorColumnRow => item !== null);

        this.originalAssignedColumns = existing;
        this.existingColumnMap = new Map(
          existing.map(column => [String(column.columnName).toUpperCase(), column])
        );

        this.columns = existing;

        if (existing.length > 0) {
          const existingTableName = this.toString(existing[0].tableName);
          if (existingTableName) {
            this.selectedTableName = existingTableName;
            this.selectedTableLabel = existingTableName;
            this.originalTableName = existingTableName;
          }
        }

        this.loadingColumns = false;
      },
      error: (err) => {
        console.error('Failed to load existing workspace columns', err);
        this.columns = [];
        this.loadingColumns = false;
      }
    });
  }

  private loadColumnsForTable(tableName: string): Promise<void> {
    this.loadingColumns = true;
    this.columns = [];

    return new Promise((resolve) => {
      this.workspaceService.getColumnByTable(tableName).subscribe({
        next: (res) => {
          const existingByName = tableName === this.originalTableName ? this.existingColumnMap : new Map<string, WorkspaceEditorColumnRow>();
          const columns = this.unwrapListResponse(res)
            .map((item: any, index: number) => this.normalizeColumnRow(item, false, index + 1))
            .filter((item: WorkspaceEditorColumnRow | null): item is WorkspaceEditorColumnRow => item !== null)
            .map((item: WorkspaceEditorColumnRow, index: number) => {
              const existing = existingByName.get(String(item.columnName).toUpperCase());
              return {
                ...item,
                id: existing?.id ?? null,
                workspaceId: existing?.workspaceId ?? this.toNumber(this.form.get('workspace_id')?.value) ?? null,
                tableName,
                columnLabel: existing?.columnLabel || item.columnLabel,
                columnType: existing?.columnType || item.columnType,
                displayOrder: existing?.displayOrder ?? item.displayOrder ?? index + 1,
                isActive: existing?.isActive ?? item.isActive ?? 1,
                isIdColumn: existing?.isIdColumn || item.isIdColumn,
                isSelected: existing ? true : item.isSelected,
              };
            });

          this.columns = columns;
          this.loadingColumns = false;
          resolve();
        },
        error: (err) => {
          console.error(`Failed to load columns for ${tableName}`, err);
          this.columns = [];
          this.loadingColumns = false;
          resolve();
        }
      });
    });
  }*/

  private normalizeColumnRow(item: any, fromWorkspace = false, displayOrder?: number): WorkspaceEditorColumnRow | null {
    const columnName = this.toString(item.columnName ?? item.column_name ?? item.name);
    if (!columnName) {
      return null;
    }

    const columnId = this.toNumber(item.columnId ?? item.column_id ?? item.id);
    if (columnId == null) {
      return null;
    }
    const dataType = this.toString(item.dataType ?? item.data_type ?? item.columnType) || '';
    const isPrimaryKey = this.toString(item.isPrimaryKey ?? item.is_primary_key ?? item.isIdColumn) || 'N';
    const label = this.toString(item.columnLabel ?? item.column_label) || this.humanize(columnName);

    return {
      id: this.toNumber(item.id ?? item.columnMapId ?? item.workspaceColumnId),
      workspaceId: this.toNumber(item.workspaceId ?? item.workspace_id),
      tableName: this.toString(item.tableName ?? item.table_name),
      columnId,
      columnName,
      columnLabel: label,
      columnType: dataType,
      displayOrder: this.toNumber(item.displayOrder ?? item.display_order) ?? displayOrder ?? null,
      isActive: this.toNumber(item.isActive ?? item.is_active) ?? 1,
      isIdColumn: isPrimaryKey === 'Y' || isPrimaryKey === 'y' || isPrimaryKey === '1' || isPrimaryKey === 'true' ? 'Y' : 'N',
      isSelected: fromWorkspace,
    };
  }

  private unwrapListResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.result)) {
      return response.result;
    }
    if (Array.isArray(response?.items)) {
      return response.items;
    }
    return [];
  }

  private parseRow(rowJson: string): any {
    try {
      return JSON.parse(rowJson);
    } catch {
      return {};
    }
  }

  private toNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toString(value: unknown): string {
    return value == null ? '' : String(value).trim();
  }

  private humanize(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
