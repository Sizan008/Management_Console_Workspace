    // Enhanced TypeScript Component with Relatable Fields
  import { Component, effect, inject, OnInit, signal, TemplateRef, ViewChild, WritableSignal, Type, ChangeDetectorRef } from '@angular/core';

  import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
  import { InputTextBox } from '../../input-types/input-text-box/input-text-box';
  import { InputIdBox } from '../../input-types/input-id-box/input-id-box';
  import { InputAmountInWord } from '../../input-types/input-amount-in-word/input-amount-in-word';
  import {  InputTagComponent } from '../../input-types/input-tag/input-tag';
  import { InputSelectOptionField } from '../../input-types/input-select-option-field/input-select-option-field';
  import { InputFile } from '../../input-types/input-file/input-file';
  import { InputOfficeBox } from '../../input-types/input-office-box/input-office-box';
  import { TableRowDesigner } from '../../generic-component-type/generic-data-grid';
  import { ExpansionPanelHeader } from '../../expansion-panel-header/expansion-panel-header';
  import { ExpansionSubPanelHeader } from '../../expansion-sub-panel-header/expansion-sub-panel-header';
  import { ExpansionSubSubPanelHeader } from '../../expansion-sub-sub-panel-header/expansion-sub-sub-panel-header';
  import { InputTextArea } from '../../input-types/input-text-area/input-text-area';
  import { InputNumber } from '../../input-types/input-number/input-number';
  import { DataGridStateChange, DropdownOption, GenericDataGrid, GridCellChangeUtils, GridColumnValidation } from '../../generic-component-type/generic-data-grid/generic-data-grid';
  import { GenericMultiInputSelectOption } from '../../generic-component-type/generic-multi-select-option/generic-multi-select-option';
  import { BUTTON_VISIBILITY, ONCLICK_EXIT, ONCLICK_SAVE, ONCLICK_SAVE_NEXT, ONCLICK_VIEW, ButtonUtils, ONCLICK_RESET } from '../../../constant/button-signals.constant';
  import { catchError, debounceTime, distinctUntilChanged, retry, timeout } from 'rxjs/operators';
  import { InputDate } from '../../input-types/input-date/input-date';
  import { OtherComponentsPage } from '../other-components-page/other-components-page';
  import { CommonModule } from '@angular/common';
  import {ToastHelperService} from '../../../services/toast-helper.service';
  import { InputAmount } from '../../input-types/input-amount/input-amount';
  import { GenericButton } from '../../generic-component-type/generic-button/generic-button';
  import { GenericSwitch } from '../../generic-component-type/generic-switch/generic-switch';
  import { GenericModal } from '../../generic-component-type/generic-modal/generic-modal';
  import { CommonQuillEditorComponent } from '../../common-quill-editor/common-quill-editor';
  import { AlertExamplePage } from '../alert-example-page/alert-example-page';
  import { HttpClient } from '@angular/common/http';
  import { of } from 'rxjs';
  import { LoaderService } from '../../../services/loader.service';
  import { DynamicTableComponent, DynamicTableConfig } from '../../generic-component-type/generic-table/generic-table';
  import { AutoTableService } from '../../../services/data-mapper.service';
  import { Label } from '../../generic-component-type/generic-label/generic-label';
  import { InputAddressSearch } from '../../input-types/input-address-search/input-address-search';
  import { AddressDto } from '../../../models/address.model';
  import { FilePreviewData } from '../../file-preview/file-preview.component';
  import { FilePreviewDialogComponent } from '../../file-preview/file-preview-dialog.component';
  import { FilePreviewCardComponent } from '../../file-preview/file-preview-card.component';
  import { MatDialog, MatDialogModule } from '@angular/material/dialog';
  import { MonthYearPickerComponent } from '../../input-types/month-year-picker/month-year-picker';
  import * as XLSX from 'xlsx';
import { InputTime } from '../../input-types/input-time/input-time';
import { toastPositionClass } from '../../../services/toast-position';
  // Types for data selection modal
  export interface AccountData {
    id: string;
    name: string;
    category: string;
    amount: number;
  }
  interface Country {
    countryId: number;
    countryNm: string;
  }
  type Option = { key: any; value: string };

  export interface DataSelectionConfig {
    pickTableDataSource: AccountData[];
    pickTablePair: Map<string, string>;
    apiSearchPlaceholder: string;
    findButtonText: string;
    loadingText: string;
    noDataMessage: string;
    loadingMessage: string;
  }

    export interface User {
      id: number;
      name: string;
      username: string;
      email: string;
      phone: string;
      website: string;
      company: {
        name: string;
      };
      address: {
        city: string;
      };
    }

  @Component({
    selector: 'app-all-components-page',
    standalone: true,
    imports: [
      ReactiveFormsModule,
      MatDialogModule,
      InputTextBox,
      InputIdBox,
      GenericSwitch,
      GenericButton,
      InputTextArea,
      InputAmountInWord,
      InputTagComponent,
      InputSelectOptionField,
      InputDate,
      CommonModule,
      GenericMultiInputSelectOption,
      InputFile,
      InputOfficeBox,
      GenericDataGrid,
      InputNumber,
      InputAmount,
      GenericModal,
      CommonQuillEditorComponent,
      ExpansionPanelHeader,
      ExpansionSubPanelHeader,
      ExpansionSubSubPanelHeader,
      AlertExamplePage,
      DynamicTableComponent,
      Label,
      InputTime,
      InputAddressSearch,
      FilePreviewCardComponent,
      MonthYearPickerComponent

  ],
    templateUrl: './all-components-page.html',
    styleUrls: ['./all-components-page.scss'],
  })
  export class AllComponentsPage implements OnInit {
    private toastCount = 0;      // Unique ID for CSS classes
    private startY = 50;         // Starting Y position
    private gapY = 70;
    frmGroup: FormGroup;
    toastr = inject(ToastHelperService);
    private dialog = inject(MatDialog);
    private autoTable = inject(AutoTableService);
    businessHeaderPanel: WritableSignal<boolean> = signal(true);
    subPanel1: WritableSignal<boolean> = signal(true);
    subSubPanel1: WritableSignal<boolean> = signal(false);
    subSubPanel2: WritableSignal<boolean> = signal(false);
    timePickerHeaderPanel: WritableSignal<boolean> = signal(true);
    datePickerHeaderPanel: WritableSignal<boolean> = signal(true);
    genericTableHeaderPanel: WritableSignal<boolean> = signal(true);
    displayComponentsPanel: WritableSignal<boolean> = signal(true);
    // Independent open/collapse state for each accent-rail section card
    addressSearchPanel: WritableSignal<boolean> = signal(true);
    outlineFieldsPanel: WritableSignal<boolean> = signal(true);
    verticalFieldsPanel: WritableSignal<boolean> = signal(true);
    documentNotesPanel: WritableSignal<boolean> = signal(true);
    formActionsPanel: WritableSignal<boolean> = signal(true);
    horizontalFieldsPanel: WritableSignal<boolean> = signal(true);
    transactionGridPanel: WritableSignal<boolean> = signal(true);
    quillPanel: WritableSignal<boolean> = signal(true);
    alertsPanel: WritableSignal<boolean> = signal(true);
    hierarchyDemoPanel: WritableSignal<boolean> = signal(true);
    apiGridPanel: WritableSignal<boolean> = signal(true);
    loaderDemoPanel: WritableSignal<boolean> = signal(true);
    filePreviewPanel: WritableSignal<boolean> = signal(true);
    // Reference to this component's own class
    static instance: Type<AllComponentsPage> = AllComponentsPage;
    isDataSelectionModalOpen = signal(false);
    checkStateColumns = ['status'];
    // checkboxSelectAllColumns = ['status'];
    onClickSave = ONCLICK_SAVE;
    onclickView = ONCLICK_VIEW;
    onclickExit = ONCLICK_EXIT;
    @ViewChild('transactionGrid') gridComponent!: GenericDataGrid;
    showLoading = signal(false);
    // Methods for modal events
    loader = inject(LoaderService);
    showLoader(){


    this.loader.show();

    setTimeout(() => {
    this.loader.hide();
  }, 10000);

      this.showLoading.set(true);
    }
    onModalClosed() {
      this.isDataSelectionModalOpen.set(false);
    }

    // pdfData: FilePreviewData = {
    //   base64: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PCAvVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA0IDAgUgovUmVzb3VyY2VzIDw8ID4+IAo+PgplbmRvYmoKNCAwIG9iago8PCAvTGVuZ3RoIDQ0ID4+CnN0cmVhbQpCVCAvRjEgMjQgVGYgNzIgNzIwIFRkIChIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MCAwMDAwMCBuIAowMDAwMDAwMTEzIDAwMDAwIG4gCjAwMDAwMDAyMjEgMDAwMDAgbiAKdHJhaWxlcgo8PCAvUm9vdCAxIDAgUgovU2l6ZSA1ID4+CnN0YXJ0eHJlZgozMTIKJSVFT0YK', // Make sure this is valid
    //   fileName: 'document.pdf',
    //   mimeType: 'application/pdf'
    // };

    excelData: FilePreviewData = {
  fileName: 'sample.xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  base64: (() => {
    // Generate inline using xlsx library
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Age', 'City', 'Salary'],
      ['Alice', 30, 'New York', 75000],
      ['Bob', 25, 'London', 62000],
      ['Charlie', 35, 'Tokyo', 88000],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  })()
};

    onPdfError(error: string) {
      console.error('PDF Preview Error:', error);
      // Handle error (show toast, etc.)
    }

    onPdfLoad() {
      console.log('PDF loaded successfully');
    }

    openFilePreviewModal(file: FilePreviewData | null) {
      if (!file) return;

      this.dialog.open(FilePreviewDialogComponent, {
        width: '80vw',
        height: '80vh',
        maxWidth: '1200px',
        data: file
      });
    }

    onModalResult(result: any) {
      console.log('Modal result received:', result);

      if (!result) return;

      // If child sends { field, value }
      if (result.field) {
        this.frmGroup.get(result.field)?.setValue(result.value);
      } else if (typeof result === 'object' && !Array.isArray(result)) {
        const controlKeys = Object.keys(this.frmGroup.controls);
        const patch: any = {};
        controlKeys.forEach(key => {
          if (result[key] !== undefined) {
            patch[key] = result[key];
          }
        });
        if (Object.keys(patch).length) {
          console.log('Patching parent form with modal data:', patch);
          this.frmGroup.patchValue(patch);
        }
      } else {
        // Fallback: set a known control
        // this.frmGroup.get('textBox')?.setValue(result);
      }

      this.showModal = false;
    }

    // openModal() {
    //   this.isDataSelectionModalOpen.set(true);
    // }

    // Relatable field signals
    selectedCurrency = signal<string>('USD');
    selectedCountry = signal<string>('');
    selectedProductCategory = signal<string>('');
    filteredSubCategories = signal<any[]>([]);
    calculatedTaxRate = signal<number>(0);
    isHighValueTransaction = signal<boolean>(false);
    relatedTransactions = signal<any[]>([]);
    showModal = false;
    isTRUE = false;
    modalComponent?: Type<any>;
    OtherComponentsPageComponent: Type<any> = OtherComponentsPage;
    modalComponentData?: any = null;
    selectedRowIds = signal<Set<string>>(new Set());
    selectedRows = signal<any[]>([]);
    transactionActionVisibility = (row: any) => this.getTransactionActionVisibility(row);
    readonly isTransactionRowSelectable = (row: any): boolean => row?.status !== 'Completed';

    // Data Selection Modal Configuration
    modalConfig: DataSelectionConfig = {
      pickTableDataSource: [
        { id: 'ACC001', name: 'Main Trading Account', category: 'Trading', amount: 50000.00 },
        { id: 'ACC002', name: 'Investment Portfolio', category: 'Investment', amount: 75000.00 },
        { id: 'ACC003', name: 'Operating Account', category: 'Business', amount: 25000.00 },
        { id: 'ACC004', name: 'Reserve Fund', category: 'Savings', amount: 100000.00 }
      ],
      pickTablePair: new Map<string, string>([
        ['id', 'ID'],
        ['name', 'Name'],
        ['category', 'Category'],
        ['amount', 'Amount']
      ]),
      apiSearchPlaceholder: 'Search transactions...',
      findButtonText: 'Find Transaction',
      loadingText: 'Searching transactions...',
      noDataMessage: 'No transactions found. Try different search terms.',
      loadingMessage: 'Loading transaction data...'
    };
    // Enhanced dropdown options with relationships
    currencyOptions: { key: string; value: string }[] = [];


    countryOptions: { key: string | number; value: string }[] = [];


    productCategoryOptions = [
      { key: 'electronics', value: 'Electronics', taxMultiplier: 1.2, requiresApproval: false },
      { key: 'automotive', value: 'Automotive', taxMultiplier: 1.5, requiresApproval: true },
      { key: 'healthcare', value: 'Healthcare', taxMultiplier: 0.8, requiresApproval: true },
      { key: 'financial', value: 'Financial Services', taxMultiplier: 2.0, requiresApproval: true },
      { key: 'retail', value: 'Retail', taxMultiplier: 1.0, requiresApproval: false },
      { key: 'construction', value: 'Construction', taxMultiplier: 1.3, requiresApproval: true }
    ];

    subCategoryOptions = [
      // Electronics
      { key: 'mobile', value: 'Mobile Devices', parentCategory: 'electronics', minAmount: 100 },
      { key: 'computers', value: 'Computers', parentCategory: 'electronics', minAmount: 500 },
      { key: 'accessories', value: 'Accessories', parentCategory: 'electronics', minAmount: 10 },

      // Automotive
      { key: 'parts', value: 'Auto Parts', parentCategory: 'automotive', minAmount: 50 },
      { key: 'services', value: 'Auto Services', parentCategory: 'automotive', minAmount: 100 },
      { key: 'vehicles', value: 'Vehicles', parentCategory: 'automotive', minAmount: 5000 },

      // Healthcare
      { key: 'equipment', value: 'Medical Equipment', parentCategory: 'healthcare', minAmount: 1000 },
      { key: 'supplies', value: 'Medical Supplies', parentCategory: 'healthcare', minAmount: 50 },
      { key: 'pharmaceuticals', value: 'Pharmaceuticals', parentCategory: 'healthcare', minAmount: 100 },

      // Financial
      { key: 'banking', value: 'Banking Services', parentCategory: 'financial', minAmount: 1000 },
      { key: 'insurance', value: 'Insurance', parentCategory: 'financial', minAmount: 500 },
      { key: 'investment', value: 'Investment', parentCategory: 'financial', minAmount: 10000 },

      // Retail
      { key: 'clothing', value: 'Clothing', parentCategory: 'retail', minAmount: 20 },
      { key: 'food', value: 'Food & Beverages', parentCategory: 'retail', minAmount: 5 },
      { key: 'home', value: 'Home & Garden', parentCategory: 'retail', minAmount: 25 },

      // Construction
      { key: 'materials', value: 'Building Materials', parentCategory: 'construction', minAmount: 100 },
      { key: 'tools', value: 'Construction Tools', parentCategory: 'construction', minAmount: 50 },
      { key: 'labor', value: 'Labor Services', parentCategory: 'construction', minAmount: 200 }
    ];

    // Enhanced dropdown options for existing fields
    dropdownOptions = [
      { key: 'option1', value: 'High Priority Transaction' },
      { key: 'option2', value: 'Medium Priority Transaction' },
      { key: 'option3', value: 'Low Priority Transaction' },
      { key: 'option4', value: 'Urgent Processing Required' },
      { key: 'option5', value: 'Standard Processing' }
    ];

    // Tag Input value for ngModel binding
    tagInputValue: string[] = [];

    // Tag suggestions for autocomplete
    tagSuggestions = [
      'urgent',
      'priority',
      'review',
      'approved',
      'pending',
      'processing',
      'completed',
      'high-risk',
      'low-risk',
      'international',
      'domestic',
      'bulk',
      'single',
      'recurring',
      'one-time',
      'automated',
      'manual'
    ];

    isApprovalView = signal(false);
    isViewDetails = signal(false);

    // Enhanced sample transactions with relatable fields
    sampleTransactions = signal([
      {
        id: 'TXN001',
        transactionType: 'PACS.008',
        amount: 50000.00,
        currency: 'USD',
        country: 'US',
        productCategory: 'financial',
        subCategory: 'banking',
        status: '',
        fromAccount: '1234567890',
        toAccount: '0987654321',
        date: '2024-01-15',
        priority: 'high',
        department: 'sales',
        category: 'international',
        taxRate: 0.10,
        calculatedTax: 5000.00,
        totalAmount: 55000.00,
        riskLevel: 'medium',
        isSelected: true,
        requiresApproval: true,
        name: 'John Smith',
        profileImage: 'https://i.pravatar.cc/30?img=1',
        availableRoles: [
          { value: 'admin', label: 'Administrator' },
          { value: 'approver', label: 'Transaction Approver' },
          { value: 'viewer', label: 'View Only' }
        ],
        assignedRole: 'approver'
      },
      {
        id: 'TXN002',
        transactionType: 'PACS.008',
        amount: 25000.00,
        currency: 'EUR',
        country: 'EU',
        productCategory: 'electronics',
        subCategory: 'computers',
        status: 'completed',
        fromAccount: '1111111111',
        toAccount: '2222222222',
        date: '2024-01-14',
        priority: 'normal',
        department: 'finance',
        category: 'domestic',
        taxRate: 0.096,
        calculatedTax: 2400.00,
        totalAmount: 27400.00,
        riskLevel: 'low',
        isSelected: false,
        requiresApproval: false,
        name: 'Sarah Johnson',
        profileImage: 'https://i.pravatar.cc/30?img=2',
        availableRoles: [
          { value: 'admin', label: 'Administrator' },
          { value: 'viewer', label: 'View Only' }
        ],
        assignedRole: 'viewer'
      },
      {
        id: 'TXN003',
        transactionType: 'PACS.008',
        amount: 100000.00,
        currency: 'GBP',
        country: 'UK',
        productCategory: 'automotive',
        subCategory: 'vehicles',
        status: 'failed',
        fromAccount: '3333333333',
        toAccount: '4444444444',
        date: '2024-01-13',
        priority: 'high',
        department: 'operations',
        category: 'urgent',
        taxRate: 0.105,
        calculatedTax: 10500.00,
        totalAmount: 110500.00,
        riskLevel: 'low',
        isSelected: false,
        requiresApproval: true,
        name: 'Michael Chen',
        profileImage: 'https://i.pravatar.cc/30?img=3',
        availableRoles: [
          { value: 'admin', label: 'Administrator' },
          { value: 'approver', label: 'Transaction Approver' },
          { value: 'specialist', label: 'Operations Specialist' }
        ],
        assignedRole: 'specialist'
      },
      {
        id: 'TXN004',
        transactionType: 'PACS.008',
        amount: 100000.00,
        currency: 'GBP',
        country: 'UK',
        productCategory: 'automotive',
        subCategory: 'parts',
        status: 'failed',
        fromAccount: '3333333333',
        toAccount: '4444444444',
        date: '2024-01-13',
        priority: 'high',
        department: 'operations',
        category: 'urgent',
        taxRate: 0.105,
        calculatedTax: 10500.00,
        totalAmount: 110500.00,
        riskLevel: 'low',
        isSelected: false,
        requiresApproval: true,
        name: 'Emma Wilson',
        profileImage: 'https://i.pravatar.cc/30?img=4',
        availableRoles: [
          { value: 'admin', label: 'Administrator' },
          { value: 'approver', label: 'Transaction Approver' },
          { value: 'specialist', label: 'Operations Specialist' }
        ],
        assignedRole: 'specialist'
      },
      {
        id: 'TXN005',
        transactionType: 'PACS.008',
        amount: 100000.00,
        currency: 'GBP',
        country: 'UK',
        productCategory: 'retail',
        subCategory: 'clothing',
        status: 'failed',
        fromAccount: '3333333333',
        toAccount: '4444444444',
        date: '2024-01-13',
        priority: 'high',
        department: 'operations',
        category: 'urgent',
        taxRate: 0.105,
        calculatedTax: 10500.00,
        totalAmount: 110500.00,
        riskLevel: 'low',
        isSelected: false,
        requiresApproval: true,
        name: 'David Martinez',
        profileImage: null,
        availableRoles: [
          { value: 'admin', label: 'Administrator' },
          { value: 'approver', label: 'Transaction Approver' },
          { value: 'specialist', label: 'Operations Specialist' }
        ],
        assignedRole: 'specialist'
      },
      {
        id: 'TXN006',
        transactionType: 'PACS.008',
        amount: 100000.00,
        currency: 'AUD',
        country: 'AU',
        productCategory: 'retail',
        subCategory: 'clothing',
        status: 'failed',
        fromAccount: '3333333333',
        toAccount: '4444444444',
        date: '2024-01-13',
        priority: 'high',
        department: 'operations',
        category: 'urgent',
        taxRate: 0.105,
        calculatedTax: 10500.00,
        totalAmount: 110500.00,
        riskLevel: 'low',
        isSelected: true,
        requiresApproval: true,
        name: 'Lisa Anderson',
        profileImage: 'https://i.pravatar.cc/30?img=6',
        availableRoles: [
          { value: 'admin', label: 'Administrator' },
          { value: 'approver', label: 'Transaction Approver' },
          { value: 'specialist', label: 'Operations Specialist' }
        ],
        assignedRole: 'specialist'
      }
    ]);
    sampleApiData = signal<any[]>([]);
    // Sample schedule data for time picker example
    sampleScheduleData = signal([
      {
        id: 'EMP001',
        name: 'John Doe',
        designation: 'Software Engineer',
        superannuationAmount: 5000,
        effectiveDate: '2024-01-01',
        startTime: '09:00',
        endTime: '17:30',
        breakTime: '12:00',
        totalHours: 8.5,
        status: 'active'
      },
      {
        id: 'EMP002',
        name: 'Jane Smith',
        designation: 'Senior Developer',
        superannuationAmount: 6500,
        effectiveDate: '2024-02-15',
        startTime: '08:30',
        endTime: '16:45',
        breakTime: '12:30',
        totalHours: 8.25,
        status: 'active'
      },
      {
        id: 'EMP003',
        name: 'Bob Johnson',
        designation: 'Product Manager',
        superannuationAmount: 7000,
        effectiveDate: '2024-03-01',
        startTime: '10:00',
        endTime: '18:00',
        breakTime: '13:00',
        totalHours: 8.0,
        status: 'inactive'
      }
    ]);

    // Sample date transaction data for date picker grid
    sampleDateTransactions = signal([
      {
        id: 'TRX001',
        description: 'Invoice Processing',
        transactionDate: '2026-01-15',
        dueDate: '2026-01-30',
        completionDate: '2026-01-28',
        status: 'completed',
        amount: 5000
      },
      {
        id: 'TRX002',
        description: 'Payment Approval',
        transactionDate: '2026-01-18',
        dueDate: '2026-01-25',
        completionDate: null,
        status: 'pending',
        amount: 12500
      },
      {
        id: 'TRX003',
        description: 'Budget Reconciliation',
        transactionDate: '2026-01-10',
        dueDate: '2026-01-20',
        completionDate: '2026-01-19',
        status: 'completed',
        amount: 25000
      },
      {
        id: 'TRX004',
        description: 'Expense Reimbursement',
        transactionDate: '2026-01-20',
        dueDate: '2026-02-05',
        completionDate: null,
        status: 'in_progress',
        amount: 3500
      }
    ]);

    // Dropdown options for date picker grid
    dateGridDropdownOptions = signal<Record<string, DropdownOption[]>>({
      status: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    });

    // Dropdown options for schedule status
    scheduleDropdownOptions = signal<Record<string, DropdownOption[]>>({
      status: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending Approval' },
        { value: 'suspended', label: 'Suspended' }
      ]
    });

    // Enhanced transaction dropdown options with relatable fields
    transactionDropdownOptions = signal<Record<string, DropdownOption[]>>({
      status: [
        { value: 'pending', label: 'Pending Review' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'in_progress', label: 'In Progress' }
      ],
      priority: [
        { value: 'low', label: 'Low Priority' },
        { value: 'normal', label: 'Normal Priority' },
        { value: 'high', label: 'High Priority' },
        { value: 'urgent', label: 'Urgent' }
      ],
      department: [
        { value: 'sales', label: 'Sales Department' },
        { value: 'finance', label: 'Finance Department' },
        { value: 'operations', label: 'Operations' },
        { value: 'treasury', label: 'Treasury' },
        { value: 'compliance', label: 'Compliance' },
        { value: 'risk', label: 'Risk Management' }
      ],
      category: [
        { value: 'domestic', label: 'Domestic Transfer' },
        { value: 'international', label: 'International Transfer' },
        { value: 'corporate', label: 'Corporate Payment' },
        { value: 'retail', label: 'Retail Payment' },
        { value: 'fx_trade', label: 'FX Trade Settlement' },
        { value: 'urgent', label: 'Urgent Payment' }
      ],
    currency: [
      { value: 'USD', label: 'US Dollar' },
      { value: 'EUR', label: 'Euro' },
      { value: 'GBP', label: 'British Pound' },
      { value: 'JPY', label: 'Japanese Yen' },
      { value: 'CAD', label: 'Canadian Dollar' },
      { value: 'AUD', label: 'Australian Dollar' }
    ],
    // Add country options
    country: [
      { value: 'US', label: 'United States' },
      { value: 'EU', label: 'European Union' },
      { value: 'UK', label: 'United Kingdom ' },
      { value: 'JP', label: 'Japan' },
      { value: 'CA', label: 'Canada' },
      { value: 'AU', label: 'Australia' },
      { value: 'CN', label: 'China' },
      { value: 'RU', label: 'Russia' },
      { value: 'BD', label: 'Bangladesh' }
    ],
    // Add product category options
    productCategory: [
      { value: 'electronics', label: 'Electronics' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'financial', label: 'Financial Services' },
      { value: 'retail', label: 'Retail' },
      { value: 'construction', label: 'Construction' }
    ],
      subCategory: [] // Will be populated dynamically based on selected category
    });

    // Enhanced dropdown columns to include new relatable fields
    transactionDropdownColumns = signal(['status', 'priority', 'department', 'category', 'assignedRole', 'currency', 'country', 'productCategory', 'subCategory']);


      accountsData = [
      { accountId: 'ACC001', accountName: 'Main Current Account', accountType: 'Current', balance: 50000.00 },
      { accountId: 'ACC002', accountName: 'Savings Account', accountType: 'Savings', balance: 25000.00 },
      { accountId: 'ACC003', accountName: 'Business Account', accountType: 'Business', balance: 100000.00 },
      { accountId: 'ACC004', accountName: 'Investment Account', accountType: 'Investment', balance: 75000.00 },
      { accountId: 'ACC005', accountName: 'Foreign Currency Account', accountType: 'FC', balance: 30000.00 }
    ];

    filteredAccounts = [...this.accountsData];
    filterAccounts(searchTerm: string) {
      if (!searchTerm.trim()) {
        this.filteredAccounts = [...this.accountsData];
        return;
      }

      const term = searchTerm.toLowerCase();
      this.filteredAccounts = this.accountsData.filter(account =>
        account.accountId.toLowerCase().includes(term) ||
        account.accountName.toLowerCase().includes(term) ||
        account.accountType.toLowerCase().includes(term)
      );
    }

    // Create new account handler
    createNewAccount() {
      // You can implement account creation logic here
      this.toastr.info('Create new account functionality would be implemented here', 'Feature');
      this.showModal = false;
    }
    constructor(
      private formBuilder: FormBuilder,
      private http: HttpClient,
      private cdr: ChangeDetectorRef
      //private toastr: CustomToastrService

    ) {
      BUTTON_VISIBILITY.set({
        save: true,
        saveNext: false,
        update: false,
        updateNext: false,
        view: true,
        delete: true,
        exit: true,
        reset: true,
      });

      effect(() => {
      if(this.onClickSave()) {

          this.save();
          ONCLICK_SAVE.set(false);
      }
    });

      effect(() => {
        if (ONCLICK_SAVE_NEXT()) {
          this.save();
          ONCLICK_SAVE_NEXT.set(false);
          // TODO: navigate to next step/page if needed
        }
      });

      effect(() => {
        if(ONCLICK_EXIT()) {
          console.log('Exit button clicked - implementing exit logic');
          window.history.back();
          ONCLICK_EXIT.set(false);
        }
      });

       effect(() => {
        if(ONCLICK_RESET()) {
          console.log('Reset button clicked - implementing reset logic');
          // window.history.back();
          ONCLICK_RESET.set(false);
        }
      });
    }


    isOrderProcessable = (sampletransaction: any): boolean => {
      return sampletransaction.riskLevel === 'medium';
    };


  save(): void {
    console.log('=== STARTING SAVE PROCESS ===');

    // First, let's see what the form actually contains
    console.log('Form valid status:', this.frmGroup.valid);
    console.log('Form value:', this.frmGroup.value);
    console.log('Form errors:', this.getFormErrors());

    // Check if form is invalid
    if (this.frmGroup.invalid) {
      console.log('❌ Form is invalid');

      // Get detailed error information
      const errors = this.getDetailedFormErrors();
      console.log('Detailed form errors:', errors);

      // Show specific error messages
      this.showFormValidationErrors(errors);
      return;
    }

    // Additional custom validation
    if (!this.validateRequiredFields()) {
      console.log('❌ Custom validation failed');
      return;
    }

    // If we reach here, form is valid
    console.log('✅ Form is valid, proceeding with save...');

    // Get all form data including calculated values
    const completeFormData = this.getCompleteFormData();

    console.log('=== COMPLETE FORM DATA ===');
    console.log(JSON.stringify(completeFormData, null, 2));

    this.toastr.success('Data saved successfully! Check console for complete data.', 'Save Successful');
  }

  private loadUsersFromApi(): void {

    // this.http.get<User[]>('https://jsonplaceholder.typicode.com/users')
    //   .pipe(
    //     timeout(5000),
    //     retry(2),
    //     catchError(error => {
    //       console.error('API failed after retries:', error);

    //       this.toastr.warning(
    //         'API not available. Loading fallback data.',
    //         'Warning'
    //       );

    //       this.loadFallbackData();

    //       // Stop stream safely
    //       return of([]);
    //     })
    //   )
    //   .subscribe((users: User[]) => {

    //     if (!users.length) return;

    //     const transformedData = users.map(user => ({
    //       id: `USER${user.id.toString().padStart(3, '0')}`,
    //       name: user.name,
    //       username: user.username,
    //       email: user.email,
    //       phone: user.phone,
    //       website: user.website,
    //       company: user.company.name,
    //       city: user.address.city,
    //       designation: 'Staff',
    //       superannuationAmount: 1000,
    //       effectiveDate: new Date().toISOString().split('T')[0],
    //       startTime: this.generateRandomTime(),
    //       endTime: this.generateRandomTime(),
    //       breakTime: '12:30',
    //       totalHours: this.calculateRandomHours(),
    //       status: this.getRandomStatus()
    //     }));

    //     this.sampleApiData.set(transformedData);
    //     this.toastr.success(
    //       `Loaded ${users.length} users from API`,
    //       'Data Loaded'
    //     );
    //   });
  }

  loadDataFromServer(event: {
    pageIndex: number;
    pageSize: number;
    pageNumber: number;
  }) {
    console.log('Page Number:', event.pageNumber);
    console.log('Page Size:', event.pageSize);
  }


    // Helper methods for data transformation
    private generateRandomTime(): string {
      const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '17:00', '17:30', '18:00'];
      return times[Math.floor(Math.random() * times.length)];
    }

    private calculateRandomHours(): number {
      return Math.round((Math.random() * 2 + 7.5) * 100) / 100; // 7.5 to 9.5 hours
    }

    private getRandomStatus(): boolean {
    return Math.random() > 0.5;
  }

    // Fallback data method
    private loadFallbackData(): void {
      this.sampleApiData.set([
        {
          id: 'ERROR001',
          name: 'API Error - Using Fallback',
          phone: 'N/A',
          company: 'Fallback Data',
          city: 'Unknown',
          designation: 'Developer',
          superannuationAmount: 0,
          effectiveDate: '2024-01-01',
          startTime: '09:00',
          endTime: '17:30',
          breakTime: '12:00',
          totalHours: 8.5,
          status: 'active'
        }
      ]);
    }

  // Improved validation method
  validateRequiredFields(): boolean {
    // Define required fields based on your form
    const requiredFields = [
      'textBox',
      'id',
      'amount',
      'dropdown',
      'currency',
      'country',
      'productCategory',
      'subCategory',
      'officeCode',
      'number'
      // Remove 'textArea' from required if express processing is enabled
    ];

    // Check if express processing is enabled (switch is on)
    const isExpressProcessing = this.frmGroup.get('switch')?.value;

    // Add textArea as required only if not in express processing mode
    if (!isExpressProcessing) {
      requiredFields.push('textArea');
    }

    let hasErrors = false;

    for (const fieldName of requiredFields) {
      const control = this.frmGroup.get(fieldName);

      if (!control) {
        console.log(`⚠️ Control '${fieldName}' not found in form`);
        continue;
      }

      const value = control.value;
      const isEmpty = value === null || value === undefined || value === '' ||
                    (Array.isArray(value) && value.length === 0);

      if (isEmpty || control.invalid) {
        console.log(`❌ Field '${fieldName}' is invalid or empty:`, {
          value: value,
          errors: control.errors,
          valid: control.valid
        });

        this.toastr.error(`Please fill in: ${this.getFieldDisplayName(fieldName)}`, 'Required Field');
        hasErrors = true;
      }
    }

    return !hasErrors;
  }


  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      textBox: 'Transaction Reference',
      id: 'Account ID',
      amount: 'Transaction Amount',
      dropdown: 'Priority Level',
      currency: 'Currency',
      country: 'Country',
      productCategory: 'Product Category',
      subCategory: 'Sub Category',
      textArea: 'Transaction Notes',
      officeCode: 'Office Code',
      number: 'Reference Number'
    };

    return fieldNames[fieldName] || fieldName;
  }
// Dynamic editable columns based on conditions
// editableFields = computed(() => this.getEditableFields());

getEditableFields(): string[] {
    if (this.isApprovalView() || this.isViewDetails()) return [];

    const hasNewScheduleRow = this.sampleScheduleData().some(r => (r as any).isNew);
    const hasNewApiRow = this.sampleApiData().some(r => (r as any).isNew);

    if (hasNewScheduleRow || hasNewApiRow) {
      return ['designation', 'superannuationAmount', 'effectiveDate'];
    }

    return ['superannuationAmount', 'effectiveDate'];
}

// Demo helper methods
toggleApprovalView() {
    this.isApprovalView.update(v => !v);
}

toggleViewDetails() {
    this.isViewDetails.update(v => !v);
}

addNewRowToSchedule() {
    const newId = `EMP${(this.sampleScheduleData().length + 1).toString().padStart(3, '0')}`;
    const newRow = {
        id: newId,
        name: 'New Employee',
        designation: '',
        superannuationAmount: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:30',
        breakTime: '12:00',
        totalHours: 8.5,
        status: 'pending',
        isNew: true
    };
    this.sampleScheduleData.update(data => [...data, newRow]);
}

addNewApiRow() {
    const newId = `USER${(this.sampleApiData().length + 1).toString().padStart(3, '0')}`;
    const newRow = {
        id: newId,
        name: 'New External User',
        email: 'new@example.com',
        designation: '',
        superannuationAmount: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:30',
        breakTime: '12:00',
        totalHours: 8.5,
        status: 'pending',
        isNew: true
    };
    this.sampleApiData.update(data => [newRow, ...data]);
}
  // Get complete form data including calculated fields

  // Get detailed form errors
  private getDetailedFormErrors(): any {
    const formErrors: any = {};

    Object.keys(this.frmGroup.controls).forEach(key => {
      const control = this.frmGroup.get(key);
      if (control && control.errors) {
        formErrors[key] = {
          value: control.value,
          errors: control.errors,
          touched: control.touched,
          dirty: control.dirty
        };
      }
    });

    return formErrors;
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

  // Update the openModal method:
  // In all-components-page.ts
  openModal(componentToLoad?: Type<any>, data?: any) {
    console.log('=== OPENING MODAL ===');
    console.log('Component to load:', componentToLoad);
  console.log('api data',this.loadUsersFromApi());
  // Reset modal state
    this.showModal = false;
    this.modalComponent = undefined;


    setTimeout(() => {
      this.modalComponent = componentToLoad || this.OtherComponentsPageComponent;

      const currentFieldData = this.frmGroup?.getRawValue ? this.frmGroup.getRawValue() : {};
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
  // Show specific validation errors
  /*private showFormValidationErrors(errors: any): void {
    const errorKeys = Object.keys(errors);

    if (errorKeys.length === 0) {
      this.toastr.error('Form has validation errors but no specific errors found', 'Validation Error');
      return;
    }

    // Show first few errors to avoid spam
    errorKeys.slice(0, 3).forEach(key => {
      const fieldError = errors[key];
      const fieldName = this.getFieldDisplayName(key);

      if (fieldError.errors.required) {
        this.toastr.error(`${fieldName} is required`, 'Required Field');
      } else if (fieldError.errors.minlength) {
        this.toastr.error(`${fieldName} must be at least ${fieldError.errors.minlength.requiredLength} characters`, 'Validation Error');
      } else if (fieldError.errors.maxlength) {
        this.toastr.error(`${fieldName} must not exceed ${fieldError.errors.maxlength.requiredLength} characters`, 'Validation Error');
      } else if (fieldError.errors.min) {
        this.toastr.error(`${fieldName} must be at least ${fieldError.errors.min.min}`, 'Validation Error');
      } else if (fieldError.errors.max) {
        this.toastr.error(`${fieldName} must not exceed ${fieldError.errors.max.max}`, 'Validation Error');
      } else if (fieldError.errors.pattern) {
        this.toastr.error(`${fieldName} has invalid format`, 'Validation Error');
      } else if (fieldError.errors.minAmount) {
        this.toastr.error(`${fieldName} must be at least ${fieldError.errors.minAmount} for selected subcategory`, 'Validation Error');
      } else {
        this.toastr.error(`${fieldName} has validation errors`, 'Validation Error');
      }
    });

    if (errorKeys.length > 3) {
      this.toastr.warning(`${errorKeys.length - 3} more validation errors found. Check form fields.`, 'Additional Errors');
    }
  }*/

  /*private showFormValidationErrors(errors: any): void {
    const errorKeys = Object.keys(errors);

    if (errorKeys.length === 0) {
      this.toastr.error('Form has validation errors but no specific errors found', 'Validation Error', {
        toastClass: 'ngx-toastr custom-toast-0',
        timeOut: 0, // stays until manually closed
        closeButton: true
      });
      return;
    }

    // Show first few errors to avoid spam
    errorKeys.slice(0, 3).forEach((key, index) => {
      const fieldError = errors[key];
      const fieldName = this.getFieldDisplayName(key);

      // Dynamic Y position for each toast
      const y = 80 + index * 70; // 80px initial offset, 70px spacing between toasts
      const customClass = `custom-toast-${index}`;

      // Create dynamic CSS for this toast
      const style = document.createElement('style');
      style.textContent = `
        .${customClass} {
          position: fixed !important;
          top: ${y}px !important;
          left: 900px !important;
          z-index: 9999 !important;
        }
      `;
      document.head.appendChild(style);

      // Determine error message
      let message = '';
      if (fieldError.errors.required) {
        message = `${fieldName} is required`;
      } else if (fieldError.errors.minlength) {
        message = `${fieldName} must be at least ${fieldError.errors.minlength.requiredLength} characters`;
      } else if (fieldError.errors.maxlength) {
        message = `${fieldName} must not exceed ${fieldError.errors.maxlength.requiredLength} characters`;
      } else if (fieldError.errors.min) {
        message = `${fieldName} must be at least ${fieldError.errors.min.min}`;
      } else if (fieldError.errors.max) {
        message = `${fieldName} must not exceed ${fieldError.errors.max.max}`;
      } else if (fieldError.errors.pattern) {
        message = `${fieldName} has invalid format`;
      } else if (fieldError.errors.minAmount) {
        message = `${fieldName} must be at least ${fieldError.errors.minAmount} for selected subcategory`;
      } else {
        message = `${fieldName} has validation errors`;
      }

      // Show toast at custom Y position
      this.toastr.error(message, 'Validation Error', {
        toastClass: `ngx-toastr ${customClass}`,
        timeOut: 0, // stays until manually closed
        closeButton: true,
        progressBar: true
      }).onHidden.subscribe(() => {
        document.head.removeChild(style); // clean up CSS
      });
    });

    // Show additional errors notice if more than 3
    if (errorKeys.length > 3) {
      const y = 80 + 3 * 70; // position below first 3 toasts
      const customClass = `custom-toast-more`;

      const style = document.createElement('style');
      style.textContent = `
        .${customClass} {
          position: fixed !important;
          top: ${y}px !important;
          left: 900px !important;
          z-index: 9999 !important;
        }
      `;
      document.head.appendChild(style);

      this.toastr.warning(`${errorKeys.length - 3} more validation errors found. Check form fields.`, 'Additional Errors', {
        toastClass: `ngx-toastr ${customClass}`,
        timeOut: 0,
        closeButton: true,
        progressBar: true
      }).onHidden.subscribe(() => {
        document.head.removeChild(style);
      });
    }
  }*/


  private showFormValidationErrors(errors: any): void {
    const errorKeys = Object.keys(errors);

    if (errorKeys.length === 0) {
      //this.showCustomToastMessage1('Form has validation errors but no specific errors found', 'Validation Error', 'error');
      this.toastr.error('Form has validation errors but no specific errors found', 'Validation Error');
      return;
    }

    // Show first few errors
    errorKeys.slice(0, 3).forEach((key) => {
      const fieldError = errors[key];
      const fieldName = this.getFieldDisplayName(key);

      // Build message
      let message = '';
      if (fieldError.errors.required) {
        message = `${fieldName} is required`;
      } else if (fieldError.errors.minlength) {
        message = `${fieldName} must be at least ${fieldError.errors.minlength.requiredLength} characters`;
      } else if (fieldError.errors.maxlength) {
        message = `${fieldName} must not exceed ${fieldError.errors.maxlength.requiredLength} characters`;
      } else if (fieldError.errors.min) {
        message = `${fieldName} must be at least ${fieldError.errors.min.min}`;
      } else if (fieldError.errors.max) {
        message = `${fieldName} must not exceed ${fieldError.errors.max.max}`;
      } else if (fieldError.errors.pattern) {
        message = `${fieldName} has invalid format`;
      } else if (fieldError.errors.minAmount) {
        message = `${fieldName} must be at least ${fieldError.errors.minAmount} for selected subcategory`;
      } else {
        message = `${fieldName} has validation errors`;
      }

      // Show toast with stacking
      //this.showCustomToastMessage1(message, 'Validation Error', 'error');
      this.toastr.error(message, 'Validation Error');
    });

    // If more than 3 errors, show summary
    if (errorKeys.length > 3) {
      this.toastr.warning(
        `${errorKeys.length - 3} more validation errors found. Check form fields.`,
        'Additional Errors',
      );
    }
  }

  handleExtra1($event:any){
    console.log('Extra button 1 clicked', $event);
  }
  handleExtra2($event:any){
    console.log('Extra button 2 clicked', $event);
  }

  // Get complete form data including calculated values
  private getCompleteFormData(): any {
    const formValues = this.frmGroup.value;

    // Include disabled field values
    const disabledValues = {
      taxRate: this.frmGroup.get('taxRate')?.value,
      calculatedTax: this.frmGroup.get('calculatedTax')?.value,
      totalAmount: this.frmGroup.get('totalAmount')?.value,
      riskLevel: this.frmGroup.get('riskLevel')?.value,
      // requiresApproval: this.frmGroup.get('requiresApproval')?.value
    };

    return {
      timestamp: new Date().toISOString(),
      formData: {
        ...formValues,
        ...disabledValues
      },
      calculatedValues: {
        selectedCurrency: this.selectedCurrency(),
        selectedCountry: this.selectedCountry(),
        selectedProductCategory: this.selectedProductCategory(),
        calculatedTaxRate: this.calculatedTaxRate(),
        isHighValueTransaction: this.isHighValueTransaction(),
        isApprovalRequired: this.isApprovalRequired(),
        relationshipStatus: this.getRelationshipStatus()
      },
      fileData: {
        pdfFiles: this.pdfFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
        anyFiles: this.anyFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
        profilePicFile: this.profilePicFile ? { name: this.profilePicFile.name, size: this.profilePicFile.size } : null
      },
      gridData: {
        transactions: this.sampleTransactions(),
        transactionCount: this.sampleTransactions().length
      },
      formStatus: {
        valid: this.frmGroup.valid,
        dirty: this.frmGroup.dirty,
        touched: this.frmGroup.touched
      }
    };
  }

  // Updated getFormErrors method
  private getFormErrors(): any {
    const formErrors: any = {};

    Object.keys(this.frmGroup.controls).forEach(key => {
      const control = this.frmGroup.get(key);
      if (control && !control.valid && control.errors) {
        formErrors[key] = control.errors;
      }
    });

    return formErrors;
  }

  // Method to mark all fields as touched (helpful for showing validation errors)
  markAllFieldsAsTouched(): void {
    Object.keys(this.frmGroup.controls).forEach(key => {
      this.frmGroup.get(key)?.markAsTouched();
    });
  }

  // Debug method to check current form state
  debugFormState(): void {
    console.log('=== FORM DEBUG INFO ===');

    Object.keys(this.frmGroup.controls).forEach(key => {
      const control = this.frmGroup.get(key);
      console.log(`${key}:`, {
        value: control?.value,
        valid: control?.valid,
        errors: control?.errors,
        touched: control?.touched,
        dirty: control?.dirty,
        disabled: control?.disabled
      });
    });
  }

  private restoreGridSelections(): void {
    try {
      // Try to get multiple selections first
      const multipleSelectionsData = localStorage.getItem('selectedRows');
      if (multipleSelectionsData) {
        const selectedRowIds = JSON.parse(multipleSelectionsData);
        console.log('ss',selectedRowIds);
        if (Array.isArray(selectedRowIds) && selectedRowIds.length > 0) {
          const transactions = this.sampleTransactions();

          // Restore all selected rows
          selectedRowIds.forEach((rowId: string, index: number) => {
            const rowIndex = transactions.findIndex(t => t.id === rowId);

            if (rowIndex !== -1) {
              // Add to selected IDs signal
              this.selectedRowIds.update(ids => {
                const newIds = new Set(ids);
                newIds.add(rowId);
                return newIds;
              });

              // Stagger the row selections to avoid timing issues
              setTimeout(() => {
                this.selectRowInGrid(rowIndex, rowId);
              }, 500 + (index * 100));
            }
          });

          console.log('Restored multiple selections:', selectedRowIds);
          this.toastr.info(`Restored ${selectedRowIds.length} selected rows`, 'Grid Selection');
          return;
        }
      }

      // Fallback: try single row selection for backward compatibility
      const storedData = localStorage.getItem('rowData');
      if (storedData) {
        const rowData = JSON.parse(storedData);

        if (rowData.id) {
          const transactions = this.sampleTransactions();
          const rowIndex = transactions.findIndex(t => t.id === rowData.id);

          if (rowIndex !== -1) {
            this.selectedRowIds.update(ids => {
              const newIds = new Set(ids);
              newIds.add(rowData.id);
              return newIds;
            });

            setTimeout(() => {
              this.selectRowInGrid(rowIndex, rowData.id);
            }, 500);

            console.log('Restored single selection for row:', rowData.id);
            this.toastr.info(`Restored selection: ${rowData.id}`, 'Grid Selection');
          }
        }
      }
    } catch (error) {
      console.error('Error restoring grid selections:', error);
    }
  }


  private selectRowInGrid(index: number, rowId?: string): void {
    const transactions = this.sampleTransactions();
    if (index >= 0 && index < transactions.length) {
      const transaction = transactions[index];


      if (this.gridComponent) {
        try {

          this.gridComponent.onRowSelect(index, true);
          console.log('Grid row selected via component method');
        } catch (error) {
          console.log('Grid component selection method not available, using fallback:', error);
        }
      }

      // this.onTransactionRowSelect({
      //   data: JSON.stringify(transaction),
      //   checked: true
      // });

      // Force change detection if needed
      console.log(`Selected row ${rowId || transaction.id} at index ${index}`);
    }
  }

  // Multiple selection localStorage methods
  private saveMultipleSelectionsToStorage(): void {
    try {
      const selectedIds = Array.from(this.selectedRowIds());
      localStorage.setItem('selectedRows', JSON.stringify(selectedIds));
      console.log('Saved multiple selections to localStorage:', selectedIds);
    } catch (error) {
      console.error('Error saving multiple selections to localStorage:', error);
    }
  }

  private removeSelectionFromStorage(rowId: string): void {
    try {
      const selectedIds = Array.from(this.selectedRowIds());
      localStorage.setItem('selectedRows', JSON.stringify(selectedIds));

      // Also remove single selection if it matches
      const currentRowData = localStorage.getItem('rowData');
      if (currentRowData) {
        const storedRowData = JSON.parse(currentRowData);
        if (storedRowData.id === rowId) {
          localStorage.removeItem('rowData');
        }
      }
    } catch (error) {
      console.error('Error removing selection from localStorage:', error);
    }
  }

  onTransactionRowSelect(event: { data: string, checked: boolean }): void {
    console.log('Row selection event:', event);

    const rowData = JSON.parse(event.data);

    const ids = Array.from(this.selectedRowIds());
    if (event.checked) {
      // Add to selected rows - use update() for signals, not push()
      this.selectedRows.update(rows => [...rows, rowData]);
      this.selectedRowIds.update(ids => {
        console.log(rowData);
        const newIds = new Set(ids);
        newIds.add(rowData.id);
        return newIds;
      });
      console.log(this.selectedRows())
      // Store all selected rows in localStorage
      // this.saveMultipleSelectionsToStorage();

      console.log(`Row ${rowData.id} selected and stored in localStorage`);
      this.toastr.info(`Transaction ${rowData.id} selected. Total: ${this.selectedRowIds().size}`, 'Row Selected');
    } else {
      // Remove from selected rows - filter out the deselected row
      this.selectedRows.update(rows => rows.filter(row => row.id !== rowData.id));
      this.selectedRowIds.update(ids => {
        const newIds = new Set(ids);
        newIds.delete(rowData.id);
        return newIds;
      });
      console.log(this.selectedRows())

      // Update localStorage with remaining selections
      this.removeSelectionFromStorage(rowData.id);

      console.log(`Row ${rowData.id} deselected`);
      this.toastr.info(`Transaction ${rowData.id} deselected. Total: ${this.selectedRowIds().size}`, 'Row Deselected');
    }

  }

    onScheduleDataChanged(updatedData: any[]): void {
      console.log('Schedule data updated:', updatedData);

      // Calculate total hours when time fields change
      const updatedScheduleData = updatedData.map(schedule => {
        if (schedule.startTime && schedule.endTime) {
          const totalHours = this.calculateTotalHours(schedule.startTime, schedule.endTime);
          return { ...schedule, totalHours };
        }
        return schedule;
      });

      this.sampleScheduleData.set(updatedScheduleData);
      this.toastr.info('Schedule data has been updated', 'Schedule Changed');
    }

    onDateTransactionDataChanged(updatedData: any[]): void {
      console.log('Date transaction data updated:', updatedData);
      this.sampleDateTransactions.set(updatedData);
      this.toastr.info('Date transaction data has been updated', 'Transaction Changed');
    }

    // Helper method to calculate total working hours
    private calculateTotalHours(startTime: string, endTime: string): number {
      if (!startTime || !endTime) return 0;

      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);

      // Handle case where end time is next day
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }

      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
    }


    ngOnInit(): void {
      // Clear previous session's selected rows from localStorage
      localStorage.removeItem('selectedRows');
      localStorage.removeItem('rowData');

      // Initialize subCategory dropdown options based on first transaction's productCategory
      const firstTransaction = this.sampleTransactions()[0];
      if (firstTransaction && firstTransaction.productCategory) {
        this.initializeSubCategoryOptions(firstTransaction.productCategory);
      }

      // Initialize generic table with auto-generation
      this.loadWithFullConfig();
      // this.loadCountries()
      this.disableSaveButton();
      // Set default selected file for file preview demo
      this.selectedFile.set(this.sampleFiles()[0]);
      this.frmGroup = this.formBuilder.group({
        textBox: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
        id: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
        textArea: ['', [Validators.required, Validators.maxLength(500)]],
        switch: [true],
        amount: ['', [Validators.required, Validators.max(2000000), Validators.min(1)]],
        amountToWord: ['', [Validators.required, Validators.max(2000000), Validators.min(1)]],
        dropdown: ['', Validators.required],
        multiSelect: [[]],
        // categories: [[], Validators.required],
        date: ['', Validators.required],
        number: ['', [Validators.required, Validators.pattern('^[0-9]*$')]],
        officeCode: ['', [Validators.required, Validators.maxLength(10), Validators.minLength(3)]],
        fileUpload: [null],
        tags: [[], [Validators.required, Validators.minLength(1), Validators.maxLength(5)]],

        // New relatable fields
        currency: ['USD', Validators.required],
        country: ['', Validators.required],
        productCategory: ['', Validators.required],
        subCategory: ['', Validators.required],
        taxRate: [{ value: 0, disabled: true }],
        calculatedTax: [{ value: 0, disabled: true }],
        totalAmount: [{ value: 0, disabled: true }],
        riskLevel: [{ value: '', disabled: true }],
        requiresApproval: [{ value: false }],
        dateField: [null, Validators.required],
        // Horizontal display mode controls (same as outline section)
        textBoxHorizontal: ['', [Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
        currencyHorizontal: ['EUR',Validators.required],
        amountToWordHorizontal: ['',Validators.required, [Validators.max(1000000), Validators.min(1)]],
        dropdownHorizontal: [''],
        multiSelectHorizontal: [[]],
        reminderTime: ['', Validators.required],
        numberHorizontal: ['', [Validators.pattern('^[0-9]*$')]],
        officeCodeHorizontal: ['', [Validators.maxLength(10), Validators.minLength(3)]],
        quillEditor: [''],
        deliveryAddress: [null, Validators.required],
      });

      this.setupFieldRelationships();
      setTimeout(() => {
        this.restoreGridSelections();
      }, 100);






        this.loadUsersFromApi();



    }


  loadCountries(): void {
    const apiUrl = 'http://192.168.20.250:9999/centrino/api/AddressCountry/RetrieveAllCountries';

    this.http.get<Country[] | { data?: Country[]; result?: Country[] }>(apiUrl).pipe(
      timeout(10000),
      catchError(error => {
        console.error('Country API error:', error);
        this.toastr.error('Failed to load countries. Using default options.', 'Error');

        // Fallback data
        const fallback: Country[] = [
          { countryId: 1, countryNm: 'United States' },
          { countryId: 2, countryNm: 'United Kingdom' },
          { countryId: 3, countryNm: 'Canada' },
          { countryId: 4, countryNm: 'Australia' }
        ];

        return of(fallback);
      })
    ).subscribe({
      next: (res) => {
        console.log('Raw API Response:', res);

        // Normalize API response
        const countries: Country[] = Array.isArray(res)
          ? res
          : res.data ?? res.result ?? [];

        // ✅ Limit to 10
        const limitedCountries = countries.slice(0, 10);

        if (limitedCountries.length === 0) {
          this.toastr.warning('No countries found', 'Warning');
          return;
        }

        this.countryOptions = limitedCountries.map((c: Country) => ({
          key: c.countryId,
          value: c.countryNm
        }));

        // Set default value
        const countryControl = this.frmGroup?.get('country');
        if (countryControl) {
          countryControl.patchValue(limitedCountries[0].countryId, {
            emitEvent: false
          });
        }

        console.log('Countries loaded successfully:', this.countryOptions);
        this.toastr.success(
          `Loaded ${limitedCountries.length} countries`,
          'Success'
        );
      },
      error: (err) => {
        console.error('Unexpected error loading countries:', err);
        this.toastr.error(
          'An unexpected error occurred while loading countries',
          'Error'
        );
      }
    });
  }



  parseCurrencyXML(xml: string): { key: string; value: string }[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const payloads = Array.from(doc.getElementsByTagName('payload'));

    return payloads.map(p => {
      const id = p.getElementsByTagName('currencyId')[0]?.textContent ?? '';
      const name = p.getElementsByTagName('currencyFullNm')[0]?.textContent ?? '';
      const code = p.getElementsByTagName('isoSwiftCode')[0]?.textContent ?? '';

      return {
        key: id,
        value: `${name} (${code})`
      };
    });
  }



    private setupFieldRelationships(): void {
      // Currency changes affect country, tax rate, and amount calculations
      this.frmGroup.get('currency')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe((currencyCode: string) => {
        this.handleCurrencyChange(currencyCode);
      });

      // Country changes affect risk level and approval requirements
      this.frmGroup.get('country')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe((countryCode: string) => {
        // this.handleCountryChange(countryCode);
      });

      // Product category changes affect subcategories and tax calculations
      this.frmGroup.get('productCategory')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe((categoryCode: string) => {
        this.handleProductCategoryChange(categoryCode);
      });

      // Amount changes affect tax calculations and approval requirements
      this.frmGroup.get('amount')?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe((amount: number) => {
        this.handleAmountChange(amount);
      });

      // Subcategory changes affect minimum amount validation
      this.frmGroup.get('subCategory')?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe((subCategoryCode: string) => {
        this.handleSubCategoryChange(subCategoryCode);
      });

      // Switch toggle affects transaction processing
      this.frmGroup.get('switch')?.valueChanges.subscribe((isEnabled: boolean) => {
        this.handleSwitchToggle(isEnabled);
      });

      this.frmGroup.get('switch')?.valueChanges.subscribe((isEnabled: boolean) => {
        this.handleSwitchToggle(!isEnabled);
      });
    }


    onTextBoxChanged(value: string): void {
      console.log('TextBox changed:', value);
    }

    onInputTextAreaChanged(value: string): void {
      console.log('InputTextArea changed:', value);
    }
    onIdBoxChanged(value: string): void {
      console.log('IdBox changed:', value);
    }
    onAmountChanged(value: string): void {
      console.log('Amount changed:', value);
    }
    onAmountToWordChanged(value: string): void {
      console.log('AmountToWord changed:', value);
    }
    onNumberChanged(value: string): void {
      console.log('Number changed:', value);
    }
    onOfficeBoxChanged(value: { officeCode: string, officeName: string }): void {
      console.log('OfficeBox changed:', value);
    }


    onTagAdded($event:any) {
      console.log($event);
    }
    onTagRemoved($event:any){
      console.log($event);

    }
    onTagsChanged($event:any){
      console.log($event);
    }
    private handleCurrencyChange(currencyCode: string): void {
      const currency = this.currencyOptions.find(c => c.key === currencyCode);
      if (currency) {
        this.selectedCurrency.set(currencyCode);

        // Auto-select related country
        // this.frmGroup.patchValue({
        //   country: currency.country
        // }, { emitEvent: false });

        // Update tax rate
        // this.frmGroup.patchValue({
        //   taxRate: currency.taxRate
        // });

        // Recalculate amounts
        this.recalculateAmounts();

        // Filter related transactions in grid
        this.filterRelatedTransactions();

        // this.toastr.info(`Currency changed to ${currency.value}. Auto-selected ${currency.country}`, 'Currency Update');
      }
    }

    // private handleCountryChange(countryCode: string): void {
    //   const country = this.countryOptions.find(c => c.key === countryCode);
    //   if (country) {
    //     this.selectedCountry.set(countryCode);

    //     // Update risk level
    //     this.frmGroup.patchValue({
    //       riskLevel: country.riskLevel
    //     });

    //     // Update approval requirements based on risk
    //     const requiresApproval = country.riskLevel === 'high' || country.riskLevel === 'medium';
    //     this.frmGroup.patchValue({
    //       requiresApproval: requiresApproval
    //     });

    //     // Update validation rules based on risk level
    //     this.updateValidationRules(country.riskLevel);

    //     this.toastr.info(`Country set to ${country.value}. Risk level: ${country.riskLevel}`, 'Country Update');
    //   }
    // }

    private handleProductCategoryChange(categoryCode: string): void {
      const category = this.productCategoryOptions.find(c => c.key === categoryCode);
      if (category) {
        this.selectedProductCategory.set(categoryCode);

        // Filter subcategories
        const filteredSubs = this.subCategoryOptions.filter(sub => sub.parentCategory === categoryCode);
        this.filteredSubCategories.set(filteredSubs);

        // Update dropdown options for subcategory in grid
        this.transactionDropdownOptions.update(options => ({
          ...options,
          subCategory: filteredSubs.map(sub => ({ value: sub.key, label: sub.value }))
        }));

        // Reset subcategory selection
        this.frmGroup.patchValue({
          subCategory: ''
        });

        // Update approval requirements
        this.frmGroup.patchValue({
          requiresApproval: category.requiresApproval
        });

        // Recalculate tax with category multiplier
        this.recalculateAmounts();

        this.toastr.info(`Product category changed to ${category.value}`, 'Category Update');
      }
    }

    private handleAmountChange(amount: number): void {
      if (amount && amount > 0) {
        // Check if high value transaction
        const isHighValue = amount > 50000;
        this.isHighValueTransaction.set(isHighValue);

        // Update approval requirements for high value
        if (isHighValue) {
          this.frmGroup.patchValue({
            requiresApproval: true
          });
        }

        // Recalculate tax and total
        this.recalculateAmounts();

        // Update amount to words field
        this.frmGroup.patchValue({
          amountToWord: amount

        });

        if (isHighValue) {
          this.toastr.warning('High value transaction - Approval required', 'High Value Alert');
        }
      }
    }

    private handleSubCategoryChange(subCategoryCode: string): void {
      const subCategory = this.subCategoryOptions.find(s => s.key === subCategoryCode);
      if (subCategory) {
        // Update minimum amount validation
        const currentAmount = this.frmGroup.get('amount')?.value || 0;
        if (currentAmount < subCategory.minAmount) {
          this.frmGroup.get('amount')?.setErrors({ minAmount: subCategory.minAmount });
          this.toastr.error(`Minimum amount for ${subCategory.value} is ${subCategory.minAmount}`, 'Validation Error');
        }

        // Update amount field minimum validator
        this.frmGroup.get('amount')?.setValidators([
          Validators.required,
          Validators.min(subCategory.minAmount),
          Validators.max(1000000)
        ]);
        this.frmGroup.get('amount')?.updateValueAndValidity();
      }
    }

  showDynamicToasts() {
      const messages = [
        'First toast message',
        'Second toast message',
        'Third toast message',
        'Fourth toast message'
      ];

      this.showNextToast(messages, 0);
    }

    private showNextToast(messages: string[], index: number) {
      if (index >= messages.length) return;

      this.toastCount++;
      const styleId = `dynamic-toast-${this.toastCount}`;
      // Calculate Y position dynamically
      const yPosition = this.startY + index * this.gapY;
      const xPosition = 50; // fixed X position, adjust if needed

      // Create dynamic CSS class
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .${styleId} {
          top: ${yPosition}px !important;
          left: ${xPosition}px !important;
          position: fixed !important;
        }
      `;
      document.head.appendChild(style);

      // Show toast and wait until hidden to show next one
      this.toastr.success(messages[index], 'Success', {
        toastClass: `ngx-toastr ${styleId}`,
        timeOut: 600,
      }).onHidden.subscribe(() => {
        this.showNextToast(messages, index + 1);
      });

      this.toastr.error(messages[index], 'Validation', {
        toastClass: `ngx-toastr ${styleId}`,
        closeButton: true,
        timeOut: 3000,
        progressBar: true,
      }).onHidden.subscribe(() => {

        document.head.removeChild(style);
        this.showNextToast(messages, index + 1);
      });
    }

    private handleSwitchToggle(isEnabled: boolean): void {
      if (isEnabled) {
        // Enable express processing - reduce validation requirements
        this.frmGroup.get('textArea')?.setValidators([Validators.maxLength(500)]);
        /*this.toastr.success('Express processing enabled', 'Processing Mode', {
        //positionClass: 'toast-top-left'
        toastClass: 'ngx-toastr custom-toast-position',
        closeButton: true
      }
      );*/
      //this.showCustomToast('Express processing enabled','Processing Mode' );
      this.toastr.success('Operation completed!', 'Processing Mode');

      } else {
        // Standard processing - restore full validation
        this.frmGroup.get('textArea')?.setValidators([Validators.required, Validators.maxLength(500)]);
        /*this.toastr.info('Standard processing mode', 'Processing Mode', {
        //positionClass: 'toast-top-left'
        toastClass: 'ngx-toastr',
        closeButton: true
      }
      );*/
      // Per-call placement: either the class helper, or the shorter
      // { position: 'top-right' } form that ToastHelperService accepts.
      this.toastr.info('Standard processing mode', 'Processing Mode', {
        positionClass: toastPositionClass('top-right')
      });
      }
      this.frmGroup.get('textArea')?.updateValueAndValidity();
    }

    private recalculateAmounts(): void {
      const amount = this.frmGroup.get('amount')?.value || 0;
      const taxRate = this.frmGroup.get('taxRate')?.value || 0;
      const categoryCode = this.frmGroup.get('productCategory')?.value;

      let effectiveTaxRate = taxRate;

      // Apply category tax multiplier
      if (categoryCode) {
        const category = this.productCategoryOptions.find(c => c.key === categoryCode);
        if (category) {
          effectiveTaxRate = taxRate * category.taxMultiplier;
        }
      }

      const calculatedTax = amount * effectiveTaxRate;
      const totalAmount = amount + calculatedTax;

      this.calculatedTaxRate.set(effectiveTaxRate);

      this.frmGroup.patchValue({
        taxRate: effectiveTaxRate,
        calculatedTax: calculatedTax,
        totalAmount: totalAmount
      });
    }

    private updateValidationRules(riskLevel: string): void {
      // Update validation based on risk level
      if (riskLevel === 'high') {
        // High risk requires more documentation
        this.frmGroup.get('textArea')?.setValidators([
          Validators.required,
          Validators.minLength(50),
          Validators.maxLength(500)
        ]);
        this.frmGroup.get('fileUpload')?.setValidators([Validators.required]);
      } else if (riskLevel === 'medium') {
        this.frmGroup.get('textArea')?.setValidators([
          Validators.required,
          Validators.minLength(20),
          Validators.maxLength(500)
        ]);
      } else {
        // Low risk - standard validation
        this.frmGroup.get('textArea')?.setValidators([
          Validators.required,
          Validators.maxLength(500)
        ]);
      }

      // Update validity
      this.frmGroup.get('textArea')?.updateValueAndValidity();
      this.frmGroup.get('fileUpload')?.updateValueAndValidity();
    }

    private filterRelatedTransactions(): void {
      const currentCurrency = this.frmGroup.get('currency')?.value;
      const currentCategory = this.frmGroup.get('productCategory')?.value;

      // Filter transactions in grid based on current form values
      const allTransactions = this.sampleTransactions();
      const filtered = allTransactions.filter(t =>
        t.currency === currentCurrency || t.productCategory === currentCategory
      );

      this.relatedTransactions.set(filtered);

      // Update grid data if needed
      // You can emit this to update the grid component
    }

    // Enhanced event handlers with relatable field logic
    handleCategorySelection(event: { selectedOption: any; selectedKey: string; selectedValue: string }): void {
      console.log('Selected option:', event.selectedOption);

      // Update priority based on selection
      if (event.selectedKey === 'option1' || event.selectedKey === 'option4') {
        // High priority or urgent
        this.frmGroup.patchValue({
          requiresApproval: true
        });
        this.toastr.info('High priority transaction - Approval required', 'Priority Update');
      }
    }

    // Enhanced grid event handlers
    onTransactionEdit(serializedData: string): void {
      const transaction = JSON.parse(serializedData);

      // Pre-populate form with transaction data for editing
      this.frmGroup.patchValue({
        amount: transaction.amount,
        currency: transaction.currency,
        country: transaction.country,
        productCategory: transaction.productCategory,
        subCategory: transaction.subCategory,
        textBox: transaction.id,
        textArea: `Editing transaction ${transaction.id}`
      });

      this.toastr.info(`Editing transaction: ${transaction.id}`, 'Edit Mode');
    }

  onTransactionDataChanged(newData: any[]): void {
    console.log('Transaction data changed:', newData);

    // Validate amounts in the updated data
    const validatedData = newData.map(transaction => {
      if (transaction.amount) {
        // Ensure amount is within valid range
        if (transaction.amount < 1) {
          transaction.amount = 1;
          this.toastr.warning(`Minimum amount of 1 applied to transaction ${transaction.id}`, 'Validation');
        } else if (transaction.amount > 1000000) {
          transaction.amount = 1000000;
          this.toastr.warning(`Maximum amount of 1,000,000 applied to transaction ${transaction.id}`, 'Validation');
        }

        // Validate against subcategory minimum
        const subCategory = this.subCategoryOptions.find(s => s.key === transaction.subCategory);
        if (subCategory && transaction.amount < subCategory.minAmount) {
          transaction.amount = subCategory.minAmount;
          this.toastr.warning(`Minimum amount of ${subCategory.minAmount} applied for ${subCategory.value}`, 'Validation');
        }

        // Recalculate related fields
        transaction = this.recalculateTransactionAmounts(transaction);
      }
      return transaction;
    });

    // Update with validated data
    this.sampleTransactions.set(validatedData);
    this.filterRelatedTransactions();

    // Reattach event listeners to new grid buttons
    // setTimeout(() => this.attachGridButtonListeners(), 100);

    this.toastr.success('Transaction data updated with validation', 'Data Updated');
  }

  private recalculateTransactionAmounts(transaction: any): any {
    const amount = Number(transaction.amount) || 0;
    let taxRate = 0.05; // Default tax rate

    // Get currency-specific tax rate
    const currency = this.currencyOptions.find(c => c.key === transaction.currency);
    if (currency) {
      // taxRate = currency.taxRate;
    }

    // Apply category multiplier
    const category = this.productCategoryOptions.find(c => c.key === transaction.productCategory);
    if (category) {
      taxRate *= category.taxMultiplier;
    }

    const calculatedTax = amount * taxRate;
    const totalAmount = amount + calculatedTax;

    return {
      ...transaction,
      amount: amount,
      taxRate: taxRate,
      calculatedTax: calculatedTax,
      totalAmount: totalAmount,
      requiresApproval: category?.requiresApproval || amount > 50000
    };
  }
      dd(){
        alert('dd');
      }

      handleRowEditStart(event: { rowData: any; rowIndex: number; displayIndex: number }) {
  console.log('Editing row data:', event.rowData);
  console.log('Absolute index:', event.rowIndex);
  console.log('Page index:', event.displayIndex);


}
    // Row-level action visibility for the transaction grid
    private getTransactionActionVisibility(row: any) {
      return {
        delete: row.status !== 'completed' && row.status !== 'failed', // hide delete for completed/failed
        edit: true,                                                   // always allow edit here
        view: true,                                                   // always allow view
        print: true,                                                  // allow print
        progress: row.priority === 'high',                            // example: show progress only for high priority
      };
    }

    // ==================== VALIDATION / COMPUTED / DEPENDENT CELL GRID ====================
    // Order lines: one grid exercising every inline-edit feature the data grid gained —
    // keyboard commit, per-column validation, a derived column, a conditional cell and
    // a dropdown whose options are reloaded from another cell in the same row.
    validationGridPanel: WritableSignal<boolean> = signal(true);

    orderLines = signal<any[]>([
      { id: 1, product: 'Laptop Dock',   category: 'hardware', subProduct: 'dock-usbc',  quantity: 4,  unitPrice: 120,  discountPercent: 0,  discountReason: '',            lineTotal: 480 },
      { id: 2, product: 'Design Suite',  category: 'software', subProduct: 'lic-annual', quantity: 10, unitPrice: 45.5, discountPercent: 10, discountReason: 'Volume deal', lineTotal: 409.5 },
      { id: 3, product: 'HDMI Cable Set', category: 'hardware', subProduct: 'cable-hdmi', quantity: 25, unitPrice: 8,   discountPercent: 0,  discountReason: '',            lineTotal: 200 }
    ]);

    // Which sub-products belong to which category — the source for the dependent dropdown
    private readonly subProductsByCategory: Record<string, DropdownOption[]> = {
      hardware: [
        { value: 'dock-usbc', label: 'USB-C Dock' },
        { value: 'cable-hdmi', label: 'HDMI Cable' },
        { value: 'kbd-mech', label: 'Mechanical Keyboard' }
      ],
      software: [
        { value: 'lic-annual', label: 'Annual Licence' },
        { value: 'lic-perpetual', label: 'Perpetual Licence' },
        { value: 'support-gold', label: 'Gold Support' }
      ]
    };

    /**
     * Plain fields rather than getters: the grid diffs these inputs on every change
     * detection pass, so they need a stable identity.
     *
     * subProduct carries every option here so a saved row can still resolve its label.
     * While a row is open the handler below narrows it to the chosen category.
     */
    readonly orderLineDropdownOptions: Record<string, DropdownOption[]> = {
      category: [
        { value: 'hardware', label: 'Hardware' },
        { value: 'software', label: 'Software' }
      ],
      subProduct: [
        { value: 'dock-usbc', label: 'USB-C Dock' },
        { value: 'cable-hdmi', label: 'HDMI Cable' },
        { value: 'kbd-mech', label: 'Mechanical Keyboard' },
        { value: 'lic-annual', label: 'Annual Licence' },
        { value: 'lic-perpetual', label: 'Perpetual Licence' },
        { value: 'support-gold', label: 'Gold Support' }
      ]
    };

    readonly orderLineValidations: Record<string, GridColumnValidation> = {
      product:    { required: true, minLength: 3, maxLength: 40 },
      category:   { required: true },
      subProduct: { required: true, messages: { required: 'Pick a sub-product for this category' } },
      quantity:   { required: true, min: 1, max: 999 },
      unitPrice:  { required: true, min: 0.01, messages: { min: 'Unit price must be above zero' } },
      discountPercent: { min: 0, max: 50, messages: { max: 'Discounts stop at 50%' } },
      // Reachable only while a discount is entered — the visibility resolver hides this
      // cell otherwise, and a hidden cell never blocks the save.
      discountReason: { required: true, minLength: 5 }
    };

    readonly orderLineComputedColumns = {
      lineTotal: (row: any) => {
        const gross = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
        const discount = Math.min(Math.max(Number(row.discountPercent) || 0, 0), 100);
        return Math.round(gross * (1 - discount / 100) * 100) / 100;
      }
    };

    readonly orderLineCellVisibility = {
      discountReason: (row: any) => (Number(row.discountPercent) || 0) > 0
    };

    readonly orderLineCellChangeHandlers = {
      category: (value: any, _row: any, utils: GridCellChangeUtils) => {
        utils.updateOptions('subProduct', this.subProductsByCategory[value] ?? []);
        // The previous pick belongs to the category that was just replaced
        utils.setValue('subProduct', null);
        utils.setMeta('categoryLabel', value === 'software' ? 'Software' : 'Hardware');
      },
      discountPercent: (value: any, _row: any, utils: GridCellChangeUtils) => {
        // Reason cell is about to disappear, so it must not keep a stale value
        if (!Number(value)) {
          utils.setValue('discountReason', '');
        }
      }
    };

    onOrderLinesChanged(rows: any[]): void {
      this.orderLines.set(rows);
      this.toastr.success('Order line saved', 'Order Lines');
    }

    onOrderLineDelete(payload: string): void {
      const row = JSON.parse(payload);
      this.orderLines.update(lines => lines.filter(line => line.id !== row.id));
      this.toastr.info(`Removed ${row.product}`, 'Order Lines');
    }

    // ==================== DATA ENTRY GRID (STARTS EMPTY) ====================
    // Row-at-a-time entry: the grid opens with nothing in it, "Add Row" appends a blank
    // line that autoEditOnAdd opens for editing, and the row cannot be committed until
    // it validates. Saving leaves it as a normal row and the next Add starts a new one.
    entryGridPanel: WritableSignal<boolean> = signal(true);

    entryRows = signal<any[]>([]);
    private nextEntryId = 1;

    readonly entryDropdownOptions: Record<string, DropdownOption[]> = {
      unit: [
        { value: 'pcs', label: 'Pieces' },
        { value: 'box', label: 'Box' },
        { value: 'kg', label: 'Kilogram' },
        { value: 'hr', label: 'Hour' }
      ]
    };

    readonly entryValidations: Record<string, GridColumnValidation> = {
      itemName: { required: true, minLength: 3, maxLength: 50 },
      unit:     { required: true, messages: { required: 'Choose a unit' } },
      quantity: { required: true, min: 1, max: 9999 },
      rate:     { required: true, min: 0.01, messages: { min: 'Rate must be above zero' } }
    };

    readonly entryComputedColumns = {
      amount: (row: any) =>
        Math.round((Number(row.quantity) || 0) * (Number(row.rate) || 0) * 100) / 100
    };

    /** Appends a blank line. autoEditOnAdd opens it in the editor on the next pass. */
    addEntryRow(): void {
      this.entryRows.update(rows => [
        ...rows,
        {
          id: this.nextEntryId++,
          itemName: '',
          unit: '',
          quantity: null,
          rate: null,
          amount: 0
        }
      ]);
    }

    onEntryRowsChanged(rows: any[]): void {
      this.entryRows.set(rows);
    }

    onEntryRowDelete(payload: string): void {
      const row = JSON.parse(payload);
      this.entryRows.update(rows => rows.filter(line => line.id !== row.id));
      this.toastr.info('Line removed', 'Data Entry');
    }

    /** Running total of every committed line, formatted for display. */
    entryTotalDisplay(): string {
      return this.entryRows()
        .reduce((total, row) => total + (Number(row.amount) || 0), 0)
        .toFixed(2);
    }

    // ==================== ENHANCED DATA GRID SHOWCASE ====================
    // Signal for enhanced showcase grid expansion state
    enhancedGridShowcase: WritableSignal<boolean> = signal(true);

    // Toggle for showing custom action buttons
    showCustomActionButtons: WritableSignal<boolean> = signal(true);

    // SVG icons for custom action buttons
    approveSvgIcon = `<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor" />`;
    downloadSvgIcon = `<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" />`;

    // Enhanced action visibility with more granular control
    enhancedActionVisibility = (row: any) => {
      return {
        delete: row.riskLevel !== 'high' || row.status === 'pending', // prevent delete on high-risk unless pending
        edit: row.status !== 'completed' && row.status !== 'failed',
        view: true,
        print: true,
        progress: row.riskLevel === 'high' && row.priority === 'high'
      };
    };

    // Enhanced dropdown options with all possible statuses, priorities, and risk levels
    enhancedDropdownOptions = () => signal<Record<string, DropdownOption[]>>({
      status: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      priority: [
        { value: 'low', label: 'Low Priority' },
        { value: 'normal', label: 'Normal Priority' },
        { value: 'high', label: 'High Priority' },
        { value: 'critical', label: 'Critical Priority' }
      ],
      riskLevel: [
        { value: 'low', label: 'Low Risk' },
        { value: 'medium', label: 'Medium Risk' },
        { value: 'high', label: 'High Risk' }
      ]
    })();

    // Custom render functions for enhanced showcase
    enhancedCellRenderers = () => ({
      // Amount column: formatted currency with conditional styling
      amount: (cellValue: any, rowData: any) => {
        const amount = parseFloat(cellValue) || 0;
        const currency = rowData.currency || 'USD';
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        return formatter.format(amount);
      },

      // Status column: colored badge with HTML
      status: (cellValue: any) => {
        const statusColors: Record<string, string> = {
          'completed': '#10b981',
          'failed': '#ef4444',
          'pending': '#f59e0b',
          'processing': '#3b82f6',
          'cancelled': '#6b7280'
        };
        const color = statusColors[cellValue] || '#6b7280';
        return `<span style="display: inline-block; background-color: ${color}; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">${cellValue?.toUpperCase()}</span>`;
      },

      // Priority column: icon + text
      priority: (cellValue: any) => {
        const icons: Record<string, string> = {
          'high': '⚠️',
          'normal': '➖',
          'low': '✓',
          'critical': '🔴'
        };
        const icon = icons[cellValue] || '➖';
        return `<span style="font-size: 14px; margin-right: 4px;">${icon}</span>${cellValue?.toUpperCase()}`;
      },

      // Risk level column: color-coded badges
      riskLevel: (cellValue: any) => {
        const riskColors: Record<string, { bg: string; text: string }> = {
          'high': { bg: '#fee2e2', text: '#991b1b' },
          'medium': { bg: '#fef3c7', text: '#92400e' },
          'low': { bg: '#dcfce7', text: '#15803d' }
        };
        const colors = riskColors[cellValue] || { bg: '#f3f4f6', text: '#374151' };
        return `<span style="background-color: ${colors.bg}; color: ${colors.text}; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">${cellValue?.toUpperCase()}</span>`;
      },

      // Total amount with formatted currency
      totalAmount: (cellValue: any, rowData: any) => {
        const amount = parseFloat(cellValue) || 0;
        const currency = rowData.currency || 'USD';
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 2
        });
        return `<strong>${formatter.format(amount)}</strong>`;
      },

      // ============= NEW: BUTTON EXAMPLES =============
      // Action buttons example
      actionButtons: (cellValue: any, rowData: any) => {
        const rowDataJson = btoa(JSON.stringify(rowData));
        return `
          <div style="display: flex; gap: 2px;">
            <button class="grid-button" data-action="approve" data-row="${rowDataJson}" style="background-color: #10b981; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              ✓ Approve
            </button>
            <button class="grid-button" data-action="reject" data-row="${rowDataJson}" style="background-color: #ef4444; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              ✕ Reject
            </button>

          </div>
        `;
      },

      // Single action button with dynamic styling
      downloadButton: (cellValue: any, rowData: any) => {
        const canDownload = rowData.status === 'completed' || rowData.status === 'processing';
        const bgColor = canDownload ? '#3b82f6' : '#d1d5db';
        const cursor = canDownload ? 'pointer' : 'not-allowed';
        const opacity = canDownload ? 1 : 0.5;
        return `
          <button style="background-color: ${bgColor}; color: white; padding: 6px 14px; border: none; border-radius: 4px; cursor: ${cursor}; opacity: ${opacity}; font-size: 12px; font-weight: 600;" ${canDownload ? '' : 'disabled'}>
            📥 Download
          </button>
        `;
      },

      // ============= NEW: PROFILE PICTURE EXAMPLES =============
      // Profile picture with initials fallback
      profilePic: (cellValue: any, rowData: any) => {
        const imageUrl = cellValue || rowData.profileImage;
        const name = rowData.name || rowData.fromAccount || 'User';
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

        if (imageUrl && imageUrl.startsWith('http')) {
          // Image URL provided - show image
          return `
            <img src="${imageUrl}" alt="${name}"
                style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb; cursor: pointer;"
                title="${name}" />
          `;
        } else {
          // Fallback to initials avatar
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
          const colorIndex = initials.charCodeAt(0) % colors.length;
          const bgColor = colors[colorIndex];
          return `
            <div style="width: 28px; height: 28px; border-radius: 50%; background-color: ${bgColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 1px solid #e5e7eb;">
              ${initials}
            </div>
          `;
        }
      },

      // Profile with name and role combo
      profileCard: (cellValue: any, rowData: any) => {
        const imageUrl = cellValue || rowData.profileImage;
        const name = rowData.name || rowData.fromAccount || 'Unknown User';
        const role = rowData.department || rowData.assignedRole || 'User';
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

        let profileHtml = '';
        if (imageUrl && imageUrl.startsWith('http')) {
          profileHtml = `<img src="${imageUrl}" alt="${name}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" />`;
        } else {
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
          const colorIndex = initials.charCodeAt(0) % colors.length;
          const bgColor = colors[colorIndex];
          profileHtml = `
            <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${bgColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px;">
              ${initials}
            </div>
          `;
        }

        return `
          <div style="display: flex; align-items: center; gap: 8px;">
            ${profileHtml}
            <div style="display: flex; flex-direction: column;">
              <span style="font-weight: 600; font-size: 12px; color: #1f2937;">${name}</span>
              <span style="font-size: 11px; color: #6b7280;">${role}</span>
            </div>
          </div>
        `;
      },

      // Link renderer - makes any cell clickable
      id: (cellValue: any, rowData: any) => {
        const id = cellValue || 'N/A';
        return `
          <a href="https://chatgpt.com/"
            onclick="alert('Transaction ID: ${id}')"
            style="color: #0ea5e9; text-decoration: none; font-weight: 600; cursor: pointer; border-bottom: 1px dotted #0ea5e9; padding-bottom: 2px;">
            ${id}
          </a>
        `;
      },

      // Generic link renderer
      link: (cellValue: any, rowData: any) => {
        const text = cellValue || 'View';
        const url = rowData.url || 'javascript:void(0)';
        const isExternal = url && url.startsWith('http');
        return `
          <a href="${url}"
            ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}
            style="color: #0ea5e9; text-decoration: none; font-weight: 600; cursor: pointer; border-bottom: 1px dotted #0ea5e9; padding-bottom: 2px;">
            ${text} ${isExternal ? '↗' : ''}
          </a>
        `;
      },

      // Clickable name (with link to profile)
      nameLink: (cellValue: any, rowData: any) => {
        const name = cellValue || rowData.name || 'Unknown';
        const profileId = rowData.id || 'N/A';
        return `
          <a href="javascript:void(0)"
            onclick="alert('View profile for: ${name} (ID: ${profileId})')"
            style="color: #0ea5e9; text-decoration: none; font-weight: 600; cursor: pointer; border-bottom: 1px solid #0ea5e9;">
            ${name}
          </a>
        `;
      },

      // ============= BUTTON IN COLUMN - Status Action Button =============
      // Single button per status (Edit button for pending status)
      statusAction: (cellValue: any, rowData: any) => {
        const status = cellValue || 'Unknown';
        const rowDataJson = btoa(JSON.stringify(rowData));

        if (status === 'pending') {
          return `
            <button class="grid-button" data-action="edit" data-row="${rowDataJson}"
                    style="background-color: #f59e0b; color: white; padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              ✎ Edit
            </button>
          `;
        } else if (status === 'completed') {
          return `
            <button class="grid-button" data-action="view" data-row="${rowDataJson}"
                    style="background-color: #10b981; color: white; padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              ✓ View
            </button>
          `;
        } else if (status === 'failed') {
          return `
            <button class="grid-button" data-action="retry" data-row="${rowDataJson}"
                    style="background-color: #ef4444; color: white; padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              ↻ Retry
            </button>
          `;
        }
        return `<span style="color: #6b7280;">${status}</span>`;
      },

      // ============= BUTTON IN COLUMN - Priority Action Button =============
      // Priority based action buttons
      priorityAction: (cellValue: any, rowData: any) => {
        const priority = cellValue || 'normal';
        const rowDataJson = btoa(JSON.stringify(rowData));

        if (priority === 'critical' || priority === 'high') {
          return `
            <button class="grid-button" data-action="escalate" data-row="${rowDataJson}"
                    style="background-color: #dc2626; color: white; padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              ⬆ Escalate
            </button>
          `;
        } else if (priority === 'low') {
          return `
            <button class="grid-button" data-action="archive" data-row="${rowDataJson}"
                    style="background-color: #6b7280; color: white; padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
              📦 Archive
            </button>
          `;
        }
        return `<span style="color: #6b7280;">${priority}</span>`;
      },

      // ============= BUTTON IN COLUMN - Multiple Buttons Row =============
      // Quick action buttons (View + Edit + Delete inline)
      quickActions: (cellValue: any, rowData: any) => {
        const rowDataJson = btoa(JSON.stringify(rowData));
        return `
          <div style="display: flex; gap: 6px;">
            <button  class="grid-button" data-action="quick-view" data-row="${rowDataJson}"
                    title="View"
                    style="background-color: #3b82f6; color: white; width: 32px; height: 32px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">
              👁
            </button>
            <button class="grid-button" data-action="quick-edit" data-row="${rowDataJson}"
                    title="Edit"
                    style="background-color: #f59e0b; color: white; width: 32px; height: 32px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">
              ✎
            </button>
            <button class="grid-button" data-action="quick-delete" data-row="${rowDataJson}"
                    title="Delete"
                    style="background-color: #ef4444; color: white; width: 32px; height: 32px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">
              🗑
            </button>
          </div>
        `;
      }
    });

    // Cell style resolvers for conditional cell styling
    enhancedCellStyleResolvers = () => ({
      amount: [
        {
          // Green text for amounts > 50K
          condition: (cellValue: any) => parseFloat(cellValue) > 50000,
          styles: { color: '#059669', fontWeight: 'bold', fontSize: '16px' }
        },
        {
          // Bold for amounts > 100K
          condition: (cellValue: any) => parseFloat(cellValue) > 100000,
          cssClasses: ['font-bold', 'text-lg'],
          styles: { color: '#dc2626', fontWeight: 'bold', fontSize: '16px' }
        }
      ],
      status: [
        {
          condition: (cellValue: any) => cellValue === 'completed',
          styles: { fontWeight: 'bold', color: '#059669' }
        },
        {
          condition: (cellValue: any) => cellValue === 'failed',
          styles: { fontWeight: 'bold', color: '#dc2626' }
        }
      ],
      priority: [
        {
          condition: (cellValue: any) => cellValue === 'high' || cellValue === 'critical',
          cssClasses: ['font-bold'],
          styles: { color: '#dc2626', fontWeight: 'bold' }
        }
      ],
      riskLevel: [
        {
          condition: (cellValue: any) => cellValue === 'high',
          styles: { backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 'bold' }
        },
        {
          condition: (cellValue: any) => cellValue === 'medium',
          styles: { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 'bold' }
        },
        {
          condition: (cellValue: any) => cellValue === 'low',
          styles: { backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 'normal' }
        }
      ]
    });

    // Row style resolvers for conditional row styling
    enhancedRowStyleResolvers = () => {
      const resolvers: any[] = [
        {
          // Highlight high-risk AND high-amount transactions with light red background
          condition: (rowData: any) =>
            rowData.riskLevel === 'high' && parseFloat(rowData.totalAmount) > 100000,
          cssClasses: [],
          styles: {
            backgroundColor: '#fef2f2',
            borderLeft: '4px solid #dc2626',
            fontWeight: 'bold'
          }
        },
        {
          // Highlight pending transactions with light blue background
          condition: (rowData: any) => rowData.status === 'pending',
          cssClasses: [],
          styles: {
            backgroundColor: '#eff6ff',
            borderLeft: 'none',
            fontWeight: 'normal'
          }
        },
        {
          // Highlight failed transactions with reduced opacity
          condition: (rowData: any) => rowData.status === 'failed',
          cssClasses: [],
          styles: {
            backgroundColor: '#fecaca',
            opacity: 0.8,
            fontWeight: 'normal'
          }
        }
      ];
      return resolvers;
    };

    // Handler for enhanced pagination changes
    onEnhancedPaginationChange(event: any) {
      console.log('Enhanced grid pagination change:', event);
      // In a real app, this would trigger a backend API call with:
      // - pageIndex, pageSize (from event)
      // - Current filters, sort, search terms
      this.toastr.info(`Pagination: Page ${event.pageIndex + 1}, Size ${event.pageSize}`, 'Pagination Changed');
    }

    // Handler for enhanced data grid state changes (backend pagination)
    onEnhancedStateChange(state: DataGridStateChange) {
      console.log('Enhanced grid state changed:', state);
      const params = {
        pageIndex: state.pageIndex,
        pageSize: state.pageSize,
        sortColumn: state.sortColumn,
        sortDirection: state.sortDirection,
        search: state.searchTerm
      };
      console.log('Requesting data with params:', params);

    }

    // Initialize subCategory options based on productCategory
    private initializeSubCategoryOptions(productCategory: string): void {
      const filteredSubs = this.subCategoryOptions.filter(sub => sub.parentCategory === productCategory);
      this.transactionDropdownOptions.update(options => ({
        ...options,
        subCategory: filteredSubs.map(sub => ({ value: sub.key, label: sub.value }))
      }));
      console.log(`Initialized subCategory options for ${productCategory}:`, filteredSubs);
    }

    // Handler for cell value changes (e.g., dropdown selection in grid)
    onCellValueChanged(event: any): void {
      console.log('Cell value changed:', event);
      const { rowData, columnProperty, oldValue, newValue } = event;

      // Example 1: If "productCategory" dropdown changed, load/update "subCategory" options
      if (columnProperty === 'productCategory') {
        console.log(`Product Category changed from ${oldValue} to ${newValue}`);
        console.log('Available subCategoryOptions:', this.subCategoryOptions);

        // Filter subcategories based on selected product category
        const filteredSubs = this.subCategoryOptions.filter(sub => {
          const match = sub.parentCategory === newValue;
          console.log(`Checking: ${sub.value} (parentCategory: ${sub.parentCategory}) === ${newValue}? ${match}`);
          return match;
        });

        console.log(`Found ${filteredSubs.length} subcategories for ${newValue}:`, filteredSubs);

        if (filteredSubs.length === 0) {
          this.toastr.warning(`No subcategories found for ${newValue}`, 'Warning');
          return;
        }

        // Create new array to force Angular to detect change
        const newSubCategoryOptions = filteredSubs.map(sub => ({ value: sub.key, label: sub.value }));
        console.log('New subCategory options:', newSubCategoryOptions);

        // Update the subCategory dropdown options for the grid dynamically
        // Create completely new object reference
        const currentOptions = this.transactionDropdownOptions();
        const updatedOptions: Record<string, DropdownOption[]> = {};

        // Copy all existing options
        Object.keys(currentOptions).forEach(key => {
          if (key === 'subCategory') {
            updatedOptions[key] = newSubCategoryOptions;
          } else {
            updatedOptions[key] = [...currentOptions[key]];
          }
        });

        console.log('Before update - transactionDropdownOptions:', this.transactionDropdownOptions());

        // Update signal with new object reference
        this.transactionDropdownOptions.set(updatedOptions);

        console.log('After update - transactionDropdownOptions:', this.transactionDropdownOptions());
        console.log('Updated subCategory in signal:', this.transactionDropdownOptions()['subCategory']);

        // Manually trigger change detection
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        // Auto-select first subcategory if current value is invalid for new category
        if (rowData && filteredSubs.length > 0) {
          const currentSubCategoryValid = filteredSubs.some(sub => sub.key === rowData.subCategory);

          if (!currentSubCategoryValid) {
            // Current subcategory is not valid for this category, auto-select first one
            rowData.subCategory = filteredSubs[0].key;
            console.log(`Auto-selected subcategory: ${filteredSubs[0].key} for row:`, rowData.id);
            this.toastr.info(`Auto-selected ${filteredSubs[0].value} as subcategory`, 'Auto-Selected');
          } else {
            console.log(`Current subcategory ${rowData.subCategory} is valid, keeping it`);
          }
        }

        this.toastr.info(`Sub-categories updated for ${newValue}. Found ${filteredSubs.length} categories.`, 'Cascading Update');
      }

      // Example 2: If "status" dropdown changed, update department or other dependent fields
      if (columnProperty === 'status') {
        console.log(`Status changed from ${oldValue} to ${newValue}`);

        // Create new department options based on status
        let newDepartmentOptions: DropdownOption[] = [];

        if (newValue === 'pending') {
          // For pending status, only show specific departments
          newDepartmentOptions = [
            { value: 'sales', label: 'Sales Department' },
            { value: 'operations', label: 'Operations' }
          ];
        } else if (newValue === 'completed') {
          // For completed status, show all departments
          newDepartmentOptions = [
            { value: 'sales', label: 'Sales Department' },
            { value: 'finance', label: 'Finance Department' },
            { value: 'operations', label: 'Operations' },
            { value: 'treasury', label: 'Treasury' },
            { value: 'compliance', label: 'Compliance' },
            { value: 'risk', label: 'Risk Management' }
          ];
        }

        // Create completely new object reference
        const currentOptions = this.transactionDropdownOptions();
        const updatedOptions: Record<string, DropdownOption[]> = {};

        Object.keys(currentOptions).forEach(key => {
          if (key === 'department') {
            updatedOptions[key] = newDepartmentOptions;
          } else {
            updatedOptions[key] = [...currentOptions[key]];
          }
        });

        // Update signal with new object reference
        this.transactionDropdownOptions.set(updatedOptions);

        // Manually trigger change detection
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        this.toastr.info(`Department options updated based on ${newValue} status`, 'Cascading Update');
      }

      // Example 3: If "currency" dropdown changed, update country options
      if (columnProperty === 'currency') {
        console.log(`Currency changed from ${oldValue} to ${newValue}`);

        // Map currencies to countries
        const currencyCountryMap: Record<string, string[]> = {
          'USD': ['US'],
          'EUR': ['EU', 'UK'],
          'GBP': ['UK'],
          'JPY': ['JP'],
          'CAD': ['CA'],
          'AUD': ['AU']
        };

        const validCountries = currencyCountryMap[newValue] || [];

        // Filter country options based on selected currency
        const filteredCountries = this.transactionDropdownOptions()['country']?.filter((c: any) =>
          validCountries.includes(c.value)
        ) || [];

        // Create completely new object reference
        const currentOptions = this.transactionDropdownOptions();
        const updatedOptions: Record<string, DropdownOption[]> = {};

        Object.keys(currentOptions).forEach(key => {
          if (key === 'country') {
            updatedOptions[key] = [...filteredCountries];
          } else {
            updatedOptions[key] = [...currentOptions[key]];
          }
        });

        // Update signal with new object reference
        this.transactionDropdownOptions.set(updatedOptions);

        // Manually trigger change detection
        this.cdr.markForCheck();
        this.cdr.detectChanges();

        console.log(`Updated country options for ${newValue} currency`);
        this.toastr.info(`Countries filtered for ${newValue}`, 'Cascading Update');
      }

      // Add your custom logic here for handling other dropdown changes
    }

    // Handler for Approve Transaction custom action
    onApproveTransaction(serializedData: string): void {
      try {
        const transaction = JSON.parse(serializedData);
        console.log('Approve transaction:', transaction);

        // Update transaction status
        const transactions = this.sampleTransactions();
        const updated = transactions.map(t => {
          if (t.id === transaction.id) {
            return { ...t, status: 'completed', requiresApproval: false };
          }
          return t;
        });

        this.sampleTransactions.set(updated);
        this.toastr.success(`Transaction ${transaction.id} approved!`, 'Approved', { timeOut: 3000 });
      } catch (error) {
        this.toastr.error('Error approving transaction', 'Error');
      }
    }

    // Handler for Download Transaction custom action
    onDownloadTransaction(serializedData: string): void {
      try {
        const transaction = JSON.parse(serializedData);
        console.log('Download transaction report:', transaction);

        // Create a simple CSV export
        const csv = `
          Transaction Report
          ==================
          ID: ${transaction.id}
          Amount: ${transaction.currency} ${transaction.amount}
          Status: ${transaction.status}
          Priority: ${transaction.priority}
          Risk Level: ${transaction.riskLevel}
          Date: ${new Date().toISOString()}
                `;

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transaction-${transaction.id}.txt`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.toastr.success(`Downloaded report for ${transaction.id}`, 'Downloaded', { timeOut: 3000 });
      } catch (error) {
        this.toastr.error('Error downloading transaction', 'Error');
      }
    }

    // Handler for toggling custom action buttons visibility
    onToggleActionButtons(event: Event): void {
      const target = event.target as HTMLInputElement;
      this.showCustomActionButtons.set(target.checked);
    }

    // Handler for onCellButtonClick output event from GenericDataGrid
    // This is triggered when buttons rendered in grid cells are clicked
    onGridCellButtonClick(event: any): void {
      console.log('Cell button click event received:', event);
      const { action, rowData, column, timestamp } = event;
      console.log(`Action: ${action}, Column: ${column}, Row ID: ${rowData?.id}`);

      // Route to handleGridButtonClick to process the action
      this.handleGridButtonClick(action, rowData);
    }

    // Attach event listeners to grid buttons
    // attachGridButtonListeners(): void {
    //   const buttons = document.querySelectorAll('.grid-button');
    //   buttons.forEach(button => {
    //     button.addEventListener('click', (e: Event) => {
    //       e.preventDefault();
    //       const btn = e.target as HTMLElement;
    //       const action = btn.getAttribute('data-action');
    //       const rowDataEncoded = btn.getAttribute('data-row');

    //       if (action && rowDataEncoded) {
    //         try {
    //           const rowData = JSON.parse(atob(rowDataEncoded));
    //           this.handleGridButtonClick(action, rowData);
    //         } catch (error) {
    //           console.error('Error parsing row data:', error);
    //         }
    //       }
    //     });
    //   });
    // }

    // Handle grid button clicks
    handleGridButtonClick(action: string, rowData: any): void {
      const id = rowData.id || 'Unknown';
      const status = rowData.status || 'Unknown';
      const priority = rowData.priority || 'normal';

      switch (action) {
        // Approve/Reject/Review actions
        case 'approve':
          this.toastr.success(`Approved transaction: ${id}`, 'Success');
          break;
        case 'reject':
          this.toastr.error(`Rejected transaction: ${id}`, 'Rejected');
          break;
        case 'review':
          this.toastr.info(`Reviewing transaction: ${id}`, 'Review');
          break;

        // Status actions
        case 'edit':
          this.toastr.info(`Editing transaction: ${id}`, 'Edit Mode');
          break;
        case 'view':
          this.toastr.info(`Viewing completed transaction: ${id}`, 'View');
          break;
        case 'retry':
          this.toastr.warning(`Retrying failed transaction: ${id}`, 'Retry');
          break;

        // Priority actions
        case 'escalate':
          this.toastr.error(`Escalated transaction: ${id} (${priority})`, 'Escalated');
          break;
        case 'archive':
          this.toastr.success(`Archived transaction: ${id}`, 'Archived');
          break;

        // Quick actions
        case 'quick-view':
          this.dd();
          // this.toastr.info(`Quick view: ${id}`, 'View');
          break;
        case 'quick-edit':
          this.toastr.info(`Quick edit: ${id}`, 'Edit');
          break;
        case 'quick-delete':
          this.toastr.error(`Delete transaction: ${id}?`, 'Delete');
          break;

        default:
          console.log(`Action: ${action}, Row:`, rowData);
      }
    }

    // private validateTransactionRelationships(transaction: any): void {
    //   // Validate currency-country relationship
    //   const currency = this.currencyOptions.find(c => c.key === transaction.currency);
    //   // if (currency && currency.country !== transaction.country) {
    //   //   this.toastr.warning(`Currency-Country mismatch in ${transaction.id}`, 'Validation Warning');
    //   // }

    //   // Validate category-subcategory relationship
    //   const subCategory = this.subCategoryOptions.find(s => s.key === transaction.subCategory);
    //   if (subCategory && subCategory.parentCategory !== transaction.productCategory) {
    //     this.toastr.error(`Invalid subcategory for ${transaction.id}`, 'Validation Error');
    //   }

    //   // Validate minimum amount for subcategory
    //   if (subCategory && transaction.amount < subCategory.minAmount) {
    //     this.toastr.error(`Amount below minimum for ${transaction.subCategory} in ${transaction.id}`, 'Amount Error');
    //   }
    // }

    // Method to get filtered options for template
    getFilteredSubCategories(): any[] {
      return this.filteredSubCategories();
    }

    onDateSelected($event:Date): void {
      this.frmGroup.patchValue({  $event });
      this.toastr.info(`Selected date: ${$event}`, 'Date Selected');
    }

    // Method to check if approval is required
    isApprovalRequired(): boolean {
      return this.frmGroup.get('requiresApproval')?.value || false;
    }

    // Method to get current tax rate
    getCurrentTaxRate(): number {
      return this.calculatedTaxRate();
    }

    // Method to get risk level styling
    getRiskLevelClass(): string {
      const riskLevel = this.frmGroup.get('riskLevel')?.value;
      switch (riskLevel) {
        case 'high': return 'text-red-600 bg-red-50';
        case 'medium': return 'text-yellow-600 bg-yellow-50';
        case 'low': return 'text-green-600 bg-green-50';
        default: return 'text-gray-600 bg-gray-50';
      }
    }

    // Export current form as transaction
    addTestRow(): void {
      const id = `TXN${Math.floor(Math.random() * 1000000)}`;
      const newRow: any = {
        id: id,
        name: `New User ${id.slice(-4)}`,
        amount: Math.floor(Math.random() * 100000),
        currency: 'USD',
        status: 'pending',
        priority: 'normal',
        riskLevel: 'low',
        date: new Date().toISOString().split('T')[0],
        fromAccount: 'TEST-ACC',
        toAccount: 'DEST-ACC',
        department: 'Operations',
        category: 'Test',
        transactionType: 'PACS.008',
        country: 'US',
        productCategory: 'Test',
        subCategory: 'Test',
        assignedRole: 'viewer'
      };

      const current = this.sampleTransactions();
      this.sampleTransactions.set([newRow, ...current]);
      this.toastr.success(`Added new row ${id}. It should be in edit mode!`, 'Success');
    }

    addCurrentFormToGrid(): void {
      const formValue = this.frmGroup.value;

      if (this.frmGroup.valid) {
        const newTransaction = {
          id: `TXN${Date.now().toString().slice(-6)}`,
          transactionType: 'PACS.008',
          amount: formValue.amount,
          currency: formValue.currency,
          country: formValue.country,
          productCategory: formValue.productCategory,
          subCategory: formValue.subCategory,
          status: 'pending',
          fromAccount: formValue.textBox || 'AUTO',
          toAccount: formValue.id || 'AUTO',
          date: formValue.date || new Date().toISOString().split('T')[0],
          priority: this.isHighValueTransaction() ? 'high' : 'normal',
          department: 'user_input',
          category: 'form_generated',
          taxRate: formValue.taxRate,
          calculatedTax: formValue.calculatedTax,
          totalAmount: formValue.totalAmount,
          riskLevel: formValue.riskLevel,
          isSelected: formValue.isSelected,
          requiresApproval: formValue.requiresApproval,
          name: `User ${Math.floor(Math.random() * 1000)}`,
          profileImage: null,
          availableRoles: [
            { value: 'admin', label: 'Administrator' },
            { value: 'approver', label: 'Transaction Approver' },
            { value: 'viewer', label: 'View Only' }
          ],
          assignedRole: formValue.requiresApproval ? 'approver' : 'viewer'
        };

        // Add to grid data
        const currentTransactions = this.sampleTransactions();
        this.sampleTransactions.set([...currentTransactions, newTransaction]);

        // Reset form
        this.resetFormWithDefaults();

        this.toastr.success(`Transaction ${newTransaction.id} added to grid`, 'Transaction Added');
      } else {
        this.toastr.error('Please fix form errors before adding to grid', 'Validation Error');
      }
    }

    // Reset form but keep some relatable field values
    private resetFormWithDefaults(): void {
      const currentCurrency = this.frmGroup.get('currency')?.value;
      const currentCountry = this.frmGroup.get('country')?.value;

      this.frmGroup.reset();

      // Restore some values to maintain context
      this.frmGroup.patchValue({
        currency: currentCurrency,
        country: currentCountry,
        switch: true,
        taxRate: 0,
        calculatedTax: 0,
        totalAmount: 0
      });
    }

    // Bulk update related fields in grid
    bulkUpdateGridByCategory(): void {
      const selectedCategory = this.frmGroup.get('productCategory')?.value;
      if (!selectedCategory) {
        this.toastr.warning('Please select a product category first', 'Bulk Update');
        return;
      }

      const currentTransactions = this.sampleTransactions();
      const updatedTransactions = currentTransactions.map(transaction => {
        if (transaction.productCategory === selectedCategory) {
          const category = this.productCategoryOptions.find(c => c.key === selectedCategory);
          if (category) {
            // Recalculate tax for matching category
            const newTaxRate = transaction.currency === 'USD' ? 0.05 * category.taxMultiplier :
                            transaction.currency === 'EUR' ? 0.08 * category.taxMultiplier :
                            0.06 * category.taxMultiplier;
            const newTax = transaction.amount * newTaxRate;

            return {
              ...transaction,
              taxRate: newTaxRate,
              calculatedTax: newTax,
              totalAmount: transaction.amount + newTax,
              requiresApproval: category.requiresApproval
            };
          }
        }
        return transaction;
      });

      this.sampleTransactions.set(updatedTransactions);
      this.toastr.success(`Updated all transactions in category: ${selectedCategory}`, 'Bulk Update Complete');
    }

    // Advanced filtering for grid
    filterGridByCriteria(): void {
      const criteria = {
        currency: this.frmGroup.get('currency')?.value,
        country: this.frmGroup.get('country')?.value,
        productCategory: this.frmGroup.get('productCategory')?.value,
        minAmount: this.frmGroup.get('amount')?.value || 0,
        riskLevel: this.frmGroup.get('riskLevel')?.value
      };

      // This would typically be handled by the grid component's filtering mechanism
      // For now, we'll update a filtered signal that the grid can use
      const allTransactions = this.sampleTransactions();
      const filtered = allTransactions.filter(transaction => {
        let matches = true;

        if (criteria.currency && transaction.currency !== criteria.currency) matches = false;
        if (criteria.country && transaction.country !== criteria.country) matches = false;
        if (criteria.productCategory && transaction.productCategory !== criteria.productCategory) matches = false;
        if (criteria.minAmount && transaction.amount < criteria.minAmount) matches = false;
        if (criteria.riskLevel && transaction.riskLevel !== criteria.riskLevel) matches = false;

        return matches;
      });

      // You would pass this filtered data to your grid component
      console.log('Filtered transactions:', filtered);
      this.toastr.info(`Found ${filtered.length} matching transactions`, 'Filter Applied');
    }

    // Get suggested values based on current form state
    getSuggestedValues(): any {
      const currency = this.frmGroup.get('currency')?.value;
      const category = this.frmGroup.get('productCategory')?.value;
      const amount = this.frmGroup.get('amount')?.value || 0;

      const suggestions = {
        suggestedOfficeCode: currency === 'USD' ? 'US01' : currency === 'EUR' ? 'EU01' : 'INTL',
        suggestedTextBox: `${currency}_${category}_${Date.now().toString().slice(-4)}`,
        suggestedDate: new Date().toISOString().split('T')[0],
        suggestedNumber: Math.floor(amount / 1000) || 1
      };

      return suggestions;
    }

    // Auto-populate suggested values
    applySuggestedValues(): void {
      const suggestions = this.getSuggestedValues();

      this.frmGroup.patchValue({
        officeCode: suggestions.suggestedOfficeCode,
        textBox: suggestions.suggestedTextBox,
        date: suggestions.suggestedDate,
        number: suggestions.suggestedNumber
      });

      this.toastr.info('Applied suggested values based on current selections', 'Auto-Complete');
    }

    // Validate all relationships
    validateAllRelationships(): boolean {
      const errors = [];
      const formValue = this.frmGroup.value;

      // Currency-Country relationship
      const currency = this.currencyOptions.find(c => c.key === formValue.currency);
      // if (currency && currency.country !== formValue.country) {
      //   errors.push('Currency and Country do not match');
      // }

      // Category-Subcategory relationship
      const subCategory = this.subCategoryOptions.find(s => s.key === formValue.subCategory);
      if (subCategory && subCategory.parentCategory !== formValue.productCategory) {
        errors.push('Product Category and Subcategory do not match');
      }

      // Amount-Subcategory minimum
      if (subCategory && formValue.amount < subCategory.minAmount) {
        errors.push(`Amount must be at least ${subCategory.minAmount} for selected subcategory`);
      }

      // Display errors
      if (errors.length > 0) {
        errors.forEach(error => this.toastr.error(error, 'Relationship Validation'));
        return false;
      }

      this.toastr.success('All relationships are valid', 'Validation Passed');
      return true;
    }

    // Method to sync form with selected grid row
    syncFormWithGridRow(transaction: any): void {
      this.frmGroup.patchValue({
        textBox: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        country: transaction.country,
        productCategory: transaction.productCategory,
        subCategory: transaction.subCategory,
        date: transaction.date,
        textArea: `Synced with transaction: ${transaction.id}`,
        taxRate: transaction.taxRate,
        calculatedTax: transaction.calculatedTax,
        totalAmount: transaction.totalAmount,
        riskLevel: transaction.riskLevel,
        requiresApproval: transaction.requiresApproval
      });

      this.toastr.info(`Form synced with transaction ${transaction.id}`, 'Form Sync');
    }

    // Enhanced transaction view handler
    onTransactionView(serializedData: string): void {
      const transaction = JSON.parse(serializedData);

      // Sync form with selected transaction
      this.syncFormWithGridRow(transaction);

      // Show detailed information
      const details = `
        Transaction: ${transaction.id}
        Amount: ${transaction.amount} ${transaction.currency}
        Tax: ${transaction.calculatedTax}
        Total: ${transaction.totalAmount}
        Risk Level: ${transaction.riskLevel}
        Requires Approval: ${transaction.requiresApproval ? 'Yes' : 'No'}
      `;

      console.log('Transaction Details:', details);
      this.toastr.info(`Viewing transaction: ${transaction.id}`, 'View Mode');
    }

    // Method to get relationship status
    getRelationshipStatus(): any {
      return {
        // currencyCountryMatch: this.isCurrencyCountryMatch(),
        categorySubcategoryMatch: this.isCategorySubcategoryMatch(),
        amountValid: this.isAmountValidForSubcategory(),
        highValueTransaction: this.isHighValueTransaction(),
        approvalRequired: this.isApprovalRequired(),
        riskLevel: this.frmGroup.get('riskLevel')?.value,
        effectiveTaxRate: this.getCurrentTaxRate()
      };
    }

    // private isCurrencyCountryMatch(): boolean {
    //   const currency = this.frmGroup.get('currency')?.value;
    //   const country = this.frmGroup.get('country')?.value;
    //   const currencyData = this.currencyOptions.find(c => c.key === currency);
    //   return currencyData ? currencyData.country === country : false;
    // }

    private isCategorySubcategoryMatch(): boolean {
      const category = this.frmGroup.get('productCategory')?.value;
      const subCategory = this.frmGroup.get('subCategory')?.value;
      const subCategoryData = this.subCategoryOptions.find(s => s.key === subCategory);
      return subCategoryData ? subCategoryData.parentCategory === category : true;
    }

    private isAmountValidForSubcategory(): boolean {
      const amount = this.frmGroup.get('amount')?.value || 0;
      const subCategory = this.frmGroup.get('subCategory')?.value;
      const subCategoryData = this.subCategoryOptions.find(s => s.key === subCategory);
      return subCategoryData ? amount >= subCategoryData.minAmount : true;
    }

    // Existing methods from your original code...

    dataSelectionConfig = signal<any>({
      pickTableDataSource: [
        { id: 'ITEM001', name: 'Sample Item 1', description: 'First sample item', category: 'Electronics' },
        { id: 'ITEM002', name: 'Sample Item 2', description: 'Second sample item', category: 'Books' },
        { id: 'ITEM003', name: 'Sample Item 3', description: 'Third sample item', category: 'Clothing' },
        { id: 'ITEM004', name: 'Sample Item 4', description: 'Fourth sample item', category: 'Electronics' },
        { id: 'ITEM005', name: 'Sample Item 5', description: 'Fifth sample item', category: 'Sports' },
      ],

      pickTablePair: new Map<string, string>([
        ['id', 'Item ID'],
        ['name', 'Item Name'],
        ['description', 'Description'],
        ['category', 'Category']
      ]),

      apiSearchPlaceholder: 'Search for items...',
      findButtonText: 'Search',
      loadingText: 'Searching...',
      noDataMessage: 'No items found. Use search to find items.',
      loadingMessage: 'Loading items...'
    });

    private mockItemService = {
      getItems: async (params: any) => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const items = [
          { id: 'ITEM001', name: 'Sample Item 1', description: 'First sample item', category: 'Electronics' },
          { id: 'ITEM002', name: 'Sample Item 2', description: 'Second sample item', category: 'Books' },
          { id: 'ITEM003', name: 'Sample Item 3', description: 'Third sample item', category: 'Clothing' },
          { id: 'ITEM004', name: 'Sample Item 4', description: 'Fourth sample item', category: 'Electronics' },
          { id: 'ITEM005', name: 'Sample Item 5', description: 'Fifth sample item', category: 'Sports' },
        ];

        let filteredItems = items;
        if (params?.search) {
          const searchTerm = params.search.toLowerCase();
          filteredItems = items.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
          );
        }

        return {
          data: filteredItems,
          totalRecords: filteredItems.length
        };
      }
    };

    @ViewChild('step1Template', { static: true }) step1Template!: TemplateRef<any>;
    @ViewChild('step2Template', { static: true }) step2Template!: TemplateRef<any>;
    @ViewChild('step3Template', { static: true }) step3Template!: TemplateRef<any>;

    gridData = [
      { id: '1', name: 'Item 1', value: 'Value 1' },
      { id: '2', name: 'Item 2', value: 'Value 2' },
      { id: '3', name: 'Item 3', value: 'Value 3' },
    ];

    showAnyFileUpload: boolean = true;
    pdfFiles: File[] = [];
    imageFiles: File[] = [];
    anyFiles: File[] = [];
    documentFiles: File[] = [];
    profilePicFile?: File;
    uploadFile: File | null = null;


    transactionColumnNames = signal({
      'id': 'Transaction ID',
      'transactionType': 'Type',
      'amount': 'Amount',
      'currency': 'Currency',
      'country': 'Country',
      'productCategory': 'Product Category',
      'subCategory': 'Sub Category',
      'status': 'Status',
      'fromAccount': 'From Account',
      'toAccount': 'To Account',
      'date': 'Date',
      'priority': 'Priority',
      'department': 'Department',
      'category': 'Category',
      'taxRate': 'Tax Rate',
      'calculatedTax': 'Tax Amount',
      'totalAmount': 'Total Amount',
      'riskLevel': 'Risk Level',
      'requiresApproval': 'Requires Approval',
      'assignedRole': 'Assigned Role'
    });

    transactionRowDesigners = signal<TableRowDesigner[]>([
      {
        condition: (item: any) => item.riskLevel === 'high',
        backgroundColor: '#fee2e2',
        textColor: '#991b1b',
        borderColor: '#fca5a5'
      },
      {
        condition: (item: any) => item.riskLevel === 'medium',
        backgroundColor: '#fef3c7',
        textColor: '#92400e',
        borderColor: '#fcd34d'
      },
      {
        condition: (item: any) => item.riskLevel === 'low',
        backgroundColor: '#dcfce7',
        textColor: '#15803d',
        borderColor: '#86efac'
      },
      {
        condition: (item: any) => item.requiresApproval && parseFloat(item.totalAmount || 0) > 100000,
        backgroundColor: '#e0e7ff',
        textColor: '#3730a3',
        borderColor: '#a5b4fc'
      }
    ]);

    transactionDynamicDropdownSources = signal<Record<string, string>>({
      assignedRole: 'availableRoles'
    });

    bicTableHeaders = new Map<string, string>([
      ['swift', 'SWIFT Code'],
      ['branchName', 'Branch Name'],
      ['address', 'Address']
    ]);



  ngAfterViewInit(): void {
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;

      const button = target.closest('.grid-button') as HTMLElement;

      if (button) {
        e.preventDefault();
        e.stopPropagation();

        const action = button.getAttribute('data-action');
        const rowDataEncoded = button.getAttribute('data-row');

        console.log('Grid button clicked:', { action, hasData: !!rowDataEncoded });

        if (action && rowDataEncoded) {
          try {
            const rowData = JSON.parse(atob(rowDataEncoded));
            this.handleGridButtonClick(action, rowData);
          } catch (error) {
            console.error('Error parsing row data:', error);
          }
        }
      }
    });

    setTimeout(() => {
      this.restoreGridSelections();
    }, 100);

    this.loadUsersFromApi();

  }

    handleFileChange(files: File[]): void {
      console.log('Selected files:', files);
    }

    handleGridAction(action: string, rowData: any): void {
      console.log(`Grid action: ${action}`, rowData);
    }

    onStepperSubmit() {
      console.log('Stepper submitted!');
    }

    onPdfSelected(files: File[]): void {
      this.pdfFiles = files || [];
      this.toastr.info(`${this.pdfFiles.length} PDF file(s) selected`, 'Files');
      console.log('Current PDF files:', this.pdfFiles);
    }

    onImagesSelected(files: File[]): void {
      this.imageFiles = files || [];
      this.toastr.info(`${this.imageFiles.length} image file(s) selected`, 'Files');
    }

    onAnyFilesSelected(files: File[]): void {
      this.anyFiles = files || [];
      this.toastr.info(`${this.anyFiles.length} file(s) selected`, 'Files');
    }

    onDocumentsSelected(files: File[]): void {
      this.documentFiles = files || [];
      this.toastr.info(`${this.documentFiles.length} document(s) selected`, 'Files');
    }

    onProfilePicSelected(files: File[]): void {
      this.profilePicFile = files && files.length > 0 ? files[0] : undefined;
      this.toastr.success(this.profilePicFile ? `Selected: ${this.profilePicFile.name}` : 'No file selected', 'Profile Picture');
    }

    onFileInputChanged(context: string): void {
      this.toastr.show(`File input changed: ${context}`, 'Notice');
    }

    onFileSelected(event: Event): void {
      const target = event.target as HTMLInputElement;
      const files = target.files;

      if (files && files.length > 0) {
        this.uploadFile = files[0];
        console.log('File selected:', this.uploadFile.name);
      } else {
        this.uploadFile = null;
      }
    }

    onExcelFileSelected(files: File[]): void {
      if (files && files.length > 0) {
        this.uploadFile = files[0];
        console.log('Excel file selected:', this.uploadFile.name);
      } else {
        this.uploadFile = null;
      }
    }

onUpload(): void {
  const file = this.uploadFile;

  if (!file) {
    this.toastr.warning('No file selected');
    return;
  }

  const ext = file.name.split('.').pop()?.toLowerCase();

  if (!ext || !['xls', 'xlsx'].includes(ext)) {
    this.toastr.warning('File Type .xls, .xlsx only!');
    return;
  }

  // Now you have a valid .xls/.xlsx file
  console.log('Ready to upload:', file);
}
    onTransactionDelete(serializedData: string): void {
      const transaction = JSON.parse(serializedData);
      console.log('Delete transaction:', transaction);
      this.toastr.warning(`Deleting transaction: ${transaction.id}`, 'Delete Confirmation');
    }

    onTransactionPrint(serializedData: string): void {
      const transaction = JSON.parse(serializedData);
      console.log('Print transaction:', transaction);
      this.toastr.success(`Printing transaction: ${transaction.id}`, 'Print');
    }

  // onTransactionRowSelect(event: { data: string, checked: boolean }): void {
  //   const rowData = JSON.parse(event.data);

  //   if (event.checked) {
  //     console.log('Row CHECKED:', rowData);

  //     // Store in localStorage
  //     localStorage.setItem('rowData', JSON.stringify(rowData));

  //     // Update selected IDs signal
  //     this.selectedRowIds.update(ids => {
  //       const newIds = new Set(ids);
  //       newIds.add(rowData.id);
  //       return newIds;
  //     });

  //     this.toastr.success(`Row selected: ${rowData.id}`, 'Selection');

  //   } else {
  //     console.log('Row UNCHECKED:', rowData);

  //     // Remove from localStorage if it's the unchecked row
  //     const storedData = localStorage.getItem('rowData');
  //     if (storedData) {
  //       const stored = JSON.parse(storedData);
  //       if (stored.id === rowData.id) {
  //         localStorage.removeItem('rowData');
  //       }
  //     }

  //     // Update selected IDs signal
  //     this.selectedRowIds.update(ids => {
  //       const newIds = new Set(ids);
  //       newIds.delete(rowData.id);
  //       return newIds;
  //     });

  //     this.toastr.info(`Row deselected: ${rowData.id}`, 'Selection');
  //   }
  // }

  // 6. Enhanced method to check if a specific row should be pre-selected
  isRowPreSelected(rowId: string): boolean {
    return this.selectedRowIds().has(rowId);
  }

  // 7. Method to get initially selected indices for the grid
  getInitiallySelectedIndices(): number[] {
    const selectedIds = this.selectedRowIds();
    const transactions = this.sampleTransactions();
    const indices: number[] = [];

    transactions.forEach((transaction, index) => {
      if (selectedIds.has(transaction.id)) {
        indices.push(index);
      }
    });

    return indices;
  }

  onSwitchToggled(event:any): void {
    alert(`Switch toggled: ${this.frmGroup.get('switch')?.value ? 'ON' : 'OFF'}`);
  }

  onTransactionSelectAll(event: { isSelectAll: boolean, selectedRows: any[], count: number }): void {
    console.log('Select all:', event.isSelectAll);
    console.log('Selected rows:', event.selectedRows);
    console.log('Count:', event.count);

    if (event.isSelectAll) {
      // All rows on current page are selected
      console.log(`Selected ${event.count} transactions`);

      // Calculate totals
      const totalAmount = event.selectedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
      console.log('Total amount:', totalAmount);


    } else {
      console.log('All selections cleared');
    }
  }

  handleCheckboxChange($event:any): void {

  }

  handleColumnSelectAll($event:any): void {
    console.log('Column select all:', $event);
  }





    onDotsClick(): void {
      console.log('Dots clicked - opening data selection modal');
      this.setupModalData();
      this.isDataSelectionModalOpen.set(true);
    }

    private setupModalData(): void {
      // Set up sample data for the modal
      this.modalConfig.pickTableDataSource = [
        { id: 'ACC001', name: 'John Doe', category: 'Individual', amount: 5000 },
        { id: 'ACC002', name: 'ABC Corp', category: 'Corporate', amount: 15000 },
        { id: 'ACC003', name: 'Jane Smith', category: 'Individual', amount: 7500 },
        { id: 'ACC004', name: 'XYZ Ltd', category: 'Corporate', amount: 25000 }
      ];
    }

    onFindClicked(searchTerm: string): void {
      console.log('Searching for:', searchTerm);
      // Filter the data based on search term
      this.modalConfig.pickTableDataSource = this.modalConfig.pickTableDataSource.filter(item =>
        Object.values(item).some(val =>
          val.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    onDataSelectionResult(result: AccountData | null): void {
      if (result) {
        console.log('Selected data:', result);

        this.frmGroup.patchValue({
          id: result.id,
          textBox: result.name
        });
      }
      this.isDataSelectionModalOpen.set(false);
    }

    onBlur(value: string): void {
      console.log('Textbox blurred, value:', value);
      this.frmGroup.get('currency')?.setValue('CAD');
    }

    // Disable buttons (visible but not clickable)
    disableSaveButton(): void {
      // ButtonUtils.disableButtons(['save']);
      this.toastr.warning('Save button disabled (visible but not clickable)', 'Button Control');
    }

    disableViewButton(): void {
      ButtonUtils.disableButtons(['view']);
      this.toastr.warning('View button disabled (visible but not clickable)', 'Button Control');
    }

    disableMultipleButtons(): void {
      ButtonUtils.disableButtons(['save', 'view', 'delete']);
      this.toastr.warning('Save, View, and Delete buttons disabled', 'Button Control');
    }

    // Enable buttons
    enableSaveButton(): void {
      ButtonUtils.enableButtons(['save']);
      this.toastr.success('Save button enabled', 'Button Control');
    }

    enableViewButton(): void {
      ButtonUtils.enableButtons(['view']);
      this.toastr.success('View button enabled', 'Button Control');
    }

    enableAllButtons(): void {
      ButtonUtils.enableButtons(['save', 'view', 'delete', 'reset', 'exit']);
      this.toastr.success('All buttons enabled', 'Button Control');
    }

    // Hide buttons completely
    hideSaveButton(): void {
      ButtonUtils.hideButtons(['save']);
      this.toastr.info('Save button hidden', 'Button Control');
    }

    hideViewButton(): void {
      ButtonUtils.hideButtons(['view']);
      this.toastr.info('View button hidden', 'Button Control');
    }

    // Show buttons
    showSaveButton(): void {
      ButtonUtils.showButtons(['save']);
      this.toastr.info('Save button shown and enabled', 'Button Control');
    }

    showViewButton(): void {
      ButtonUtils.showButtons(['view']);
      this.toastr.info('View button shown and enabled', 'Button Control');
    }

    // Dynamic button control based on form state
    updateButtonsBasedOnForm(): void {
      const isValid = this.frmGroup.valid;
      const isDirty = this.frmGroup.dirty;

      if (!isValid) {
        // Form invalid - disable save, enable view
        ButtonUtils.disableButtons(['save']);
        ButtonUtils.enableButtons(['view']);
        this.toastr.warning('Form invalid - Save disabled, View enabled', 'Form State');
      } else if (!isDirty) {
        // No changes - disable save
        ButtonUtils.disableButtons(['save']);
        this.toastr.info('No changes detected - Save disabled', 'Form State');
      } else {
        // Valid and has changes - enable save
        ButtonUtils.enableButtons(['save']);
        this.toastr.success('Form valid with changes - Save enabled', 'Form State');
      }
    }



    /**
     * Get today's date for minDate
     */
    getTodayDate(): Date {
      return new Date();
    }

    // Generic Table Example - Current Mode
    currentTableMode = signal<string>('Static Data');

    // Generic Table Example - Static Data
    genericTableConfig = signal<DynamicTableConfig>({
      sections: []
    });

    // Sample Account Data
    readonly SAMPLE_ACCOUNT_DATA = {
      "accountInfo": {
        "accountHolderName": "ANAAMIC ACCESSORIES",
        "contactAddress": "119 JAHANARA BHAISAN (2ND FL)",
        "city": "Dhaka",
        "country": "BANGLADESH",
        "accountType": "Customer",
        "telephone": "+880-1234567890",
        "accountStatus": "REGULAR",
        "currency": "BDT",
        "customerCode": "0000000685",
        "customerCategory": "Organization - Private Sector",
        "specialInstruction": "Please verify all transactions before processing"
      },
      "balanceDetails": {
        "availableBalance": 100000.00,
        "currentBalance": 100000.00,
        "principleAmount": 100000.00,
        "amountOnLien": 0.00,
        "maturedAmount": 100642.50,
        "interestPayable": 0.00,
        "blockedAmount": 0.00,
        "totalTermNo": 3,
        "totalTermAmount": 300000,
        "openDate": "2022-09-06T00:00:00Z",
        "maturityDate": "2022-09-08T00:00:00Z",
        "interestPerMonth": 3.00,
        "interestDueLastMonth": 0.00,
        "interestCredit": 0.59,
        "totalBelda": 0.59,
        "renewedPrincipalAmount": 100000,
        "lastRenewalDate": "2022-09-08T12:00:00Z",
        "accountRenewalDate": "2022-09-08T00:00:00Z"
      }
    };

    // Sample Customer Data
    readonly SAMPLE_CUSTOMER_DATA = {
      "personalInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1990-05-15T00:00:00Z",
        "gender": "Male",
        "nationality": "Bangladeshi",
        "maritalStatus": "Married"
      },
      "contactInfo": {
        "email": "john.doe@example.com",
        "phone": "+880-1712345678",
        "alternatePhone": "+880-1812345678",
        "emergencyContact": "+880-1912345678"
      },
      "addressInfo": {
        "presentAddress": "House 25, Road 12, Dhanmondi, Dhaka",
        "permanentAddress": "Village: Chandpur, District: Chittagong",
        "city": "Dhaka",
        "postCode": "1209",
        "country": "Bangladesh"
      },
      "employmentInfo": {
        "occupation": "Software Engineer",
        "employer": "Tech Solutions Ltd",
        "designation": "Senior Developer",
        "monthlyIncome": 80000.00,
        "experience": "8 years"
      }
    };

    // Sample Transaction Data
    readonly SAMPLE_TRANSACTION_DATA = {
      "transactionInfo": {
        "transactionId": "TXN20240115001",
        "transactionDate": "2024-01-15T14:30:00Z",
        "transactionType": "Debit",
        "status": "Completed",
        "channel": "Online Banking",
        "reference": "REF20240115001"
      },
      "amountDetails": {
        "amount": 5000.00,
        "currency": "BDT",
        "exchangeRate": 1.0,
        "charges": 10.00,
        "tax": 5.00,
        "netAmount": 5015.00
      },
      "accountDetails": {
        "fromAccount": "0000000685",
        "toAccount": "0000000786",
        "fromAccountName": "ANAAMIC ACCESSORIES",
        "toAccountName": "ABC COMPANY LTD"
      }
    };

    /**
     * METHOD 1: Zero Configuration - Fully Automatic
     */
    loadWithAutoGeneration(): void {
      console.log(' Loading with AUTO-GENERATION (zero config)...');

      const config = this.autoTable.autoGenerateTable(this.SAMPLE_ACCOUNT_DATA);

      this.genericTableConfig.set(config);
      this.currentTableMode.set('Auto-Generation (Zero Config)');

      console.log('✅ Table generated automatically!', config);
      this.toastr.success('Table generated automatically with zero configuration!', 'Auto-Generation');
    }

    /**
     * METHOD 2: With Minimal Configuration
     */
    loadWithMinimalConfig(): void {
      console.log(' Loading with MINIMAL CONFIG...');

      const config = this.autoTable.autoGenerateTable(this.SAMPLE_ACCOUNT_DATA, {
        // Highlight important fields
        highlightFields: [
          'accountHolderName',
          'availableBalance',
          'currentBalance'
        ],

        // Auto-format currency fields
        currencyFields: [
          'availableBalance',
          'currentBalance',
          'principleAmount',
          'amountOnLien',
          'maturedAmount',
          'interestPayable',
          'blockedAmount',
          'renewedPrincipalAmount'
        ],

        // Auto-format date fields
        dateFields: [
          'openDate',
          'maturityDate',
          'lastRenewalDate',
          'accountRenewalDate'
        ]
      });

      this.genericTableConfig.set(config);
      this.currentTableMode.set('With Formatting (Minimal Config)');

      console.log('Table generated with formatting!', config);
      this.toastr.success('Table generated with formatting!', 'Minimal Config');
    }

    /**
     * METHOD 3: Full Customization
     */
    loadWithFullConfig(): void {
      console.log('✨ Loading with FULL CUSTOMIZATION...');

      const config = this.autoTable.autoGenerateTable(this.SAMPLE_ACCOUNT_DATA, {
      // groupBy:'none',//for single object data
        // Highlight important fields
        highlightFields: [
          'accountHolderName',
          'availableBalance',
          'currentBalance'
        ],

        // Auto-format currency fields
        currencyFields: [
          'availableBalance',
          'currentBalance',
          'principleAmount',
          'amountOnLien',
          'maturedAmount',
          'interestPayable',
          'blockedAmount',
          'totalTermAmount',
          'renewedPrincipalAmount'
        ],

        // Auto-format date fields
        dateFields: [
          'openDate',
          'maturityDate',
          'lastRenewalDate',
          'accountRenewalDate'
        ],

        // Make these fields full width
        fullWidthFields: [
          'accountHolderName',
          'contactAddress',
          'specialInstruction',
          'customerCategory'
        ],

        // Custom section titles
        sectionTitles: {
          'accountInfo': 'Account Information',
          'balanceDetails': 'Balance Details'
        },
        fieldOrder: [
        'accountHolderName',
        'city',
        'contactAddress',
        'customerCode',
        'country',
        'accountType',
        'telephone',
        'accountStatus',
        'currency',
        'customerCategory',
        'specialInstruction'
      ],
      fieldCustomizations: {
        'city': { colspan: 2, highlighted: true,className:'px-3 py-2', style: { color: '#dc2626', fontWeight: 'bold', fontSize: '14px' }}
      },

        // Custom field labels

        fieldLabels: {
          'accountHolderName': 'Account Holder Names',
          'contactAddress': 'Contact Address',
          'accountType': 'Account Type',
          'accountStatus': 'Account Status',
          'customerCode': 'Customer Code',
          'customerCategory': 'Customer Category',
          'specialInstruction': 'Special Instruction',
          'availableBalance': 'Available Balance',
          'currentBalance': 'Current Balance',
          'principleAmount': 'Principle Amount',
          'amountOnLien': 'Amount On Lien',
          'maturedAmount': 'Matured Amount',
          'interestPayable': 'Interest Payable',
          'blockedAmount': 'Blocked Amount',
          'totalTermNo': 'Total Term No.',
          'totalTermAmount': 'Total Term Amount',
          'openDate': 'Open Date',
          'maturityDate': 'Maturity Date',
          'interestPerMonth': 'Interest Per Month',
          'interestDueLastMonth': 'Interest Due Last Month',
          'interestCredit': 'Interest Credit',
          'totalBelda': 'Total Belda',
          'renewedPrincipalAmount': 'Renewed Principal Amount',
          'lastRenewalDate': 'Last Renewal Date',
          'accountRenewalDate': 'Account Renewal Date'
        }
      });

      this.genericTableConfig.set(config);
      this.currentTableMode.set('Full Customization');

      console.log('Table generated with full customization!', config);
      this.toastr.success('Table generated with full customization!', 'Full Config');
    }

    /**
     * Load Customer Data Example
     */
    loadCustomerData(): void {
      const config = this.autoTable.autoGenerateTable(this.SAMPLE_CUSTOMER_DATA, {
        highlightFields: ['firstName', 'lastName', 'email'],
        dateFields: ['dateOfBirth'],
        currencyFields: ['monthlyIncome'],
        sectionTitles: {
          'personalInfo': 'Personal Information',
          'contactInfo': 'Contact Information',
          'addressInfo': 'Address Information',
          'employmentInfo': 'Employment Information'
        }
      });

      this.genericTableConfig.set(config);
      this.currentTableMode.set('Customer Data Example');
      this.toastr.info('Loaded customer data example', 'Customer Data');
    }

    /**
     * Load Transaction Data Example
     */
    loadTransactionData(): void {
      const config = this.autoTable.autoGenerateTable(this.SAMPLE_TRANSACTION_DATA, {
        highlightFields: ['transactionId', 'netAmount'],
        dateFields: ['transactionDate'],
        currencyFields: ['amount', 'charges', 'tax', 'netAmount'],
        fullWidthFields: ['transactionId'],
        sectionTitles: {
          'transactionInfo': 'Transaction Information',
          'amountDetails': 'Amount Details',
          'accountDetails': 'Account Details'
        }
      });

      this.genericTableConfig.set(config);
      this.currentTableMode.set('Transaction Data Example');
      this.toastr.info('Loaded transaction data example', 'Transaction Data');
    }

    /**
     * Load Custom Table with Rowspan and Colspan Examples
     *
     * This demonstrates how to use colspan and rowspan for advanced table layouts:
     *
     * COLSPAN: Use colspan to make a cell span multiple columns
     *   Example: { value: 'Some text', colspan: 3 } spans 3 columns
     *
     * ROWSPAN: Use rowspan to make a cell span multiple rows
     *   Example: { label: 'Category', rowspan: 4 } spans 4 rows
     *   Note: When using rowspan, you must skip cells in subsequent rows
     *
     * COMBINED: You can combine both for complex layouts
     *   Example: { value: 'Header', colspan: 2, rowspan: 2 }
     *
     * IMPORTANT: When using rowspan:
     *   - The first row defines the cell with rowspan
     *   - Subsequent rows must have fewer cells (skip the spanned position)
     *   - Use className: 'align-middle' for vertical alignment
     */
    loadCustomTableWithSpanning(): void {
      const config: DynamicTableConfig = {
        sections: [
          {
            title: 'Account Summary with Colspan',
            rows: [
              {
                cells: [
                  { label: 'Account Holder', width: '25%' },
                  { value: 'ANAAMIC ACCESSORIES', width: '25%', highlighted: true },
                  { label: 'Account Number', width: '25%' },
                  { value: '0000000685', width: '25%', highlighted: true }
                ]
              },
              {
                cells: [
                  { label: 'Address', width: '25%' },
                  { value: '119 JAHANARA BHAISAN (2ND FL), Dhaka, BANGLADESH', colspan: 3, width: '75%' }
                ]
              },
              {
                cells: [
                  { label: 'Account Type', width: '25%' },
                  { value: 'Customer', width: '25%' },
                  { label: 'Status', width: '25%' },
                  { value: 'REGULAR', width: '25%', className: 'text-green-600 font-semibold px-3' }
                ]
              }
            ]
          },
          {
            title: 'Balance Details with Rowspan',
            rows: [
              {
                cells: [
                  { label: 'Balance Information', rowspan: 4, width: '20%', className: 'align-middle' },
                  { label: 'Available Balance', width: '20%' },
                  { value: '100,000.00 BDT', width: '30%', highlighted: true, className: 'text-green-600 font-bold' },
                  { label: 'Currency', width: '15%' },
                  { value: 'BDT', width: '15%' }
                ]
              },
              {
                cells: [
                  { label: 'Current Balance', width: '20%' },
                  { value: '100,000.00 BDT', width: '30%', highlighted: true },
                  { label: 'Blocked Amount', width: '20%' },
                  { value: '0.00 BDT', width: '30%' }
                ]
              },
              {
                cells: [
                  { label: 'Principle Amount', width: '20%' },
                  { value: '100,000.00 BDT', width: '30%' },
                  { label: 'Amount on Lien', width: '20%' },
                  { value: '0.00 BDT', width: '30%' }
                ]
              },
              {
                cells: [
                  { label: 'Matured Amount', width: '20%' },
                  { value: '100,642.50 BDT', width: '30%', className: 'text-blue-600' },
                  { label: 'Interest Payable', width: '20%' },
                  { value: '0.00 BDT', width: '30%' }
                ]
              }
            ]
          },
          {
            title: 'Term Details with Complex Spanning',
            rows: [
              {
                cells: [
                  { label: 'Term Information', rowspan: 3, width: '20%', className: 'align-middle' },
                  { label: 'Total Terms', width: '20%' },
                  { value: '3', width: '15%' },
                  { label: 'Total Term Amount', width: '20%' },
                  { value: '300,000.00 BDT', width: '25%', highlighted: true }
                ]
              },
              {
                cells: [
                  { label: 'Open Date', width: '20%' },
                  { value: '06/09/2022', width: '15%' },
                  { label: 'Maturity Date', width: '20%' },
                  { value: '08/09/2022', width: '25%' }
                ]
              },
              {
                cells: [
                  { label: 'Interest Rate', width: '20%' },
                  { value: '3.00% per month', width: '15%', className: 'text-blue-600 font-semibold' },
                  { label: 'Last Renewal', width: '20%' },
                  { value: '08/09/2022', width: '25%' }
                ]
              },
              {
                cells: [
                  { label: 'Notes', colspan: 5, value: 'This account has been active since September 2022 with consistent transaction history. All terms are properly maintained.', className: 'italic text-gray-600' }
                ]
              }
            ]
          },
          {
            title: 'Contact Information with Mixed Spanning',
            rows: [
              {
                cells: [
                  { label: 'Primary Contact', rowspan: 2, width: '20%', className: 'align-middle' },
                  { label: 'Telephone', width: '20%' },
                  { value: '+880-1234567890', colspan: 3, width: '60%' }
                ]
              },
              {
                cells: [
                  { label: 'Customer Code', width: '20%' },
                  { value: '0000000685', colspan: 3, width: '60%', highlighted: true }
                ]
              },
              {
                cells: [
                  { label: 'Category', width: '20%' },
                  { value: 'Organization - Private Sector', colspan: 4, width: '80%' }
                ]
              },
              {
                cells: [
                  { label: 'Special Instructions', width: '20%' },
                  { value: 'Please verify all transactions before processing', colspan: 4, width: '80%', className: 'bg-yellow-50 italic' }
                ]
              }
            ]
          }
        ],
        loading: false,
        error: null
      };

      this.genericTableConfig.set(config);
      this.currentTableMode.set('Custom Table with Rowspan & Colspan');
      this.toastr.success('Loaded custom table with rowspan and colspan examples!', 'Advanced Customization');
    }


    // Address Search Component Methods
    onAddressSelected(address: AddressDto): void {
      console.log('Address selected in demo:', address);
      // this.toastr.success('Address selected successfully!', 'Address Search');
    }

    onAddressSearchChanged(query: string): void {
      console.log('Address search query changed:', query);
      if (query.length >= 2) {
        // this.toastr.info(`Searching for: ${query}`, 'Address Search');
      }
    }

    // File Preview Component Demo Data
    readonly sampleFiles = signal<FilePreviewData[]>([
      {
        fileName: 'sample-document.pdf',
        mimeType: 'application/pdf',
        url: 'https://cdn.mozilla.net/pdfjs/tracemonkey.pdf'
      },
      {
        fileName: 'sample-image.jpg',
        mimeType: 'image/jpeg',
        url: 'https://picsum.photos/800/600?random=1'
      }
    ]);

    readonly selectedFile = signal<FilePreviewData | null>(null);

    selectSampleFile(file: FilePreviewData) {
      this.selectedFile.set(file);
    }

    onFileDownload(fileData: FilePreviewData) {
      // Handle file download
      console.log('Downloading file:', fileData.fileName);
      // You can implement actual download logic here
    }

    onFileFullscreen(fileData: FilePreviewData) {
      // Handle fullscreen view
      console.log('Opening fullscreen for:', fileData.fileName);
      // You can implement fullscreen modal logic here
    }

    onFileError(error: string) {
      console.error('File preview error:', error);
      this.toastr.error(error, 'Preview Error');
    }

    onFileLoad() {
      console.log('File loaded successfully');
    }

  }






