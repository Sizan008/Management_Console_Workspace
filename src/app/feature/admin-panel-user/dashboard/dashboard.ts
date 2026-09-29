import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CommonBarChart } from '../../../shared/common-components/charts/common-bar-chart/common-bar-chart';
import { ExpansionPanelHeader } from '../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericModal } from '../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { GenericSwitch } from '../../../shared/common-components/generic-component-type/generic-switch/generic-switch';
import { InputDate } from '../../../shared/common-components/input-types/input-date/input-date';
import {
  ButtonUtils,
  ONCLICK_EXIT,
  ONCLICK_RESET,
} from '../../../shared/constant/button-signals.constant';

import {
  BillsPayRow,
  DashboardCount,
  DashboardKpi,
  LastMonthTransRow,
  MfsSummaryRow,
  TodayTransactionRow,
  TopUserPasswordChangeRow,
  TopUserTransSummary,
  TopupSummaryRow,
  UserDeviceSummaryRow,
} from '../models/dashboard.model';
import { DashboardService } from '../services/dashboard.service';

interface DashboardMetricCard {
  key: string;
  label: string;
  value: string | number;
  detailKpi?: DashboardKpi;
  modalTitle?: string;
  fileName?: string;
  columns?: string[];
  columnNames?: Record<string, string>;
}

import { ToastHelperService } from '../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputDate,
    GenericButton,
    GenericSwitch,
    GenericDataGrid,
    GenericModal,
    CommonBarChart,
    ExpansionPanelHeader,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastHelperService);

  readonly filterForm = this.fb.group({
    filterDate: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  readonly todayTransactionForm = this.fb.group({
    isSuccessful: [true],
  });

  readonly loading = signal(false);
  readonly todayTransactionLoading = signal(false);
  readonly modalLoading = signal(false);
  readonly pageError = signal('');

  readonly dashboardCount = signal<DashboardCount>({
    totaL_USER_REG_TILLTODATE: '0',
    totaL_USER_REG_TODAY: '0',
    totaL_USER_SIGNED_TODAY: '0',
    totaL_USER_ACTIVE_TODAY: '0',
    totaL_USER_LOCKED_TODAY: '0',
    totaL_FDPS_OPENED_TODAY: '0',
    totaL_REQS_RECEIVED_TODAY: '0',
  });

  readonly topUserSummary = signal<TopUserTransSummary[]>([]);
  readonly todayTransactions = signal<TodayTransactionRow[]>([]);
  readonly userDeviceSummary = signal<UserDeviceSummaryRow[]>([]);
  readonly passwordChangeList = signal<TopUserPasswordChangeRow[]>([]);
  readonly topupSummary = signal<TopupSummaryRow[]>([]);
  readonly mfsSummary = signal<MfsSummaryRow[]>([]);
  readonly billsPaySummary = signal<BillsPayRow[]>([]);
  readonly lastMonthSummary = signal<LastMonthTransRow[]>([]);

  readonly transactionSwitchValue = signal(true);

  readonly mobileTopupPanelOpen = signal(true);
  readonly mfsSendMoneyPanelOpen = signal(true);
  readonly billsPayPanelOpen = signal(true);
  readonly todayTransactionPanelOpen = signal(true);
  readonly lastThirtyDaysPanelOpen = signal(true);
  readonly topUserPanelOpen = signal(true);
  readonly largeDevicePanelOpen = signal(true);
  readonly changedPasswordPanelOpen = signal(true);
  readonly metricModalPanelOpen = signal(true);

  readonly detailModalVisible = signal(false);
  readonly detailModalTitle = signal('Details');
  readonly detailModalRows = signal<any[]>([]);
  readonly detailModalColumns = signal<string[]>([]);
  readonly detailModalColumnNames = signal<Record<string, string>>({});
  readonly detailModalFileName = signal('Dashboard Details');

  readonly topUserColumns = ['useR_ID', 'tranS_COUNT', 'tranS_AMOUNT'];
  readonly topUserColumnNames: Record<string, string> = {
    useR_ID: 'User ID',
    tranS_COUNT: 'Total Transaction',
    tranS_AMOUNT: 'Total Amount',
  };

  readonly todayTransactionColumns = [
    'loG_ID',
    'transfeR_TYPE',
    'useR_ID',
    'transactioN_DATE',
    'transactioN_ID',
    'customeR_ID',
    'froM_BRANCH_ID',
    'froM_ACCOUNT_NO',
    'tO_BRANCH_ID',
    'tO_ACCOUNT_NO',
    'receiver',
    'tranS_AMOUNT',
  ];

  readonly todayTransactionColumnNames: Record<string, string> = {
    loG_ID: 'Log ID',
    transfeR_TYPE: 'Type',
    useR_ID: 'User ID',
    transactioN_DATE: 'Date',
    transactioN_ID: 'Transaction ID',
    customeR_ID: 'Customer ID',
    froM_BRANCH_ID: 'Source Branch',
    froM_ACCOUNT_NO: 'Source A/C',
    tO_BRANCH_ID: 'Destination Branch',
    tO_ACCOUNT_NO: 'Destination A/C',
    receiver: 'Receiver',
    tranS_AMOUNT: 'Amount',
  };

  readonly userDeviceColumns = ['useR_ID', 'devicE_COUNT'];
  readonly userDeviceColumnNames: Record<string, string> = {
    useR_ID: 'User ID',
    devicE_COUNT: 'Total Device',
  };

  readonly passwordChangeColumns = ['useR_ID', 'pasS_CHANGE_COUNT'];
  readonly passwordChangeColumnNames: Record<string, string> = {
    useR_ID: 'User ID',
    pasS_CHANGE_COUNT: 'Total Password Changed',
  };

  readonly topUserDetailsColumns = [
    'useR_ID',
    'transfeR_FOR',
    'tranS_COUNT',
    'tranS_AMOUNT',
  ];
  readonly topUserDetailsColumnNames: Record<string, string> = {
    useR_ID: 'User ID',
    transfeR_FOR: 'Type',
    tranS_COUNT: 'Total Transaction',
    tranS_AMOUNT: 'Total Amount',
  };

  readonly lockedUserColumns = [
    'useR_ID',
    'useR_NM',
    'customeR_ID',
    'useR_STATUS_CHANGED_ON',
    'reason',
  ];
  readonly lockedUserColumnNames: Record<string, string> = {
    useR_ID: 'User ID',
    useR_NM: 'Name',
    customeR_ID: 'Customer ID',
    useR_STATUS_CHANGED_ON: 'Locked On',
    reason: 'Reason',
  };

  readonly accOpenedColumns = [
    'brancH_NM',
    'accounT_NO',
    'accounT_TITLE',
    'producT_NM',
    'payeE_BRANCH_ID',
    'payeE_ACCOUNT_NO',
    'procesS_DT',
  ];
  readonly accOpenedColumnNames: Record<string, string> = {
    brancH_NM: 'Branch',
    accounT_NO: 'Account No',
    accounT_TITLE: 'Title',
    producT_NM: 'Product',
    payeE_BRANCH_ID: 'Payee Branch',
    payeE_ACCOUNT_NO: 'Payee Account',
    procesS_DT: 'Date',
  };

  readonly reqReceivedColumns = [
    'requesT_TYPE',
    'brancH_ID',
    'accounT_NO',
    'requesT_DETAILS',
    'status',
  ];
  readonly reqReceivedColumnNames: Record<string, string> = {
    requesT_TYPE: 'Type',
    brancH_ID: 'Branch',
    accounT_NO: 'Account No',
    requesT_DETAILS: 'Details',
    status: 'Status',
  };

  readonly registeredByBranchColumns = ['homE_BRANCH_ID', 'useR_COUNT'];
  readonly registeredByBranchColumnNames: Record<string, string> = {
    homE_BRANCH_ID: 'Branch ID',
    useR_COUNT: 'Total Registered',
  };

  readonly metricCards = computed<DashboardMetricCard[]>(() => {
    const count = this.dashboardCount();

    return [
      {
        key: 'registeredTillToday',
        label: 'Registered Till Today',
        value: count.totaL_USER_REG_TILLTODATE,
      },
      {
        key: 'registeredToday',
        label: 'Registered Today',
        value: count.totaL_USER_REG_TODAY,
        detailKpi: 2.1,
        modalTitle: 'Registered User',
        fileName: 'Registered User By Branch',
        columns: this.registeredByBranchColumns,
        columnNames: this.registeredByBranchColumnNames,
      },
      {
        key: 'signedInToday',
        label: 'Signed-in Today',
        value: count.totaL_USER_SIGNED_TODAY,
      },
      {
        key: 'activeUsers',
        label: 'Active Users',
        value: count.totaL_USER_ACTIVE_TODAY,
      },
      {
        key: 'lockedUsers',
        label: 'Locked Users',
        value: count.totaL_USER_LOCKED_TODAY,
        detailKpi: 7.1,
        modalTitle: 'Locked User',
        fileName: 'Locked User',
        columns: this.lockedUserColumns,
        columnNames: this.lockedUserColumnNames,
      },
      {
        key: 'fdrDpsToday',
        label: 'FDR/DPS Today',
        value: count.totaL_FDPS_OPENED_TODAY,
        detailKpi: 14.1,
        modalTitle: 'FDR/DPS Opened Today',
        fileName: 'Account Opened',
        columns: this.accOpenedColumns,
        columnNames: this.accOpenedColumnNames,
      },
      {
        key: 'requestReceivedToday',
        label: 'Req. Received Today',
        value: count.totaL_REQS_RECEIVED_TODAY,
        detailKpi: 15.1,
        modalTitle: 'Request Received Today',
        fileName: 'Request Received',
        columns: this.reqReceivedColumns,
        columnNames: this.reqReceivedColumnNames,
      },
    ];
  });

  readonly topupChartData = computed(() => ({
    monthly: {
      categories: this.topupSummary().map((row) => row.mobilE_OPERATOR),
      series: [
        {
          name: 'Amount',
          data: this.topupSummary().map((row) => this.toNumber(row.tranS_AMOUNT)),
        },
      ],
    },
  }));

  readonly mfsChartData = computed(() => ({
    monthly: {
      categories: this.mfsSummary().map((row) => row.mfs),
      series: [
        {
          name: 'Amount',
          data: this.mfsSummary().map((row) => this.toNumber(row.tranS_AMOUNT)),
        },
      ],
    },
  }));

  readonly billsPayChartData = computed(() => ({
    monthly: {
      categories: this.billsPaySummary().map((row) => row.biller),
      series: [
        {
          name: 'Amount',
          data: this.billsPaySummary().map((row) => this.toNumber(row.tranS_AMOUNT)),
        },
      ],
    },
  }));

  readonly lastMonthChartData = computed(() => ({
    monthly: {
      categories: this.lastMonthSummary().map((row) => this.toDDMMM(row.tranS_DATE)),
      series: [
        {
          name: 'Total Transaction',
          data: this.lastMonthSummary().map((row) => this.toNumber(row.tranS_COUNT)),
        },
        {
          name: 'Total Amount',
          data: this.lastMonthSummary().map((row) => this.toNumber(row.tranS_AMOUNT)),
        },
      ],
    },
  }));

  constructor() {
    effect(() => {
      const message = this.pageError();
      if (message) this.toast.error(message);
    });

    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.onRefresh();
      }
    });

    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.onExit();
      }
    });
  }

  ngOnInit(): void {
    ButtonUtils.setPageButtons({
      reset: true,
      exit: true,
    });

    void this.loadAll();
  }

  ngOnDestroy(): void {
    ButtonUtils.resetAllButtons();
    ONCLICK_RESET.set(false);
    ONCLICK_EXIT.set(false);
  }

  onSearch(): void {
    if (this.filterForm.invalid || this.loading()) {
      this.filterForm.markAllAsTouched();
      return;
    }

    void this.loadAll();
  }

  onRefresh(): void {
    if (!this.loading()) {
      void this.loadAll();
    }
  }

  onExit(): void {
    void this.router.navigate(['../../'], { relativeTo: this.route });
  }

  onTransactionToggle(isSuccessful: boolean): void {
    this.transactionSwitchValue.set(isSuccessful);
    this.todayTransactionForm.patchValue(
      { isSuccessful },
      { emitEvent: false },
    );
    void this.loadTodaysTransaction();
  }

  openMetricDetails(card: DashboardMetricCard): void {
    if (
      card.detailKpi === undefined ||
      !card.columns ||
      !card.columnNames
    ) {
      return;
    }

    this.openDetailModal(
      card.modalTitle || card.label,
      card.fileName || card.label,
      card.detailKpi,
      card.columns,
      card.columnNames,
    );
  }

  viewTopUserDetails(event: unknown): void {
    const row = this.parseRow<TopUserTransSummary>(event);
    if (!row?.useR_ID) {
      return;
    }

    this.openDetailModal(
      'Top User Transaction Details',
      'Top User Transaction Details',
      5.1,
      this.topUserDetailsColumns,
      this.topUserDetailsColumnNames,
      row.useR_ID,
    );
  }

  closeMetricModal(): void {
    this.detailModalVisible.set(false);
    this.modalLoading.set(false);
    this.detailModalRows.set([]);
  }

  downloadTodayTransactions(): void {
    this.downloadCsv(
      this.transactionSwitchValue()
        ? 'Successful Transaction'
        : 'Failed Transaction',
      this.todayTransactions(),
      this.todayTransactionColumns,
      this.todayTransactionColumnNames,
    );
  }

  downloadTopUsers(): void {
    this.downloadCsv(
      'Top User (Transaction)',
      this.topUserSummary(),
      this.topUserColumns,
      this.topUserColumnNames,
    );
  }

  downloadDeviceSummary(): void {
    this.downloadCsv(
      'User Device Summary',
      this.userDeviceSummary(),
      this.userDeviceColumns,
      this.userDeviceColumnNames,
    );
  }

  downloadPasswordSummary(): void {
    this.downloadCsv(
      'User Password Change History',
      this.passwordChangeList(),
      this.passwordChangeColumns,
      this.passwordChangeColumnNames,
    );
  }

  downloadCurrentDetail(): void {
    this.downloadCsv(
      this.detailModalFileName(),
      this.detailModalRows(),
      this.detailModalColumns(),
      this.detailModalColumnNames(),
    );
  }

  private async loadAll(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.pageError.set('');
    this.transactionSwitchValue.set(true);
    this.todayTransactionForm.patchValue(
      { isSuccessful: true },
      { emitEvent: false },
    );

    try {
      await Promise.all([
        this.loadSummary(),
        this.fetchDetails<TopUserTransSummary>(5).then((rows) =>
          this.topUserSummary.set(rows),
        ),
        this.fetchDetails<TodayTransactionRow>(6).then((rows) =>
          this.todayTransactions.set(rows),
        ),
        this.fetchDetails<TopupSummaryRow>(8).then((rows) =>
          this.topupSummary.set(rows),
        ),
        this.fetchDetails<MfsSummaryRow>(9).then((rows) =>
          this.mfsSummary.set(rows),
        ),
        this.fetchDetails<BillsPayRow>(10).then((rows) =>
          this.billsPaySummary.set(rows),
        ),
        this.fetchDetails<LastMonthTransRow>(11).then((rows) =>
          this.lastMonthSummary.set(rows),
        ),
        this.fetchDetails<UserDeviceSummaryRow>(12).then((rows) =>
          this.userDeviceSummary.set(rows),
        ),
        this.fetchDetails<TopUserPasswordChangeRow>(16).then((rows) =>
          this.passwordChangeList.set(rows),
        ),
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  private loadSummary(): Promise<void> {
    return new Promise((resolve) => {
      this.svc
        .getDashboardSummary({ pDATE: this.getDateValue() })
        .subscribe({
          next: (res) => {
            if (this.isOk(res?.Status) && res.Result) {
              this.dashboardCount.set(res.Result);
            }
          },
          error: () => {
            this.pageError.set('Dashboard summary could not be loaded.');
            resolve();
          },
          complete: () => resolve(),
        });
    });
  }

  private loadTodaysTransaction(): Promise<void> {
    if (this.todayTransactionLoading()) {
      return Promise.resolve();
    }

    this.todayTransactionLoading.set(true);
    const kpi: DashboardKpi = this.transactionSwitchValue() ? 6 : 13;

    return this.fetchDetails<TodayTransactionRow>(kpi)
      .then((rows) => this.todayTransactions.set(rows))
      .finally(() => this.todayTransactionLoading.set(false));
  }

  private openDetailModal(
    title: string,
    fileName: string,
    kpi: DashboardKpi,
    columns: string[],
    columnNames: Record<string, string>,
    userId = '',
  ): void {
    this.detailModalTitle.set(title);
    this.detailModalFileName.set(fileName);
    this.detailModalColumns.set(columns);
    this.detailModalColumnNames.set(columnNames);
    this.detailModalRows.set([]);
    this.metricModalPanelOpen.set(true);
    this.modalLoading.set(true);
    this.detailModalVisible.set(true);

    this.fetchDetails<any>(kpi, userId)
      .then((rows) => this.detailModalRows.set(rows))
      .finally(() => this.modalLoading.set(false));
  }

  private fetchDetails<T>(kpi: DashboardKpi, userId = ''): Promise<T[]> {
    const payload = {
      pKPI: kpi,
      pDATE: this.getDateValue(),
      pUSER_ID: userId,
    };

    return new Promise<T[]>((resolve) => {
      this.svc.getDashboardDetails(payload).subscribe({
        next: (res) => {
          resolve(
            this.isOk(res?.Status) && Array.isArray(res.Result)
              ? (res.Result as unknown as T[])
              : [],
          );
        },
        error: () => resolve([]),
      });
    });
  }

  private getDateValue(): string {
    const raw = this.filterForm.controls.filterDate.value || '';
    return this.toMMDDYYYY(String(raw));
  }

  private toMMDDYYYY(value: string): string {
    if (!value) {
      return '';
    }

    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      return `${isoDate[2]}/${isoDate[3]}/${isoDate[1]}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${month}/${day}/${parsed.getFullYear()}`;
  }

  private toDDMMM(date: string): string {
    if (!date) {
      return '';
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return `${parsed.getDate()}-${months[parsed.getMonth()]}`;
  }

  private parseRow<T>(event: unknown): T | null {
    if (event && typeof event === 'object') {
      return event as T;
    }

    if (typeof event !== 'string' || !event.trim()) {
      return null;
    }

    try {
      return JSON.parse(event) as T;
    } catch {
      return null;
    }
  }

  private downloadCsv(
    fileName: string,
    rows: any[],
    columns: string[],
    columnNames: Record<string, string>,
  ): void {
    if (!rows.length) {
      return;
    }

    const header = columns
      .map((column) => this.escapeCsv(columnNames[column] || column))
      .join(',');

    const body = rows
      .map((row) =>
        columns
          .map((column) => this.escapeCsv(row?.[column]))
          .join(','),
      )
      .join('\n');

    const blob = new Blob([`${header}\n${body}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName || 'export'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsv(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private toNumber(value: string | number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private isOk(status: unknown): boolean {
    return String(status ?? '').trim().toUpperCase() === 'OK';
  }
}
