import { ChangeDetectionStrategy, Component, input, output, signal, computed, OnInit, OnDestroy, effect, WritableSignal, TemplateRef, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GenericMultiInputSelectOption } from '../generic-multi-select-option/generic-multi-select-option';
import { ExpansionPanelHeader } from '../../expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../generic-button/generic-button';
import { InputTime } from '../../input-types/input-time/input-time';
import { InputDate } from '../../input-types/input-date/input-date';
import { DataGridStateService, DataGridState } from '../../../services/data-grid-state.service';

/**
 * Defines custom styling for a cell based on cell value or row data
 */
export interface CellStyleDefinition {
  /** Condition to apply styles (row data and cell value available) */
  condition: (cellValue: any, rowData?: any) => boolean;
  /** Custom CSS classes to apply */
  cssClasses?: string | string[];
  /** Inline styles object */
  styles?: Record<string, string | number>;
  /** Custom HTML attributes */
  attributes?: Record<string, string>;
}

/**
 * Defines custom styling for an entire row based on row data
 */
export interface RowStyleDefinition {
  /** Condition to apply styles */
  condition: (rowData: any) => boolean;
  /** Custom CSS classes to apply */
  cssClasses?: string | string[];
  /** Inline styles object */
  styles?: Record<string, string | number>;
}

/**
 * Emitted when pagination state changes (page, sort, filter)
 * Used for backend data requests
 */
export interface DataGridStateChange {
  pageIndex: number;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  totalRecords: number;
  totalPages: number;
}

/**
 * Defines custom content rendering for a cell or column
 */
export interface CellRenderFunction {
  (cellValue: any, rowData: any, rowIndex: number, columnProperty: string): string | SafeHtml | any;
}

/**
 * Defines custom row rendering
 */
export interface RowRenderFunction {
  (rowData: any, rowIndex: number): Record<string, string | number>;
}

/**
 * Legacy row styling interface - superseded by RowStyleDefinition
 */
export interface TableRowDesigner {
  condition: (item: any) => boolean;
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: string;
  borderColor?: string;
}

export interface DropdownOption {
  value: any;
  label: string;
  disabled?: boolean;
}

/** Rule keys a column validation can produce a message for */
export type GridValidationRule =
  | 'required'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern';

/**
 * Validation applied to one column while its row is being inline-edited.
 * A row with any failing cell cannot be saved.
 */
export interface GridColumnValidation {
  required?: boolean;
  /** Numeric bounds — only checked when the value parses as a number */
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  /** Runs after the built-in rules. Return a message to reject, or null/'' to accept. */
  validate?: (value: any, rowData: any) => string | null;
  /** Replaces the default wording for a built-in rule */
  messages?: Partial<Record<GridValidationRule, string>>;
}

/**
 * Handed to a cellChangeHandlers callback so it can drive the rest of the row
 * being edited — swap another cell's dropdown options, stash state, write values.
 */
export interface GridCellChangeUtils {
  /** Replace the options offered by another column, for this row only */
  updateOptions: (property: string, options: DropdownOption[]) => void;
  /** Store per-row state, readable by getMeta and by computed/visibility resolvers */
  setMeta: (key: string, value: any) => void;
  /** Read per-row state */
  getMeta: (key: string) => any;
  /** Write another cell's value in the row being edited */
  setValue: (property: string, value: any) => void;
}

export interface GridColumn {
  property: string;
  header: string;
  isEditable: boolean;
  isNumeric: boolean;
  isVisible: boolean;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  isDropdown?: boolean;
  dropdownOptions?: DropdownOption[];
  dropdownOptionsSource?: string;
  isMultiSelect?: boolean;
  isCheckbox?: boolean;
  showSelectAll?: boolean; // New property for checkbox columns
  readOnly?: boolean; // New property to make checkboxes read-only
  isTimeField?: boolean; // New property for time picker fields
  isDateField?: boolean; // New property for date picker fields
  isFileUpload?: boolean; // New property for inline file upload fields
  fileAccept?: string; // Accepted file types for file upload columns, e.g. '.pdf,.docx' or 'image/*'

  // NEW: Complete styling freedom
  /** Custom CSS classes to apply to all cells in this column */
  cssClasses?: string | string[];
  /** Inline styles to apply to all cells in this column */
  styles?: Record<string, string | number>;
  /** Header-specific CSS classes */
  headerCssClasses?: string | string[];
  /** Header-specific inline styles */
  headerStyles?: Record<string, string | number>;

  // NEW: Conditional styling per cell
  /** Apply styles conditionally based on cell value or row data */
  cellStyleDefinitions?: CellStyleDefinition[];

  // NEW: Custom content rendering
  /** Function to render arbitrary content (HTML, icons, badges, components, etc.) */
  renderFunction?: CellRenderFunction;
  /** Template reference for custom cell rendering */
  cellTemplate?: TemplateRef<any>;
}

export interface GridAction {
  type: 'edit' | 'delete' | 'view' | 'print';
  icon: string;
  tooltip: string;
  visible: boolean;
  disabled?: boolean;
}

type ActionVisibilityKey =
  | 'edit'
  | 'delete'
  | 'view'
  | 'print'
  | 'progress'
  | 'customAction1'
  | 'customAction2';

type ActionVisibilityMap = Partial<Record<ActionVisibilityKey, boolean>>;

export interface CheckboxChangeEvent {
  item: any;
  property: string;
  value: boolean;
  index: number;
}

/**
 * Emitted when a file is picked or cleared in a file upload column
 */
export interface RowFileChangeEvent {
  /** Updated row object (the file is stored under `property`) */
  item: any;
  /** The column property that changed */
  property: string;
  /** Selected File, or null if cleared */
  file: File | null;
  /** Absolute index in the full data source */
  index: number;
}

export interface ColumnSelectAllEvent {
  property: string;
  checked: boolean;
}

export interface Option {
  key: string;
  value: string;
}

/**
 * Shared immutable results for the per-cell style/class helpers.
 * These helpers run for every cell on every change detection pass; returning the same
 * reference when there is nothing to apply keeps ngStyle/ngClass from re-diffing.
 */
const NO_STYLES: Record<string, never> = Object.freeze({});
const NO_CLASSES: string[] = Object.freeze([]) as unknown as string[];

/**
 * Steps offered by the paginator when no explicit `pageSizeOptions` is given.
 * Only the steps smaller than the row count are shown, and the row count itself is
 * appended as the "show everything" entry.
 */
const PAGE_SIZE_LADDER = [5, 10, 25, 50, 100, 250, 500, 1000] as const;

@Component({
  selector: 'generic-data-grid',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    GenericMultiInputSelectOption,
    ExpansionPanelHeader,
    GenericButton,
    InputTime,
    InputDate
  ],
  templateUrl: './generic-data-grid.html',
  styleUrl: './generic-data-grid.scss',
  // All internal state is signal-based, so the view only needs re-checking when a
  // signal changes. With CheckAlways every mouse move re-ran every per-cell helper.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericDataGrid<T extends Record<string, any> = any> implements OnInit, OnDestroy {
  frmGroup: FormGroup;
  private stateService = inject(DataGridStateService);

  // Basic Inputs
  readonly id = input<string>('');
  readonly showEditButton = input<boolean>(false);
  readonly showDeleteButton = input<boolean>(false);
  readonly showViewButton = input<boolean>(false);
  readonly showProgressButton = input<boolean>(false);
  readonly showPrintButton = input<boolean>(false);
  readonly showCustomAction1 = input<boolean>(false);
  readonly customActionIcon1 = input<string>('');
  readonly customActionSvg1 = input<string>('');
  readonly customActionTooltip1 = input<string>('');
  readonly showCustomAction2 = input<boolean>(false);
  readonly customActionIcon2 = input<string>('');
  readonly customActionSvg2 = input<string>('');
  readonly customActionTooltip2 = input<string>('');
  readonly iconPathPrefix = input<string>('/asset/icons');
  readonly enableSelection = input<boolean>(false);
  readonly tblClass = input<string>('');
  readonly customColumnNames = input<Record<string, string>>({});
  readonly selectedColumns = input<string[]>([]);
  readonly editableColumns = input<string[]>([]);
  readonly numberColumns = input<string[]>([]);
  // Per-column width override, keyed by column property (e.g. { name: '250px', status: '120px' }).
  // Accepts any CSS width value: '200px', '20%', '15rem', etc.
  readonly columnWidths = input<Record<string, string>>({});
  // Optional fixed height applied to every data row cell (e.g. '48px', '2.5rem'). Empty = auto.
  readonly rowHeight = input<string>('');
  // Columns (by property) whose long content should wrap within the column width instead of
  // widening the column. Requires a width to wrap against (from columnWidths or the defaults).
  readonly wrapColumns = input<string[]>([]);
  readonly rowDesignerList = input<TableRowDesigner[]>([]);
  readonly dataSource = input<T[]>([]);
  readonly initPageSize = input<number>(5);
  readonly useInlineEdit = input<boolean>(true);
  readonly searchEnabled = input<boolean>(false);
  readonly groupOptionEnabled = input<boolean>(false);
  readonly gridTitle = input<string>('');
  readonly summaryGridPosition = input<string>('above');
  readonly summaryGridEnabled = input<boolean>(false);
  readonly pageSizeOptions = input<number[]>([]);  // Custom page size options

  // Dropdown Inputs
  readonly dropdownColumns = input<string[]>([]);
  readonly dropdownOptions = input<Record<string, DropdownOption[]>>({});
  readonly multiSelectColumns = input<string[]>([]);
  readonly dynamicDropdownSources = input<Record<string, string>>({});

  // Enhanced Checkbox Inputs
  readonly checkboxColumns = input<string[]>([]);
  readonly checkboxSelectAllColumns = input<string[]>([]); // Columns that should show select all
  readonly readOnlyCheckboxColumns = input<string[]>([]); // Columns that should be read-only
  readonly selectionStateField = input<string>('');
  readonly selectionStateFunction = input<(item: any) => boolean>();
  readonly selectionUpdateField = input<string>('');
  readonly rowSelectionCondition = input<(item: T) => boolean>();
  readonly rowDisabledField = input<string>('');
  readonly rowDisabledResolver = input<(row: T) => boolean>();
  // Time Field Inputs
  readonly timeColumns = input<string[]>([]); // Columns that should use time picker
  // Date Field Inputs
  readonly dateColumns = input<string[]>([]); // Columns that should use date picker
  // File Upload Inputs
  readonly fileUploadColumns = input<string[]>([]); // Columns that should render an inline file picker
  readonly fileAcceptTypes = input<Record<string, string>>({}); // Optional per-column accept filter, e.g. { attachment: '.pdf' }
  // Summary
  readonly summaryColumns = input<string[]>([]);
  readonly groupByColumns = input<string[]>([]);
  // Per-row action visibility override. Return a map like { delete: false } to hide delete for that row.
  readonly actionVisibility = input<(row: T) => ActionVisibilityMap>();
  readonly readOnlyColumnResolvers = input<Record<string, (rowData: T) => boolean>>({});


  /**
   * Per-column validation for inline editing, keyed by column property.
   * A row that fails any rule is refused by saveEdit until it is corrected.
   */
  readonly columnValidations = input<Record<string, GridColumnValidation>>({});
  /**
   * Derived columns, keyed by column property. The function runs on every edit of
   * the open row and writes its result back into the row, so the derived value is
   * what gets saved. Computed columns are read-only in the editor.
   */
  readonly computedColumns = input<Record<string, (rowData: T, meta: Record<string, any>) => any>>({});
  /**
   * Per-row cell visibility, keyed by column property. A cell whose resolver returns
   * false renders empty and is skipped by validation — the column itself stays in
   * the table so every row keeps the same shape.
   */
  readonly cellVisibilityResolvers = input<Record<string, (rowData: T, meta: Record<string, any>) => boolean>>({});
  /**
   * Reacts to a cell changing in the row being edited, keyed by column property.
   * Use the utils to drive dependent cells (options, values, per-row state).
   * May be async.
   */
  readonly cellChangeHandlers = input<
    Record<string, (value: any, rowData: T, utils: GridCellChangeUtils) => void | Promise<void>>
  >({});
  /** Enter saves the row being inline-edited. Escape and Tab-off-the-last-cell always apply. */
  readonly commitEditOnEnter = input<boolean>(true);

  readonly cellRenderFunctions = input<Record<string, CellRenderFunction>>({});
  /** Conditional cell styling per column */
  readonly cellStyleResolvers = input<Record<string, CellStyleDefinition[]>>({});
  /** Row-level conditional styling */
  readonly rowStyleResolvers = input<RowStyleDefinition[]>([]);
  /** Enable backend-driven pagination - emit state changes instead of filtering locally */
  readonly backendPaginationEnabled = input<boolean>(false);
  readonly autoEditOnAdd = input<boolean>(false);
  // Optional row property that marks an unsaved (newly added) record, e.g. 'isNew'.
  // When not supplied, a row counts as new if its uniqueIdField is empty/0 or the grid
  // detected it being appended to dataSource. Drives the Save/Update action label.
  readonly newRowField = input<string>('');

  readonly showPaginator = input<boolean>(true);

  readonly onPaginationChange = output<{
    pageIndex: number;
    pageSize: number;
    pageNumber: number;
  }>();

  readonly onRowEditStart = output<{
  rowData: T;
  rowIndex: number;
  displayIndex: number;
}>();

  // NEW: Backend-driven pagination state change event
  /**
   * Emitted when pagination state changes (page, sort, filter, search)
   * Used to signal parent component to fetch data from backend
   * Only emitted if backendPaginationEnabled is true
   */
  readonly onDataGridStateChange = output<DataGridStateChange>();

  /**
   * Emitted when a cell value changes (especially for dropdown selections)
   * Useful for triggering cascading updates or dependent dropdowns
   */
  readonly onCellValueChange = output<{
    rowData: T;
    columnProperty: string;
    oldValue: any;
    newValue: any;
  }>();

  // Basic Outputs
  readonly onSelectAllChange = output<{
    isSelectAll: boolean,
    selectedRows: T[],
    count: number
  }>();
  readonly onFHEditClick = output<string>();
  readonly onFHDeleteClick = output<string>();
  readonly onFHViewClick = output<string>();
  readonly onFHProgressClick = output<string>();
  readonly onChecked = output<{ data: string, checked: boolean }>();
  readonly onPrint = output<string>();
  readonly onExtraAction1Click = output<string>();
  readonly onExtraAction2Click = output<string>();
  readonly onCellButtonClick = output<any>();
  readonly dataSourceChanged = output<T[]>();
  readonly onRowDoubleClick = output<string>();
// Add this to your inputs
  readonly uniqueIdField = input<string>('id');
  // Enhanced Checkbox Outputs
  readonly onCheckboxValueChange = output<CheckboxChangeEvent>();
  readonly onColumnSelectAll = output<ColumnSelectAllEvent>();
  // File Upload Outputs
  readonly onRowFileChange = output<RowFileChangeEvent>();

  // Internal state signals
  public _dataSource = signal<T[]>([]);
  public _filteredData = signal<T[]>([]);
  public _currentPage = signal<number>(0);
  public _pageSize = signal<number>(5);
  public _sortColumn = signal<string>('');
  public _sortDirection = signal<'asc' | 'desc'>('asc');
  public _searchTerm = signal<string>('');
  public _selectedRows = signal<Set<string>>(new Set()); // Changed to store IDs instead of indices
  public _selectAll = signal<boolean>(false);
  public _editingRow = signal<number | null>(null);
  // Ids of rows appended after the initial load and not yet saved
  public _newRowIds = signal<Set<string>>(new Set());
  public _editingData = signal<Partial<T>>({});
  public _editingFormGroup = signal<FormGroup | null>(null);
  // Validation state for the open editing row: messages keyed by column property.
  // Messages stay hidden until a save is attempted, then track every keystroke.
  public _editingErrors = signal<Record<string, string>>({});
  public _editValidationAttempted = signal<boolean>(false);
  // Dropdown options and arbitrary state pushed in by cellChangeHandlers. Both are
  // scoped to the open editing row and cleared when it closes.
  private _editingOptions = signal<Record<string, DropdownOption[]>>({});
  private _editingMeta = signal<Record<string, any>>({});
  public _allSummary = signal<Record<string, number>>({});
  public _summaryOption = signal<{ key: string; value: string }[]>([]);
  public _groupByOption = signal<{ key: string; value: string }[]>([]);
  public _gridSummaryColumns = signal<string[]>([]);
  public _gridGroupColumns = signal<string[]>([]);
  public _selectedSummaryColumns = signal<string[]>([]);
  public _selectedGroupColumns = signal<string[]>([]);
  public _panelTitle = signal<string>('');
  businessHeaderPanel: WritableSignal<boolean> = signal(true);

  //Grouped summary (per group)
  public _groupedSummary = signal<any[]>([]);
  private _lastDataSourceCount = 0;
  // Guards autoEditOnAdd: set once the first dataSource value (empty or not) has been
  // applied, so only rows appended after that open themselves for editing.
  private _hasLoadedOnce = false;
  private _initialized = false;

  //Overall summary
  public _totalSummary = signal<{ totalCount: number; totals: Record<string, number> }>({
    totalCount: 0,
    totals: {}
  });

  // Computed values
  columns = computed(() => this.buildColumns());
  displayedData = computed(() => this.getDisplayedData());
  totalPages = computed(() => Math.ceil(this._filteredData().length / this._pageSize()));
  hasNextPage = computed(() => this._currentPage() < this.totalPages() - 1);
  hasPrevPage = computed(() => this._currentPage() > 0);
  selectedCount = computed(() => this._selectedRows().size);
  // A row can be selected only if the caller's selection condition allows it AND the row
  // is not disabled — the two opt-outs compose rather than override each other.
  selectableDisplayedRows = computed(() =>
    this.displayedData().filter(item => this.isRowSelectable(item) && !this.isRowDisabled(item))
  );
  selectedSelectableDisplayedCount = computed(() => {
    const idField = this.uniqueIdField();
    if (!idField) return 0;
    return this.selectableDisplayedRows().filter(item => this._selectedRows().has(String(item[idField]))).length;
  });
  isAllSelected = computed(() => {
    const selectableRows = this.selectableDisplayedRows();
    if (selectableRows.length === 0) return false;
    const idField = this.uniqueIdField();
    if (!idField) return false;
    return selectableRows.every(item => this._selectedRows().has(String(item[idField])));
  });

  constructor(private formBuilder: FormBuilder, private sanitizer: DomSanitizer) {
    // Data source effect.
    // Only `dataSource()` may be tracked here: applyFilters() reads the page/search/sort
    // signals, so without untracked() this effect re-ran (full array copy + full re-sort)
    // on every paging or search keystroke.
    effect(() => {
      const data = this.dataSource();

      untracked(() => {
        if (data && data.length > 0) {
          const previousCount = this._lastDataSourceCount;
          // Rows arriving with the first load are existing records, not additions
          const hadLoaded = this._hasLoadedOnce;
          this._hasLoadedOnce = true;
          this._lastDataSourceCount = data.length;

          const oldData = this._dataSource();
          this._dataSource.set([...data]); // Create a copy
          this.applyFilters();

          // Detect addition, remember which rows are unsaved and trigger auto-edit if enabled
          if (data.length > previousCount && hadLoaded) {
            const idField = this.uniqueIdField();
            if (idField) {
              // Find the new items (not in oldData). Set lookup keeps this O(n) — a
              // nested find() here stalled on large data sets.
              const previousIds = new Set(oldData.map(old => old[idField]));
              const newItems = data.filter(item => !previousIds.has(item[idField]));

              if (newItems.length > 0) {
                // Track them so the edit action reads "Save" instead of "Update",
                // dropping ids of rows that no longer exist in the data source
                const currentIds = new Set(data.map(item => String(item[idField])));
                const trackedIds = new Set(
                  [...this._newRowIds()].filter(trackedId => currentIds.has(trackedId))
                );
                newItems.forEach(item => trackedIds.add(String(item[idField])));
                this._newRowIds.set(trackedIds);
              }

              if (this.autoEditOnAdd() && newItems.length > 0) {
                // Edit the first new item found
                const newItem = newItems[0];

                // Wait for change detection to apply filters and update displayedData
                setTimeout(() => {
                  // Find in filtered data to know which page it's on
                  const rowIndex = this._filteredData().findIndex(item => item[idField] === newItem[idField]);
                  if (rowIndex !== -1) {
                    const pageIndex = Math.floor(rowIndex / this._pageSize());
                    this._currentPage.set(pageIndex);

                    // Wait for page change to update displayedData
                    setTimeout(() => {
                      const indexOnPage = this.displayedData().findIndex(item => item[idField] === newItem[idField]);
                      if (indexOnPage !== -1) {
                        this.startEdit(indexOnPage);
                      }
                    });
                  }
                });
              }
            }
          }
        } else {
          // An empty first load still counts as loaded, so a grid that starts with no
          // rows treats the very first row the caller appends as a real addition.
          this._hasLoadedOnce = true;
          this._lastDataSourceCount = 0;
          this._dataSource.set([]);
          this._filteredData.set([]);
          this._newRowIds.set(new Set());
        }
      });
    });

    // Set initial page size effect
    effect(() => {
      const pageSize = this.initPageSize();

      // Page size is never restored from saved state, so initPageSize always wins.
      if (pageSize > 0) {
        this._pageSize.set(pageSize);
      }
    });

    // State persistence effect
    effect(() => {
      const id = this.id();
      if (id) {
        // pageSize, pageIndex and searchTerm are deliberately absent — see DataGridState.
        // Only the sort survives navigation.
        const state: DataGridState = {
          sortColumn: this._sortColumn(),
          sortDirection: this._sortDirection()
        };
        this.stateService.saveState(id, state);
      }
    });

    //Group Summary, Count
    effect(() => {
      if (this._initialized) return; // skip re-run
      this._initialized = true;
      this.allGroupSummary();
    });
  }

  ngOnInit() {
    this.loadState();
    this.frmGroup = this.formBuilder.group({
      summaryColumn: [[]],
      groupColumn: [[]],
    });

    this.loadSummaryOption();
    this.loadGroupOption();

    // Child Panel Title
    const gridTitle = this.gridTitle();
    this._panelTitle.set(`${gridTitle} Summary`);
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private loadState() {
    const id = this.id();
    if (!id) return;

    const savedState = this.stateService.getState(id);
    if (savedState) {
      if (savedState.sortColumn !== undefined) this._sortColumn.set(savedState.sortColumn);
      if (savedState.sortDirection !== undefined) this._sortDirection.set(savedState.sortDirection);

      this.applyFilters();
      this.emitDataGridStateChange();
    }
  }

  // Enhanced Column management
  private buildColumns(): GridColumn[] {
    const allProperties = this._dataSource().length > 0 ? Object.keys(this._dataSource()[0]) : [];
    const propertiesToShow = this.selectedColumns().length > 0 ? this.selectedColumns() : allProperties;

    return propertiesToShow.map(prop => ({
      property: prop,
      header: this.customColumnNames()[prop] || this.formatColumnHeader(prop),
      isEditable: this.editableColumns().includes(prop),
      isNumeric: this.numberColumns().includes(prop),
      isVisible: true,
      // Checkboxes and file pickers are not sortable by default
      sortable: !this.checkboxColumns().includes(prop) && !this.fileUploadColumns().includes(prop),
      filterable: true,
      width: this.getColumnWidth(prop),

      // Dropdown properties
      isDropdown: this.dropdownColumns().includes(prop),
      dropdownOptions: [], // Not used anymore, options come from input
      dropdownOptionsSource: this.dynamicDropdownSources()[prop],
      isMultiSelect: this.multiSelectColumns().includes(prop),

      // Enhanced checkbox properties
      isCheckbox: this.checkboxColumns().includes(prop),
      showSelectAll: this.checkboxSelectAllColumns().includes(prop),
      readOnly: this.readOnlyCheckboxColumns().includes(prop),

      // Time field properties
      isTimeField: this.timeColumns().includes(prop),

      // File upload properties
      isFileUpload: this.fileUploadColumns().includes(prop),
      fileAccept: this.fileAcceptTypes()[prop]
    }));
  }

  // Method to get dropdown options for a column
  getDropdownOptions(column: GridColumn, rowData?: T): DropdownOption[] {
    // A dependent cell whose options were swapped by cellChangeHandlers takes priority
    const override = this.getEditingOptionOverride(column.property, rowData);
    if (override) return override;

    if (column.dropdownOptionsSource && rowData) {
      // Dynamic options from row data
      const optionsData = this.getPropertyValue(rowData, column.dropdownOptionsSource);
      if (Array.isArray(optionsData)) {
        return optionsData.map(item => ({
          value: typeof item === 'object' ? item.value : item,
          label: typeof item === 'object' ? item.label : String(item)
        }));
      }
    }

    // Static options from current input configuration
    return this.dropdownOptions()[column.property] || [];
  }

  // Method to get display text for dropdown values
  getDropdownDisplayText(column: GridColumn, value: any, rowData?: T): string {
    if (!column.isDropdown) return value;

    const options = this.getDropdownOptions(column, rowData);

    if (column.isMultiSelect && Array.isArray(value)) {
      return value.map(v => {
        const option = options.find(opt => opt.value === v);
        return option ? option.label : v;
      }).join(', ');
    }

    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  }

  // Enhanced setEditingValue to handle all input types
  setEditingValue(property: string, value: any): void {
    const column = this.columns().find(col => col.property === property);
    const oldValue = (this._editingData() as any)?.[property];

    let nextValue = value;
    if (column?.isCheckbox) {
      // Ensure boolean value for checkboxes
      nextValue = Boolean(value);
    } else if (column?.isMultiSelect && typeof value === 'string') {
      // Handle multi-select string conversion if needed
      try {
        nextValue = JSON.parse(value);
      } catch {
        nextValue = value;
      }
    }

    // Derived columns are recomputed from the row as a whole, so they have to be
    // re-applied after every single-cell write rather than only on edit start.
    this._editingData.set(
      this.applyComputedColumns({ ...this._editingData(), [property]: nextValue } as Partial<T>)
    );

    // Once the user has tried to save, messages track every keystroke so a corrected
    // cell clears immediately instead of waiting for the next save attempt.
    if (this._editValidationAttempted()) {
      this.validateEditingRow();
    }

    // Emit cell value change event
    if (oldValue !== nextValue) {
      this.onCellValueChange.emit({
        rowData: this._editingData() as T,
        columnProperty: property,
        oldValue: oldValue,
        newValue: nextValue
      });
      this.runCellChangeHandler(property, nextValue);
    }
  }

  // ----- Computed columns, dependent cells and per-row state -----

  /** Runs every computedColumns resolver over the row and returns the updated copy. */
  private applyComputedColumns(rowData: Partial<T>): Partial<T> {
    const resolvers = this.computedColumns();
    const properties = Object.keys(resolvers);
    if (properties.length === 0) return rowData;

    const meta = this._editingMeta();
    let result = rowData;
    for (const property of properties) {
      let computedValue: any;
      try {
        computedValue = resolvers[property](result as T, meta);
      } catch (error) {
        console.warn(`computedColumns error for "${property}":`, error);
        continue;
      }
      if ((result as Record<string, any>)[property] !== computedValue) {
        result = { ...result, [property]: computedValue } as Partial<T>;
      }
    }
    return result;
  }

  /** Notifies the column's cellChangeHandlers callback, if the caller registered one. */
  private runCellChangeHandler(property: string, value: any): void {
    const handler = this.cellChangeHandlers()[property];
    if (typeof handler !== 'function') return;

    try {
      Promise.resolve(handler(value, this._editingData() as T, this.buildCellChangeUtils()))
        .catch(error => console.warn(`cellChangeHandlers error for "${property}":`, error));
    } catch (error) {
      console.warn(`cellChangeHandlers error for "${property}":`, error);
    }
  }

  private buildCellChangeUtils(): GridCellChangeUtils {
    return {
      updateOptions: (property, options) => {
        this._editingOptions.update(current => ({ ...current, [property]: options ?? [] }));
      },
      setMeta: (key, value) => {
        this._editingMeta.update(current => ({ ...current, [key]: value }));
        // Meta feeds computed columns and cell visibility, so the row is re-derived.
        this._editingData.set(this.applyComputedColumns(this._editingData()));
      },
      getMeta: key => this._editingMeta()[key],
      setValue: (property, value) => this.setEditingValue(property, value)
    };
  }

  /** Per-row state pushed in by cellChangeHandlers for the open editing row. */
  getEditingMeta(): Record<string, any> {
    return this._editingMeta();
  }

  /** Drops everything scoped to the open editing row. */
  private resetEditingState(): void {
    this._editingData.set({});
    this._editingFormGroup.set(null);
    this._editingErrors.set({});
    this._editValidationAttempted.set(false);
    this._editingOptions.set({});
    this._editingMeta.set({});
  }

  /**
   * Options handed in by updateOptions() win over the column's configured options,
   * but only for the row that is actually open in the editor.
   */
  private getEditingOptionOverride(property: string, rowData?: T): DropdownOption[] | null {
    const editingIndex = this._editingRow();
    if (editingIndex === null) return null;

    const override = this._editingOptions()[property];
    if (!override) return null;
    if (rowData && this.displayedData()[editingIndex] !== rowData) return null;

    return override;
  }

  // Method to handle multi-select changes
  onMultiSelectChange(property: string, selectedValues: any[]): void {
    this.setEditingValue(property, selectedValues);
  }

  // Enhanced checkbox methods
onCheckboxChange(item: T, property: string, checked: boolean, displayIndex: number): void {
  if (this.readOnlyCheckboxColumns().includes(property)) {
    return;
  }

  // Get unique ID field
  const idField = this.uniqueIdField();

  if (!idField) {
    console.error('Checkbox columns require uniqueIdField to be set');
    return;
  }

  const itemId = item[idField];

  // Find by unique ID instead of reference
  const sourceIndex = this._dataSource().findIndex((sourceItem) => {
    return sourceItem[idField] === itemId;
  });

  if (sourceIndex === -1) {
    console.error('Checkbox change: could not find row in source data', {
      itemId,
      idField,
      sourceLength: this._dataSource().length
    });
    return;
  }

  // Create a new array with the updated item
  // The updated item must be a NEW object to prevent reference sharing issues
  const updatedData = this._dataSource().map((dataItem, idx) => {
    if (idx === sourceIndex) {
      // Create a new object by spreading to ensure it's not a shared reference
      return {
        ...dataItem,
        [property]: checked
      } as T;
    }
    // Return other items unchanged (references are OK for non-updated items)
    return dataItem;
  });

  this._dataSource.set(updatedData);
  this.applyFilters();

  this.dataSourceChanged.emit(updatedData);

  this.onCheckboxValueChange.emit({
    item: updatedData[sourceIndex],
    property: property,
    value: checked,
    index: sourceIndex
  });
}

  // ----- Inline file upload -----

  /**
   * Stable DOM id for the hidden native file input of a given row/column.
   * Row identity comes from uniqueIdField so the id survives re-renders.
   */
  getFileInputId(item: T, property: string): string {
    const idField = this.uniqueIdField();
    const rowKey = idField && item ? item[idField] : '';
    const gridId = this.id() || 'grid';
    return `file-input-${gridId}-${property}-${rowKey}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  /** Opens the native file picker for a row/column */
  triggerFileInput(item: T, property: string): void {
    const input = document.getElementById(this.getFileInputId(item, property)) as HTMLInputElement | null;
    if (!input) return;
    // Reset first so re-picking the same file still fires a change event
    input.value = '';
    input.click();
  }

  /** Returns the selected File name, an existing server-side filename, or '' */
  getRowFileName(item: T, property: string): string {
    const value = this.getPropertyValue(item, property);
    if (!value) return '';
    if (typeof File !== 'undefined' && value instanceof File) return value.name;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && typeof value.name === 'string') return value.name;
    return '';
  }

  /** Handles a file being picked from the native input */
  onFileSelected(item: T, property: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files.length > 0 ? input.files[0] : null;
    this.updateRowFile(item, property, file);
  }

  /** Clears the file for a row/column and resets the native input */
  clearRowFile(item: T, property: string): void {
    const input = document.getElementById(this.getFileInputId(item, property)) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
    this.updateRowFile(item, property, null);
  }

  /** Shared row-update logic for file selection and clearing */
  private updateRowFile(item: T, property: string, file: File | null): void {
    if (this.isCellReadOnly(property, item, -1)) {
      return;
    }

    const idField = this.uniqueIdField();
    if (!idField) {
      console.error('File upload columns require uniqueIdField to be set');
      return;
    }

    const itemId = item[idField];
    const sourceIndex = this._dataSource().findIndex(sourceItem => sourceItem[idField] === itemId);

    if (sourceIndex === -1) {
      console.error('File upload: could not find row in source data', { itemId, idField });
      return;
    }

    const updatedData = this._dataSource().map((dataItem, idx) => {
      if (idx === sourceIndex) {
        return { ...dataItem, [property]: file } as T;
      }
      return dataItem;
    });

    this._dataSource.set(updatedData);
    this.applyFilters();
    this.dataSourceChanged.emit(updatedData);

    this.onRowFileChange.emit({
      item: updatedData[sourceIndex],
      property: property,
      file: file,
      index: sourceIndex
    });
  }

  // Method to check if all values in a column are checked
  isAllColumnValuesChecked(property: string): boolean {
    const displayedData = this.displayedData();
    if (displayedData.length === 0) return false;

    return displayedData.every(item =>
      Boolean(this.getPropertyValue(item, property))
    );
  }

  // Method to check if some (but not all) values in a column are checked
  isSomeColumnValuesChecked(property: string): boolean {
    const displayedData = this.displayedData();
    if (displayedData.length === 0) return false;

    const checkedCount = displayedData.filter(item =>
      Boolean(this.getPropertyValue(item, property))
    ).length;

    return checkedCount > 0 && checkedCount < displayedData.length;
  }

  // Method to select/deselect all checkboxes in a column
  onSelectAllForColumn(property: string, checked: boolean): void {
    if (this.readOnlyCheckboxColumns().includes(property)) {
      return; // Don't allow changes for read-only columns
    }

    const displayedData = this.displayedData();
    const displayedIds = new Set<any>();
    const idField = this.uniqueIdField();

    if (idField) {
      // Collect IDs of displayed items for efficient lookup
      displayedData.forEach(item => {
        displayedIds.add(item[idField]);
      });
    }

    // Create a new array with updated items for displayed rows
    const updatedData = this._dataSource().map(sourceItem => {
      // Check if this item is in the displayed data
      const isDisplayed = idField ? displayedIds.has(sourceItem[idField]) : displayedData.includes(sourceItem);

      if (isDisplayed) {
        // Create a new object to prevent reference sharing
        return {
          ...sourceItem,
          [property]: checked
        } as T;
      }
      // Return unchanged items
      return sourceItem;
    });

    this._dataSource.set(updatedData);
    this.applyFilters();

    // Emit events
    this.dataSourceChanged.emit(updatedData);
    this.onColumnSelectAll.emit({
      property: property,
      checked: checked
    });
  }

  private getColumnWidth(property: string): string {
    // Caller-provided width overrides take precedence over the built-in defaults.
    const override = this.columnWidths()[property];
    if (override) {
      return override;
    }

    // Enhanced width mapping with checkbox consideration
    const widthMap: Record<string, string> = {
      id: '100px',
      name: '200px',
      email: '250px',
      status: '120px',
      isActive: '120px',
      // Add more properties as needed
    };

    // Shorter width for checkbox columns
    if (this.checkboxColumns().includes(property)) {
      return widthMap[property] || '100px';
    }

    return widthMap[property] || '150px'; // Default width
  }

  public formatColumnHeader(property: string): string {
    return property
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }


 private applyDatabaseSelectionState(): void {
   const stateField = this.selectionStateField();
    const stateFunction = this.selectionStateFunction();
    const idField = this.uniqueIdField();

    if (!stateField && !stateFunction) return;
    if (!idField) {
      console.error('Selection state requires uniqueIdField to be set');
      return;
    }

    const newSelected = new Set<string>();
    this._filteredData().forEach((item) => {
      let isSelected = false;

      if (stateFunction) {
        // Use custom function if provided
        isSelected = stateFunction(item);
      } else if (stateField) {
        // Use simple field check
        isSelected = this.getPropertyValue(item, stateField);
      }

      if (isSelected && !this.isRowDisabled(item)) {
        newSelected.add(String(item[idField]));
      }
    });

    this._selectedRows.set(newSelected);
  }

  private updateRowSelectionInDatabase(item: T, checked: boolean): void {
    const updateField = this.selectionUpdateField() || this.selectionStateField();
    if (!updateField) return;

    const idField = this.uniqueIdField();
    if (!idField) return;

    const itemId = item[idField];
    const sourceIndex = this._dataSource().findIndex(sourceItem => sourceItem[idField] === itemId);

    if (sourceIndex !== -1) {
      const updatedData = [...this._dataSource()];
      (updatedData[sourceIndex] as any)[updateField] = checked;
      this._dataSource.set(updatedData);
      this.applyFilters();
      this.dataSourceChanged.emit(updatedData);
    }
  }

  /** Column lookup by property, rebuilt only when the column set changes */
  private _columnMap = computed(() => {
    const map = new Map<string, GridColumn>();
    for (const column of this.columns()) {
      map.set(column.property, column);
    }
    return map;
  });

  /** Per-row search predicate. Term is pre-lowercased by the caller. */
  private matchesSearchTerm(item: T, term: string, columnMap: Map<string, GridColumn>): boolean {
    for (const key of Object.keys(item as Record<string, any>)) {
      const value = (item as Record<string, any>)[key];
      const column = columnMap.get(key);

      if (column?.isCheckbox) {
        // For checkboxes, search for "true", "false", "yes", "no"
        const boolValue = Boolean(value);
        if (
          (boolValue && ['true', 'yes', '1', 'checked'].includes(term)) ||
          (!boolValue && ['false', 'no', '0', 'unchecked'].includes(term))
        ) {
          return true;
        }
      } else if (column?.isFileUpload) {
        // For file columns, search on the file name instead of the raw value
        if (this.getRowFileName(item, key).toLowerCase().includes(term)) {
          return true;
        }
      } else if (column?.isDropdown) {
        // For dropdowns, search in both value and display text
        const displayText = this.getDropdownDisplayText(column, value, item);
        if (String(displayText).toLowerCase().includes(term) ||
            String(value).toLowerCase().includes(term)) {
          return true;
        }
      } else if (String(value).toLowerCase().includes(term)) {
        // Regular search for other columns
        return true;
      }
    }

    return false;
  }

  // Enhanced data filtering and sorting
  private applyFilters(): void {
    const source = this._dataSource();
    const term = this._searchTerm().toLowerCase();
    const sortColumn = this._sortColumn();
    const columnMap = this._columnMap();

    // Apply search filter. When there is no term we keep the source reference and only
    // copy below if sorting needs a mutable array.
    let filtered = term
      ? source.filter(item => this.matchesSearchTerm(item, term, columnMap))
      : source;

    // Apply sorting.
    // Decorate-sort-undecorate: the sort key is resolved once per row instead of twice
    // per comparison, which matters a lot once the grid holds thousands of rows.
    if (sortColumn) {
      const column = columnMap.get(sortColumn);
      const ascending = this._sortDirection() === 'asc';
      const direction = ascending ? 1 : -1;

      let decorated: { row: T; key: any }[];

      if (column?.isCheckbox) {
        decorated = filtered.map(row => ({ row, key: this.getPropertyValue(row, sortColumn) ? 1 : 0 }));
      } else if (column?.isNumeric) {
        decorated = filtered.map(row => ({ row, key: Number(this.getPropertyValue(row, sortColumn)) || 0 }));
      } else {
        decorated = filtered.map(row => ({ row, key: String(this.getPropertyValue(row, sortColumn)).toLowerCase() }));
      }

      decorated.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) * direction);
      filtered = decorated.map(entry => entry.row);
    }

    // Hand the signal a distinct array even when the search/sort path aliased `source`.
    // Signals skip notification on an identical value, and with OnPush a skipped
    // notification would leave the view stale after refreshData().
    this._filteredData.set(filtered === source ? source.slice() : filtered);

    // Ensure current page is still valid after filtering
    // Only clamp if we have data to prevent resetting to 0 during initial load or empty states
    if (filtered.length > 0) {
      const maxPage = Math.max(0, Math.ceil(filtered.length / this._pageSize()) - 1);
      if (this._currentPage() > maxPage) {
        this._currentPage.set(maxPage);
      }
    }
  }

  public getPropertyValue(item: T, property: string): any {
    if (item == null) return undefined;
    // Fast path: the overwhelming majority of columns are flat properties, and this runs
    // several times per cell per change detection pass — avoid the split/reduce there.
    if (property.indexOf('.') === -1) {
      return (item as Record<string, any>)[property];
    }
    return property.split('.').reduce((obj: any, key) => obj?.[key], item);
  }

  private getDisplayedData(): T[] {
    const startIndex = this._currentPage() * this._pageSize();
    const endIndex = startIndex + this._pageSize();
    const displayed = this._filteredData().slice(startIndex, endIndex);
    return displayed;
  }

  /**
   * Page size choices offered by the paginator.
   *
   * Computed (not a plain method) so the array identity is stable — mat-paginator
   * treats a fresh array as a changed input and rebuilds its select on every pass.
   *
   * Auto-generated sizes are the full ladder up to the row count, plus the row count
   * itself as "show everything" — so small sizes stay available no matter how large the
   * set is. Rendering a very large set in one mat-table is expensive, so prefer backend
   * pagination — or an explicit `pageSizeOptions` — for huge grids.
   */
  readonly pageSizeChoices = computed<number[]>(() => {
    const customOptions = this.pageSizeOptions();
    const dataLength = this._filteredData().length;

    const options = new Set<number>();

    if (customOptions && customOptions.length > 0) {
      customOptions.forEach(size => options.add(size));
    } else {
      // Every step the data can actually fill — a 1500-row grid still offers 5 and 10,
      // so a user who wants a short page is never forced onto a large one.
      PAGE_SIZE_LADDER.filter(size => size < dataLength).forEach(size => options.add(size));

      // "All" — the largest page size is the row count, not a fixed ceiling
      if (dataLength > 0) {
        options.add(dataLength);
      }
    }

    // Always include current page size so the paginator can display it
    options.add(this._pageSize());

    return Array.from(options).sort((a, b) => a - b);
  });

  getPageSizeOptions(): number[] {
    return this.pageSizeChoices();
  }

  onSort(column: string): void {
    if (this._sortColumn() === column) {
      this._sortDirection.set(this._sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this._sortColumn.set(column);
      this._sortDirection.set('asc');
    }
    this._currentPage.set(0); // Reset to first page when sorting changes
    this.applyFilters();
    this.emitDataGridStateChange(); // NEW: Emit state change for backend
  }

  // Pagination
onPageChange(event: PageEvent): void {
  const dataLength = this._filteredData().length;

  // If "All" selected
  if (event.pageSize === dataLength) {
    this._currentPage.set(0);
  } else {
    this._currentPage.set(event.pageIndex);
  }

  this._pageSize.set(event.pageSize);

  this.onPaginationChange.emit({
    pageIndex: this._currentPage(),
    pageSize: event.pageSize,
    pageNumber: this._currentPage() + 1
  });

  this.emitDataGridStateChange();
}

  /**
   * Emits the current grid state (pagination, sorting, filtering, search)
   * Used for backend-driven pagination and data requests
   */
  private emitDataGridStateChange(): void {
    if (this.backendPaginationEnabled()) {
      this.onDataGridStateChange.emit({
        pageIndex: this._currentPage(),
        pageSize: this._pageSize(),
        sortColumn: this._sortColumn(),
        sortDirection: this._sortDirection(),
        searchTerm: this._searchTerm(),
        totalRecords: this._filteredData().length,
        totalPages: this.totalPages()
      });
    }
  }


  // Search
  onSearch(term: string): void {
    this._searchTerm.set(term);
    this._currentPage.set(0); // Reset to first page when search term changes
    this.applyFilters();
    this.emitDataGridStateChange(); // NEW: Emit state change for backend
  }

  // Row selection
  onRowSelect(item: T, checked: boolean): void {
    if (this.isRowDisabled(item)) return;

    const idField = this.uniqueIdField();
    if (!idField) {
      console.error('Row selection requires uniqueIdField to be set');
      return;
    }

    const itemId = String(item[idField]);
    const newSelected = new Set(this._selectedRows());

    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }

    this._selectedRows.set(newSelected);

    if(this.selectionStateField()) {
      this.updateRowSelectionInDatabase(item, checked);
    }

    this.onChecked.emit({
      data: JSON.stringify(item),
      checked: checked
    });
  }

  // Scoped to the current page, because that is what the header checkbox reports:
  // isAllSelected() and its indeterminate binding both read selectableDisplayedRows().
  // Acting on the whole filtered set here made the box claim one thing and do another —
  // ticking it on a 5-row page selected every row hidden behind the paginator.
  onSelectAll(checked: boolean): void {
    this._selectAll.set(checked);

    const idField = this.uniqueIdField();
    if (!idField) {
      console.error('Row selection requires uniqueIdField to be set');
      return;
    }

    // Merge into the existing set rather than replacing it, so rows ticked on other
    // pages survive a select-all/deselect-all on this one.
    const newSelected = new Set(this._selectedRows());
    this.selectableDisplayedRows().forEach(item => {
      const itemId = String(item[idField]);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
    });
    this._selectedRows.set(newSelected);

    const selectedRows = this.getSelectedRows();
    this.onSelectAllChange.emit({
      isSelectAll: checked,
      selectedRows: selectedRows,
      count: selectedRows.length
    });
  }

  // A row is new while it has no persisted identity, or while it is one the grid saw appended
  isRowNew(row: T): boolean {
    if (!row) return false;

    const flagField = this.newRowField();
    if (flagField) {
      return !!(row as any)[flagField];
    }

    const idField = this.uniqueIdField();
    if (!idField) return false;

    const id = (row as any)[idField];
    if (id === null || id === undefined || id === '' || id === 0 || id === '0') return true;

    return this._newRowIds().has(String(id));
  }

  // Label for the edit/save action: "Edit" when idle, "Save" for a new row, "Update" for an existing one
  getEditActionLabel(row: T, index: number): string {
    if (!this.useInlineEdit() || !this.isRowEditing(index)) return 'Edit';
    return this.isRowNew(row) ? 'Save' : 'Update';
  }

  // Row editing
  startEdit(index: number): void {
    // Clear anything left over from a previous row before the new one is derived
    this.resetEditingState();
    this._editingRow.set(index);
    const rowData = { ...this.displayedData()[index] };
    this._editingData.set(this.applyComputedColumns(rowData));

  //  Emit the row being edited with full row data
  this.onRowEditStart.emit({
    rowData: this._editingData() as T,
    rowIndex: this._currentPage() * this._pageSize() + index, // absolute index in filtered data
    displayIndex: index // index on current page
  });

    // Create form group for time and date fields
    const formControls: any = {};
    this.timeColumns().forEach(timeCol => {
      const value = rowData[timeCol] || '';
      formControls[timeCol] = [value];
    });

    this.dateColumns().forEach(dateCol => {
      let value = rowData[dateCol] || '';
      // Parse date string to Date object for the date picker
      if (typeof value === 'string' && value) {
        // Parse ISO date string (YYYY-MM-DD or similar) to Date object
        // Using Date constructor with UTC to avoid timezone issues
        const parts = value.split('-');
        if (parts.length === 3) {
          // Create date from parts to avoid timezone offset issues
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
          const day = parseInt(parts[2], 10);
          value = new Date(year, month, day);
        } else {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = date;
          }
        }
      }
      formControls[dateCol] = [value];
    });

    if (Object.keys(formControls).length > 0) {
      const newFormGroup = this.formBuilder.group(formControls);
      this._editingFormGroup.set(newFormGroup);

      // Subscribe to form control value changes for date and time fields
      // This captures changes from date picker and time picker selections
      this.dateColumns().forEach(dateCol => {
        const control = newFormGroup.get(dateCol);
        if (control) {
          control.valueChanges.subscribe(value => {
            this.setEditingValue(dateCol, this.formatDateValue(value));
          });
        }
      });

      this.timeColumns().forEach(timeCol => {
        const control = newFormGroup.get(timeCol);
        if (control) {
          control.valueChanges.subscribe(value => {
            this.setEditingValue(timeCol, value);
          });
        }
      });
    }
  }

  saveEdit(index: number): void {
    // A row that fails validation stays open with its messages showing
    this._editValidationAttempted.set(true);
    if (Object.keys(this.validateEditingRow()).length > 0) {
      return;
    }

    const displayedItem = this.displayedData()[index];
    const idField = this.uniqueIdField();
    let sourceIndex = -1;

    if (idField && displayedItem) {
      // Use ID-based lookup
      const itemId = displayedItem[idField];
      sourceIndex = this._dataSource().findIndex(sourceItem => sourceItem[idField] === itemId);
    } else {
      // Fallback to reference comparison
      sourceIndex = this._dataSource().findIndex(sourceItem => sourceItem === displayedItem);
    }

    if (sourceIndex !== -1) {
      const updatedData = this._dataSource().map((item, idx) => {
        if (idx === sourceIndex) {
          return { ...item, ...this._editingData() } as T;
        }
        return item;
      });

      this._dataSource.set(updatedData);
      this._editingRow.set(null);
      this.resetEditingState();

      // The row is no longer an unsaved addition
      if (idField && displayedItem) {
        const savedId = String(displayedItem[idField]);
        if (this._newRowIds().has(savedId)) {
          const remaining = new Set(this._newRowIds());
          remaining.delete(savedId);
          this._newRowIds.set(remaining);
        }
      }

      this.applyFilters();
      this.dataSourceChanged.emit(updatedData);
    }
  }

  cancelEdit(): void {
    this._editingRow.set(null);
    this.resetEditingState();
  }

  // Check if a column is a date column
  isDateColumn(columnProperty: string): boolean {
    return this.dateColumns().includes(columnProperty);
  }

  // Check if a column is a time column
  isTimeColumn(columnProperty: string): boolean {
    return this.timeColumns().includes(columnProperty);
  }

  // Whether a column should wrap its content within its width instead of expanding.
  isWrapColumn(columnProperty: string): boolean {
    return this.wrapColumns().includes(columnProperty);
  }

  // Check if column should be treated as a date for display purposes
  isDateOrTimeColumn(column: GridColumn): boolean {
    return column.isDateField || this.isDateColumn(column.property) ||
           column.isTimeField || this.isTimeColumn(column.property);
  }

  // Format date value to ISO string (YYYY-MM-DD) using local time (not UTC)
  formatDateValue(value: any): string {
    if (!value) return '';

    // If it's already a string in ISO format, return it
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }

    // If it's a Date object, convert using local time to avoid timezone offset issues
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return value;
  }

  // Format date value for display (use the same ISO format for consistency)
  getFormattedDateForDisplay(value: any, column: GridColumn): string {
    if (!value) return '';

    // If it's a Date object, format it properly instead of using toString()
    if (value instanceof Date) {
      return this.formatDateValue(value);
    }

    // If it's a string that looks like an ISO date, just return it
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value;
    }

    // Try to parse as date if it doesn't look like an ISO format
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return this.formatDateValue(date);
      }
    }

    return String(value);
  }

  // Actions
  onEditClick(item: T): void {
    this.onFHEditClick.emit(JSON.stringify(item));
  }

  onDeleteClick(item: T): void {
    this.onFHDeleteClick.emit(JSON.stringify(item));
  }

  onViewClick(item: T): void {
    this.onFHViewClick.emit(JSON.stringify(item));
  }

  onFHProgress(item: T): void {
    this.onFHProgressClick.emit(JSON.stringify(item));
  }

  onPrintClick(item: T): void {
    this.onPrint.emit(JSON.stringify(item));
  }

  // Extra configurable action buttons
  emitExtraAction1(item: T): void {
    this.onExtraAction1Click.emit(JSON.stringify(item));
  }

  emitExtraAction2(item: T): void {
    this.onExtraAction2Click.emit(JSON.stringify(item));
  }

  // Resolve icon URL from public path; will append .svg if no extension provided
  getIconUrl(iconName: string): string {
    if (!iconName) return '';
    const hasExt = /\.\w+$/.test(iconName);
    const prefix = this.iconPathPrefix ? this.iconPathPrefix() : '/asset/icons';
    return `${prefix}/${iconName}${hasExt ? '' : '.svg'}`;
  }

  // Safely render HTML/SVG content
  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // Row styling
  getRowStyle(item: T): any {
    const designers = this.rowDesignerList();
    const styleResolvers = this.rowStyleResolvers();

    // Fast path: shared empty object so ngStyle has nothing to diff (see getCellStyle)
    if (designers.length === 0 && styleResolvers.length === 0) {
      return NO_STYLES;
    }

    for (const designer of designers) {
      if (designer.condition(item)) {
        return {
          backgroundColor: designer.backgroundColor,
          color: designer.textColor,
          fontWeight: designer.fontWeight,
          borderColor: designer.borderColor
        };
      }
    }

    // NEW: Apply row style definitions (advanced styling)
    for (const styleDefinition of styleResolvers) {
      if (styleDefinition.condition(item)) {
        return this.buildStyleObject(
          styleDefinition.styles,
          styleDefinition.cssClasses
        );
      }
    }

    return NO_STYLES;
  }

  /**
   * Get cell-specific styling based on column and row data
   * Supports:
   * - Column-level CSS classes and styles
   * - Conditional cell styling based on cell value or row data
   * - Cell-level style overrides
   */
  getCellStyle(column: GridColumn, cellValue: any, rowData: T): any {
    const resolvers = this.cellStyleResolvers()[column.property];

    // Fast path: nothing to apply for this column, so hand back the shared empty object
    // rather than allocating one per cell per change detection pass.
    if (!column.styles && !column.cellStyleDefinitions?.length && !resolvers?.length) {
      return NO_STYLES;
    }

    const styles: any = {};

    // Apply column-level styles
    if (column.styles) {
      Object.assign(styles, column.styles);
    }

    // Apply conditional cell styling from cellStyleDefinitions
    if (column.cellStyleDefinitions && column.cellStyleDefinitions.length > 0) {
      for (const styleDef of column.cellStyleDefinitions) {
        if (styleDef.condition(cellValue, rowData)) {
          if (styleDef.styles) {
            Object.assign(styles, styleDef.styles);
          }
          break; // Apply first matching condition
        }
      }
    }

    // Apply styling from cellStyleResolvers (global configuration)
    if (resolvers && resolvers.length > 0) {
      for (const styleDef of resolvers) {
        if (styleDef.condition(cellValue, rowData)) {
          if (styleDef.styles) {
            Object.assign(styles, styleDef.styles);
          }
          break;
        }
      }
    }

    return styles;
  }

  /**
   * Get CSS classes for a cell
   * Combines column-level classes with conditional classes
   */
  getCellCssClasses(column: GridColumn, cellValue: any, rowData: T): string[] {
    const resolvers = this.cellStyleResolvers()[column.property];

    // Fast path: shared empty array so ngClass has nothing to diff (see getCellStyle)
    if (!column.cssClasses && !column.cellStyleDefinitions?.length && !resolvers?.length) {
      return NO_CLASSES;
    }

    const classes: string[] = [];

    // Add column-level CSS classes
    if (column.cssClasses) {
      if (typeof column.cssClasses === 'string') {
        classes.push(column.cssClasses);
      } else {
        classes.push(...column.cssClasses);
      }
    }

    // Add conditional CSS classes from cellStyleDefinitions
    if (column.cellStyleDefinitions && column.cellStyleDefinitions.length > 0) {
      for (const styleDef of column.cellStyleDefinitions) {
        if (styleDef.condition(cellValue, rowData)) {
          if (styleDef.cssClasses) {
            if (typeof styleDef.cssClasses === 'string') {
              classes.push(styleDef.cssClasses);
            } else {
              classes.push(...styleDef.cssClasses);
            }
          }
          break;
        }
      }
    }

    // Add conditional CSS classes from global cellStyleResolvers
    if (resolvers && resolvers.length > 0) {
      for (const styleDef of resolvers) {
        if (styleDef.condition(cellValue, rowData)) {
          if (styleDef.cssClasses) {
            if (typeof styleDef.cssClasses === 'string') {
              classes.push(styleDef.cssClasses);
            } else {
              classes.push(...styleDef.cssClasses);
            }
          }
          break;
        }
      }
    }

    return classes;
  }

  /**
   * Render cell content using custom render function
   * Supports rendering: HTML, text, icons, badges, buttons, custom components
   */
  renderCellContent(column: GridColumn, cellValue: any, rowData: T, rowIndex: number): any {
    // Check for custom render function
    const renderFunc = this.cellRenderFunctions()[column.property];
    if (renderFunc && typeof renderFunc === 'function') {
      const result = renderFunc(cellValue, rowData, rowIndex, column.property);
      // If result is a string with HTML, wrap it as safe HTML for rendering
      if (typeof result === 'string' && result.includes('<')) {
        return this.getSafeHtml(result);
      }
      return result;
    }

    // Check for column-level render function
    if (column.renderFunction && typeof column.renderFunction === 'function') {
      const result = column.renderFunction(cellValue, rowData, rowIndex, column.property);
      // If result is a string with HTML, wrap it as safe HTML for rendering
      if (typeof result === 'string' && result.includes('<')) {
        return this.getSafeHtml(result);
      }
      return result;
    }

    // Default: return cell value
    return cellValue;
  }



  private getEffectiveRowData(rowData: T, rowIndex: number): T {
    if (this.isRowEditing(rowIndex)) {
      return { ...rowData, ...(this._editingData() as Partial<T>) } as T;
    }
    return rowData;
  }

  isCellReadOnly(columnProperty: string, rowData: T, rowIndex: number): boolean {
    // A derived cell is written by its resolver, so it is never typed into directly
    if (this.computedColumns()[columnProperty]) {
      return true;
    }
    const resolver = this.readOnlyColumnResolvers()[columnProperty];
    if (typeof resolver !== 'function') {
      return false;
    }
    return !!resolver(this.getEffectiveRowData(rowData, rowIndex));
  }

  // ----- Per-row cell visibility -----

  private resolveCellVisible(columnProperty: string, rowData: T): boolean {
    const resolver = this.cellVisibilityResolvers()[columnProperty];
    if (typeof resolver !== 'function') {
      return true;
    }
    try {
      return !!resolver(rowData, this._editingMeta());
    } catch (error) {
      console.warn(`cellVisibilityResolvers error for "${columnProperty}":`, error);
      return true;
    }
  }

  /** False hides the cell's content — the column and the row's layout are untouched. */
  isCellVisible(columnProperty: string, rowData: T, rowIndex: number): boolean {
    return this.resolveCellVisible(columnProperty, this.getEffectiveRowData(rowData, rowIndex));
  }

  // ----- Inline edit validation -----

  /**
   * Validates every visible column of the open editing row and publishes the result.
   * Returns the messages so callers can branch on them without re-reading the signal.
   */
  private validateEditingRow(): Record<string, string> {
    const rules = this.columnValidations();
    const errors: Record<string, string> = {};

    if (Object.keys(rules).length > 0) {
      const rowData = this._editingData() as T;
      for (const column of this.columns()) {
        const rule = rules[column.property];
        // A cell the row doesn't show can't be filled in, so it must not block the save
        if (!rule || !this.resolveCellVisible(column.property, rowData)) continue;

        const message = this.validateCellValue(
          column,
          rule,
          (rowData as Record<string, any>)[column.property]
        );
        if (message) {
          errors[column.property] = message;
        }
      }
    }

    this._editingErrors.set(errors);
    return errors;
  }

  private validateCellValue(column: GridColumn, rule: GridColumnValidation, value: any): string {
    const label = column.header || column.property;
    const isEmpty = value === null
      || value === undefined
      || value === ''
      || (Array.isArray(value) && value.length === 0);

    if (rule.required && isEmpty) {
      return rule.messages?.required ?? `${label} is required`;
    }

    // The remaining built-ins describe the shape of a value, so an empty optional
    // cell skips them and goes straight to the caller's own validator.
    if (!isEmpty) {
      const text = String(value);

      if (rule.minLength != null && text.length < rule.minLength) {
        return rule.messages?.minLength ?? `${label} needs at least ${rule.minLength} characters`;
      }
      if (rule.maxLength != null && text.length > rule.maxLength) {
        return rule.messages?.maxLength ?? `${label} allows at most ${rule.maxLength} characters`;
      }

      if (rule.min != null || rule.max != null) {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          if (rule.min != null && numeric < rule.min) {
            return rule.messages?.min ?? `${label} must be at least ${rule.min}`;
          }
          if (rule.max != null && numeric > rule.max) {
            return rule.messages?.max ?? `${label} must be at most ${rule.max}`;
          }
        }
      }

      if (rule.pattern) {
        const expression = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
        if (!expression.test(text)) {
          return rule.messages?.pattern ?? `${label} is not in the expected format`;
        }
      }
    }

    if (typeof rule.validate === 'function') {
      try {
        return rule.validate(value, this._editingData() as T) || '';
      } catch (error) {
        console.warn(`columnValidations error for "${column.property}":`, error);
      }
    }

    return '';
  }

  /** Message for a cell, or '' — empty until the user has attempted a save. */
  getCellError(columnProperty: string): string {
    return this._editValidationAttempted() ? (this._editingErrors()[columnProperty] ?? '') : '';
  }

  hasCellError(columnProperty: string): boolean {
    return !!this.getCellError(columnProperty);
  }

  /** True while the open editing row is blocking its own save. */
  hasRowErrors(): boolean {
    return this._editValidationAttempted() && Object.keys(this._editingErrors()).length > 0;
  }

  // ----- Keyboard editing -----

  /**
   * Spreadsheet keys for the row being inline-edited: Enter saves, Escape discards,
   * and tabbing off the last editable cell saves. Keys from an open overlay (a
   * mat-select panel, a datepicker) never reach here — they live outside the cell.
   */
  onCellKeydown(event: KeyboardEvent, rowIndex: number, columnProperty: string): void {
    if (!this.useInlineEdit() || !this.isRowEditing(rowIndex)) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
      return;
    }

    const isForwardTab = event.key === 'Tab' && !event.shiftKey;
    const shouldSave = (event.key === 'Enter' && this.commitEditOnEnter())
      || (isForwardTab && this.isLastEditableCell(columnProperty, rowIndex));

    if (!shouldSave) return;

    event.preventDefault();
    this.saveEdit(rowIndex);
  }

  private isLastEditableCell(columnProperty: string, rowIndex: number): boolean {
    const row = this.displayedData()[rowIndex];
    if (!row) return false;

    const editable = this.columns().filter(column =>
      column.isEditable
      && !this.isCellReadOnly(column.property, row, rowIndex)
      && this.isCellVisible(column.property, row, rowIndex)
    );
    return editable[editable.length - 1]?.property === columnProperty;
  }

  // Handler for button clicks in rendered cells
  onRenderedButtonClick(action: string, rowData: any, columnName: string): void {
    this.onCellButtonClick.emit({
      action: action,
      rowData: rowData,
      column: columnName,
      timestamp: new Date()
    });
  }

  /**
   * Check if a cell should use custom rendering
   */
  hasCustomCellRendering(column: GridColumn): boolean {
    const globalRenderFunc = this.cellRenderFunctions()[column.property];
    return !!(globalRenderFunc || column.renderFunction);
  }

  /**
   * Helper method to build style object from styles and CSS classes
   */
  private buildStyleObject(styles?: Record<string, string | number>, cssClasses?: string | string[]): any {
    const result: any = {};

    if (styles) {
      Object.assign(result, styles);
    }

    return result;
  }

  // Utility methods
  isRowDisabled(item: T): boolean {
    if (!item) return false;
    const field = this.rowDisabledField();
    if (field && this.getPropertyValue(item, field)) {
      return true;
    }
    const resolver = this.rowDisabledResolver();
    if (resolver && resolver(item)) {
      return true;
    }
    return false;
  }

  isRowSelected(item: T): boolean {
    const idField = this.uniqueIdField();
    if (!idField) {
      return false; // Cannot determine selection without ID field
    }
    return this._selectedRows().has(String(item[idField])) && !this.isRowDisabled(item);
  }

  isRowSelectable(item: T): boolean {
    const condition = this.rowSelectionCondition();
    if (typeof condition !== 'function') {
      return true;
    }
    try {
      return !!condition(item);
    } catch {
      return true;
    }
  }

  isRowEditing(index: number): boolean {
    return this._editingRow() === index;
  }

  getEditingValue(property: string): any {
    const value = (this._editingData() as Record<string, any>)[property];
    const column = this.columns().find(col => col.property === property);

    if (column?.isCheckbox) {
      return Boolean(value);
    }

    return value !== undefined ? value : '';
  }

  // Public methods for external access
  getSelectedRows(): T[] {
    const idField = this.uniqueIdField();
    if (!idField) {
      return [];
    }

    const selectedIds = this._selectedRows();
    return this._filteredData().filter(item =>
      selectedIds.has(String(item[idField]))
    );
  }

  clearSelection(): void {
    this._selectedRows.set(new Set());
    this._selectAll.set(false);
  }

  refreshData(): void {
    this.applyFilters();
  }

  /**
   * Action visibility keyed by row object, resolved only for rows on the current page.
   *
   * The previous version resolved every row in the whole data source and then located
   * the row with a findIndex() on each lookup — one linear scan of the full dataset per
   * action button per row per change detection pass, which is what froze large grids.
   */
  private _actionVisibilityResults = computed(() => {
      const resolver = this.actionVisibility();
      const results = new Map<T, ActionVisibilityMap>();

      if (!resolver) return results;

      this.displayedData().forEach((row, index) => {
        try {
          results.set(row, resolver(row) || {});
        } catch (error) {
          console.warn('ActionVisibility error for row', index, ':', error);
          results.set(row, {});
        }
      });

      return results;
    });

  // Resolve whether a given action should be visible for the provided row.
 isActionVisible(row: T, key: ActionVisibilityKey, defaultValue: boolean): boolean {
      if (!this.actionVisibility()) return defaultValue;

      const rowResult = this._actionVisibilityResults().get(row);
      if (rowResult && rowResult[key] !== undefined && rowResult[key] !== null) {
        return !!rowResult[key];
      }

      return defaultValue;
    }


  /**
   * Columns rendered by the table, as a computed so the array identity only changes when
   * the column set actually changes. mat-table diffs this binding on every pass and
   * re-creates every cell of every row when it sees a new array reference.
   */
  readonly displayedColumns = computed<string[]>(() => {
    const columns: string[] = [];

    if (this.enableSelection()) {
      columns.push('selection');
    }

    if (this.showEditButton() || this.showDeleteButton() || this.showViewButton() || this.showPrintButton() || this.showProgressButton() || this.showCustomAction1() || this.showCustomAction2()) {
      columns.push('actions');
    }

    for (const col of this.columns()) {
      columns.push(col.property);
    }

    return columns;
  });

  // Get displayed columns for the table
  getDisplayedColumns(): string[] {
    return this.displayedColumns();
  }

  // Row double-click handler (template binds directly, but helper for clarity)
  emitRowDoubleClick(item: T): void {
    this.onRowDoubleClick.emit(JSON.stringify(item));
  }

  // Enhanced public methods for checkbox functionality

  // Get all checked items for a specific column
  getCheckedItemsForColumn(property: string): T[] {
    return this._dataSource().filter(item =>
      Boolean(this.getPropertyValue(item, property))
    );
  }

  // Set checkbox value for a specific item
  setCheckboxValue(item: T, property: string, checked: boolean): void {
    const idField = this.uniqueIdField();
    const itemId = idField ? item[idField] : null;

    let sourceIndex = -1;
    if (itemId !== null) {
      // Use ID-based lookup
      sourceIndex = this._dataSource().findIndex(sourceItem => sourceItem[idField] === itemId);
    } else {
      // Fallback to reference comparison if no ID field
      sourceIndex = this._dataSource().findIndex(sourceItem => sourceItem === item);
    }

    if (sourceIndex !== -1 && !this.readOnlyCheckboxColumns().includes(property)) {
      const updatedData = this._dataSource().map((dataItem, idx) => {
        if (idx === sourceIndex) {
          return {
            ...dataItem,
            [property]: checked
          } as T;
        }
        return dataItem;
      });

      this._dataSource.set(updatedData);
      this.applyFilters();
      this.dataSourceChanged.emit(updatedData);
    }
  }

  // Bulk update checkbox values
  bulkUpdateCheckboxColumn(property: string, checked: boolean, condition?: (item: T) => boolean): void {
    if (this.readOnlyCheckboxColumns().includes(property)) {
      return;
    }

    const updatedData = this._dataSource().map((item, index) => {
      if (!condition || condition(item)) {
        return {
          ...item,
          [property]: checked
        } as T;
      }
      return item;
    });

    // Only trigger updates if something was actually changed
    const hasChanges = updatedData.some((item, idx) => item !== this._dataSource()[idx]);
    if (hasChanges) {
      this._dataSource.set(updatedData);
      this.applyFilters();
      this.dataSourceChanged.emit(updatedData);
    }
  }

  // Mobile detection utility for responsive design
  isMobileView(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  }

  // Math utility for template
  Math = Math;

  // Time field helper methods
  /** Reused so the template's [formGroup] binding doesn't get a new group every pass */
  private _emptyEditingFormGroup: FormGroup | null = null;

  getEditingFormGroup(): FormGroup {
    const group = this._editingFormGroup();
    if (group) return group;

    if (!this._emptyEditingFormGroup) {
      this._emptyEditingFormGroup = this.formBuilder.group({});
    }
    return this._emptyEditingFormGroup;
  }

  onTimeFieldChange(property: string, timeValue: string): void {
    // Get the value from the form control to ensure we have the latest value
    const formGroup = this._editingFormGroup();
    const formValue = formGroup?.get(property)?.value;
    const finalValue = formValue !== undefined ? formValue : timeValue;

    // Update editing data with the correct value
    this.setEditingValue(property, finalValue);
  }

  onDateFieldChange(property: string, dateValue: any): void {
    // Get the value from the form control to ensure we have the latest value
    const formGroup = this._editingFormGroup();
    const formValue = formGroup?.get(property)?.value;
    const finalValue = formValue !== undefined ? formValue : dateValue;

    // Update editing data with the correct value
    this.setEditingValue(property, finalValue);
  }

  /**
   * TrackBy function for mat-table rows
   * Uses unique ID field to help Angular properly identify and reuse row components
   * This prevents Angular from recreating rows unnecessarily and causing checkbox issues
   */
  trackByRowId(index: number, row: T): any {
    const idField = this.uniqueIdField();
    if (idField && row) {
      return row[idField];
    }
    return index;
  }


  private loadSummaryOption() {
    //this.selectedSummaryColumns.set(this.summaryColumns());
    const cols = this.summaryColumns();
    //const cols = this.selectedSummaryColumns();

    if (cols && cols.length > 0) {
      const options: Option[] = cols.map(col => ({
        key: col,
        value: this.formatColumnHeader(col)
      }));

      this._summaryOption.set(options);
    }
    else {
      this._summaryOption.set([]);
    }
  }

  private loadGroupOption() {
    //this.selectedGroupColumns.set(this.groupByColumns());
    //const groupCols = this.selectedGroupColumns();

    const groupCols = this.groupByColumns();

    if (groupCols && groupCols.length > 0) {
      const options: Option[] = groupCols.map(col => ({
        key: col,
        value: this.formatColumnHeader(col)
      }));

      this._groupByOption.set(options);
    }
    else {
      this._groupByOption.set([]);
    }
  }

  onSummaryChange(value: any[]) {
    const keysOnly = value.map(v => v.key ?? v);
    this._selectedSummaryColumns.set(keysOnly);
  }

  onGroupChange(value: any[]) {
    const keysOnly = value.map(v => v.key ?? v);
    this._selectedGroupColumns.set(keysOnly);
  }

  private selectedGroupSummary() {
    // this._groupedSummary.set([]);
    // this._totalSummary.set({
    //   totalCount: 0,
    //   totals: {}
    // });

    const data = this._dataSource();
    const sumCols = this._selectedSummaryColumns();
    const groupCols = this._selectedGroupColumns();

    this._gridSummaryColumns.set(sumCols);
    this._gridGroupColumns.set(groupCols);

    // Reset if data or grouping not available
    if (!data.length || !groupCols.length) {
      this._groupedSummary.set([]);
      this._totalSummary.set({ totalCount: 0, totals: {} });
      return;
    }

    const groupedMap = new Map<string, any>();
    const totalTotals: Record<string, number> = {};
    sumCols.forEach(c => (totalTotals[c] = 0));
    let totalCount = 0;

    // GROUP + SUM
    data.forEach(row => {
      const key = groupCols.map(c => row[c] ?? '').join('|');
      if (!groupedMap.has(key)) {
        const newObj: any = {};
        groupCols.forEach(c => (newObj[c] = row[c]));
        sumCols.forEach(s => (newObj[s] = 0));
        newObj['count'] = 0;
        groupedMap.set(key, newObj);
      }

      const groupItem = groupedMap.get(key);
      groupItem['count'] += 1;
      totalCount++;

      // Add to group totals and overall totals
      sumCols.forEach(s => {
        const val = Number(row[s]) || 0;
        groupItem[s] += val;
        totalTotals[s] += val;
      });
    });

    // Set computed results
    this._groupedSummary.set(Array.from(groupedMap.values()));
    this._totalSummary.set({ totalCount, totals: totalTotals });

  }

  public allGroupSummary() {
    const data = this._dataSource();
    const groupCols = this.groupByColumns();
    const sumCols = this.summaryColumns();

    this._gridGroupColumns.set(groupCols);
    this._gridSummaryColumns.set(sumCols);

    // Reset if data or grouping not available
    if (!data.length || !groupCols.length) {
      this._groupedSummary.set([]);
      this._totalSummary.set({ totalCount: 0, totals: {} });
      return;
    }

    const groupedMap = new Map<string, any>();
    const totalTotals: Record<string, number> = {};
    sumCols.forEach(c => (totalTotals[c] = 0));
    let totalCount = 0;

    // GROUP + SUM
    data.forEach(row => {
      const key = groupCols.map(c => row[c]).join('|');
      if (!groupedMap.has(key)) {
        const newObj: any = {};
        groupCols.forEach(c => (newObj[c] = row[c]));
        sumCols.forEach(s => (newObj[s] = 0));
        newObj['count'] = 0;
        groupedMap.set(key, newObj);
      }

      const groupItem = groupedMap.get(key);
      groupItem['count'] += 1;
      totalCount++;

      // Add to group totals and overall totals
      sumCols.forEach(s => {
        const val = Number(row[s]) || 0;
        groupItem[s] += val;
        totalTotals[s] += val;
      });
    });

    // Set computed results
    this._groupedSummary.set(Array.from(groupedMap.values()));
    this._totalSummary.set({ totalCount, totals: totalTotals });
  }

  generateSelectedGroupSummary(): void {
    this.selectedGroupSummary();
  }

  // Group + summary columns, computed for a stable array identity (see displayedColumns)
  readonly displayedGroupColumns = computed<string[]>(
    () => [...this._gridGroupColumns(), ...this._gridSummaryColumns()]
  );

  readonly displayedGroupColumnsWithCount = computed<string[]>(
    () => [...this.displayedGroupColumns(), 'count']
  );

  // Returns all columns for mat-table including count
  getDisplayedColumnsWithCount(): string[] {
    return this.displayedGroupColumnsWithCount();
  }

  // Example: getDisplayedColumns() returns group + summary columns
  getDisplayedGroupColumns(): string[] {
    return this.displayedGroupColumns();
  }
}
