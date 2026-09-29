import { Component, OnInit, Input, Output, EventEmitter, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ExpansionPanelHeader } from '../../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../common-components/generic-component-type/generic-data-grid';

// Data interfaces matching the grid format
export interface FunctionItem {
  functionId: string;
  functionName: string;
  module: string;
  description?: string;
  isActive?: boolean;
}

export interface FunctionSelectionConfig {
  title?: string;
  searchPlaceholder?: string;
  findButtonText?: string;
  loadingText?: string;
  noDataMessage?: string;
  allowMultiSelect?: boolean;
  showCreateNew?: boolean;
}

@Component({
  selector: 'app-function-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GenericDataGrid,
    GenericButton,
    ExpansionPanelHeader
],
  templateUrl: './function-selection-modal.html',
  styleUrls: ['./function-selection-modal.scss']
})
export class FunctionSelectionModalComponent implements OnInit {
  private toastr = inject(ToastrService);
  private formBuilder = inject(FormBuilder);

  // Inputs
  @Input() initialData?: any;
  @Input() config: FunctionSelectionConfig = {};
  @Input() dataSource: FunctionItem[] = [];

  // Outputs
  @Output() result = new EventEmitter<any>();
  @Output() onFind = new EventEmitter<string>();
  @Output() onCreateNewEvent = new EventEmitter<void>();
  @Output() onPreview = new EventEmitter<FunctionItem>();

  // Component state
  searchForm: FormGroup;
  filteredFunctions = signal<FunctionItem[]>([]);
  selectedFunctions = signal<FunctionItem[]>([]);
  isLoading = signal<boolean>(false);
  availableFunctionsPanel: WritableSignal<boolean> = signal(true);

  // Grid configuration - using function-specific columns
  gridColumns = [
    'functionId',
    'functionName',
    // 'module',
  ];

  constructor() {
    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });
  }

  ngOnInit() {
    console.log("Function modal initialized");
    
    // Load functions when component initializes
    this.loadFunctions();
    
    // Process initial data if provided
    if (this.initialData?.searchTerm) {
      this.searchForm.patchValue({ searchTerm: this.initialData.searchTerm });
    }

    // Setup search form subscription
    this.searchForm.get('searchTerm')?.valueChanges.subscribe(() => {
      this.performSearch();
    });
  }

  /**
   * Load functions from mock data or API
   */
  loadFunctions() {
    this.isLoading.set(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Use provided dataSource or fallback to mock data
      const functions = this.dataSource.length > 0 ? this.dataSource : [];
      
      console.log('Loaded functions:', functions);
      this.dataSource = functions;
      this.filteredFunctions.set(functions);
      this.isLoading.set(false);
    }, 300);
  }

  onSearchTermChanged(value: string) {
    this.searchForm.patchValue({ searchTerm: value });
  }

  onFindClick(event: MouseEvent) {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.trim();
    if (searchTerm) {
      this.performApiSearch(searchTerm);
    } else {
      this.toastr.warning('Please enter a search term', 'Search Required');
    }
  }

  /**
   * Perform API search for functions
   */
  performApiSearch(searchTerm: string) {
    this.isLoading.set(true);
    
    // Emit search term and perform local search
    this.onFind.emit(searchTerm);
    this.performSearch();
    
    setTimeout(() => {
      this.isLoading.set(false);
    }, 500);
  }

  performSearch() {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.toLowerCase() || '';
    
    if (!searchTerm.trim()) {
      this.filteredFunctions.set(this.dataSource || []);
      return;
    }

    const filtered = (this.dataSource || []).filter((func: any) =>
      func.functionId.toLowerCase().includes(searchTerm) ||
      func.functionName.toLowerCase().includes(searchTerm) ||
      func.module.toLowerCase().includes(searchTerm) ||
      (func.description && func.description.toLowerCase().includes(searchTerm))
    );
    
    this.filteredFunctions.set(filtered);
  }

  // Grid event handlers
  onFunctionRowSelect(eventData: any) {
    console.log('Grid selection event:', eventData);
    
    // Handle the grid selection event properly
    if (eventData && typeof eventData === 'object') {
      if (eventData.data && typeof eventData.data === 'string') {
        try {
          // Parse the JSON string
          const functionData = JSON.parse(eventData.data);
          if (eventData.checked) {
            // Add to selection
            const current = this.selectedFunctions();
            if (!current.find(f => f.functionId === functionData.functionId)) {
              this.selectedFunctions.set([...current, functionData]);
            }
          } else {
            // Remove from selection
            const current = this.selectedFunctions();
            this.selectedFunctions.set(current.filter(f => f.functionId !== functionData.functionId));
          }
        } catch (e) {
          console.error('Failed to parse function data:', e);
        }
      } else if (Array.isArray(eventData)) {
        // Direct array of functions
        this.selectedFunctions.set(eventData);
      }
    }
    
    console.log('Updated selection:', this.selectedFunctions());
  }

  onFunctionEdit(eventData: any) {
    console.log('Function edit clicked:', eventData);
    // Parse the event data like in parameter-list-ui
    let functionItem = eventData;
    if (typeof eventData === 'string') {
      try {
        functionItem = JSON.parse(eventData);
      } catch (e) {
        console.error('Failed to parse event data:', e);
        return;
      }
    } else if (eventData?.data) {
      functionItem = eventData.data;
    } else if (eventData?.rowData) {
      functionItem = eventData.rowData;
    }

    console.log('Final function object for selection:', functionItem);
    if (functionItem) {
      this.result.emit(functionItem);
    }
  }

  onFunctionDataChanged(data: FunctionItem[]) {
    console.log('Grid data changed:', data);
    // Handle any data grid changes if needed
  }

  // Action button handlers
  onSelectConfirm(event: MouseEvent) {
    const selected = this.selectedFunctions();
    if (selected.length > 0) {
      const result = this.config.allowMultiSelect ? selected : selected[0];
      this.result.emit(result);
    } else {
      this.toastr.warning('Please select at least one function', 'Selection Required');
    }
  }

  onCancel(event: MouseEvent) {
    this.result.emit(null);
  }

  onCreateNewClick(event: MouseEvent) {
    this.onCreateNewEvent.emit();
  }

  hasSelection(): boolean {
    return this.selectedFunctions().length > 0;
  }

  getSelectButtonText(): string {
    const count = this.selectedFunctions().length;
    if (this.config.allowMultiSelect) {
      return count > 0 ? `Select (${count})` : 'Select';
    }
    return 'Select';
  }

  // Panel header helpers
  getPanelTitle(): string {
    return this.config.title || 'Select Function';
  }

  getResultsCount(): number {
    return this.filteredFunctions().length;
  }
}