import { CommonModule } from '@angular/common';
import { Component, OnInit, Type, WritableSignal, effect, inject, signal, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

import { ReportBackendService, ReportMetadata, ReportParameterMetadata, ReportGenerationRequest } from '../services/report-backend.service';

import { ReportRegistrationService } from '../services/report-registration.service';

import { ReportSelectionModalComponent } from '../components/report-selection-modal/report-selection-modal';
import { DialogUtils } from '../../../service/dialog-utils';
import { BUTTON_VISIBILITY, MENU_NAME, ONCLICK_RESET, ONCLICK_SAVE } from '../../../constant/button-signals.constant';
import { InputTextBox } from '../../../common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { GenericButton } from '../../../common-components/generic-component-type/generic-button/generic-button';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { InputTextArea } from '../../../common-components/input-types/input-text-area/input-text-area';
import { InputDate } from '../../../common-components/input-types/input-date/input-date';
import { InputNumber } from '../../../common-components/input-types/input-number/input-number';
import { InputAmount } from '../../../common-components/input-types/input-amount/input-amount';
import { InputIdBox } from '../../../common-components/input-types/input-id-box/input-id-box';
import { GenericSwitch } from '../../../common-components/generic-component-type/generic-switch/generic-switch';
import { GenericModal } from '../../../common-components/generic-component-type/generic-modal/generic-modal';

/**
 * Report Generation Page
 * Dynamically renders report parameters and generates reports
 */
@Component({
  selector: 'app-report-generation-ui',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    InputTextBox,
    InputSelectOptionField,
    GenericButton,
    ExpansionPanelHeader,
    InputTextArea,
    InputDate,
    InputNumber,
    InputAmount,
    InputIdBox,
    GenericSwitch,
    GenericModal
],
  templateUrl: './report-generation-ui.html',
  styleUrl: './report-generation-ui.scss'
})
export class ReportGenerationUI implements OnInit {
  // Injected services
  private formBuilder = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);
  private reportBackendService = inject(ReportBackendService);
  private reportRegistrationService = inject(ReportRegistrationService);
  private dialogUtils = inject(DialogUtils);
  private cdr = inject(ChangeDetectorRef);
  showModal = false;
  // Form and state properties
  selectionForm!: FormGroup;
  parameterForm!: FormGroup;
  loading = signal<boolean>(false);
  generating = signal<boolean>(false);
  selectionPanel: WritableSignal<boolean> = signal(true);
  parametersPanel: WritableSignal<boolean> = signal(true);
  outputFormatPanel: WritableSignal<boolean> = signal(true);

  // Report configuration
  reportMetadata = signal<ReportMetadata | null>(null);
  sortedParameters = signal<ReportParameterMetadata[]>([]);
  selectedFormat = signal<string>('PDF');
  availableFormats = signal<string[]|null>([]);
  modalComponent?: Type<any>;
  ReportSelectionModalComponent: Type<any> = ReportSelectionModalComponent;
  modalComponentData?: any = null;
  // Report list for selection
  reportList: any[] = [];

  // Dependent parameter loading states
  dependentParamLoading = signal<{ [key: string]: boolean }>({});
  private dependentParamSubscriptions: Subscription[] = [];

  menuName = MENU_NAME;
  onClickReset = ONCLICK_RESET;
  onClickSave = ONCLICK_SAVE;

  constructor() {
    effect(() => {
      const metadata = this.reportMetadata();
      if (metadata) {
        this.menuName.set(`REPORT GENERATION - ${metadata.reportName.toUpperCase()}`);
      } else {
        this.menuName.set('REPORT GENERATION');
      }
    });
    BUTTON_VISIBILITY.set({
      save: false,
      update: false,
      view: false,
      delete: false,
      exit: false,
      reset: true,
    });
    this.setupSignalEffects();
  }

  ngOnInit() {
    this.initializeSelectionForm();
    this.initializeParameterForm();
    this.loadReportList();

    // Check for query parameters to pre-load a report
    this.route.queryParams.subscribe(params => {
      const reportId = params['reportId'];
      if (reportId) {
        this.loadReportMetadataById(parseInt(reportId));
      }
    });
  }

  /**
   * Initialize selection form
   */
  private initializeSelectionForm() {
    this.selectionForm = this.formBuilder.group({
      reportId: [null],
      functionId: [''],
      reportName: [{ value: '', disabled: true }],
      appCode: [''],
    });
  }

  /**
   * Initialize empty parameter form
   */
  private initializeParameterForm() {
    this.parameterForm = this.formBuilder.group({});
  }
  onModalClose(isVisible: boolean) {
    console.log('Modal visibility changed:', isVisible);
    this.showModal = isVisible;

    if (!isVisible) {
      console.log('Modal closed');
    }
  }

  onModalVisibilityChange(isVisible: boolean) {
    this.showModal = isVisible;
    console.log('Modal visibility changed to:', isVisible);
  }

  onIdBoxChanged(value: string): void {
    console.log('IdBox changed:', value);
  }
// Update the openModal method:
// In all-components-page.ts
openModal(componentToLoad?: Type<any>, data?: any) {
  console.log('=== OPENING MODAL ===');
  console.log('Component to load:', componentToLoad);
  console.log('Component name:', componentToLoad?.name);

  // Reset modal state
  this.showModal = false;
  this.modalComponent = undefined;


  setTimeout(() => {
    this.modalComponent = componentToLoad || this.ReportSelectionModalComponent;

    const currentFieldData = this.selectionForm?.getRawValue ? this.selectionForm.getRawValue() : {};
    this.modalComponentData = {
      initialData: currentFieldData,
      ...(data || {})
    };

    console.log('Setting modal component:', this.modalComponent?.name);
    console.log('Setting modal data:', this.modalComponentData);

    this.showModal = true;

    console.log('Modal should now be visible');
  }, 50);
}

onModalResult(result: any) {
  console.log('Modal result received:', result);

  if (!result) {
    this.showModal = false;
    return;
  }

  // Handle report selection result
  if (result.id && result.reportName && result.functionId) {
    // Update form with selected report name and load metadata
    this.selectionForm.patchValue({
      reportName: result.reportName,
      functionId: result.functionId
    });
    this.loadReportMetadataById(result.id);
  } else if (typeof result === 'object' && !Array.isArray(result)) {
    // Handle other modal results
    const controlKeys = Object.keys(this.selectionForm.controls);
    const patch: any = {};
    controlKeys.forEach(key => {
      if (result[key] !== undefined) {
        patch[key] = result[key];
      }
    });
    if (Object.keys(patch).length) {
      console.log('Patching parent form with modal data:', patch);
      this.selectionForm.patchValue(patch);
    }
  }

  this.showModal = false;
}

  /**
   * Load all reports for selection
   */
  private loadReportList() {
    let resourceList = JSON.parse(localStorage.getItem('resourceList') || '[]');
    if(!resourceList || resourceList.length === 0) {
    console.warn('No resourceList found in localStorage');
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
    return;
    }

    this.reportRegistrationService.getByUserFunctions(reportFunctionIds).subscribe({
          next: (reports) => {
        console.log('Received reports from API:', reports);
        this.reportList = reports.map(report => ({
          id: report.id,
          reportName: report.reportName,
          functionId: report.functionId,
          status: report.isVisible ? 'Active' : 'Inactive'
        }));
        console.log('Processed report list:', this.reportList);
      },
      error: (err) => {
        console.error('Error loading reports:', err);
        this.toastr.error('Failed to load reports', 'Error');
      }
    });
  }

  private setupSignalEffects(): void {
    effect(() => {
      this.handleButtonActions();
    });
  }

  private handleButtonActions(): void {
    if (this.onClickReset()) {
      this.onReset();
    }
  }

  /**
   * Open report selection modal using new LdsModal
   */
  openReportModal() {
    console.log('=== OPENING REPORT SELECTION MODAL ===');

    // Reset modal state
    this.showModal = false;
    this.modalComponent = undefined;

    setTimeout(() => {
      this.modalComponent = this.ReportSelectionModalComponent;

      // Prepare modal data with configuration
      this.modalComponentData = {
        config: {
          title: 'Select Report',
          searchPlaceholder: 'Search reports by name, function ID...',
          findButtonText: 'Search',
          loadingText: 'Searching reports...',
          noDataMessage: 'No reports found. Try different search criteria or contact administrator.',
          allowMultiSelect: false,
          showCreateNew: false
        }
      };

      console.log('Opening modal with data:', this.modalComponentData);
      this.showModal = true;
    }, 50);
  }

  /**
   * Load report metadata by report ID
   */
  private loadReportMetadataById(reportId: number) {
    this.loading.set(true);
    this.reportBackendService.getReportMetadataById(reportId).subscribe({
      next: (metadata) => {
        this.reportMetadata.set(metadata);
        this.selectionForm.patchValue({
          reportId: metadata.id,
          functionId: metadata.functionId,
          reportName: metadata.reportName,
          appCode: metadata?.dataSourceInfo?.vAppName,
        });

        // Sort parameters and rebuild form
        const sorted = [...metadata.parameters]
          .sort((a, b) => a.parameterOrder - b.parameterOrder)
          .map(param => this.prepareParameterMetadata(param));
        this.sortedParameters.set(sorted);
        this.rebuildParameterForm(sorted);

        // Set available formats (backend uses supportedFormats)
        const formats = metadata.supportedFormats || metadata.outputFormats || [];
        this.availableFormats.set(formats);
        if (formats.length > 0) {
          this.selectedFormat.set(formats[0]);
        }

        setTimeout(() => {
          this.loading.set(false);
          this.cdr.detectChanges();
        });
       // this.toastr.success('Report loaded successfully', 'Success');
      },
      error: (err) => {
        console.error('Error loading report metadata:', err);
        this.toastr.error('Failed to load report metadata', 'Error');
        setTimeout(() => {
          this.loading.set(false);
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Load report metadata by function ID or report name
   */
  loadReportByFunctionId() {
    const functionId = this.selectionForm.get('functionId')?.value;
    const reportName = this.selectionForm.get('reportName')?.value;

    if (!functionId && !reportName) {
      this.toastr.warning('Please enter a Function ID or Report Name', 'Warning');
      return;
    }

    this.loading.set(true);

    // Try to load by function ID first, then by report name
    if (functionId) {
      this.loadReportByIdentifier('functionId', functionId);
    } else if (reportName) {
      this.loadReportByIdentifier('reportName', reportName);
    }
  }

  /**
   * Load report by identifier (functionId or reportName)
   */
  private loadReportByIdentifier(type: 'functionId' | 'reportName', value: string) {
    let serviceCall;

    if (type === 'functionId') {
      serviceCall = this.reportBackendService.getReportMetadataByFunctionId(value);
    } else {
      // For report name, find from the loaded report list first
      const foundReport = this.reportList.find(report =>
        report.reportName.toLowerCase().includes(value.toLowerCase())
      );

      if (foundReport) {
        serviceCall = this.reportBackendService.getReportMetadataById(foundReport.id);
      } else {
        this.loading.set(false);
        this.toastr.error(`No report found with name containing: ${value}`, 'Error');
        return;
      }
    }

    serviceCall.subscribe({
      next: (metadata) => {
        this.reportMetadata.set(metadata);
        this.selectionForm.patchValue({
          reportId: metadata.id,
          reportName: metadata.reportName,
          functionId: metadata.functionId,
        });

        // Sort parameters and rebuild form
        const sorted = [...metadata.parameters]
          .sort((a, b) => a.parameterOrder - b.parameterOrder)
          .map(param => this.prepareParameterMetadata(param));
        this.sortedParameters.set(sorted);
        this.rebuildParameterForm(sorted);

        // Set available formats (backend uses supportedFormats)
        const formats = metadata.supportedFormats || metadata.outputFormats || [];
        this.availableFormats.set(formats);
        if (formats.length > 0) {
          this.selectedFormat.set(formats[0]);
        }

        setTimeout(() => {
          this.loading.set(false);
          this.cdr.detectChanges();
        });
       // this.toastr.success('Report loaded successfully', 'Success');
      },
      error: (err) => {
        console.error('Error loading report metadata:', err);
        this.toastr.error(`Failed to load report by ${type}`, 'Error');
        setTimeout(() => {
          this.loading.set(false);
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Rebuild parameter form based on metadata
   */
  private rebuildParameterForm(parameters: ReportParameterMetadata[]) {
    const group: any = {};

    parameters.forEach(param => {
      const validators: ValidatorFn[] = [];
      const isRequired = this.isParameterRequired(param);
      if (isRequired) {
        validators.push(this.isSwitchInput(param) ? Validators.requiredTrue : Validators.required);
      }
      if (param.minLength) {
        validators.push(Validators.minLength(param.minLength));
      }
      if (param.maxLength) {
        validators.push(Validators.maxLength(param.maxLength));
      }
      if (param.minValue !== undefined) {
        validators.push(Validators.min(param.minValue));
      }
      if (param.maxValue !== undefined) {
        validators.push(Validators.max(param.maxValue));
      }

      // Process template variables in default value
      let processedDefaultValue: any = this.processParameterTemplate(param.defaultValue ?? '');

      if (this.isSwitchInput(param)) {
        processedDefaultValue = this.toBooleanValue(processedDefaultValue);
      }

      // Special handling for date fields
      if (param.dataType === 'DATE' && processedDefaultValue) {
        // Convert date-like strings to Date objects for date inputs.
        if (typeof processedDefaultValue === 'string') {
          const normalizedDate = this.normalizeStoredDate(processedDefaultValue);
          if (normalizedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            processedDefaultValue = new Date(normalizedDate + 'T00:00:00');
          }
        }
      }

      group[param.parameterName] = [processedDefaultValue, validators];
    });

    this.parameterForm = this.formBuilder.group(group);
    this.setupDependentParameterListeners();
    this.loadInitialDynamicOptions(parameters);
  }

  private prepareParameterMetadata(param: ReportParameterMetadata): ReportParameterMetadata {
    const isDynamicSelect = this.isDynamicSelectParameter(param);
    return {
      ...param,
      selectOptions: isDynamicSelect ? '' : param.selectOptions,
      _optionConfig: param.selectOptions
    } as ReportParameterMetadata;
  }

  isParameterRequired(param: ReportParameterMetadata): boolean {
    return this.toBooleanValue(param.isRequired ?? param.required);
  }

  isParameterReadOnly(param: ReportParameterMetadata): boolean {
    return this.toBooleanValue(param.readOnly ?? (param as any).readonly);
  }

  isParameterVisible(param: ReportParameterMetadata): boolean {
    return param.visible !== undefined ? this.toBooleanValue(param.visible) : true;
  }

  private toBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return !!value;
  }

  /**
   * Initialize the parameter form dynamically
   */
  private initializeForm() {
    const formControls: { [key: string]: FormControl } = {};

    this.sortedParameters().forEach(param => {
      const validators = [];

      if (param.required) {
        validators.push(Validators.required);
      }

      if (param.dataType === 'TEXT') {
        if (param.minLength) validators.push(Validators.minLength(param.minLength));
        if (param.maxLength) validators.push(Validators.maxLength(param.maxLength));
      }

      if (param.dataType === 'NUMBER') {
        if (param.minValue !== undefined) validators.push(Validators.min(param.minValue));
        if (param.maxValue !== undefined) validators.push(Validators.max(param.maxValue));
      }
      // Set default value
      let defaultValue: any = '';
      if (param.defaultValue) {
        if (param.defaultValue === 'TODAY' && param.dataType === 'DATE') {
          defaultValue = new Date();
        } else {
          defaultValue = this.processParameterTemplate(param.defaultValue);
        }
      }

      formControls[param.parameterName] = new FormControl(defaultValue, validators);
    });

    this.parameterForm = this.formBuilder.group(formControls);

    // Setup listeners for dependent parameters
    this.setupDependentParameterListeners();
  }

  /**
   * Setup listeners for cascading parameters
   */
  private setupDependentParameterListeners() {
    this.dependentParamSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.dependentParamSubscriptions = [];

    this.sortedParameters().forEach(param => {
      if (param.dependsOnParameter) {
        const parentControl = this.parameterForm.get(param.dependsOnParameter);
        const childControl = this.parameterForm.get(param.parameterName);

        if (parentControl && childControl) {
          if (!parentControl.value || parentControl.value === 'ALL') {
            childControl.setValue('');
            childControl.disable({ emitEvent: false });
            this.updateParameterOptions(param.parameterName, '');
          } else {
            childControl.enable({ emitEvent: false });
          }

          const subscription = parentControl.valueChanges.subscribe(parentValue => {
            this.onParentParameterChange(param.parameterName, param.dependsOnParameter!, parentValue);
          });
          this.dependentParamSubscriptions.push(subscription);
        }
      }
    });
  }

  private loadInitialDynamicOptions(parameters: ReportParameterMetadata[]) {
    parameters.forEach(param => {
      if (!this.isDynamicSelectParameter(param)) {
        return;
      }

      if (param.dependsOnParameter) {
        const parentValue = this.parameterForm.get(param.dependsOnParameter)?.value;
        if (parentValue && parentValue !== 'ALL') {
          this.loadOptionsForParameter(param);
        }
        return;
      }

      this.loadOptionsForParameter(param);
    });
  }

  /**
   * Handle parent parameter change for cascading
   */
  private onParentParameterChange(paramName: string, parentParamName: string, parentValue: any) {
    const control = this.parameterForm.get(paramName);
    const param = this.sortedParameters().find(parameter => parameter.parameterName === paramName);

    if (!parentValue || parentValue === 'ALL') {
      // Disable and clear dependent parameter
      control?.setValue('');
      control?.disable();
      this.updateParameterOptions(paramName, '');
    } else {
      // Enable and load options for dependent parameter
      control?.enable();
      if (param) {
        this.loadOptionsForParameter(param);
      }
    }
  }

  /**
   * Load options for dependent parameter
   */
  private loadOptionsForParameter(param: ReportParameterMetadata) {
    if (!this.isDynamicSelectParameter(param) || !param.dataSource) {
      return;
    }

    if (this.looksLikeDatabaseQuery(param.dataSource)) {
      this.loadParameterFromDatabase(param);
      return;
    }

    if (this.looksLikeApiSource(param.dataSource)) {
      this.loadParameterFromAPI(param);
      return;
    }

    this.loadParameterFromStaticDataSource(param);
  }

  /**
   * Check if parameter is dependent and parent has no value
   */
  isParameterDisabled(param: ReportParameterMetadata): boolean {
    if (param.dependsOnParameter) {
      const parentControl = this.parameterForm.get(param.dependsOnParameter);
      return !parentControl?.value || parentControl.value === 'ALL';
    }
    return false;
  }

  /**
   * Check if dependent parameter is loading
   */
  isParameterLoading(paramName: string): boolean {
    return this.dependentParamLoading()[paramName] || false;
  }

  /**
   * Get dropdown options for parameter
   */
  getParameterOptions(param: ReportParameterMetadata): Array<{ key: string; value: string }> {
    return this.getSelectOptions(param);
  }

  /**
   * Get output format options
   */
  getOutputFormatOptions(): Array<{ key: string; value: string }> {
    const formats = this.availableFormats();
    return formats?.map((format: string) => ({
      key: format,
      value: format,
    }))??[];
  }

  /**
   * Generate and preview report
   */
  onGenerateReport() {
    if (this.parameterForm.invalid) {
      this.toastr.error('Please fill all required fields correctly.', 'Validation Error');
      Object.keys(this.parameterForm.controls).forEach(key => {
        const control = this.parameterForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    if (this.selectionForm.invalid) {
      this.toastr.error('Please fill all required fields correctly.', 'Validation Error');
      Object.keys(this.selectionForm.controls).forEach(key => {
        const control = this.selectionForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const metadata = this.reportMetadata();
    if (!metadata) {
      this.toastr.error('No report loaded. Please select a report first.', 'Error');
      return;
    }

    this.generating.set(true);

    const appCode =  metadata?.dataSourceInfo?.vAppName || 'ultimus';
    const processedParameters = this.buildProcessedParameters();

    const request: ReportGenerationRequest = {
      reportId: metadata.id,
      outputFormat: this.selectedFormat(),
      parameters: processedParameters,
      appCode: appCode
    };

    // console.log("request ", request)
    this.reportBackendService.generateReportNew(request).subscribe({
      next: (blob) => {
        // Preview the report instead of downloading
        this.previewReport(blob, metadata.reportName);

        this.toastr.success(`Report "${metadata.reportName}" generated successfully!`, 'Success');
        setTimeout(() => {
          this.generating.set(false);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error generating report:', err);
        this.toastr.error('Failed to generate report. Please try again.', 'Error');
        setTimeout(() => {
          this.generating.set(false);
          this.cdr.detectChanges();
        });
      }
    });
  }

   /**
 * Format date according to the specified pattern
 * Supports patterns like: mm/dd/yyyy, dd/mm/yyyy, yyyy-mm-dd, etc.
 */
  private formatDate(date: Date | string, pattern: string): string {
    // Convert to Date object if it's a string
    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      console.warn('Invalid date input:', date);
      return '';
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return '';
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    // Convert pattern to lowercase for consistent matching
    const lowerPattern = pattern.toLowerCase();

    // Replace pattern tokens with actual values
    let formattedDate = lowerPattern
      .replace('yyyy', String(year))
      .replace('yy', String(year).slice(-2))
      .replace('mm', month)
      .replace('dd', day);

    console.log(`Formatted date: ${this.toLocalDateString(dateObj)} with pattern "${pattern}" -> "${formattedDate}"`);

    return formattedDate;
  }

  /**
   * Preview report in new window/tab
   */
  private previewReport(blob: Blob, reportName: string) {
    const format = this.selectedFormat().toLowerCase();

    // Create object URL for the blob
    const url = window.URL.createObjectURL(blob);

    if (format === 'pdf') {
      // For PDF, open in new tab for preview
      window.open(url, '_blank');
    } else {
      // For Excel/other formats, create download with preview option
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';

      // Determine file extension
      const extension = format === 'xlsx' ? 'xlsx' : (format === 'xls' || format === 'excel') ? 'xls' : 'pdf';
      const filename = `${reportName}_${new Date().getTime()}.${extension}`;
      link.download = filename;

      // Show preview options dialog
      this.showPreviewDialog(url, filename, format);
    }

    // Clean up the URL after some time
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);
  }

  /**
   * Show preview options dialog for non-PDF formats
   */
  private showPreviewDialog(url: string, filename: string, format: string) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

  }

  /**
   * Download report directly (can be called from preview)
   */
  onDownloadReport() {
    // Re-generate report for download
    this.onGenerateReportForDownload();
  }

  /**
   * Generate report specifically for download
   */
  private onGenerateReportForDownload() {
    const metadata = this.reportMetadata();
    if (!metadata) return;
    const appCode =  metadata?.dataSourceInfo?.vAppName || 'ultimus';
    this.generating.set(true);

    const processedParameters = this.buildProcessedParameters();
    const request: ReportGenerationRequest = {
      reportId: metadata.id,
      outputFormat: this.selectedFormat(),
      parameters: processedParameters,
      appCode: appCode
    };

    this.reportBackendService.generateReportNew(request).subscribe({
      next: (blob) => {
        console.log(this.selectedFormat().toLowerCase())
        // Direct download
        const format = this.selectedFormat().toLowerCase();
        const extension = format === 'xlsx' ? 'xlsx' : (format === 'xls' || format === 'excel') ? 'xls' : 'pdf';
        const filename = `${metadata.reportName}_${new Date().getTime()}.${extension}`;

        this.reportBackendService.downloadBlob(blob, filename);
        setTimeout(() => {
          this.generating.set(false);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Error generating report:', err);
        this.toastr.error('Failed to generate report. Please try again.', 'Error');
        setTimeout(() => {
          this.generating.set(false);
          this.cdr.detectChanges();
        });
      }
    });
  }

  /**
   * Reset form
   */
  onReset() {
    this.selectionForm.reset({
      appCode: '' // Keep default app code
    });
    this.parameterForm.reset();
    this.reportMetadata.set(null);
    this.sortedParameters.set([]);
    this.availableFormats.set([]);
    this.selectedFormat.set('PDF');
    this.onClickReset.set(false);
    this.toastr.info('Form has been reset.', 'Reset');
  }

  /**
   * Get help text for parameter
   */
  getHelpText(param: ReportParameterMetadata): string {
    return param.helpText || '';
  }

  /**
   * Check if parameter has select options
   */
  hasSelectOptions(param: ReportParameterMetadata): boolean {
    return (param.inputType === 'SELECT' || param.dataType === 'SELECT') && !!param.selectOptions;
  }

  /**
   * Parse select options from string (supports JSON format)
   */
  getSelectOptions(param: ReportParameterMetadata): Array<{ key: string, value: string }> {
    if (!param.selectOptions) {
      // Return empty array if no options - user needs to configure them
      return [];
    }

    try {
      // First, try to parse as JSON object format
      // e.g., {"ORACLE":"Oracle","POSTGRESQL":"PostGreSql","MYSQL":"MySql"}
      const parsedOptions = JSON.parse(param.selectOptions);

      if (typeof parsedOptions === 'object' && !Array.isArray(parsedOptions)) {
        // Convert object to array of {key, value}
        return Object.entries(parsedOptions).map(([key, value]) => ({
          key: key,
          value: value as string
        }));
      }

      // If it's already an array format
      if (Array.isArray(parsedOptions)) {
        return parsedOptions.map(opt => ({
          key: opt.key || opt.value,
          value: opt.value || opt.key
        }));
      }

      return [];
    } catch (jsonError) {
      // If JSON parsing fails, try comma-separated "key:value" format
      // e.g., "option1:Option 1,option2:Option 2"
      try {
        const options = param.selectOptions.split(',').map(opt => {
          const [key, value] = opt.split(':');
          return { key: key.trim(), value: value?.trim() || key.trim() };
        });
        return options;
      } catch (e) {
        console.error('Error parsing select options:', e);
        return [];
      }
    }
  }

  /**
   * Check if parameter should show as text input
   */
  isTextInput(param: ReportParameterMetadata): boolean {
    return param.dataType === 'STRING' && ['TEXT', '', null, undefined].includes(param.inputType as any);
  }

  /**
   * Check if parameter should show as text area
   */
  isInputTextArea(param: ReportParameterMetadata): boolean {
    return param.dataType === 'STRING' && param.inputType === 'TEXTAREA';
  }

  /**
   * Check if parameter should show as number input
   */
  isInputNumber(param: ReportParameterMetadata): boolean {
    return param.inputType === 'NUMBER' || (param.dataType === 'NUMBER' && param.inputType !== 'AMOUNT');
  }

  /**
   * Check if parameter should show as amount input
   */
  isInputAmount(param: ReportParameterMetadata): boolean {
    return param.inputType === 'AMOUNT';
  }

  /**
   * Check if parameter should show as date input
   */
  isInputDate(param: ReportParameterMetadata): boolean {
    return param.dataType === 'DATE';
  }

  /**
   * Check if parameter should show as switch
   */
  isSwitchInput(param: ReportParameterMetadata): boolean {
    return param.inputType === 'SWITCH';
  }

  /**
   * Process parameter template variables from session/local storage.
   */
  private processParameterTemplate(value: string): string {
    console.log("Processing template: ", value);
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Handle special date values first
    if (value.toUpperCase() === 'TODAY') {
      const today = this.getCurrentDate();
      console.log(`TODAY processed to: ${today}`);
      return today;
    }

    // Template variable mapping
    const templateVars: { [key: string]: string } = {
      'userId': this.getUserId(),
      'userID': this.getUserId(),
      'homeBranch': this.getHomeBranch(),
      'officeId': this.getOfficeId(),
      'officeCode': this.getOfficeCode(),
      'officeNm': this.getOfficeName(),
      'officeName': this.getOfficeName(),
      'employeeId': this.getEmployeeId(),
      'entityTypeId': this.getEntityTypeId(),
      'operationMode': this.getOperationMode(),
      'operationModeFunction': this.getOperationModeFunction(),
      'instituteType': this.getInstituteType(),
      'currentPageName': this.getCurrentPageName(),
      'userName': this.getUserName(),
      'userRole': this.getUserRole(),
      'authToken': this.getAuthToken(),
      'currentDate': this.getCurrentDate(),
      'systemDate': this.toLocalDateString(new Date()),
      'transactionDate': this.getTransactionDate(),
      'txnDt': this.getTransactionDateTime(),
      'firstDateOfMonth': this.getFirstDateOfMonth(),
      'lastDateOfMonth': this.getLastDateOfMonth(),
      'firstDateOfYear': this.getFirstDateOfYear(),
      'lastDateOfYear': this.getLastDateOfYear(),
      'previousSystemDate': this.getPreviousSystemDate(),
      'previousTransactionDate': this.getPreviousTransactionDate(),
      'functionID': this.getFunctionId(),
      'functionId': this.getFunctionId(),
      'accountNumber': this.getAccountNumber()

    };

    // Replace template variables {{variableName}}
    let processedValue = value;
    Object.keys(templateVars).forEach(key => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedValue = processedValue.replace(pattern, templateVars[key]);
    });

    if (this.parameterForm) {
      const rawValues = this.parameterForm.getRawValue();
      Object.keys(rawValues).forEach(key => {
        const parameterValue = rawValues[key];
        if (parameterValue === null || parameterValue === undefined || parameterValue === '') {
          return;
        }

        const resolvedValue = parameterValue instanceof Date
          ? this.toLocalDateString(parameterValue)
          : String(parameterValue);
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedValue = processedValue.replace(pattern, resolvedValue);
      });
    }

    return processedValue;
  }
getFirstDateOfMonth(){
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  return this.toLocalDateString(firstDayOfMonth);
}
getLastDateOfMonth(){
  const currentDate = new Date();
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  return this.toLocalDateString(lastDayOfMonth);
}
getFirstDateOfYear(){
  const currentDate = new Date();
  const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1);
  return this.toLocalDateString(firstDayOfYear);
}
getLastDateOfYear(){
  const currentDate = new Date();
  const lastDayOfYear = new Date(currentDate.getFullYear(), 11, 31);
  return this.toLocalDateString(lastDayOfYear);
}
getPreviousSystemDate(){
  const currentDate = new Date();
  const previousDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
  return this.toLocalDateString(previousDay);
}
getPreviousTransactionDate(){
  const currentDate = new Date();
  const previousDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
  return this.toLocalDateString(previousDay);
}
getFunctionId(){
  return this.getStorageValue(['functionId']);
}
getAccountNumber(){
  return this.getStorageValue(['accountNumber']);
}
private getOfficeId(): string {
  return this.getStorageValue(['officeId']);
}
private getOfficeCode(): string {
  return this.getStorageValue(['officeCode']);
}
private getOfficeName(): string {
  return this.getStorageValue(['officeNm', 'officeName']);
}
private getEmployeeId(): string {
  return this.getStorageValue(['employeeId']);
}
private getEntityTypeId(): string {
  return this.getStorageValue(['entityTypeId']);
}
private getOperationMode(): string {
  return this.getStorageValue(['operationMode']);
}
private getOperationModeFunction(): string {
  return this.getStorageValue(['operationModeFunction']);
}
private getInstituteType(): string {
  return this.getStorageValue(['instituteType']);
}
private getCurrentPageName(): string {
  return this.getStorageValue(['currentPageName']);
}
private getStorageValue(keys: string[], fallback = ''): string {
  for (const key of keys) {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null && sessionValue !== undefined && sessionValue !== '') {
      return sessionValue;
    }

    const localValue = localStorage.getItem(key);
    if (localValue !== null && localValue !== undefined && localValue !== '') {
      return localValue;
    }
  }

  return fallback;
}
private normalizeStoredDate(value: string): string {
  if (!value) {
    return '';
  }

  const trimmedValue = value.trim();
  const exactDateMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (exactDateMatch) {
    return exactDateMatch[1];
  }

  const parsedDate = new Date(trimmedValue);
  if (!isNaN(parsedDate.getTime())) {
    return this.toLocalDateString(parsedDate);
  }

  return trimmedValue;
}
  /**
   * Get current user ID from session/localStorage
   */
  private getUserId(): string {
    const userId = this.getStorageValue(['userId']);
    console.log('getUserId() result:', userId);
    return userId;
  }

  /**
   * Get user's home branch from session/localStorage
   */
  private getHomeBranch(): string {
    const userBranch = this.getStorageValue(['homeBranchId', 'officeCode', 'officeId'], '0031');
    return userBranch;
  }

  /**
   * Get user's display name from session/localStorage
   */
  private getUserName(): string {
    return this.getStorageValue(['userName']);
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  private getCurrentDate(): string {
    const currentDate = this.toLocalDateString(new Date());
    console.log('getCurrentDate() result:', currentDate);
    return currentDate;
  }

  /**
   * Get transaction date
   */
  private getTransactionDate(): string {
    const storedValue = this.getStorageValue(['transactionDate', 'txnDt']);
    return storedValue ? this.normalizeStoredDate(storedValue) : this.toLocalDateString(new Date());
  }

  private getTransactionDateTime(): string {
    return this.getStorageValue(['txnDt', 'transactionDate'], this.getTransactionDate());
  }

  /**
   * Get user role from session/localStorage
   */
  private getUserRole(): string {
    const userRole = this.getStorageValue(['userRole']);
    console.log('getUserRole() result:', userRole);
    return userRole;
  }

  private buildProcessedParameters(): { [key: string]: any } {
    const formValues = this.parameterForm.value;
    const processedParameters: { [key: string]: any } = {};

    Object.keys(formValues).forEach(key => {
      let value = formValues[key];
      const paramMetadata = this.sortedParameters().find(p => p.parameterName === key);

      if (paramMetadata?.dataType === 'DATE' && value) {
        let dateValue: Date;

        if (value instanceof Date) {
          dateValue = value;
        } else if (typeof value === 'string') {
          dateValue = new Date(value);
        } else {
          dateValue = new Date(value);
        }

        if (!isNaN(dateValue.getTime())) {
          value = paramMetadata.formatPattern
            ? this.formatDate(dateValue, paramMetadata.formatPattern)
            : this.toLocalDateString(dateValue);
        } else {
          console.warn(`Invalid date value for ${key}:`, value);
          value = '';
        }
      }

      value = this.processParameterTemplate(value);

      if (paramMetadata?.dataType === 'STRING' && value !== null && value !== undefined) {
        processedParameters[key] = String(value);
      } else {
        processedParameters[key] = value;
      }

      console.log("processedParameters[key]: ", key, "final value:", processedParameters[key]);
    });

    return processedParameters;
  }

  /**
   * Get user role from session/localStorage
   */
  private getAuthToken(): string {
    const authToken = this.getStorageValue(['access_token']);
    return authToken;
  }

  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Public method to test template processing (for debugging)
   */
  public testTemplate(template: string): string {
    console.log('=== MANUAL TEMPLATE TEST ===');
    const result = this.processParameterTemplate(template);
    console.log('Test result:', result);
    return result;
  }

  /**
   * Refresh all parameter values with template processing
   */
  public refreshParameterTemplates(): void {
    console.log('=== REFRESHING PARAMETER TEMPLATES ===');
    const currentFormValue = this.parameterForm.value;
    const parameters = this.sortedParameters();

    parameters.forEach(param => {
      if (param.defaultValue && param.defaultValue.includes('{{')) {
        const processedValue = this.processParameterTemplate(param.defaultValue);
        console.log(`Refreshing ${param.parameterName}: "${param.defaultValue}" -> "${processedValue}"`);
        this.parameterForm.patchValue({
          [param.parameterName]: processedValue
        });
      }
    });
  }


  /**
   * Load parameter options from API endpoint
   */
  private loadParameterFromAPI(param: ReportParameterMetadata) {
    if (!param.dataSource) return;

    // Set loading state
    this.dependentParamLoading.set({
      ...this.dependentParamLoading(),
      [param.parameterName]: true
    });

    const apiUrl = param.dataSource.trim();
    console.log(`Loading options from API: ${apiUrl} for parameter: ${param.parameterName}`);

    // Process template variables in API URL
    const processedUrl = this.processParameterTemplate(apiUrl);
    console.log(`Processed API URL: ${processedUrl}`);

    // Parse field mapping from selectOptions if available
    let keyField = 'id';
    let valueField = 'name';
    let arrayPath = '';

    const optionConfig = this.getParameterOptionConfig(param);
    if (optionConfig) {
      try {
        const fieldMapping = JSON.parse(optionConfig);
        keyField = fieldMapping.keyField || keyField;
        valueField = fieldMapping.valueField || valueField;
        arrayPath = fieldMapping.arrayPath || arrayPath;
        console.log(`Using field mapping: keyField="${keyField}", valueField="${valueField}", arrayPath="${arrayPath}"`);
      } catch (e) {
        console.warn('Invalid field mapping JSON, using defaults:', e);
      }
    }

    fetch(processedUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        'Authorization': `Bearer ${sessionStorage.getItem('access_token') || ''}`,
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`API response for ${param.parameterName}:`, data);

      // Extract array from nested object if arrayPath is specified
      let dataArray = data;

      if (arrayPath && typeof data === 'object' && !Array.isArray(data)) {
        // Navigate to nested array using dot notation (e.g., "response.payload")
        const pathParts = arrayPath.split('.');
        let current = data;

        for (const part of pathParts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            throw new Error(`Array path "${arrayPath}" not found in API response`);
          }
        }

        dataArray = current;
        console.log(`Extracted array from path "${arrayPath}":`, dataArray);
      }

      // Convert API response to select options format using specified fields
      let optionsString = '';

      if (Array.isArray(dataArray)) {
        const options: { [key: string]: string } = {};

        dataArray.forEach(item => {
          const key = item[keyField];
          const value = item[valueField];

          if (key !== undefined && value !== undefined) {
            options[String(key)] = String(value);
          }
        });

        optionsString = JSON.stringify(options);
        console.log(`Converted ${dataArray.length} items to options using ${keyField}/${valueField}:`, optionsString);
      } else if (!arrayPath && typeof data === 'object') {
        // If no arrayPath specified and response is object, try common array properties
        const commonArrayProps = ['data', 'payload', 'items', 'results', 'content'];
        let foundArray = false;

        for (const prop of commonArrayProps) {
          if (data[prop] && Array.isArray(data[prop])) {
            dataArray = data[prop];
            console.log(`Auto-detected array in property "${prop}":`, dataArray);
            foundArray = true;
            break;
          }
        }

        if (foundArray && Array.isArray(dataArray)) {
          const options: { [key: string]: string } = {};

          dataArray.forEach(item => {
            const key = item[keyField];
            const value = item[valueField];

            if (key !== undefined && value !== undefined) {
              options[String(key)] = String(value);
            }
          });

          optionsString = JSON.stringify(options);
        } else {
          // Use response as-is if it's already a key-value object
          optionsString = JSON.stringify(data);
        }
      } else {
        throw new Error('API response must be an array or object with array property');
      }

      // Update parameter options in the signal
      this.updateParameterOptions(param.parameterName, optionsString);
      this.clearParameterLoading(param.parameterName);
    })
    .catch(error => {
      console.error(`Error loading options from API for ${param.parameterName}:`, error);
      this.clearParameterLoading(param.parameterName);
      this.toastr.error(`Failed to load options for ${param.parameterLabel}: ${error.message}`, 'API Error');
    });
  }

  /**
   * Load parameter options from database query
   */
  private loadParameterFromDatabase(param: ReportParameterMetadata) {
    if (!param.dataSource) return;

    this.dependentParamLoading.set({
      ...this.dependentParamLoading(),
      [param.parameterName]: true
    });

    console.log(`Loading options from Database for parameter: ${param.parameterName}`);

    const query = param.dataSource.trim();
    const processedQuery = this.processParameterTemplate(query);

    const requestPayload = {
      query: processedQuery,
      parameterName: param.parameterName
    };

    // Call backend service to execute database query
    this.reportBackendService.executeParameterQuery(requestPayload)
      .subscribe({
        next: (data) => {
          console.log(`Database response for ${param.parameterName}:`, data);

          // Convert database response to select options format
          let optionsString = '';
          if (Array.isArray(data)) {
            const options: { [key: string]: string } = {};
            const fieldMapping = this.getParameterFieldMapping(param);
            data.forEach(row => {
              const keys = Object.keys(row);
              const keyField = fieldMapping?.keyField && row[fieldMapping.keyField] !== undefined
                ? fieldMapping.keyField
                : keys[0];
              const valueField = fieldMapping?.valueField && row[fieldMapping.valueField] !== undefined
                ? fieldMapping.valueField
                : (keys[1] || keys[0]);
              const key = row[keyField];
              const value = row[valueField] ?? row[keyField];
              if (key !== undefined && value !== undefined) {
                options[String(key)] = String(value);
              }
            });
            optionsString = JSON.stringify(options);
          } else {
            optionsString = JSON.stringify(data);
          }

          this.updateParameterOptions(param.parameterName, optionsString);
          this.clearParameterLoading(param.parameterName);

        },
        error: (error) => {
          console.error(`Error loading options from Database for ${param.parameterName}:`, error);
          this.clearParameterLoading(param.parameterName);
          this.toastr.error(`Failed to load options for ${param.parameterLabel}`, 'Database Error');
        }
      });
  }

  /**
   * Update parameter options in the signal
   */
  private updateParameterOptions(parameterName: string, optionsString: string) {
    const updatedParams = this.sortedParameters().map(p =>
      p.parameterName === parameterName ? { ...p, selectOptions: optionsString } : p
    );
    this.sortedParameters.set(updatedParams);
    console.log(`Updated options for ${parameterName}:`, optionsString);
  }

  /**
   * Clear parameter loading state
   */
  private clearParameterLoading(parameterName: string) {
    this.dependentParamLoading.set({
      ...this.dependentParamLoading(),
      [parameterName]: false
    });
  }

  private isDynamicSelectParameter(param: ReportParameterMetadata): boolean {
    return (param.inputType === 'SELECT' || param.dataType === 'SELECT') && !!param.dataSource;
  }

  private looksLikeApiSource(dataSource: string): boolean {
    const source = dataSource.trim().toLowerCase();
    return source.startsWith('http://') || source.startsWith('https://') || source.startsWith('/');
  }

  private looksLikeDatabaseQuery(dataSource: string): boolean {
    const source = dataSource.trim().toLowerCase();
    return source.startsWith('select ') || source.includes(' from ');
  }

  private loadParameterFromStaticDataSource(param: ReportParameterMetadata) {
    if (!param.dataSource) {
      return;
    }

    this.dependentParamLoading.set({
      ...this.dependentParamLoading(),
      [param.parameterName]: true
    });

    try {
      const parsed = JSON.parse(this.processParameterTemplate(param.dataSource.trim()));
      const optionsString = Array.isArray(parsed)
        ? JSON.stringify(
            Object.fromEntries(
              parsed.map((item: any) => [String(item.key ?? item.value), String(item.value ?? item.key)])
            )
          )
        : JSON.stringify(parsed);
      this.updateParameterOptions(param.parameterName, optionsString);
    } catch (error) {
      console.error(`Error parsing static dataSource for ${param.parameterName}:`, error);
      this.toastr.error(`Failed to parse static options for ${param.parameterLabel}`, 'Options Error');
    } finally {
      this.clearParameterLoading(param.parameterName);
    }
  }

  private getParameterOptionConfig(param: ReportParameterMetadata): string {
    return ((param as any)._optionConfig ?? '') as string;
  }

  private getParameterFieldMapping(param: ReportParameterMetadata): { keyField?: string; valueField?: string; arrayPath?: string } | null {
    const optionConfig = this.getParameterOptionConfig(param);
    if (!optionConfig) {
      return null;
    }

    try {
      return JSON.parse(optionConfig);
    } catch {
      return null;
    }
  }
}
