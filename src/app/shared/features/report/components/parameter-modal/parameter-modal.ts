import { Component, OnInit, Input, Output, EventEmitter, inject, WritableSignal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MatTooltip } from "@angular/material/tooltip";
import { ExpansionPanelHeader } from '../../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericSwitch } from '../../../../common-components/generic-component-type/generic-switch/generic-switch';
import { InputNumber } from '../../../../common-components/input-types/input-number/input-number';
import { InputSelectOptionField } from '../../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { InputTextArea } from '../../../../common-components/input-types/input-text-area/input-text-area';
import { InputTextBox } from '../../../../common-components/input-types/input-text-box/input-text-box';

export interface ParameterModalData {
  parameter?: any; // Existing parameter data for editing
  isEditing?: boolean;
  parameterOrder?: number;
}

export interface ParameterModalConfig {
  title?: string;
  saveButtonText?: string;
  cancelButtonText?: string;
}

@Component({
  selector: 'app-parameter-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField,
    GenericSwitch,
    InputTextArea,
    MatTooltip,
    InputNumber,
    ExpansionPanelHeader
],
  templateUrl: './parameter-modal.html',
  styleUrls: ['./parameter-modal.scss']
})
export class ParameterModalComponent implements OnInit {
  private toastr = inject(ToastrService);
  // private formBuilder = inject(FormBuilder);

  validationPanel: WritableSignal<boolean> = signal(true);
  defaultValuePanel: WritableSignal<boolean> = signal(true);
  parameterFormPanel: WritableSignal<boolean> = signal(true);
  // Inputs
  @Input() initialData?: ParameterModalData;
  @Input() config: ParameterModalConfig = {};

  // Outputs
  @Output() modalResult = new EventEmitter<any>();
  // Form
  parameterForm!: FormGroup;

  // Form options
  parameterDataTypeOptions = [
    { key: 'STRING', value: 'String/Text' },
    { key: 'NUMBER', value: 'Number' },
    { key: 'DATE', value: 'Date' },
    { key: 'BOOLEAN', value: 'Boolean' },
    { key: 'SELECT', value: 'Dropdown/Select' },
  ];

  inputTypeOptions = [
    { key: 'TEXT', value: 'Text Input' },
    { key: 'TEXTAREA', value: 'Text Area' },
    { key: 'SWITCH', value: 'Switch' },
    { key: 'SELECT', value: 'Dropdown' },
    { key: 'NUMBER', value: 'Number Box' },
    { key: 'AMOUNT', value: 'Amount Box' },
    { key: 'DATE', value: 'Date Picker' },
  ];

  dataSourceOptions = [
    { key: 'STATIC', value: 'Static Options (Manual)' },
    { key: 'API', value: 'API Endpoint' },
    { key: 'DATABASE', value: 'Database Query' },
    { key: 'FUNCTION', value: 'Custom Function' },
  ];

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

  constructor( private formBuilder: FormBuilder) {
    console.log('OtherComponentsPage constructor called');
    
  }

  ngOnInit() {
    this.initializeForm();
    this.setupFormListeners();
    
    // Populate form if editing
    if (this.initialData?.parameter && this.initialData?.isEditing) {
      this.populateForm(this.initialData.parameter);
    }

    // Check if the form value is correct
    console.log('Form visible value:', this.parameterForm.get('visible')?.value);
    console.log('Form control:', this.parameterForm.get('visible'));
  }

  private initializeForm() {
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
      parameterOrder: [this.initialData?.parameterOrder || 1],
      dependsOnParameter: [''],
      helpText: ['', [Validators.maxLength(200)]],
    });
    
    // Force update to ensure switch components reflect initial values
    setTimeout(() => {
      this.parameterForm.updateValueAndValidity();
      console.log('Form values after timeout:', this.parameterForm.value);
    }, 100);
  }

  get frmGroup() {
    return this.parameterForm;
  }
  

  private setupFormListeners() {
    // Data type change listener
    this.parameterForm.get('dataType')?.valueChanges.subscribe(dataType => {
      this.updateParameterValidators(dataType);
    });

    // Data source change listener
    this.parameterForm.get('dataSource')?.valueChanges.subscribe(() => {
      this.updateSelectOptionsValidators();
    });

    // Input type change listener
    this.parameterForm.get('inputType')?.valueChanges.subscribe(() => {
      this.updateSelectOptionsValidators();
    });

    // Default value type change listener
    this.parameterForm.get('defaultValueType')?.valueChanges.subscribe((type) => {
      if (type === 'custom') {
        const customValue = this.parameterForm.get('customDefaultValue')?.value;
        this.parameterForm.get('defaultValue')?.setValue(customValue);
      } else {
        this.parameterForm.get('customDefaultValue')?.setValue('');
      }
    });

    // Custom default value change listener
    this.parameterForm.get('customDefaultValue')?.valueChanges.subscribe((value) => {
      if (this.parameterForm.get('defaultValueType')?.value === 'custom') {
        this.parameterForm.get('defaultValue')?.setValue(value);
      }
    });

    // Handle BOOLEAN type switch
    this.parameterForm.get('dataType')?.valueChanges.subscribe((dataType) => {
      const defaultValueControl = this.parameterForm.get('defaultValue');
      const customDefaultValueControl = this.parameterForm.get('customDefaultValue');
      const hasExistingDefault =
        defaultValueControl?.value !== null &&
        defaultValueControl?.value !== undefined &&
        defaultValueControl?.value !== '';

      if (dataType === 'BOOLEAN' && !hasExistingDefault) {
        this.parameterForm.get('defaultValue')?.setValue(false);
        customDefaultValueControl?.setValue(false);
      }
    });
  }

  private populateForm(parameter: any) {
    const normalizedRequired = parameter.required ?? parameter.isRequired ?? false;
    const normalizedVisible = parameter.visible ?? true;
    const normalizedReadonly = parameter.readonly ?? parameter.readOnly ?? false;
    const normalizedDefaultValue = parameter.defaultValue ?? '';
    const useCustomDefaultValue =
      normalizedDefaultValue !== '' &&
      !this.getFilteredPredefinedValues().some(item => item.key === normalizedDefaultValue);

    const formData = {
      parameterName: parameter.parameterName,
      parameterLabel: parameter.parameterLabel,
      dataType: parameter.dataType,
      inputType: parameter.inputType,
      selectOptions: parameter.selectOptions,
      dataSource: parameter.dataSource,
      formatPattern: parameter.formatPattern,
      required: this.toBooleanValue(normalizedRequired),
      visible: this.toBooleanValue(normalizedVisible),
      readonly: this.toBooleanValue(normalizedReadonly),
      minLength: parameter.minLength ? Number(parameter.minLength) : null,
      maxLength: parameter.maxLength ? Number(parameter.maxLength) : null,
      minValue: parameter.minValue !== null && parameter.minValue !== undefined ? Number(parameter.minValue) : null,
      maxValue: parameter.maxValue !== null && parameter.maxValue !== undefined ? Number(parameter.maxValue) : null,
      defaultValueType: useCustomDefaultValue ? 'custom' : 'predefined',
      defaultValue: useCustomDefaultValue ? '' : normalizedDefaultValue,
      customDefaultValue: useCustomDefaultValue ? normalizedDefaultValue : '',
      parameterOrder: parameter.parameterOrder || parameter.sNo,
      dependsOnParameter: parameter.dependsOnParameter,
      helpText: parameter.helpText,
    };
    
    this.parameterForm.patchValue(formData);
  }

  private toBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase().trim() === 'true';
    }
    return !!value;
  }

  private updateParameterValidators(dataType: string) {
    const selectOptionsControl = this.parameterForm.get('selectOptions');
    const inputTypeControl = this.parameterForm.get('inputType');
    const currentInputType = inputTypeControl?.value;
    
    selectOptionsControl?.clearValidators();
    
    // Set a sensible default only when the current input type is incompatible.
    if (dataType === 'NUMBER' && !['NUMBER', 'AMOUNT'].includes(currentInputType)) {
      inputTypeControl?.setValue('NUMBER');
    } else if (dataType === 'STRING' && !['TEXT', 'TEXTAREA', 'SELECT', 'NUMBER', 'AMOUNT'].includes(currentInputType)) {
      inputTypeControl?.setValue('TEXT');
    } else if (dataType === 'DATE' && currentInputType !== 'DATE') {
      inputTypeControl?.setValue('DATE');
    } else if (dataType === 'BOOLEAN' && currentInputType !== 'SWITCH') {
      inputTypeControl?.setValue('SWITCH');
    } else if (dataType === 'SELECT') {
      selectOptionsControl?.setValidators([Validators.required]);
      if (currentInputType !== 'SELECT') {
        inputTypeControl?.setValue('SELECT');
      }
    }
    
    selectOptionsControl?.updateValueAndValidity();
  }

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

  private urlValidator(control: any) {
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

  // Helper methods for form visibility
  getFilteredInputTypeOptions(): { key: string, value: string }[] {
    const dataType = this.parameterForm.get('dataType')?.value;
    
    if (dataType === 'NUMBER') {
      return this.inputTypeOptions.filter(option => 
        ['NUMBER', 'AMOUNT'].includes(option.key)
      );
    } else if (dataType === 'STRING') {
      return this.inputTypeOptions.filter(option => 
        ['TEXT', 'TEXTAREA', 'SELECT', 'NUMBER', 'AMOUNT'].includes(option.key)
      );
    } else if (dataType === 'DATE') {
      return this.inputTypeOptions.filter(option => 
        option.key === 'DATE'
      );
    } else if (dataType === 'BOOLEAN') {
      return this.inputTypeOptions.filter(option => 
        option.key === 'SWITCH'
      );
    }
    
    return this.inputTypeOptions;
  }

  getFilteredPredefinedValues(): Array<{ key: string, value: string }> {
    const dataType = this.parameterForm.get('dataType')?.value;
    
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
      default:
        return this.predefinedDefaultValues;
    }
  }

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

  // Visibility helper methods
  showDropdownOptions(): boolean {
    const dataType = this.parameterForm.get('dataType')?.value;
    const inputType = this.parameterForm.get('inputType')?.value;
    return dataType === 'SELECT' || inputType === 'SELECT';
  }

  showDataSourceField(): boolean {
    return this.showDropdownOptions();
  }

  showTextValidation(): boolean {
    const inputType = this.parameterForm.get('inputType')?.value;
    return this.parameterForm.get('dataType')?.value === 'STRING' && ['TEXT', 'TEXTAREA'].includes(inputType);
  }

  showNumberValidation(): boolean {
    const dataType = this.parameterForm.get('dataType')?.value;
    const inputType = this.parameterForm.get('inputType')?.value;
    return dataType === 'NUMBER' || inputType === 'NUMBER' || inputType === 'AMOUNT';
  }

  showDateFormat(): boolean {
    return this.parameterForm.get('dataType')?.value === 'DATE';
  }

  hasDataSource(): boolean {
    const dataSource = this.parameterForm.get('dataSource')?.value?.trim();
    return !!dataSource;
  }

  getSelectOptionsPlaceholder(): string {
    if (this.hasDataSource()) {
      return 'Enter field mapping: {"keyField":"id","valueField":"name","arrayPath":"data"}';
    }
    return 'Enter options as JSON: {"key1":"Label 1","key2":"Label 2"}';
  }
  
  getSelectOptionsLabel(): string {
    if (this.hasDataSource()) {
      return 'Field Mapping (keyField, valueField)';
    }
    return 'Select Options (Required)';
  }

  getDataSourceError(): string | null {
    const dataSourceControl = this.parameterForm.get('dataSource');
    
    if (dataSourceControl?.errors && dataSourceControl?.touched) {
      if (dataSourceControl.errors['invalidDataSource']) {
        return 'Please enter a valid URL, SQL query, function call, or JSON object';
      }
    }
    
    return null;
  }

  onCancel() {
    this.modalResult.emit(null);
  }

  getModalTitle(): string {
    if (this.initialData?.isEditing) {
      return this.config.title || 'Edit Parameter';
    }
    return this.config.title || 'Add Parameter';
  }

  getSaveButtonText(): string {
    if (this.initialData?.isEditing) {
      return this.config.saveButtonText || 'Update Parameter';
    }
    return this.config.saveButtonText || 'Add Parameter';
  }
}
