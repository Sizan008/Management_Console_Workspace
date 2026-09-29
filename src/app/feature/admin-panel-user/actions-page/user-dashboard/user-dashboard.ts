import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, finalize } from 'rxjs';

import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericSwitch } from '../../../../shared/common-components/generic-component-type/generic-switch/generic-switch';
import { InputDate } from '../../../../shared/common-components/input-types/input-date/input-date';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import { AdminPanelUserDashboardService } from '../../services/admin-panel-user-dashboard.service';
import {
  CustomerInfoCard,
  DashboardCustomerTab,
  DashboardGridRow,
  UserDashboardInitialData,
  UserDashboardKpiResponse,
  UserDashboardRow,
  UserDashboardUserInformation,
} from '../../models/user-dashboad.model';
import { UserDashboardSearchCriteria } from '../../models/user-dashboard-search.model';
@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    GenericSwitch,
    InputDate,
    ActionConfirmationHost,
  ],
  templateUrl: './user-dashboard.html',
})
export class UserDashboard implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminPanelUserDashboardService);
  private readonly loader = inject(LoaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly userId = signal('');
  readonly hasSearchResult = signal(false);
  readonly userInformation = signal<UserDashboardUserInformation>({});
  readonly lastSearchCriteria = signal<UserDashboardSearchCriteria | null>(
    null,
  );
  readonly userDashboardPanelOpen = signal(true);
  readonly todayTransactionPanelOpen = signal(true);
  readonly fdrDpsPanelOpen = signal(true);
  readonly requestDetailsPanelOpen = signal(true);
  readonly activityDetailsPanelOpen = signal(true);
  readonly deviceDetailsPanelOpen = signal(true);
  readonly passwordChangePanelOpen = signal(true);
  readonly activeCustomerTab = signal<DashboardCustomerTab>('customer');
  readonly isSuccessfulTransaction = signal(true);
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly filterForm = this.fb.group({
    fromDate: [new Date(), Validators.required],
    toDate: [new Date(), Validators.required],
  });
  readonly todayTransactionStatusForm = this.fb.nonNullable.group({
    isSuccessful: true,
  });
  readonly todayTransactionRows = signal<DashboardGridRow[]>([]);
  readonly fdrDpsOpenRows = signal<DashboardGridRow[]>([]);
  readonly requestDetailRows = signal<DashboardGridRow[]>([]);
  readonly activityDetailRows = signal<DashboardGridRow[]>([]);
  readonly deviceDetailRows = signal<DashboardGridRow[]>([]);
  readonly passwordChangeHistoryRows = signal<DashboardGridRow[]>([]);
  readonly accountColumns = ['branchId', 'accountNumber'];
  readonly accountColumnNames: Record<string, string> = {
    branchId: 'Branch ID',
    accountNumber: 'Account Number',
  };
  readonly addressColumns = [
    'addressType',
    'address1',
    'address2',
    'city',
    'district',
    'division',
    'phone',
    'mobile',
    'email',
  ];
  readonly addressColumnNames: Record<string, string> = {
    addressType: 'Address Type',
    address1: 'Address 1',
    address2: 'Address 2',
    city: 'City',
    district: 'District',
    division: 'Division',
    phone: 'Phone',
    mobile: 'Mobile',
    email: 'Email',
  };
  readonly todayTransactionColumns = [
    'logId',
    'type',
    'userId',
    'date',
    'transactionId',
    'customerId',
    'sourceBranch',
    'sourceAccount',
    'destinationBranch',
    'destinationAccount',
    'receiver',
    'amount',
  ];
  readonly todayTransactionColumnNames: Record<string, string> = {
    logId: 'Log ID',
    type: 'Type',
    userId: 'User ID',
    date: 'Date',
    transactionId: 'Transaction ID',
    customerId: 'Customer ID',
    sourceBranch: 'Source Br.',
    sourceAccount: 'Source A/C',
    destinationBranch: 'Dest. Br.',
    destinationAccount: 'Dest. A/C',
    receiver: 'Receiver',
    amount: 'Amount',
  };
  readonly fdrDpsColumns = [
    'branch',
    'accountNo',
    'title',
    'product',
    'payeeBranch',
    'payeeAccount',
    'date',
  ];
  readonly fdrDpsColumnNames: Record<string, string> = {
    branch: 'Branch',
    accountNo: 'Account No',
    title: 'Title',
    product: 'Product',
    payeeBranch: 'Payee Branch',
    payeeAccount: 'Payee Account',
    date: 'Date',
  };
  readonly requestColumns = [
    'type',
    'branch',
    'accountNo',
    'details',
    'status',
  ];
  readonly requestColumnNames: Record<string, string> = {
    type: 'Type',
    branch: 'Branch',
    accountNo: 'Account No',
    details: 'Details',
    status: 'Status',
  };
  readonly activityColumns = ['date', 'details', 'from', 'ipImei'];
  readonly activityColumnNames: Record<string, string> = {
    date: 'Date',
    details: 'Details',
    from: 'From',
    ipImei: 'IP/IMEI',
  };
  readonly deviceColumns = ['deviceType', 'deviceToken'];
  readonly deviceColumnNames: Record<string, string> = {
    deviceType: 'Device Type',
    deviceToken: 'Device Token',
  };
  readonly passwordChangeColumns = ['date', 'totalChange'];
  readonly passwordChangeColumnNames: Record<string, string> = {
    date: 'Date',
    totalChange: 'Total Change',
  };
  readonly customerInfoCards = computed<CustomerInfoCard[]>(() => {
    const user = this.userInformation();
    const registeredUser = user.regCustUser;
    const customer = user.customerInfo;
    return [
      {
        title: 'Basic Information',
        items: [
          {
            label: 'User ID',
            value: registeredUser?.userId || '-',
          },
          {
            label: 'Home Branch ID',
            value: customer?.homE_BRANCH_ID || '-',
          },
          {
            label: 'Customer ID',
            value: registeredUser?.customerId || '-',
          },
          {
            label: 'No. of User',
            value: registeredUser?.userId ? '1' : '-',
          },
          {
            label: 'User Type',
            value: customer?.customeR_TYPE_NM || '-',
          },
        ],
      },
      {
        title: 'Extended Information',
        items: [
          {
            label: 'User Name',
            value: registeredUser?.userNm || '-',
          },
          {
            label: 'D.O.B',
            value: this.formatCustomerDate(customer?.birtH_DATE),
          },
          {
            label: 'Creation Status',
            value: this.formatCreationStatus(registeredUser?.authStatusId),
          },
          {
            label: 'Auth Type',
            value: this.formatAuthenticationType(
              registeredUser?.authenticationTypeId,
            ),
          },
        ],
      },
      {
        title: 'Contact Information',
        items: [
          {
            label: 'Father Name',
            value: customer?.fatheR_NM || '-',
          },
          {
            label: 'Mother Name',
            value: customer?.motheR_NM || '-',
          },
          {
            label: 'Email',
            value: registeredUser?.emailAddress || '-',
          },
          {
            label: 'Mobile',
            value: registeredUser?.mobileNumber || '-',
          },
          {
            label: 'User Status',
            value: this.formatUserStatus(
              registeredUser?.userStatusActiveFlag,
              registeredUser?.lockedFlag,
            ),
          },
        ],
      },
    ];
  });
  readonly accountRows = computed<DashboardGridRow[]>(() => {
    return (this.userInformation().accounts || [])
      .map((account, index) => ({
        rowId: `account-${index + 1}`,
        branchId: account.branchId || '',
        accountNumber: account.accountNumber || '',
      }))
      .filter((row) => !!row.branchId || !!row.accountNumber);
  });
  readonly addressRows = computed<DashboardGridRow[]>(() => {
    return (this.userInformation().customerFullAddresses || [])
      .map((address, index) => ({
        rowId: `address-${index + 1}`,
        addressType: address.addressType || '',
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        district: address.district || '',
        division: address.division || '',
        phone: address.phone || '',
        mobile: address.mobile || '',
        email: address.email || '',
      }))
      .filter((row) =>
        Object.entries(row).some(
          ([key, value]) =>
            key !== 'rowId' && String(value || '').trim().length > 0,
        ),
      );
  });
  get hasFilterChanges(): boolean {
    const value = this.filterForm.getRawValue();
    const today = this.formatDate(new Date());
    return (
      this.formatDate(value.fromDate) !== today ||
      this.formatDate(value.toDate) !== today
    );
  }
  constructor() {
    this.todayTransactionStatusForm.controls.isSuccessful.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.onTodayTransactionStatusChanged(value);
      });
  }
  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const userId = params.get('userId');
        if (!userId) {
          this.toast.error('User ID not found in route.', 'Error');
          return;
        }
        this.userId.set(userId);
        this.resetFilterValues();
        this.resetTransactionSwitch();
        this.loadDashboard(this.buildSearchCriteria(), false);
      });
  }
  searchUserDashboard(): void {
    if (this.loading()) return;
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.userDashboardPanelOpen.set(true);
      const invalidControl = this.getFirstInvalidControl();
      if (invalidControl) {
        this.scrollToField('dashboard-filter-form', invalidControl);
      }
      this.toast.warning('Please provide From Date and To Date.', 'Validation');
      return;
    }
    const fromDate = this.toDate(this.filterForm.controls.fromDate.value);
    const toDate = this.toDate(this.filterForm.controls.toDate.value);
    if (!fromDate) {
      this.filterForm.controls.fromDate.markAsTouched();
      this.scrollToField('dashboard-filter-form', 'fromDate');
      this.toast.warning('Please provide a valid From Date.', 'Validation');
      return;
    }
    if (!toDate) {
      this.filterForm.controls.toDate.markAsTouched();
      this.scrollToField('dashboard-filter-form', 'toDate');
      this.toast.warning('Please provide a valid To Date.', 'Validation');
      return;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      this.filterForm.controls.toDate.markAsTouched();
      this.scrollToField('dashboard-filter-form', 'toDate');
      this.toast.warning(
        'To Date must be greater than or equal to From Date.',
        'Validation',
      );
      return;
    }
    this.loadDashboard(this.buildSearchCriteria(), true);
  }
  private loadDashboard(
    criteria: UserDashboardSearchCriteria,
    showSuccess: boolean,
  ): void {
    if (!criteria.userId) {
      this.toast.error('User ID is not available.', 'Error');
      return;
    }
    this.loading.set(true);
    this.loader.show();
    this.api
      .loadInitialDashboardData(criteria)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (data) => {
          this.applyDashboardData(data);
          this.lastSearchCriteria.set(criteria);
          this.hasSearchResult.set(true);
          this.activeCustomerTab.set('customer');
          this.resetTransactionSwitch();
          if (data.warnings?.length) {
            this.toast.warning(
              `Some dashboard sections could not be loaded: ${data.warnings.join(' | ')}`,
              'Warning',
            );
            return;
          }
          if (showSuccess) {
            this.toast.success('Dashboard loaded successfully.', 'Success');
          }
        },
        error: (error) => {
          this.clearDashboardData();
          this.toast.error(
            this.getErrorMessage(error, 'Dashboard loading failed.'),
            'Error',
          );
        },
      });
  }
  private applyDashboardData(data: UserDashboardInitialData): void {
    this.userInformation.set(data?.userInformation ?? {});
    const kpiMap = new Map<number, UserDashboardKpiResponse>(
      (data?.kpiResponses ?? []).map((item) => [item.pKPI, item]),
    );
    this.todayTransactionRows.set(
      this.toDashboardGridRows(kpiMap.get(2)?.rows, 'transaction'),
    );
    this.fdrDpsOpenRows.set(
      this.toDashboardGridRows(kpiMap.get(4)?.rows, 'fdr-dps'),
    );
    this.requestDetailRows.set(
      this.toDashboardGridRows(kpiMap.get(5)?.rows, 'request'),
    );
    this.deviceDetailRows.set(
      this.toDashboardGridRows(kpiMap.get(6)?.rows, 'device'),
    );
    this.activityDetailRows.set(
      this.toDashboardGridRows(kpiMap.get(7)?.rows, 'activity'),
    );
    this.passwordChangeHistoryRows.set(
      this.toDashboardGridRows(kpiMap.get(8)?.rows, 'password'),
    );
  }
  onTodayTransactionStatusChanged(isSuccessful: boolean): void {
    const criteria = this.lastSearchCriteria();
    this.isSuccessfulTransaction.set(isSuccessful);
    if (!criteria || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.loader.show();
    this.api
      .loadTodayTransactionByStatus(criteria, isSuccessful)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          this.todayTransactionRows.set(response.rows as DashboardGridRow[]);
        },
        error: (error) => {
          this.todayTransactionRows.set([]);
          this.toast.error(
            this.getErrorMessage(
              error,
              isSuccessful
                ? 'Successful transaction data could not be loaded.'
                : 'Failed transaction data could not be loaded.',
            ),
            'Error',
          );
        },
      });
  }
  async requestReset(): Promise<void> {
    if (this.loading() || !this.hasFilterChanges) {
      return;
    }
    this.resetFilterValues();
    this.activeCustomerTab.set('customer');
    this.resetTransactionSwitch();
    this.loadDashboard(this.buildSearchCriteria(), false);
    this.toast.info('Dashboard filter has been reset.', 'Reset');
  }
  requestClose(): void {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  setCustomerTab(tab: DashboardCustomerTab): void {
    if (this.loading() || this.activeCustomerTab() === tab) {
      return;
    }
    this.activeCustomerTab.set(tab);
  }
  getCustomerTabStyle(tab: DashboardCustomerTab): string {
    return this.activeCustomerTab() === tab
      ? 'background: var(--theme-secondary); color: #ffffff;'
      : 'background: #e5e7eb; color: #4b5563;';
  }
  downloadExcel(
    rows: readonly DashboardGridRow[],
    columns: readonly string[],
    columnNames: Readonly<Record<string, string>>,
    sheetName: string,
    fileName: string,
  ): void {
    if (!rows.length) {
      this.toast.warning('No data available for download.', 'Warning');
      return;
    }
    const exportRows = rows.map((row) => {
      const exportRow: Record<string, unknown> = {};
      columns.forEach((column) => {
        exportRow[columnNames[column] || column] = row[column] ?? '';
      });
      return exportRow;
    });
    import('xlsx')
      .then((XLSX) => {
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        worksheet['!cols'] = columns.map((column) => {
          const header = columnNames[column] || column;
          const width = rows.reduce(
            (max, row) => Math.max(max, String(row[column] ?? '').length),
            header.length,
          );
          return {
            wch: Math.min(Math.max(width + 2, 14), 40),
          };
        });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sheetName.slice(0, 31),
        );
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `${fileName}_${date}.xlsx`);
      })
      .catch(() => {
        this.toast.error('Excel export failed.', 'Error');
      });
  }
  private resetFilterValues(): void {
    this.filterForm.reset({
      fromDate: new Date(),
      toDate: new Date(),
    });
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }
  private resetTransactionSwitch(): void {
    this.isSuccessfulTransaction.set(true);
    this.todayTransactionStatusForm.controls.isSuccessful.setValue(true, {
      emitEvent: false,
    });
  }
  private clearDashboardData(): void {
    this.hasSearchResult.set(false);
    this.userInformation.set({});
    this.lastSearchCriteria.set(null);
    this.todayTransactionRows.set([]);
    this.fdrDpsOpenRows.set([]);
    this.requestDetailRows.set([]);
    this.activityDetailRows.set([]);
    this.deviceDetailRows.set([]);
    this.passwordChangeHistoryRows.set([]);
  }
  private buildSearchCriteria(): UserDashboardSearchCriteria {
    return {
      searchFlag: 0,
      userId: this.userId(),
      customerId: '',
      mobileNumber: '',
      email: '',
      fromDate: this.formatDate(this.filterForm.controls.fromDate.value),
      toDate: this.formatDate(this.filterForm.controls.toDate.value),
    };
  }
  private getFirstInvalidControl(): string | null {
    const controls = ['fromDate', 'toDate'];
    return (
      controls.find(
        (controlName) => this.filterForm.get(controlName)?.invalid,
      ) ?? null
    );
  }
  private scrollToField(formId: string, controlName: string): void {
    setTimeout(() => {
      const field = document.querySelector(
        `#${formId} [controlname="${controlName}"]`,
      ) as HTMLElement | null;
      if (!field) return;
      field.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setTimeout(() => {
        const input = field.querySelector(
          'input,textarea,select',
        ) as HTMLElement | null;
        input?.focus();
      }, 350);
    }, 0);
  }
  private formatCreationStatus(value: unknown): string {
    const status = String(value ?? '')
      .trim()
      .toUpperCase();
    if (!status) return '-';
    return status === 'A' ? 'Authorized' : 'Unauthorized';
  }
  private formatAuthenticationType(value: unknown): string {
    const id = String(value ?? '').trim();
    if (!id) return '-';
    const types: Record<string, string> = {
      '1': 'OTP',
      '2': '2FA',
      '3': 'RBA',
    };
    return types[id] ?? id;
  }
  private formatUserStatus(
    active: boolean | undefined,
    locked: boolean | undefined,
  ): string {
    if (active === undefined && locked === undefined) {
      return '-';
    }
    return `${active ? 'Active' : 'Inactive'}, ${locked ? 'Locked' : 'Unlocked'}`;
  }
  private formatCustomerDate(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) return '-';
    const cbsDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
    if (cbsDate) {
      return `${cbsDate[2].padStart(2, '0')}/${cbsDate[1].padStart(2, '0')}/${cbsDate[3]}`;
    }
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (isoDate) {
      return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
    }
    return text;
  }
  private formatDate(value: unknown): string {
    const date = this.toDate(value);
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return null;
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
      if (match) {
        const date = new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
        );
        return Number.isNaN(date.getTime()) ? null : date;
      }
    }
    const date = new Date(value as any);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as {
        error?: {
          Message?: unknown;
          message?: unknown;
        };
      };
      const message = httpError.error?.Message ?? httpError.error?.message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
    return fallback;
  }
  private toDashboardGridRows(
    rows: UserDashboardRow[] | undefined,
    prefix: string,
  ): DashboardGridRow[] {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row, index) => {
        const mappedRow: DashboardGridRow = {
          rowId: String(row?.['rowId'] ?? `${prefix}-${index + 1}`),
        };
        Object.entries(row ?? {}).forEach(([key, value]) => {
          if (key === 'rowId') return;
          if (typeof value === 'string' || typeof value === 'number') {
            mappedRow[key] = value;
            return;
          }
          if (value === null || value === undefined) {
            mappedRow[key] = '';
            return;
          }
          mappedRow[key] = String(value);
        });
        return mappedRow;
      })
      .filter((row) =>
        Object.entries(row).some(
          ([key, value]) =>
            key !== 'rowId' && String(value ?? '').trim().length > 0,
        ),
      );
  }
}
