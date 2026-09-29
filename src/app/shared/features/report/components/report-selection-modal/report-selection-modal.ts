import { Component, OnInit, Input, Output, EventEmitter, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ReportRegistrationService } from '../../services/report-registration.service';
import { ToastrService } from 'ngx-toastr';
import { ExpansionPanelHeader } from '../../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../common-components/generic-component-type/generic-data-grid';


// Data interfaces matching the grid format
export interface ReportItem {
  id: number;
  reportName: string;
  functionId: string;
  status?: string;
  description?: string;
  dateCreated?: string;
  lastModified?: string;
  createdBy?: string;
  parameters?: number;
}

export interface ReportSelectionConfig {
  title?: string;
  searchPlaceholder?: string;
  findButtonText?: string;
  loadingText?: string;
  noDataMessage?: string;
  allowMultiSelect?: boolean;
  showCreateNew?: boolean;
  manage?:boolean;
}

@Component({
  selector: 'app-report-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GenericDataGrid,
    GenericButton,
    ExpansionPanelHeader
],
  templateUrl: './report-selection-modal.html',
  styleUrls: ['./report-selection-modal.scss']
})
export class ReportSelectionModalComponent implements OnInit {
  private toastr = inject(ToastrService);
  private formBuilder = inject(FormBuilder);
  private reportService = inject(ReportRegistrationService);
  // Inputs - following all-components-page pattern
  @Input() initialData?: any;
  @Input() config: ReportSelectionConfig = {};

  // Outputs
  @Output() result = new EventEmitter<any>();
  @Output() onFind = new EventEmitter<string>();
  @Output() onCreateNewEvent = new EventEmitter<void>();
  @Output() onPreview = new EventEmitter<ReportItem>();
  dataSource  = signal<any[]>([]);
  // Component state
  searchForm: FormGroup;
  filteredReports = signal<ReportItem[]>([]);
  selectedReports = signal<ReportItem[]>([]);
  isLoading = signal<boolean>(false);
  availableReportsPanel: WritableSignal<boolean> = signal(true);
  reportList: any[] = [];
  // Grid configuration - following the all-components-page pattern
  gridColumns = [
    'id',
    'reportName',
    'functionId',
    'parameters',
  ];

  // Remove row designers as they're not being used in the grid

  constructor() {
    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });
  }



  ngOnInit() {
    console.log("Modal initialized");

    // Load reports from API when component initializes
    this.loadReports();

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
   * Load reports from the API
   */
  private loadReportsAll() {

  }
  loadReports() {

    this.isLoading.set(true);
    if(this.config.manage){
      this.reportService.getAll().subscribe({
        next: (reports) => {
          console.log('Loaded reports from API:', reports);
          // Transform the data to match the grid format
          const transformedReports = reports.map((report: any) => ({
            id: report.id,
            reportName: report.reportName,
            functionId: report.functionId,
            parameters: report?.parameters?.length ?? 0
          }));
          this.dataSource.set(transformedReports);
          this.filteredReports.set(transformedReports);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading reports:', error);
          this.toastr.error('Failed to load reports', 'Error');
          this.isLoading.set(false);
        }
      });
    }else {

      let resourceList = JSON.parse(localStorage.getItem('resourceList') || '[]');
      if (!resourceList || resourceList.length === 0) {
      console.warn('No resourceList found in localStorage');
      this.isLoading.set(false);
      return;
      }

      // Filter resources where functionType is 'R' and extract functionIds
      const reportFunctionIds: string[] = resourceList
      .filter((item: any) => item?.attributes?.functionType === 'R')
      .map((m: any) => m.attributes.functionId)
      .filter((id: string) => id); // Remove any undefined/null values

      console.log('Report Function IDs to send:', reportFunctionIds);

      if (reportFunctionIds.length === 0) {
      console.warn('No report functions found with type "R"');
      this.toastr.warning('No report functions available for this user', 'Access Info');
      this.isLoading.set(false);
      return;
      }

      this.reportService.getByUserFunctions(reportFunctionIds).subscribe({
               next: (reports: any[]) => {
          console.log('Loaded reports from API:', reports);
          // Transform the data to match the grid format
          const transformedReports = reports.map((report: any) => ({
            id: report.id,
            reportName: report.reportName,
            functionId: report.functionId,
            parameters: report?.parameters?.length ?? 0
          }));
          this.dataSource.set(transformedReports);
          this.filteredReports.set(transformedReports);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          console.error('Error loading reports:', error);
          this.toastr.error('Failed to load reports', 'Error');
          this.isLoading.set(false);
        }
      });
    }
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
   * Perform API search for reports
   */
  performApiSearch(searchTerm: string) {
    this.isLoading.set(true);

    // You can implement the search API call here
    // For now, just filter existing data and emit the search term
    this.onFind.emit(searchTerm);
    this.performSearch();

    setTimeout(() => {
      this.isLoading.set(false);
    }, 500);
  }

  performSearch() {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.toLowerCase() || '';

    if (!searchTerm.trim()) {
      this.filteredReports.set(this.dataSource() || []);
      return;
    }

    const filtered = (this.dataSource() || []).filter((report: any) =>
      report.reportName.toLowerCase().includes(searchTerm) ||
      report.functionId.toLowerCase().includes(searchTerm)
    );

    this.filteredReports.set(filtered);
  }

  // Grid event handlers - following all-components-page pattern
  onReportRowSelect(selectedItems: any) {
    this.selectedReports.set(selectedItems);
    console.log('Selected reports:', selectedItems);
  }

  onReportSelectAll(allSelected: any) {
    if (allSelected) {
      this.selectedReports.set([...this.filteredReports()]);
    } else {
      this.selectedReports.set([]);
    }
    console.log('Select all changed:', allSelected, 'Selected:', this.selectedReports());
  }

  onReportEdit(eventData: any) {
    console.log('Report edit clicked:', eventData);
    // Parse the event data like in parameter-list-ui
    let report = eventData;
    if (typeof eventData === 'string') {
      try {
        report = JSON.parse(eventData);
      } catch (e) {
        console.error('Failed to parse event data:', e);
        return;
      }
    } else if (eventData?.data) {
      report = eventData.data;
    } else if (eventData?.rowData) {
      report = eventData.rowData;
    }

    console.log('Final report object for selection:', report);
    if (report) {
      this.result.emit(report);
    }
  }

  onReportView(report: any) {
    console.log('View report:', report);
    this.onPreview.emit(report);
  }

  onReportDelete(report: any) {
    console.log('Delete report:', report);
    this.toastr.warning('Delete functionality would be implemented here', 'Feature');
  }

  onReportPrint(reports: any) {
    console.log('Print reports:', reports);
    this.toastr.info('Print functionality would be implemented here', 'Feature');
  }

  onReportDataChanged(data: ReportItem[]) {
    console.log('Report data changed:', data);
    // Handle any data grid changes
  }

  // Action button handlers
  onSelectConfirm(event: MouseEvent) {
    const selected = this.selectedReports();
    if (selected.length > 0) {
      const result = this.config.allowMultiSelect ? selected : selected[0];
      this.result.emit(result);
    } else {
      this.toastr.warning('Please select at least one report', 'Selection Required');
    }
  }

  onCancel(event: MouseEvent) {
    this.result.emit(null);
  }

  onCreateNewClick(event: MouseEvent) {
    this.onCreateNewEvent.emit();
  }

  hasSelection(): boolean {
    return this.selectedReports().length > 0;
  }

  getSelectButtonText(): string {
    const count = this.selectedReports().length;
    if (this.config.allowMultiSelect) {
      return count > 0 ? `Select (${count})` : 'Select';
    }
    return 'Select';
  }

  // Panel header helpers
  getPanelTitle(): string {
    return this.config.title || 'Select Report';
  }

  getResultsCount(): number {
    return this.filteredReports().length;
  }
}
