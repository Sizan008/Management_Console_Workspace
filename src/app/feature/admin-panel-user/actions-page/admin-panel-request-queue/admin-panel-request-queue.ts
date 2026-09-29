import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subscription,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
} from 'rxjs';
import {
  SummaryDetailsComponent,
  SummaryDetailItem,
} from '../../../../shared/common-components/case-quick-view/summary-details/summary-details.component';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericModal } from '../../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputDate } from '../../../../shared/common-components/input-types/input-date/input-date';
import { InputSelectOptionField } from '../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputTextBox } from '../../../../shared/common-components/input-types/input-text-box/input-text-box';
import {
  RequestQueueBranch,
  RequestQueueRow,
  RequestQueueSearchRequest,
} from '../../models/request-queue.model';
import { RequestQueueService } from '../../services/request-queue.service';

type SelectOption = { key: string; value: string };

import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-request-queue',
  standalone: true,
  imports: [
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    GenericModal,
    InputTextBox,
    InputSelectOptionField,
    InputDate,
    SummaryDetailsComponent,
  ],
  templateUrl: './admin-panel-request-queue.html',
})
export class AdminPanelRequestQueueComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(RequestQueueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastHelperService);

  private searchRequest?: Subscription;
  private filterRequest?: Subscription;

  readonly selectedUserId = signal('');
  readonly branchOptions = signal<SelectOption[]>([]);
  readonly requestTypeOptions = signal<SelectOption[]>([]);
  readonly statusOptions = signal<SelectOption[]>([]);
  readonly requestQueueData = signal<RequestQueueRow[]>([]);
  readonly selectedRequest = signal<RequestQueueRow | null>(null);

  readonly loadingFilters = signal(false);
  readonly searching = signal(false);
  readonly errorMessage = signal('');
  readonly warningMessage = signal('');
  readonly filterOpen = signal(true);
  readonly gridOpen = signal(true);
  readonly detailsOpen = signal(false);
  readonly detailsInformationOpen = signal(true);
  readonly detailsUserOpen = signal(true);
  readonly detailsParametersOpen = signal(true);

  readonly busy = computed(() => this.loadingFilters() || this.searching());
  readonly canSearch = computed(
    () => !!this.selectedUserId() && !this.searching(),
  );

  readonly requestForm = new FormGroup({
    userId: new FormControl('', { nonNullable: true }),
    branchName: new FormControl('All', { nonNullable: true }),
    requestType: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });

  readonly columns = [
    'requesT_ID',
    'requesT_DATE',
    'useR_ID',
    'useR_NM',
    'customeR_ID',
    'contacT_EMAIL',
    'contacT_MOBILE',
    'reqS_TYPE',
    'paraM_1',
    'paraM_2',
    'paraM_3',
    'paraM_4',
    'paraM_5',
    'paraM_6',
    'paraM_7',
    'status',
    'reason',
  ];

  readonly columnNames: Record<string, string> = {
    requesT_ID: 'Request ID',
    requesT_DATE: 'Request Date',
    useR_ID: 'User ID',
    useR_NM: 'User Name',
    customeR_ID: 'Customer ID / Group ID',
    contacT_EMAIL: 'Contact Email',
    contacT_MOBILE: 'Contact Mobile',
    reqS_TYPE: 'Request Type',
    paraM_1: 'Account Number',
    paraM_2: 'Branch ID',
    paraM_3: 'Beneficiary Name',
    paraM_4: 'Cheque Amount',
    paraM_5: 'Cheque Date',
    paraM_6: 'Cheque Prefix',
    paraM_7: 'Cheque Leaf No',
    status: 'Status',
    reason: 'Reason',
  };

  readonly requestDetails = computed<SummaryDetailItem[]>(() => {
    const row = this.selectedRequest();
    return [
      { label: 'Request ID', value: this.display(row?.requesT_ID) },
      { label: 'Request Date', value: this.display(row?.requesT_DATE) },
      { label: 'Request Type', value: this.display(row?.reqS_TYPE) },
      { label: 'Status', value: this.display(row?.status) },
      { label: 'Reason', value: this.display(row?.reason) },
    ];
  });

  readonly userDetails = computed<SummaryDetailItem[]>(() => {
    const row = this.selectedRequest();
    return [
      { label: 'User ID', value: this.display(row?.useR_ID) },
      { label: 'User Name', value: this.display(row?.useR_NM) },
      { label: 'Customer ID', value: this.display(row?.customeR_ID) },
      { label: 'Contact Email', value: this.display(row?.contacT_EMAIL) },
      { label: 'Contact Mobile', value: this.display(row?.contacT_MOBILE) },
    ];
  });

  readonly parameterDetails = computed<SummaryDetailItem[]>(() => {
    const row = this.selectedRequest();
    return [
      { label: 'Account Number', value: this.display(row?.paraM_1) },
      { label: 'Branch ID', value: this.display(row?.paraM_2) },
      { label: 'Beneficiary Name', value: this.display(row?.paraM_3) },
      { label: 'Cheque Amount', value: this.display(row?.paraM_4) },
      { label: 'Cheque Date', value: this.display(row?.paraM_5) },
      { label: 'Cheque Prefix', value: this.display(row?.paraM_6) },
      { label: 'Cheque Leaf No', value: this.display(row?.paraM_7) },
    ];
  });

  constructor() {
    effect(() => {
      const message = this.errorMessage();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.warningMessage();
      if (message) this.toast.warning(message);
    });

  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => (params.get('userId') || '').trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((userId) => {
        this.selectedUserId.set(userId);
        this.requestForm.patchValue({ userId }, { emitEvent: false });
        this.requestQueueData.set([]);
        this.closeDetails();
        this.errorMessage.set(
          userId ? '' : 'Select a user from the workspace to open Request Queue.',
        );
      });

    this.loadDropdownData();
  }

  loadDropdownData(): void {
    this.filterRequest?.unsubscribe();
    this.loadingFilters.set(true);
    this.warningMessage.set('');

    const warnings: string[] = [];
    this.filterRequest = forkJoin({
      branches: this.api.getBranchList().pipe(
        catchError((error: unknown) => {
          warnings.push(this.getErrorMessage(error, 'Unable to load branch list.'));
          return of([] as RequestQueueBranch[]);
        }),
      ),
      headOfficeId: this.api.getHeadOfficeBranchId().pipe(
        catchError((error: unknown) => {
          warnings.push(this.getErrorMessage(error, 'Unable to load the head-office branch.'));
          return of('0001');
        }),
      ),
      requestTypes: this.api.getRequestTypes().pipe(
        catchError((error: unknown) => {
          warnings.push(this.getErrorMessage(error, 'Unable to load request types.'));
          return of([]);
        }),
      ),
      statuses: this.api.getRequestStatuses().pipe(
        catchError((error: unknown) => {
          warnings.push(this.getErrorMessage(error, 'Unable to load request statuses.'));
          return of([]);
        }),
      ),
    })
      .pipe(
        finalize(() => this.loadingFilters.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ branches, headOfficeId, requestTypes, statuses }) => {
        this.branchOptions.set(this.buildBranchOptions(branches, headOfficeId));
        this.requestTypeOptions.set(
          requestTypes.map((type) => ({ key: String(type.id ?? ''), value: type.name ?? '' })),
        );
        this.statusOptions.set(
          statuses.map((status) => ({
            key: String(status.authStatus ?? ''),
            value: status.authStatusNm ?? '',
          })),
        );
        this.warningMessage.set(warnings.filter(Boolean).join(' '));
      });
  }

  search(): void {
    if (!this.canSearch()) {
      return;
    }

    const value = this.requestForm.getRawValue();
    const userId = this.selectedUserId();
    const payload: RequestQueueSearchRequest = {
      userId,
      // Intentionally keep the exact string so values such as 0031 remain 0031.
      // "All" is represented by an empty key and therefore sends BranchId="".
      branchId: this.normalizeBranchId(value.branchName),
      requestType: value.requestType ?? '',
      statusType: value.status ?? '',
      startDate: this.toApiDate(value.startDate),
      endTime: this.toApiDate(value.endDate),
    };

    this.searchRequest?.unsubscribe();
    this.errorMessage.set('');
    this.requestQueueData.set([]);
    this.closeDetails();
    this.searching.set(true);

    this.searchRequest = this.api
      .getRequestQueue(payload)
      .pipe(
        finalize(() => this.searching.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (response?.Status?.trim().toUpperCase() !== 'OK') {
            this.errorMessage.set(
              response?.Message?.trim() || 'Unable to load request queue data.',
            );
            return;
          }

          const result = Array.isArray(response.Result) ? response.Result : [];
          this.requestQueueData.set(
            result.filter((row) => !this.isColumnHeaderRow(row)),
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to load request queue data.'),
          );
        },
      });
  }

  reset(): void {
    if (this.searching()) {
      return;
    }
    this.requestForm.reset({
      userId: this.selectedUserId(),
      branchName: 'All',
      requestType: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    this.requestQueueData.set([]);
    this.errorMessage.set('');
    this.closeDetails();
  }

  onView(event: string | RequestQueueRow): void {
    const row = this.parseRow(event);
    if (!row) {
      this.errorMessage.set('Unable to read the selected request.');
      return;
    }
    this.selectedRequest.set(row);
    this.detailsInformationOpen.set(true);
    this.detailsUserOpen.set(true);
    this.detailsParametersOpen.set(true);
    this.detailsOpen.set(true);
  }

  closeDetails(): void {
    this.detailsOpen.set(false);
    this.selectedRequest.set(null);
  }

  onClose(): void {
    if (!this.searching()) {
      void this.router.navigate(['../../'], { relativeTo: this.route });
    }
  }

  private buildBranchOptions(
    branches: RequestQueueBranch[],
    headOfficeId: string,
  ): SelectOption[] {
    // Keep a real display key for the shared searchable select so choosing All
    // stays visible in the field. normalizeBranchId() still converts it to an
    // empty BranchId for the API request.
    const options: SelectOption[] = [{ key: 'All', value: 'All' }];
    const seen = new Set<string>();

    for (const branch of branches) {
      const id = String(branch?.brancH_ID ?? '').trim();
      if (!id || seen.has(id)) {
        continue;
      }
      seen.add(id);
      options.push({ key: id, value: branch?.brancH_NM || id });
    }

    const headOffice = String(headOfficeId ?? '').trim();
    if (headOffice && !seen.has(headOffice)) {
      options.splice(1, 0, {
        key: headOffice,
        value: `${headOffice} : Head Office`,
      });
    }

    return options;
  }

  private normalizeBranchId(value: unknown): string {
    const branchId = value === null || value === undefined ? '' : String(value).trim();
    return branchId.toLowerCase() === 'all' ? '' : branchId;
  }

  private toApiDate(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : value.toISOString();
    }

    const raw = String(value).trim();
    if (!raw) {
      return '';
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
  }

  private parseRow(event: string | RequestQueueRow): RequestQueueRow | null {
    if (typeof event !== 'string') {
      return event;
    }
    try {
      return JSON.parse(event) as RequestQueueRow;
    } catch {
      return null;
    }
  }

  private isColumnHeaderRow(row: RequestQueueRow): boolean {
    return (
      this.normalizeCell(row.requesT_ID) === 'request id' &&
      this.normalizeCell(row.requesT_DATE) === 'request date' &&
      this.normalizeCell(row.useR_ID) === 'user id' &&
      this.normalizeCell(row.useR_NM) === 'user name'
    );
  }

  private normalizeCell(value: unknown): string {
    return value === null || value === undefined
      ? ''
      : String(value).trim().toLowerCase();
  }

  private display(value: unknown): string | number {
    return value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'number'
        ? value
        : String(value);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { Message?: unknown } | null;
      if (typeof body?.Message === 'string' && body.Message.trim()) {
        return body.Message.trim();
      }
      if (error.status === 0) {
        return 'Unable to reach the server. Please try again.';
      }
      return fallback;
    }
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
