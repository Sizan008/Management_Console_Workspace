import {Label} from './../generic-label/generic-label';
import {CommonModule} from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  signal,
  ViewChild,
  output,
} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {GenericButton} from '../generic-button/generic-button';
import {InputTextBox} from '../../input-types/input-text-box/input-text-box';
import {InputSelectOptionField} from '../../input-types/input-select-option-field/input-select-option-field';
import {InputDate} from '../../input-types/input-date/input-date';
import {InputNumber} from '../../input-types/input-number/input-number';
import {InputTextArea} from '../../input-types/input-text-area/input-text-area';
import {GenericDataGrid} from '../generic-data-grid/generic-data-grid';
import {ExpansionPanelHeader} from '../../expansion-panel-header/expansion-panel-header';

/**
 * Generic Search Modal Component
 *
 * A highly configurable search modal that dynamically renders input fields
 * based on provided configuration and displays results in a data grid.
 *
 * @example
 * // Configuration for employee search
 * searchConfig: GenericSearchConfig = {
 *   title: 'Search Employees',
 *   searchFields: [
 *     { type: 'text', controlName: 'employeeId', label: 'Employee ID', placeholder: 'Enter Employee ID' },
 *     { type: 'text', controlName: 'name', label: 'Name', placeholder: 'Enter Name' },
 *     { type: 'select', controlName: 'department', label: 'Department', options: departments, searchable: true }
 *   ],
 *   gridConfig: {
 *     selectedColumns: ['employeeId', 'name', 'department'],
 *     customColumnNames: { employeeId: 'Employee ID', name: 'Name' }
 *   }
 * };
 */

export type SearchFieldType =
  | 'text'
  | 'select'
  | 'date'
  | 'number'
  | 'number-range'
  | 'textarea'
  | 'display';

export interface SearchFieldConfig {
  /** Type of input field to render */
  type: SearchFieldType;

  /** Form control name for this field */
  controlName: string;
  secondControlName?: string;

  /** Display label for the field */
  label: string;

  /** Placeholder text (optional) */
  placeholder?: string;
  secondPlaceholder?: string;


  /** Options for select/dropdown fields */
  options?: any[];

  /** Whether select field is searchable */
  searchable?: boolean;

  /** Whether field is readonly */
  isReadonly?: boolean;

  /** Whether display field is selectable (for display type) */
  isSelectable?: boolean;

  /** Display mode for display field (horizontal or vertical) */
  displayMode?: 'horizontal' | 'vertical';

  /** Default value for the field */
  defaultValue?: any;

  /** Custom validation requirements */
  required?: boolean;

  /** Minimum value (for number/date fields) */
  min?: number | Date;

  /** Maximum value (for number/date fields) */
  max?: number | Date;

  /** CSS class for grid layout (e.g., 'col-span-2') */
  cssClass?: string;
}

export interface GridColumnConfig {
  /** Array of column names to display in grid */
  selectedColumns: string[];

  /** Custom column header names */
  customColumnNames?: { [key: string]: string };

  /** Initial page size for grid */
  pageSize?: number;

  /** Whether to show edit button */
  showEditButton?: boolean;

  /** Whether to show delete button */
  showDeleteButton?: boolean;

  /** Label for action button (defaults to 'Select') */
  actionButtonLabel?: string;

  /** Title for the grid */
  gridTitle?: string;

  /** Enable row selection with checkboxes */
  enableSelection?: boolean;
}

export interface GenericSearchConfig {
  /** Modal title */
  title?: string;

  /** Array of search field configurations */
  searchFields: SearchFieldConfig[];

  /** Data grid configuration */
  gridConfig?: GridColumnConfig;

  /** Whether to auto-search on modal open */
  autoSearchOnOpen?: boolean;

  /** Custom CSS class for the form grid */
  formGridCss?: string;

  /** Hide the search button */
  hideSearchButton?: boolean;

  /** Hide the reset button */
  hideResetButton?: boolean;

  /** Hide the results grid */
  hideResultsGrid?: boolean;

  /** Hide the search criteria header */
  hideSearchCriteriaHeader?: boolean;
}

@Component({
  selector: 'generic-search-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField,
    InputDate,
    InputNumber,
    InputTextArea,
    GenericButton,
    GenericDataGrid,
    ExpansionPanelHeader,
    Label
  ],
  templateUrl: './generic-search-modal.html',
  styleUrls: ['./generic-search-modal.scss'],
})
export class GenericSearchModal implements OnInit {
  /** Configuration passed from parent component or modal */
  @Input() modalComponentData: any = {};

  /** Configuration for the search modal */
  @Input() config!: GenericSearchConfig;

  /** Existing form group to use instead of creating a new one */
  @Input() existingForm?: FormGroup;

  /** Search callback function that returns search results */
  @Input() searchCallback!: (filters: any) => Promise<any[]> | any[];

  /** Emits when a row is selected from the grid */
  onRowSelect = output<any>();

  /** Emits when modal should close */
  onClose = output<void>();

  // Exposed for modal parent API
  modalParent: any;

  filterForm!: FormGroup;
  searchResults = signal<any[]>([]);
  loading = signal(false);
  noResults = signal(false);
  resultsPanel = signal(true);
  searchCriteriaPanel = signal(true);

  @ViewChild(GenericDataGrid) dataGrid!: GenericDataGrid<any>;

  constructor(private fb: FormBuilder) {
  }

  ngOnInit(): void {
    // Use config from Input or modalComponentData
    if (!this.config && this.modalComponentData?.config) {
      this.config = this.modalComponentData.config;
    }

    if (!this.searchCallback && this.modalComponentData?.searchCallback) {
      this.searchCallback = this.modalComponentData.searchCallback;
    }

    if (!this.existingForm && this.modalComponentData?.existingForm) {
      this.existingForm = this.modalComponentData.existingForm;
    }

    // Validate required inputs
    if (!this.config) {
      console.error('GenericSearchModal: config is required');
      return;
    }

    if (!this.searchCallback) {
      console.error('GenericSearchModal: searchCallback is required');
      return;
    }

    // Build form dynamically based on field configuration
    this.buildForm();

    // Auto-search if configured
    if (this.config.autoSearchOnOpen) {
      this.onSearch();
    }
  }

  /**
   * Builds the reactive form dynamically based on field configuration
   */
  private buildForm(): void {
    // Use existing form if provided
    if (this.existingForm) {
      this.filterForm = this.existingForm;
      return;
    }

    const formConfig: any = {};

    this.config.searchFields.forEach((field) => {
      formConfig[field.controlName] = [
        field.defaultValue || '',
        field.required ? [] : [], // Add validators here if needed
      ];
      if (field.type === 'number-range' && field.secondControlName) {
        formConfig[field.secondControlName] = [''];
      }
    });

    this.filterForm = this.fb.group(formConfig);
  }

  /**
   * Handles search button click
   */
  async onSearch(): Promise<void> {
    if (this.filterForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.noResults.set(false);

    try {
      const filters = this.filterForm.value;

      // Convert select field objects to their keys if needed
      const processedFilters: any = {};
      this.config.searchFields.forEach((field) => {
        const value = filters[field.controlName];
        if (field.type === 'select' && value && typeof value === 'object') {
          processedFilters[field.controlName] = value.key || value;
        } else {
          processedFilters[field.controlName] = value;
        }
      });

      // Call the search callback
      const results = await Promise.resolve(
        this.searchCallback(processedFilters),
      );

      this.searchResults.set(results || []);
      this.noResults.set(!results || results.length === 0);
    } catch (error) {
      console.error('Search error:', error);
      this.searchResults.set([]);
      this.noResults.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Resets the search form
   */
  onReset(): void {
    this.filterForm.reset();
    this.searchResults.set([]);
    this.noResults.set(false);

    // Call search API after reset to reload all data
    this.onSearch();
  }

  /**
   * Handles row selection from the grid
   */
  onSelectRow(row: any): void {
    // If modal parent exists (when used in GenericModal), close it
    if (this.modalParent && typeof this.modalParent.close === 'function') {
      this.modalParent.close(row);
    } else {
      // Only emit if not in modal context (for standalone usage)
      this.onRowSelect.emit(row);
    }
  }

  /**
   * Gets the grid CSS class (defaults to 3 columns)
   */
  getFormGridClass(): string {
    return this.config.formGridCss || 'grid md:grid-cols-3 gap-4 mb-6';
  }

  /**
   * Gets the page size for grid
   */
  getPageSize(): number {
    return this.config.gridConfig?.pageSize || 10;
  }

  /**
   * Gets whether to show edit button
   */
  getShowEditButton(): boolean {
    return this.config.gridConfig?.showEditButton || false;
  }

  /**
   * Gets whether to enable selection
   */
  getEnableSelection(): boolean {
    return this.config.gridConfig?.enableSelection || false;
  }

  /**
   * Handle selection change
   */
  onSelectionChange(event: any): void {
    // Handle selection change if needed
    console.log('Selection changed:', event);
  }

  /**
   * Get modal result (called by parent modal when OK button is clicked)
   */
  getModalResult(): any {
    return this.filterForm.value;
  }

  /**
   * Gets field-specific CSS class
   */
  getFieldClass(field: SearchFieldConfig): string {
    return field.cssClass || '';
  }
}
