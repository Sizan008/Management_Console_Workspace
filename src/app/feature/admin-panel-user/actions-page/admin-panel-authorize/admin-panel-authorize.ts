import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, distinctUntilChanged, finalize, map } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericModal } from '../../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputSelectOptionField } from '../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputTextBox } from '../../../../shared/common-components/input-types/input-text-box/input-text-box';
import {
  AuthorizationChangeDetail,
  AuthorizationDecisionRequest,
  AuthorizationFeature,
  AuthorizationFunctionOption,
  AuthorizationRequest,
  AuthorizationRequestDetails,
  AuthorizerHistoryRow,
} from '../../models/authorization.model';
import { AuthorizationService } from '../../services/authorization.service';

type AuthorizationDecision = 'Authorize' | 'Decline';

type DetailGridRow = AuthorizationChangeDetail & {
  columnName: string;
  oldValue: string;
  newValue: string;
};

import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-authorize',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    GenericModal,
    InputSelectOptionField,
    InputTextBox,
  ],
  templateUrl: './admin-panel-authorize.html',
})
export class AdminPanelAuthorizeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastHelperService);

  private featureRequest?: Subscription;
  private queueRequest?: Subscription;
  private detailsRequest?: Subscription;
  private historyRequest?: Subscription;
  private decisionRequest?: Subscription;

  @ViewChild('authorizerDetailsSection')
  private authorizerDetailsSection?: ElementRef<HTMLElement>;

  readonly selectedUserId = signal('');
  readonly features = signal<AuthorizationFeature[]>([]);
  readonly selectedFeatureId = signal('');
  readonly authorizationRows = signal<AuthorizationRequest[]>([]);
  readonly selectedRequest = signal<AuthorizationRequest | null>(null);
  readonly selectedRequestDetails = signal<AuthorizationRequestDetails | null>(null);
  readonly detailRows = signal<DetailGridRow[]>([]);
  readonly authorizerHistoryRows = signal<AuthorizerHistoryRow[]>([]);

  readonly loadingFeatures = signal(false);
  readonly loadingQueue = signal(false);
  readonly loadingDetails = signal(false);
  readonly processingDecision = signal(false);
  readonly pageError = signal('');
  readonly pageNotice = signal('');
  readonly detailModalError = signal('');
  readonly successMessage = signal('');

  readonly authorizationPanelOpen = signal(true);
  readonly authorizerDetailsPanelOpen = signal(true);
  readonly authorizerDetailsVisible = signal(false);
  readonly detailModalVisible = signal(false);
  readonly confirmModalVisible = signal(false);
  readonly successModalVisible = signal(false);
  readonly pendingDecision = signal<AuthorizationDecision | null>(null);
  readonly activeAuthorizerQueueId = signal('');

  readonly busy = computed(
    () =>
      this.loadingFeatures() ||
      this.loadingQueue() ||
      this.loadingDetails() ||
      this.processingDecision(),
  );

  readonly functionOptions = computed<AuthorizationFunctionOption[]>(() =>
    this.features().map((feature) => ({
      key: String(feature.adminFeaturesId),
      value: feature.featureDesc,
    })),
  );

  readonly selectedFeature = computed<AuthorizationFeature | null>(() => {
    const featureId = this.selectedFeatureId();
    return (
      this.features().find(
        (feature) => String(feature.adminFeaturesId) === featureId,
      ) ?? null
    );
  });

  readonly filterForm = new FormGroup({
    featureId: new FormControl('', { nonNullable: true }),
  });

  readonly decisionForm = new FormGroup({
    remarks: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly authorizationColumns = [
    'makeDt',
    'makeBy',
    'authLevelPending',
    'authLevelMax',
    'actionStatus',
    'makeBranchId',
    'functionId',
  ];

  readonly authorizationColumnNames: Record<string, string> = {
    makeDt: 'Make Date',
    makeBy: 'Make By',
    authLevelPending: 'Authorization Level Pending',
    authLevelMax: 'Authorization Level Max',
    actionStatus: 'Action Status',
    makeBranchId: 'Branch ID',
    functionId: 'Function ID',
  };

  readonly authorizerHistoryColumns = [
    'authOrDecBy',
    'authOrDecDt',
    'authLevel',
    'authRemarks',
  ];

  readonly authorizerHistoryColumnNames: Record<string, string> = {
    authOrDecBy: 'Authorize Or Decline By',
    authOrDecDt: 'Authorize Or Decline Date',
    authLevel: 'Authorization Level',
    authRemarks: 'Authorization Remarks',
  };

  readonly detailGridColumns = ['columnName', 'oldValue', 'newValue'];
  readonly detailGridColumnNames: Record<string, string> = {
    columnName: 'Column Name',
    oldValue: 'Old Value',
    newValue: 'New Value',
  };

  readonly pageSizeOptions = [10, 25, 50, 100];

  readonly detailActionSvg = `
    <path d="M6 4.5h8.5L18 8v11.5H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
    <path d="M14.5 4.5V8H18M8.5 11h7M8.5 14h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
  `;

  readonly authorizerDetailActionSvg = `
    <path d="M5 5.5h14v13H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
    <path d="M8 9h8M8 12h8M8 15h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
  `;

  constructor() {
    effect(() => {
      const message = this.pageError();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.detailModalError();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.pageNotice();
      if (message) this.toast.info(message);
    });

    effect(() => {
      const message = this.successMessage();
      if (message) this.toast.success(message);
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
        this.featureRequest?.unsubscribe();
        this.queueRequest?.unsubscribe();
        this.detailsRequest?.unsubscribe();
        this.historyRequest?.unsubscribe();

        this.selectedUserId.set(userId);
        this.features.set([]);
        this.filterForm.reset({ featureId: '' }, { emitEvent: false });
        this.resetPageState(false);

        if (!userId) {
          this.pageError.set('Select a user from the workspace to open Authorization.');
          return;
        }

        this.loadFeatureList(userId);
      });

    this.filterForm.controls.featureId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((featureId) => {
        const normalizedFeatureId = String(featureId ?? '').trim();
        this.selectedFeatureId.set(normalizedFeatureId);
        this.loadAuthorizationQueue(normalizedFeatureId);
      });

  }

  loadFeatureList(userId: string = this.selectedUserId().trim()): void {
    this.featureRequest?.unsubscribe();
    this.pageError.set('');
    this.pageNotice.set('');

    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      this.features.set([]);
      this.pageError.set('Select a user from the workspace to load authorization functions.');
      return;
    }

    this.loadingFeatures.set(true);
    this.featureRequest = this.api
      .getFeatureListByUserId(normalizedUserId)
      .pipe(
        finalize(() => this.loadingFeatures.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (features) => {
          this.features.set(features);
          if (!features.length) {
            this.pageNotice.set(
              'No authorization functions are available for the selected user.',
            );
          }
        },
        error: (error: unknown) => {
          this.features.set([]);
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load authorization feature list.'),
          );
        },
      });
  }

  private loadAuthorizationQueue(featureId: string): void {
    this.queueRequest?.unsubscribe();
    this.authorizationRows.set([]);
    this.clearAuthorizerDetails();
    this.closeDetailModal();
    this.closeConfirmModal();
    this.pageError.set('');
    this.pageNotice.set('');

    if (!featureId) {
      return;
    }

    const selectedUserId = this.selectedUserId().trim();
    if (!selectedUserId) {
      this.pageError.set('Select a user from the workspace to load authorization requests.');
      return;
    }

    this.loadingQueue.set(true);
    this.queueRequest = this.api
      .getAuthorizationRequestListByUserIdAndFeature(selectedUserId, featureId)
      .pipe(
        finalize(() => this.loadingQueue.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.authorizationRows.set(this.mapAuthorizationRows(rows));

          if (!rows.length) {
            this.pageNotice.set(
              'No authorization requests are available for the selected user and function.',
            );
          }
        },
        error: (error: unknown) => {
          this.authorizationRows.set([]);
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load authorization queue.'),
          );
        },
      });
  }

  openDetails(actionPayload: unknown): void {
    const request = this.resolveRequest(actionPayload);
    if (!request) {
      this.pageError.set('Selected authorization request was not found.');
      return;
    }

    this.detailsRequest?.unsubscribe();
    this.pageError.set('');
    this.detailModalError.set('');
    this.selectedRequest.set(request);
    this.selectedRequestDetails.set(null);
    this.detailRows.set([]);
    this.decisionForm.reset({ remarks: '' });
    this.loadingDetails.set(true);

    this.detailsRequest = this.api
      .getAuthorizationRequestDetails(request.queueId)
      .pipe(
        finalize(() => this.loadingDetails.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (details) => {
          this.selectedRequestDetails.set(details);
          this.detailRows.set(this.mapChangeDetailRows(details.authLogTables ?? []));
          this.detailModalVisible.set(true);
        },
        error: (error: unknown) => {
          this.selectedRequest.set(null);
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load authorization details.'),
          );
        },
      });
  }

  showAuthorizerDetails(actionPayload: unknown): void {
    const request = this.resolveRequest(actionPayload);
    if (!request) {
      this.pageError.set('Selected authorization request was not found.');
      return;
    }

    this.historyRequest?.unsubscribe();
    this.pageError.set('');
    this.loadingDetails.set(true);

    this.historyRequest = this.api
      .getAuthorizationRequestDetails(request.queueId)
      .pipe(
        finalize(() => this.loadingDetails.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (details) => {
          this.activeAuthorizerQueueId.set(request.queueId);
          this.authorizerHistoryRows.set(
            this.mapAuthorizerHistoryRows(details.authLogDetails ?? []),
          );
          this.authorizerDetailsVisible.set(true);
          this.scrollToAuthorizerDetails();
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load authorizer details.'),
          );
        },
      });
  }

  openDecisionConfirmation(decision: AuthorizationDecision): void {
    if (!this.selectedRequest()) {
      return;
    }

    this.detailModalError.set('');
    if (this.decisionForm.invalid || !this.decisionForm.controls.remarks.value.trim()) {
      this.decisionForm.markAllAsTouched();
      this.detailModalError.set('Remarks is required before authorization or decline.');
      return;
    }

    this.pendingDecision.set(decision);
    this.confirmModalVisible.set(true);
  }

  confirmDecision(): void {
    const request = this.selectedRequest();
    const decision = this.pendingDecision();
    const remarks = this.decisionForm.controls.remarks.value.trim();

    if (!request || !decision || !remarks || this.processingDecision()) {
      return;
    }

    const payload: AuthorizationDecisionRequest = {
      queueID: request.queueId,
      remakrs: remarks,
    };

    this.decisionRequest?.unsubscribe();
    this.processingDecision.set(true);
    this.pageError.set('');

    const request$ =
      decision === 'Authorize'
        ? this.api.authorizeRequest(payload)
        : this.api.declineRequest(payload);

    this.decisionRequest = request$
      .pipe(
        finalize(() => this.processingDecision.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (apiMessage) => {
          this.closeConfirmModal();
          this.closeDetailModal();
          this.clearAuthorizerDetails();
          this.successMessage.set(
            apiMessage ||
              (decision === 'Authorize'
                ? 'Authorization completed successfully.'
                : 'Authorization declined successfully.'),
          );
          this.successModalVisible.set(true);
          this.refreshCurrentQueue();
        },
        error: (error: unknown) => {
          this.closeConfirmModal();
          this.detailModalError.set(
            this.getErrorMessage(error, 'Authorization decision failed.'),
          );
        },
      });
  }

  reset(): void {
    if (this.processingDecision()) {
      return;
    }
    this.filterForm.reset({ featureId: '' }, { emitEvent: false });
    this.resetPageState(true);
  }

  refresh(): void {
    if (!this.busy() && this.selectedFeatureId()) {
      this.loadAuthorizationQueue(this.selectedFeatureId());
    }
  }

  closeDetailModal(): void {
    this.detailModalVisible.set(false);
    this.detailModalError.set('');
    this.selectedRequest.set(null);
    this.selectedRequestDetails.set(null);
    this.detailRows.set([]);
    this.decisionForm.reset({ remarks: '' });
  }

  closeConfirmModal(): void {
    this.confirmModalVisible.set(false);
    this.pendingDecision.set(null);
  }

  closeSuccessModal(): void {
    this.successModalVisible.set(false);
    this.successMessage.set('');
  }

  onClose(): void {
    if (!this.processingDecision()) {
      void this.router.navigate(['../../'], { relativeTo: this.route });
    }
  }

  private refreshCurrentQueue(): void {
    const featureId = this.selectedFeatureId();
    if (featureId) {
      this.loadAuthorizationQueue(featureId);
    }
  }

  private resetPageState(clearMessages: boolean): void {
    this.selectedFeatureId.set('');
    this.authorizationRows.set([]);
    this.clearAuthorizerDetails();
    this.closeDetailModal();
    this.closeConfirmModal();
    this.closeSuccessModal();
    if (clearMessages) {
      this.pageError.set('');
      this.pageNotice.set('');
    }
  }

  private clearAuthorizerDetails(): void {
    this.activeAuthorizerQueueId.set('');
    this.authorizerDetailsVisible.set(false);
    this.authorizerHistoryRows.set([]);
  }

  private mapAuthorizationRows(rows: AuthorizationRequest[]): AuthorizationRequest[] {
    return rows.map((row) => ({
      ...row,
      queueId: String(row.queueId ?? ''),
      makeDt: this.formatDateForGrid(row.makeDt),
    }));
  }

  private mapAuthorizerHistoryRows(rows: AuthorizerHistoryRow[]): AuthorizerHistoryRow[] {
    return rows.map((row) => ({
      ...row,
      authOrDecDt: this.formatDateForGrid(row.authOrDecDt),
    }));
  }

  private mapChangeDetailRows(rows: AuthorizationChangeDetail[]): DetailGridRow[] {
    return rows.map((row, index) => {
      const rawRow = row as Record<string, unknown>;
      return {
        ...row,
        columnName: this.getDisplayValue(
          this.readFirstDefinedValue(rawRow, [
            'columnName',
            'ColumnName',
            'COLUMN_NAME',
            'columnNm',
            'ColumnNm',
            'fieldName',
            'FieldName',
            'field',
            'Field',
            'name',
            'Name',
          ]) ?? `Field ${index + 1}`,
        ),
        oldValue: this.getDisplayValue(
          this.readFirstDefinedValue(rawRow, [
            'oldValue',
            'OldValue',
            'OLD_VALUE',
            'oldVal',
            'OldVal',
            'previousValue',
            'PreviousValue',
          ]),
        ),
        newValue: this.getDisplayValue(
          this.readFirstDefinedValue(rawRow, [
            'newValue',
            'NewValue',
            'NEW_VALUE',
            'newVal',
            'NewVal',
            'currentValue',
            'CurrentValue',
          ]),
        ),
      };
    });
  }

  private resolveRequest(actionPayload: unknown): AuthorizationRequest | null {
    const queueId = this.resolveQueueId(actionPayload);
    if (!queueId) {
      return null;
    }
    return this.authorizationRows().find((row) => row.queueId === queueId) ?? null;
  }

  private resolveQueueId(actionPayload: unknown): string {
    if (typeof actionPayload === 'string') {
      const rawValue = actionPayload.trim();
      if (!rawValue.startsWith('{')) {
        return rawValue;
      }
      try {
        const rowData = JSON.parse(rawValue) as Record<string, unknown>;
        return this.queueIdFromObject(rowData);
      } catch {
        return '';
      }
    }

    if (!actionPayload || typeof actionPayload !== 'object') {
      return '';
    }
    return this.queueIdFromObject(actionPayload as Record<string, unknown>);
  }

  private queueIdFromObject(payload: Record<string, unknown>): string {
    const queueId = payload['queueId'] ?? payload['QueueId'] ?? payload['queueID'];
    return typeof queueId === 'string' || typeof queueId === 'number'
      ? String(queueId)
      : '';
  }

  private scrollToAuthorizerDetails(): void {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.authorizerDetailsSection?.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  }

  private formatDateForGrid(rawDate: string | null): string {
    if (!rawDate) {
      return '-';
    }

    const [datePart, timePart] = rawDate.split('T');
    const dateParts = datePart.split('-');
    if (dateParts.length !== 3) {
      return rawDate;
    }

    const [year, month, day] = dateParts;
    return timePart ? `${day}/${month}/${year} ${timePart}` : `${day}/${month}/${year}`;
  }

  private readFirstDefinedValue(
    row: Record<string, unknown>,
    candidateKeys: string[],
  ): unknown {
    for (const key of candidateKeys) {
      if (key in row && row[key] !== undefined) {
        return row[key];
      }
    }
    return null;
  }

  private getDisplayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: { Message?: string; message?: string } };
      const apiMessage = httpError.error?.Message || httpError.error?.message;
      if (apiMessage) {
        return apiMessage;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return fallbackMessage;
  }
}
