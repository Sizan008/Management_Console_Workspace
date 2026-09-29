import { CommonModule } from '@angular/common';
import { Component, OnInit, WritableSignal, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { ReportSelectionModalComponent } from '../components/report-selection-modal/report-selection-modal';
import { FunctionSelectionModalComponent } from '../components/function-selection-modal/function-selection-modal';
import { ParameterModalComponent } from '../components/parameter-modal/parameter-modal';

import { ReportRegistrationService, ReportDTO } from '../services/report-registration.service';
import { DatabaseConnectionService } from '../services/database-connection.service';
//import { ApiEndpointService } from '../services/api-endpoint.service';
import { catchError, of } from 'rxjs';
import { InputTextBox } from '../../../common-components/input-types/input-text-box/input-text-box';
import { BUTTON_VISIBILITY, MENU_NAME, ONCLICK_DELETE, ONCLICK_RESET, ONCLICK_SAVE, ONCLICK_UPDATE } from '../../../constant/button-signals.constant';
import { InputSelectOptionField } from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { GenericButton } from '../../../common-components/generic-component-type/generic-button/generic-button';
import { InputIdBox } from '../../../common-components/input-types/input-id-box/input-id-box';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericSwitch } from '../../../common-components/generic-component-type/generic-switch/generic-switch';
import { InputTextArea } from '../../../common-components/input-types/input-text-area/input-text-area';
import { InputFile } from '../../../common-components/input-types/input-file/input-file';
import { ExpansionSubPanelHeader } from '../../../common-components/expansion-sub-panel-header/expansion-sub-panel-header';
import { InputDate } from '../../../common-components/input-types/input-date/input-date';
import { InputNumber } from '../../../common-components/input-types/input-number/input-number';
import { GenericDataGrid } from '../../../common-components/generic-component-type/generic-data-grid';
import { GenericModal } from '../../../common-components/generic-component-type/generic-modal/generic-modal';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthResourceService } from '../../../../core/service/auth-resource-service';
import { UserService } from '../../../../core/user/user.service';
import { AppFunctionsRequest } from '../../../../core/utils/model/common.model';


/**
 * Report Registration and Parameter Setup Page
 * Handles report metadata and parameter definitions
 */
@Component({
  selector: 'app-report-parameter-list-ui',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTooltipModule,
    InputTextBox,
    InputSelectOptionField,
    GenericButton,
    InputIdBox,
    ExpansionPanelHeader,
    GenericSwitch,
    InputTextArea,
    InputFile,
    GenericDataGrid,
    ExpansionSubPanelHeader,
    InputDate,
    InputNumber,
    GenericDataGrid,
    GenericModal
],
  templateUrl: './report-parameter-list-ui.html',
  styleUrl: './report-parameter-list-ui.scss'
})
export class ReportParameterListUI implements OnInit {
  // Injected services
  private formBuilder = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private reportService = inject(ReportRegistrationService);
  private dbService = inject(DatabaseConnectionService);
  //private apiService = inject(ApiEndpointService);
  private authResourceService = inject(AuthResourceService);
  private _authService = inject(AuthService);
  private _userService = inject(UserService);

  // Form and state properties
  reportForm!: FormGroup;
  parameterForm!: FormGroup;
  loading = signal<boolean>(false);
  reportInfoPanel: WritableSignal<boolean> = signal(true);
  parameterSubPanel: WritableSignal<boolean> = signal(true);
  isEditingParameter = signal<boolean>(false);
  editingParameterIndex = signal<number>(-1);
  currentReportId = signal<number | null>(null);
  selectedReportFile: File | null = null;

  // Modal properties
  showModal = signal<boolean>(false);
  modalComponent?: any;
  modalComponentData?: any;

  // Report Category options
  reportCategoryOptions = [
    { key: 'FINANCIAL', value: 'Financial' },
    { key: 'OPERATIONAL', value: 'Operational' },
    { key: 'COMPLIANCE', value: 'Compliance' },
    { key: 'CUSTOM', value: 'Custom' },
  ];

  // Data Source Type options
  dataSourceTypeOptions = [
    { key: 'DATABASE', value: 'Database' },
    { key: 'API', value: 'API Endpoint' }
  ];

  // Output Format options (for multi-select checkboxes)
  outputFormatOptions = [
    { key: 'PDF', value: 'PDF' },
    { key: 'EXCEL', value: 'Excel' },
    // { key: 'WORD', value: 'Word' },
    // { key: 'HTML', value: 'HTML' },
   // { key: 'CSV', value: 'CSV' },
  ];

  // Parameter Data Type options
  parameterDataTypeOptions = [
    { key: 'STRING', value: 'String/Text' },
    { key: 'NUMBER', value: 'Number' },
    { key: 'DATE', value: 'Date' },
    { key: 'BOOLEAN', value: 'Boolean' },
    { key: 'SELECT', value: 'Dropdown/Select' },
  ];

  // Input Type options
  inputTypeOptions = [
    { key: 'TEXT', value: 'Text Input' },
    { key: 'TEXTAREA', value: 'Text Area' },
    { key: 'SWITCH', value: 'Switch' },
    { key: 'SELECT', value: 'Dropdown' },
    { key: 'NUMBER', value: 'Number Box' },
    { key: 'AMOUNT', value: 'Amount Box' },
    { key: 'DATE', value: 'Date Picker' },
  ];

  // Dynamic data for dropdowns
  databaseConnections: { key: string, value: string }[] = [];
  // apiEndpoints: { key: string, value: string }[] = [];

  // Report list loaded from backend
  reportList: any[] = [];

  // Mock function list (can be replaced with real API later)
  functionList:any[] = [

  ];

  // Auto Generation Period options
  autoGenPeriodOptions = [
    { key: 'DAILY', value: 'Daily' },
    { key: 'WEEKLY', value: 'Weekly' },
    { key: 'MONTHLY', value: 'Monthly' },
    { key: 'QUARTERLY', value: 'Quarterly' },
    { key: 'YEARLY', value: 'Yearly' },
  ];

  // Predefined default values for different parameter types
  predefinedDefaultValues = [
    { key: '{{homeBranch}}', value: 'Home Branch' },
    { key: '{{officeId}}', value: 'Office ID' },
    { key: '{{officeCode}}', value: 'Office Code' },
    { key: '{{officeNm}}', value: 'Office Name' },
    { key: '{{txnDt}}', value: 'Transaction Date' },
    { key: '{{systemDate}}', value: 'System Date' },
    { key: '{{authToken}}', value: 'Auth Token' },
    { key: '{{firstDateOfMonth}}', value: 'First Date of Month' },
    { key: '{{lastDateOfMonth}}', value: 'Last Date of Month' },
    { key: '{{firstDateOfYear}}', value: 'First Date of Year' },
    { key: '{{lastDateOfYear}}', value: 'Last Date of Year' },
    { key: '{{userID}}', value: 'User ID' },
    { key: '{{userId}}', value: 'User ID (camelCase)' },
    { key: '{{employeeId}}', value: 'Employee ID' },
    { key: '{{entityTypeId}}', value: 'Entity Type ID' },
    { key: '{{operationMode}}', value: 'Operation Mode' },
    { key: '{{operationModeFunction}}', value: 'Operation Mode Function' },
    { key: '{{instituteType}}', value: 'Institute Type' },
    { key: '{{currentPageName}}', value: 'Current Page Name' },
    { key: '{{functionID}}', value: 'Function ID' },
    { key: '{{functionId}}', value: 'Function ID (camelCase)' },
    { key: '{{accountNumber}}', value: 'Account Number' },
    { key: '{{previousSystemDate}}', value: 'Previous System Date' },
    { key: '{{previousTransactionDate}}', value: 'Previous Transaction Date' },
    { key: '{{branchCode}}', value: 'Branch Code' },
    { key: '{{transactionAmount}}', value: 'Transaction Amount' },
    { key: '{{transactionType}}', value: 'Transaction Type' },
    { key: '{{balanceAfterTransaction}}', value: 'Balance After Transaction' },
    { key: '{{customerName}}', value: 'Customer Name' },
    { key: '{{transactionReference}}', value: 'Transaction Reference' },
    { key: '{{currencyCode}}', value: 'Currency Code' },
    { key: 'TODAY', value: 'Today' },
    { key: 'UserInput', value: 'Custom User Input' },
  ];

  // Parameters array
  parameters = signal<any[]>([]);

  // Parameter table columns configuration
  parameterColumns: any[] = [];

  menuName = MENU_NAME;
  onClickReset = ONCLICK_RESET;
  onClickSave = ONCLICK_SAVE;
  onClickUpdate = ONCLICK_UPDATE;
  onClickDelete = ONCLICK_DELETE;

  constructor() {
    effect(() => {
      let localMenuName = 'REPORT REGISTRATION';
      this.menuName.set(localMenuName);
    });
    BUTTON_VISIBILITY.set({
      save: true,
      update: false,
      view: false,
      delete: false,
      exit: false,
      reset: true,
    });
    this.setupSignalEffects();
  }

  ngOnInit() {
    this.initializeReportForm();
    this.initializeParameterForm(); // Add this back for compatibility
    this.setupDataSourceListener();
    this.setupParameterColumns();
    this.setupFunctionIdListener();
    this.loadDatabaseConnections();
    // this.loadApiEndpoints();
    // this.loadReports();
    this.loadReportFunctionsData();
  }

  /**
   * Setup listener for default value changes
   */
  private loadReportFunctionsData(appId?: number, moduleId?: string): void {
    const request: AppFunctionsRequest = {
      // appId: appId ?? 1,          // default if needed
      moduleId: moduleId ?? null, // optional
      functionType: 'R'
    };

    this.authResourceService.getFilteredFunction(request)
      .pipe(
        catchError((error) => {
          console.error('Error loading applications:', error);
          return of([]);
        })
      )
      .subscribe((response) => {
        // Extract functions from response (depends on API)
        const functions = response.data ?? response;  // <--- declare variable here

        this.functionList = (functions as any[]).map((app: any) => ({
          functionId: app.functionId.toString(),
          functionName: app.functionNm
        }));
      });
  }

  /**
   * Get filtered predefined values based on parameter type
   */
  getFilteredPredefinedValues(): Array<{ key: string, value: string }> {
    const dataType = this.parameterForm.get('dataType')?.value;
    console.log("fff: ",dataType);
    switch (dataType) {
      case 'DATE':
        return this.predefinedDefaultValues.filter(item =>
          item.key.toLowerCase().includes('date') ||
          item.key === 'TODAY' ||
          item.key === '{{txnDt}}' ||
          item.key === '{{systemDate}}'
        );
      case 'STRING':
        return this.predefinedDefaultValues;
      case 'NUMBER':
        return this.predefinedDefaultValues.filter(item =>
          item.key.toLowerCase().includes('amount') ||
          item.key === '{{userID}}' ||
          item.key === '{{userId}}' ||
          item.key === '{{employeeId}}' ||
          item.key === '{{officeId}}' ||
          item.key === '{{accountNumber}}' ||
          item.key === 'UserInput'
        );
      case 'SELECT':
        return this.predefinedDefaultValues;
      default:
        return this.predefinedDefaultValues;
    }
  }

  /**
   * Get select options for default value dropdown (SELECT parameters)
   */
  getSelectOptionsForDefault(): Array<{ key: string, value: string }> {
    const selectOptionsValue = this.parameterForm.get('selectOptions')?.value;

    if (!selectOptionsValue) {
      return [];
    }

    try {
      const options = JSON.parse(selectOptionsValue);
      return Object.entries(options).map(([key, value]) => ({
        key: key,
        value: value as string
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Setup listener for dataSource field changes
   */
  // private setupDataSourceChangeListener() {
  //   this.parameterForm.get('dataSource')?.valueChanges.subscribe(() => {
  //     this.updateSelectOptionsValidators();
  //   });

  //   // Also listen to dataType and inputType changes
  //   this.parameterForm.get('dataType')?.valueChanges.subscribe(() => {
  //     this.updateSelectOptionsValidators();
  //   });

  //   this.parameterForm.get('inputType')?.valueChanges.subscribe(() => {
  //     this.updateSelectOptionsValidators();
  //   });
  // }

  /**
   * Setup function ID listener to populate function name
   */
  private setupFunctionIdListener() {
    this.reportForm.get('functionId')?.valueChanges.subscribe(functionId => {
      if (functionId) {
        const selectedFunction = this.functionList.find(f => f.functionId === functionId);
        if (selectedFunction) {
          this.reportForm.get('functionName')?.setValue(selectedFunction.functionName);
        }
      } else {
        this.reportForm.get('functionName')?.setValue('');
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
      this.onRefresh();
    } else if (this.onClickSave()) {
      this.onSave();
    } else if (this.onClickUpdate()) {
      console.log("Update Clicked");
      this.onUpdate();
    } else if (this.onClickDelete()) {
      this.onDelete();
    }
  }

  /**
   * Initialize the report form with validation
   */
  private initializeReportForm() {
    this.reportForm = this.formBuilder.group({
      id: [null],
      reportName: ['', [Validators.required, Validators.maxLength(150)]],
      functionId: ['', [Validators.required]],
      functionName: [{ value: '', disabled: true }],
      dataSourceType: ['', [Validators.required]],
      databaseConnectionId: [''],
      reportFile: [null],
      reportFileName: ['', [Validators.maxLength(150)]],
      outputFormats: [['PDF'], [Validators.required]],
      // visible: [true],
      autoGenPeriod: [''],
      genBeforeEod: [false],
    });
  }

  /**
   * Initialize the parameter form
   */
  private initializeParameterForm() {
    this.parameterForm = this.formBuilder.group({
      parameterName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      parameterLabel: ['', [Validators.required, Validators.maxLength(100)]],
      dataType: ['STRING', [Validators.required]],
      inputType: ['TEXT'],
      selectOptions: [''],
      dataSource: ['', [this.urlValidator]],
      formatPattern: [''],
      required: [false],
      visible: [true],
      readonly: [false],
      minLength: [null],
      maxLength: [null],
      minValue: [null],
      maxValue: [null],
      defaultValueType: ['predefined'], // 'predefined' or 'custom'
      defaultValue: [''],
      customDefaultValue: [''],
      parameterOrder: [1],
      dependsOnParameter: [''],
      helpText: ['', [Validators.maxLength(200)]],
    });
  }

  /**
   * Setup parameter table columns
   */
  private setupParameterColumns() {
    this.parameterColumns = [
      { property: 'sNo', header: 'S.No.', isEditable: false, isNumeric: true, visible: true, width: '80px' },
      { property: 'parameterName', header: 'Parameter Name', isEditable: false, isNumeric: false, visible: true, width: '150px' },
      { property: 'parameterLabel', header: 'Parameter Label', isEditable: false, isNumeric: false, visible: true, width: '150px' },
      { property: 'dataType', header: 'Data Type', isEditable: false, isNumeric: false, visible: true, width: '120px' },
      { property: 'required', header: 'Required', isEditable: false, isNumeric: false, visible: true, width: '100px' },
      { property: 'visible', header: 'Visible', isEditable: false, isNumeric: false, visible: true, width: '100px' },
      { property: 'readonly', header: 'Readonly', isEditable: false, isNumeric: false, visible: true, width: '100px' },
      { property: 'defaultValue', header: 'Default Value', isEditable: false, isNumeric: false, visible: true, width: '150px' },
    ];
  }

  /**
   * Setup listener for data source type changes
   */
  private setupDataSourceListener() {
    this.reportForm.get('dataSourceType')?.valueChanges.subscribe(dataSourceType => {
      this.updateDataSourceValidators(dataSourceType);
    });
  }

  /**
   * Update validators based on data source type
   */
  private updateDataSourceValidators(dataSourceType: string) {
    const dbControl = this.reportForm.get('databaseConnectionId');

    dbControl?.clearValidators();

    if (dataSourceType === 'DATABASE' || dataSourceType === 'BOTH') {
      dbControl?.setValidators([Validators.required]);
    }

    dbControl?.updateValueAndValidity();
  }

  /**
   * Update selectOptions validators based on dataSource value
   */
  private updateSelectOptionsValidators() {
    const selectOptionsControl = this.parameterForm.get('selectOptions');
    const dataSourceControl = this.parameterForm.get('dataSource');
    const dataTypeControl = this.parameterForm.get('dataType');
    const inputTypeControl = this.parameterForm.get('inputType');

    selectOptionsControl?.clearValidators();

    const dataType = dataTypeControl?.value;
    const inputType = inputTypeControl?.value;
    const dataSourceValue = dataSourceControl?.value?.trim();

    // Only require selectOptions for SELECT/DROPDOWN types without dataSource
    const isSelectType = dataType === 'SELECT' || inputType === 'SELECT' || dataType === 'DROPDOWN';

    if (isSelectType && !dataSourceValue) {
      selectOptionsControl?.setValidators([Validators.required]);
    }

    selectOptionsControl?.updateValueAndValidity();
  }

  /**
   * Check if data source fields should be shown
   */
  showDatabaseConnection(): boolean {
    const dataSourceType = this.reportForm.get('dataSourceType')?.value;
    return dataSourceType === 'DATABASE' || dataSourceType === 'BOTH';
  }

  // showApiEndpoint(): boolean {
  //   const dataSourceType = this.reportForm.get('dataSourceType')?.value;
  //   return dataSourceType === 'API' || dataSourceType === 'BOTH';
  // }

  /**
   * Get filtered input type options based on data type
   */
  getFilteredInputTypeOptions(): { key: string, value: string }[] {
    const dataType = this.parameterForm.get('dataType')?.value;

    if (dataType === 'NUMBER') {
      // For NUMBER data type, only show Number Box and Amount Box
      return this.inputTypeOptions.filter(option =>
        ['NUMBER', 'AMOUNT'].includes(option.key)
      );
    } else if (dataType === 'STRING') {
      // For STRING data type, show Text, InputTextArea, and Dropdown
      return this.inputTypeOptions.filter(option =>
        ['TEXT', 'TEXTAREA', 'SELECT'].includes(option.key)
      );
    } else if (dataType === 'DATE') {
      // For DATE data type, only show Date Picker
      return this.inputTypeOptions.filter(option =>
        option.key === 'DATE'
      );
    } else if (dataType === 'BOOLEAN') {
      // For BOOLEAN data type, show Select dropdown
      return this.inputTypeOptions.filter(option =>
        option.key === 'SWITCH'
      );
    }
    // else if (dataType === 'SELECT') {
    //   // For SELECT data type, only show Dropdown
    //   return this.inputTypeOptions.filter(option =>
    //     option.key === 'SELECT'
    //   );
    // }

    // Default: return all options
    return this.inputTypeOptions;
  }

  /**
   * Check parameter form field visibility
   */
  showTextInputType(): boolean {
    return this.parameterForm.get('dataType')?.value === 'STRING';
  }

  showDropdownOptions(): boolean {
    const dataType = this.parameterForm.get('dataType')?.value;
    const inputType = this.parameterForm.get('inputType')?.value;
    return dataType === 'SELECT' || inputType === 'SELECT';
  }

  showTextValidation(): boolean {
    return this.parameterForm.get('dataType')?.value === 'STRING';
  }

  showNumberValidation(): boolean {
    return this.parameterForm.get('dataType')?.value === 'NUMBER';
  }

  showDateFormat(): boolean {
    return this.parameterForm.get('dataType')?.value === 'DATE';
  }

  /**
   * Custom validator for URL format
   */
  urlValidator(control: any) {
    if (!control.value) {
      return null; // Allow empty values
    }

    const value = control.value.trim();

    // Allow template variables
    if (value.includes('{{') && value.includes('}}')) {
      return null;
    }

    try {
      // Check if it's a valid URL
      new URL(value);
      return null;
    } catch (error) {
      // If not a URL, check if it might be a SQL query or function
      const lowerValue = value.toLowerCase();

      // Allow SQL queries
      if (lowerValue.startsWith('select ') || lowerValue.includes('from ')) {
        return null;
      }

      // Allow function calls
      if (lowerValue.includes('()') || lowerValue.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*\(/)) {
        return null;
      }

      // Allow static JSON
      try {
        JSON.parse(value);
        return null;
      } catch (jsonError) {
        return { invalidDataSource: true };
      }
    }
  }

  /**
   * Get appropriate placeholder text for select options based on data source
   */
  getSelectOptionsPlaceholder(): string {
    if (this.hasDataSource()) {
      return 'Enter field mapping: {"keyField":"id","valueField":"name","arrayPath":"data"}';
    }
    return 'Enter options as JSON: {"key1":"Label 1","key2":"Label 2"}';
  }

  /**
   * Get select options label based on whether dataSource is provided
   */
  getSelectOptionsLabel(): string {
    if (this.hasDataSource()) {
      return 'Field Mapping (keyField, valueField)';
    }
    return 'Select Options (Required)';
  }

  /**
   * Check if dataSource is provided
   */
  hasDataSource(): boolean {
    const dataSource = this.parameterForm.get('dataSource')?.value?.trim();
    return !!dataSource;
  }

  /**
   * Check if dataSource field has validation errors
   */
  getDataSourceError(): string | null {
    const dataSourceControl = this.parameterForm.get('dataSource');

    if (dataSourceControl?.errors && dataSourceControl?.touched) {
      if (dataSourceControl.errors['invalidDataSource']) {
        return 'Please enter a valid URL, SQL query, function call, or JSON object';
      }
    }

    return null;
  }

  /**
   * Load database connections from backend
   */
  private loadDatabaseConnections() {
    this.dbService.getAll().subscribe({
      next: (connections) => {
        this.databaseConnections = connections.map(conn => ({
          key: conn.id!.toString(),
          value: `${conn.id}-${conn.connectionName}`
        }));
      },
      error: (err) => {
        console.error('Error loading database connections:', err);
        this.toastr.error('Failed to load database connections', 'Error');
      }
    });
  }

  /**
   * Load API endpoints from backend
   */
  // private loadApiEndpoints() {
  //   this.apiService.getAll().subscribe({
  //     next: (endpoints) => {
  //       this.apiEndpoints = endpoints.map(ep => ({
  //         key: ep.id!.toString(),
  //         value: `${ep.id}-${ep.endpointName}`
  //       }));
  //     },
  //     error: (err) => {
  //       console.error('Error loading API endpoints:', err);
  //       // this.toastr.error('Failed to load API endpoints', 'Error');
  //     }
  //   });
  // }

  /**
   * Load reports from backend
   */
  // private loadReports() {
  //   this.loading.set(true);
  //   this.reportService.getAll().subscribe({
  //     next: (reports) => {
  //       this.reportList = reports.map(report => {
  //         const func = this.functionList.find(f => f.functionId === report.functionId);
  //         return {
  //           id: report.id,
  //           reportName: report.reportName,
  //           functionName: func?.functionName || report.functionId,
  //           status: report.visible ? 'Active' : 'Inactive',
  //           functionId: report.functionId
  //         };
  //       });
  //       this.loading.set(false);
  //     },
  //     error: (err) => {
  //       console.error('Error loading reports:', err);
  //       this.toastr.error('Failed to load reports from server', 'Error');
  //       this.loading.set(false);
  //     }
  //   });
  // }

  /**
   * Open report selection modal using new modal system
   */
  openReportModal() {
    console.log('Opening report selection modal');

    // Reset modal state
    this.showModal.set(false);
    this.modalComponent = undefined;

    setTimeout(() => {
      this.modalComponent = ReportSelectionModalComponent;

      // Prepare modal data with configuration
      this.modalComponentData = {
        config: {
          title: 'Select Report',
          searchPlaceholder: 'Search reports by name, function ID...',
          findButtonText: 'Search',
          loadingText: 'Searching reports...',
          noDataMessage: 'No reports found. Try different search criteria or contact administrator.',
          allowMultiSelect: false,
          showCreateNew: false,
          manage:true
        }
      };

      console.log('Opening modal with data:', this.modalComponentData);
      this.showModal.set(true);
    }, 50);
  }

  /**
   * Open function selection modal using new modal system
   */
  openFunctionModal() {
    console.log('Opening function selection modal');

    // Reset modal state
    this.showModal.set(false);
    this.modalComponent = undefined;

    setTimeout(() => {
      this.modalComponent = FunctionSelectionModalComponent;

      // Prepare modal data with configuration
      this.modalComponentData = {
        dataSource: this.functionList,
        config: {
          title: 'Select Function',
          searchPlaceholder: 'Search functions by ID, name, or module...',
          findButtonText: 'Search',
          loadingText: 'Searching functions...',
          noDataMessage: 'No functions found. Try different search criteria or contact administrator.',
          allowMultiSelect: false,
          showCreateNew: false
        }
      };

      console.log('Opening function modal with data:', this.modalComponentData);
      this.showModal.set(true);
    }, 50);
  }

  /**
   * On Blur Load function by input string
   */

  loadFunctionById(functionId: number, appId?: number, moduleId?: string) {
    const request: AppFunctionsRequest = {
      appId: appId ?? 1,        // default appId if needed
      moduleId: moduleId ?? null,
      functionType: 'R'         // assuming 'R' for report functions
    };

    this.authResourceService.getFilteredFunction(request)
      .pipe(
        catchError((error) => {
          console.error('Error loading function by ID:', error);
          return of([]);
        })
      )
      .subscribe((response) => {
        // Extract data from response
        const functions = response.data ?? response;

        console.log(functions);

        const matchedFunction = functions.find((f: any) => f.functionId === functionId);

        if (matchedFunction) {
          this.reportForm.patchValue({
            functionId: matchedFunction.functionId,
            functionName: matchedFunction.functionNm,
          });
        } else {
          this.reportForm.patchValue({
            functionId: '',
            functionName: '',
          });
        }
      });
  }


  /**
   * Load report by ID from backend
   */
  loadReportById(reportId: number) {
    this.loading.set(true);
    this.reportService.getById(reportId).subscribe({
      next: (report) => {
        this.currentReportId.set(report.id!);

        // Find and set function name
        const selectedFunction = this.functionList.find(f => f.functionId == report.functionId);
        // console.log('Selected function for report:', selectedFunction);
        // Populate form with fetched report data
        this.reportForm.patchValue({
          id: report.id,
          reportName: report.reportName,
          functionId: report.functionId,
          functionName: selectedFunction?.functionName || '',
          dataSourceType: report.dataSourceType,
          databaseConnectionId: report.databaseConnectionId || '',
          reportFileName: report.reportFileName || '',
          outputFormats: report.outputFormats || ['PDF'],
          // visible: report.visible !== undefined ? report.visible : true,
          autoGenPeriod: report.autoGenPeriod || '',
          genBeforeEod: report.genBeforeEod || false,
        });

        // Load parameters
        if (report.parameters && report.parameters.length > 0) {
          const paramData = report.parameters.map((param, index) => ({
            sNo: index + 1,
            parameterName: param.parameterName,
            parameterLabel: param.parameterLabel,
            dataType: param.dataType,
            dataSource: param.dataSource,
            required: param.required ?? (param as any).isRequired ?? false,
            visible: param.visible !== undefined ? (param.visible ? true : false) : true,
            readonly: param.readonly !== undefined ? (param.readonly ? true : false) : ((param as any).readOnly ?? false),
            defaultValue: param.defaultValue || '',
            inputType: param.inputType,
            selectOptions: param.selectOptions,
            formatPattern: param.formatPattern,
            minLength: param.minLength,
            maxLength: param.maxLength,
            minValue: param.minValue,
            maxValue: param.maxValue,
            parameterOrder: this.toPositiveInteger(param.parameterOrder, index + 1),
            dependsOnParameter: param.dependsOnParameter,
            helpText: param.helpText
          }));
          this.parameters.set(paramData);
        } else {
          this.parameters.set([]);
        }

        // Update button visibility
        BUTTON_VISIBILITY.set({
          save: false,
          update: true,
          view: false,
          delete: true,
          exit: false,
          reset: true,
        });

        this.loading.set(false);
      },
      error: (err) => {
        this.reportForm.reset();
        this.parameters.set([]);
        console.error('Error loading report:', err);
        if (err.status === 404 || (err.error?.detail && err.error?.detail.includes("not found"))) {
              this.toastr.error('Report not found', 'Error');
        }else{
              this.toastr.error('Failed to load report', 'Error');
        }

        this.loading.set(false);
      }
    });
  }

  /**
   * Open parameter form for adding new parameter using modal
   */
  openParameterForm() {
    console.log('Opening parameter add modal');

    // Reset modal state
    this.showModal.set(false);
    this.modalComponent = undefined;

    setTimeout(() => {
      this.modalComponent = ParameterModalComponent;

      // Prepare modal data for adding new parameter
      this.modalComponentData = {
        initialData: {
          parameter: null,
          isEditing: false,
          parameterOrder: this.parameters().length + 1
        },
        config: {
          title: 'Add New Parameter',
          saveButtonText: 'Add Parameter',
          cancelButtonText: 'Cancel'
        }
      };

      console.log('Opening parameter modal with data:', this.modalComponentData);
      this.showModal.set(true);
    }, 50);
  }

  /**
   * Handle parameter edit from grid
   */
  onParameterEdit(eventData: any) {
    console.log('=== EDIT DEBUG START ===');
    console.log('Raw event data received:', eventData);
    console.log('Event data type:', typeof eventData);

    // Parse JSON string if needed
    let parameter = eventData;
    if (typeof eventData === 'string') {
      try {
        parameter = JSON.parse(eventData);
        console.log('Parsed JSON string to object:', parameter);
      } catch (e) {
        console.error('Failed to parse JSON string:', e);
        this.toastr.error('Invalid parameter data format', 'Error');
        return;
      }
    } else if (eventData?.data) {
      parameter = eventData.data;
      console.log('Using eventData.data:', parameter);
    } else if (eventData?.rowData) {
      parameter = eventData.rowData;
      console.log('Using eventData.rowData:', parameter);
    } else if (eventData?.item) {
      parameter = eventData.item;
      console.log('Using eventData.item:', parameter);
    }


    if (!parameter || !parameter.sNo) {
      console.error('No valid parameter data found in event');
      this.toastr.error('Invalid parameter data for editing', 'Error');
      return;
    }

    const index = this.parameters().findIndex(p => p.sNo === parameter.sNo);

    if (index === -1) {
      console.error('Parameter not found in array');
      this.toastr.error('Parameter not found for editing.', 'Error');
      return;
    }

    this.isEditingParameter.set(true);
    this.editingParameterIndex.set(index);

    // Populate form with parameter data
    // const formData = {
    //   parameterName: parameter.parameterName,
    //   parameterLabel: parameter.parameterLabel,
    //   dataType: parameter.dataType,
    //   inputType: parameter.inputType,
    //   selectOptions: parameter.selectOptions,
    //   dataSource: parameter.dataSource,
    //   formatPattern: parameter.formatPattern,
    //   required:parameter.required === true,
    //   visible: parameter.visible === true,
    //   readonly: parameter.readonly === true,
    //   minLength: parameter.minLength ? Number(parameter.minLength) : null,
    //   maxLength: parameter.maxLength ? Number(parameter.maxLength) : null,
    //   minValue: parameter.minValue !== null && parameter.minValue !== undefined ? Number(parameter.minValue) : null,
    //   maxValue: parameter.maxValue !== null && parameter.maxValue !== undefined ? Number(parameter.maxValue) : null,
    //   defaultValue: parameter.defaultValue,
    //   parameterOrder: parameter.parameterOrder || parameter.sNo,
    //   dependsOnParameter: parameter.dependsOnParameter,
    //   helpText: parameter.helpText,
    // };

    // Open parameter edit modal instead of inline form
    this.openParameterEditModal(parameter, index);
  }

  /**
   * Handle parameter delete from grid
   */
  onParameterDelete(eventData: any) {

    // Parse JSON string if needed
    let parameter = eventData;
    if (typeof eventData === 'string') {
      try {
        parameter = JSON.parse(eventData);
        console.log('Parsed JSON string to object:', parameter);
      } catch (e) {
        console.error('Failed to parse JSON string:', e);
        this.toastr.error('Invalid parameter data format', 'Error');
        return;
      }
    } else if (eventData?.data) {
      parameter = eventData.data;
      console.log('Using eventData.data:', parameter);
    } else if (eventData?.rowData) {
      parameter = eventData.rowData;
      console.log('Using eventData.rowData:', parameter);
    } else if (eventData?.item) {
      parameter = eventData.item;
      console.log('Using eventData.item:', parameter);
    }

    console.log('Final parameter object for delete:', parameter);

    if (!parameter || !parameter.sNo) {
      console.error('No valid parameter data found in delete event');
      this.toastr.error('Invalid parameter data for deletion', 'Error');
      return;
    }

    if (confirm('Are you sure you want to delete this parameter?')) {
      const currentParams = [...this.parameters()];
      console.log('Current parameters before delete:', currentParams);
      console.log('Parameter to delete - sNo:', parameter.sNo);

      // Find and remove the parameter by sNo
      const filteredParams = currentParams.filter(p => {
        console.log(`Comparing ${p.sNo} !== ${parameter.sNo} (types: ${typeof p.sNo} vs ${typeof parameter.sNo})`);
        return p.sNo !== parameter.sNo;
      });

      console.log('Filtered parameters after delete:', filteredParams);
      console.log('Original length:', currentParams.length, 'New length:', filteredParams.length);

      // Renumber only the grid serial so row actions still work predictably.
      const renumberedParams = filteredParams.map((p, index) => {
        const newParam = { ...p };
        newParam.sNo = index + 1;
        return newParam;
      });

      console.log('Renumbered parameters:', renumberedParams);

      // Force signal update with empty array first, then new data
      this.parameters.set([]);

      // Use setTimeout to ensure proper signal update
      setTimeout(() => {
        this.parameters.set(renumberedParams);
        console.log('Parameters signal updated. New value:', this.parameters());
        this.toastr.success('Parameter deleted successfully.', 'Success');
      }, 100);

      console.log('=== DELETE DEBUG END ===');
    }
  }


  onIdBoxChanged(value: string): void {
    console.log('IdBox changed:', value);
  }

  /**
   * Check if a format is selected
   */
  isFormatSelected(formatKey: string): boolean {
    const formats = this.reportForm.get('outputFormats')?.value;
    return Array.isArray(formats) && formats.includes(formatKey);
  }

  /**
   * Handle output format checkbox change
   */
  onOutputFormatChange(event: any, formatKey: string) {
    const currentFormats = this.reportForm.get('outputFormats')?.value || [];

    if (event.target.checked) {
      // Add format if not already present
      if (!currentFormats.includes(formatKey)) {
        this.reportForm.patchValue({
          outputFormats: [...currentFormats, formatKey]
        });
      }
    } else {
      // Remove format
      this.reportForm.patchValue({
        outputFormats: currentFormats.filter((f: string) => f !== formatKey)
      });
    }
  }

  /**
   * Handle file upload
   */
  onFileSelected(files: File[]) {
    if (files && files.length > 0) {
      this.selectedReportFile = files[0];
      this.reportForm.patchValue({
        reportFileName: files[0].name,
      });
      this.toastr.success(`File "${files[0].name}" selected.`, 'File Selected');
    }
  }

  /**
   * Save report
   */
  onSave() {
    if (this.reportForm.invalid) {
      this.toastr.error('Please fill all required fields correctly.', 'Validation Error');
      Object.keys(this.reportForm.controls).forEach(key => {
        const control = this.reportForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.onClickSave.set(false);
      return;
    }

    if (this.parameters().length === 0) {
      this.toastr.warning('Please add at least one parameter for the report.', 'Warning');
      return;
    }
    const userId = this._userService?.user?.username??'admin';
    this.loading.set(true);

    const formValue = this.reportForm.value;
    const parametersForSave = [...this.parameters()];

    // Prepare ReportDTO
    const reportDTO: ReportDTO = {
      reportName: formValue.reportName,
      functionId: formValue.functionId,
      dataSourceType: formValue.dataSourceType,
      databaseConnectionId: formValue.databaseConnectionId || undefined,
      outputFormats: formValue.outputFormats,
      isVisible: formValue.visible,
      autoGenPeriod: formValue.autoGenPeriod || "D",
      genBeforeEod: formValue.genBeforeEod,
      createdBy: userId,
      modifyBy: userId,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),

      parameters: parametersForSave.map(param => ({
        parameterName: param.parameterName,
        parameterLabel: param.parameterLabel,
        dataType: param.dataType,
        inputType: param.inputType,
        selectOptions: param.selectOptions,
        dataSource: param.dataSource,
        formatPattern: param.formatPattern,
        required: param.required,
        visible: param.visible,
        readonly: param.readonly,
        minLength: param.minLength,
        maxLength: param.maxLength,
        minValue: param.minValue,
        maxValue: param.maxValue,
        defaultValue: param.defaultValue,
        parameterOrder: param.parameterOrder,
        dependsOnParameter: param.dependsOnParameter,
        helpText: param.helpText,
        createdBy: userId,
        modifyBy: userId,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
      }))
    };

    // Call API to create report
    this.reportService.create(reportDTO, this.selectedReportFile || undefined).subscribe({
      next: (response) => {
        this.toastr.success('Report registered successfully!', 'Success');
        this.currentReportId.set(response.id!);

        // Update button visibility for edit mode
        BUTTON_VISIBILITY.set({
          save: false,
          update: true,
          view: false,
          delete: true,
          exit: false,
          reset: true,
        });

        // Refresh report list
        // this.loadReports();
        this.loading.set(false);
        this.onClickSave.set(false);
        this.onClickUpdate.set(false);
      },
      error: (err) => {
        console.error('Error saving report:', err);
        this.toastr.error('Failed to save report. Please try again.', 'Error');
        this.loading.set(false);
        this.onClickSave.set(false);
        this.onClickUpdate.set(false);
      },


    });
  }

  /**
   * Update existing report
   */
  onUpdate() {
    console.log("this.reportForm: ", this.reportForm)
    if (this.reportForm.invalid) {
      this.toastr.error('Please fill all required fields correctly.', 'Validation Error');
      Object.keys(this.reportForm.controls).forEach(key => {
        const control = this.reportForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }
    const token = sessionStorage.getItem("access_token")??"token";
    this._authService.userInfo(token);
    console.log(this._userService?.user);
    const userId = this._userService?.user?.username??'admin';
    console.log(userId);
    const reportId = this.currentReportId();
    if (!reportId) {
      this.toastr.error('No report selected for update.', 'Error');
      return;
    }

    if (this.parameters().length === 0) {
      this.toastr.warning('Please add at least one parameter for the report.', 'Warning');
      return;
    }

    this.loading.set(true);

    const formValue = this.reportForm.value;
    const parametersForSave = [...this.parameters()];

    // Prepare ReportDTO
    const reportDTO: ReportDTO = {
      reportName: formValue.reportName,
      functionId: formValue.functionId,
      dataSourceType: formValue.dataSourceType,
      databaseConnectionId: formValue.databaseConnectionId || undefined,
      outputFormats: formValue.outputFormats,
      isVisible: formValue.visible,
      autoGenPeriod: formValue.autoGenPeriod || undefined,
      genBeforeEod: formValue.genBeforeEod,
      modifyBy: userId,
      modifiedDate: new Date().toISOString(),
      parameters: parametersForSave.map(param => ({
        parameterName: param.parameterName,
        parameterLabel: param.parameterLabel,
        dataType: param.dataType,
        inputType: param.inputType,
        selectOptions: param.selectOptions,
        dataSource: param.dataSource,
        formatPattern: param.formatPattern,
        required: param.required,
        visible: param.visible,
        readonly: param.readonly,
        minLength: param.minLength,
        maxLength: param.maxLength,
        minValue: param.minValue,
        maxValue: param.maxValue,
        defaultValue: param.defaultValue,
        parameterOrder: param.parameterOrder,
        dependsOnParameter: param.dependsOnParameter,
        helpText: param.helpText,
        modifyBy: userId,
        modifiedDate: new Date().toISOString()
      }))
    };

    // Call API to update report
    this.reportService.update(reportId, reportDTO, this.selectedReportFile || undefined).subscribe({
      next: (response) => {
        this.toastr.success('Report updated successfully!', 'Success');

        // Refresh report list
        // this.loadReports();
        this.loading.set(false);
        this.onClickUpdate.set(false);
      },
      error: (err) => {
        console.error('Error updating report:', err);
        this.toastr.error('Failed to update report. Please try again.', 'Error');
        this.loading.set(false);
        this.onClickUpdate.set(false);
      }
    });
  }

  /**
   * Delete report
   */
  onDelete() {
    const reportId = this.currentReportId();
    if (!reportId) {
      this.toastr.error('No report selected for deletion.', 'Error');
      return;
    }

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    this.loading.set(true);

    this.reportService.delete(reportId).subscribe({
      next: () => {
        this.toastr.success('Report deleted successfully!', 'Success');

        // Refresh and reset form
        this.onRefresh();
        // this.loadReports();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error deleting report:', err);
        this.toastr.error('Failed to delete report. Please try again.', 'Error');
        this.loading.set(false);
      }
    });
  }

  /**
   * Refresh form
   */
  onRefresh() {
    this.reportForm.reset({
      outputFormats: ['PDF'],
      visible: true,
      genBeforeEod: false,
      autoGenPeriod: '',
    });
    this.parameters.set([]);
    this.currentReportId.set(null);
    this.selectedReportFile = null;

    // Reset button visibility
    BUTTON_VISIBILITY.set({
      save: true,
      update: false,
      view: false,
      delete: false,
      exit: false,
      reset: true,
    });
    this.onClickReset.set(false);
    this.toastr.info('Form has been reset.', 'Refresh');
  }

  /**
   * Open parameter edit modal
   */
  openParameterEditModal(parameter: any, index: number) {
    console.log('Opening parameter edit modal');

    // Reset modal state
    this.showModal.set(false);
    this.modalComponent = undefined;

    setTimeout(() => {
      this.modalComponent = ParameterModalComponent;

      // Prepare modal data for editing parameter
      this.modalComponentData = {
        initialData: {
          parameter: parameter,
          isEditing: true,
          parameterOrder: parameter.parameterOrder ?? parameter.sNo
        },
        config: {
          title: 'Edit Parameter',
          saveButtonText: 'Update Parameter',
          cancelButtonText: 'Cancel'
        }
      };

      // Store editing info for later use
      this.isEditingParameter.set(true);
      this.editingParameterIndex.set(index);

      console.log('Opening parameter edit modal with data:', this.modalComponentData);
      this.showModal.set(true);
    }, 50);
  }

  /**
   * Handle modal result
   */
  onModalResult(result: any) {

    if (!result) {
      this.showModal.set(false);
      return;
    }

    // Handle report selection result
    if (result.id && result.reportName && result.functionId) {
      this.loadReportById(result.id);
    }
    // Handle function selection result
    else if (result.functionId && result.functionName) {
      this.reportForm.patchValue({
        functionId: result.functionId,
      });
    }
    // Handle parameter add/edit result
    else if (result.parameterName && result.parameterLabel) {
      this.handleParameterResult(result);
    }

    this.showModal.set(false);
  }

  /**
   * Handle parameter add/edit result from modal
   */
  private handleParameterResult(parameterResult: any) {
    const currentParams = [...this.parameters()];
    const desiredOrder = this.toPositiveInteger(
      parameterResult.parameterOrder,
      this.isEditingParameter() ? this.editingParameterIndex() + 1 : currentParams.length + 1
    );
    const existingParameter = this.isEditingParameter()
      ? currentParams[this.editingParameterIndex()]
      : null;
    const parameter = {
      sNo: existingParameter?.sNo ?? this.getNextParameterSNo(currentParams),
      parameterName: parameterResult.parameterName,
      parameterLabel: parameterResult.parameterLabel,
      dataType: parameterResult.dataType,
      inputType: parameterResult.inputType,
      selectOptions: parameterResult.selectOptions,
      dataSource: parameterResult.dataSource,
      formatPattern: parameterResult.formatPattern,
      required: parameterResult.required,
      visible: parameterResult.visible,
      readonly: parameterResult.readonly,
      minLength: parameterResult.minLength,
      maxLength: parameterResult.maxLength,
      minValue: parameterResult.minValue,
      maxValue: parameterResult.maxValue,
      defaultValue: parameterResult.defaultValue,
      parameterOrder: desiredOrder,
      dependsOnParameter: parameterResult.dependsOnParameter,
      helpText: parameterResult.helpText,
    };

    if (this.isEditingParameter()) {
      currentParams[this.editingParameterIndex()] = parameter;
      this.parameters.set(currentParams);
    } else {
      this.parameters.set([...currentParams, parameter]);
    }

    if (this.isEditingParameter()) {
      this.toastr.success('Parameter updated successfully.', 'Success');
    } else {
      this.toastr.success('Parameter added successfully.', 'Success');
    }

    // Reset editing state
    this.isEditingParameter.set(false);
    this.editingParameterIndex.set(-1);
  }

  private toPositiveInteger(value: any, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
  }

  private getNextParameterSNo(parameters: any[]): number {
    const maxSNo = parameters.reduce((max, param) => {
      const sNo = this.toPositiveInteger(param?.sNo, 0);
      return Math.max(max, sNo);
    }, 0);

    return maxSNo + 1;
  }

  /**
   * Handle modal close
   */
  onModalClose() {
    this.showModal.set(false);
  }
}
