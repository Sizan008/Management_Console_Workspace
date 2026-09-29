import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  Subscription,
  catchError,
  combineLatest,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import {
  SummaryDetailsComponent,
  SummaryDetailItem,
} from '../../../../shared/common-components/case-quick-view/summary-details/summary-details.component';
import {
  ConfirmationDialogue,
  DeleteConfirmationModalConfig,
} from '../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {
  RegisteredDevice,
  RemovedDevice,
  UserDeviceUser,
} from '../../models/user-device.model';
import { UserDeviceService } from '../../services/user-device.service';

import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-user-device',
  standalone: true,
  imports: [
    SummaryDetailsComponent,
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    ConfirmationDialogue,
  ],
  templateUrl: './admin-panel-user-device.html',
})
export class AdminPanelUserDeviceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(UserDeviceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastHelperService);
  private readonly reload = new Subject<void>();

  private deviceLoadRequest?: Subscription;
  private removeRequest?: Subscription;
  private selectedDeviceForRemoval: RegisteredDevice | null = null;

  readonly selectedUserId = signal('');
  readonly customerId = signal('');
  readonly user = signal<UserDeviceUser | null>(null);
  readonly activeDevices = signal<RegisteredDevice[]>([]);
  readonly removedDevices = signal<RemovedDevice[]>([]);

  readonly loading = signal(false);
  readonly deviceLoading = signal(false);
  readonly removing = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly informationOpen = signal(true);
  readonly activeDeviceOpen = signal(true);
  readonly removedDeviceOpen = signal(true);
  readonly confirmationOpen = signal(false);
  readonly confirmationConfig = signal<DeleteConfirmationModalConfig>({});

  readonly busy = computed(
    () => this.loading() || this.deviceLoading() || this.removing(),
  );

  readonly userDetails = computed<SummaryDetailItem[]>(() => {
    const user = this.user();
    return [
      { label: 'User ID', value: user?.userId || '—' },
      { label: 'User Name', value: user?.userNm || '—' },
      { label: 'Login ID', value: user?.loginId || '—' },
      { label: 'Branch ID', value: this.displayValue(user?.orgId) },
      { label: 'Customer ID', value: this.displayValue(user?.customerId) },
      { label: 'Email', value: user?.emailAddress || '—' },
      { label: 'Mobile Number', value: user?.mobileNumber || '—' },
      { label: 'User Description', value: user?.userDescrip || '—' },
      {
        label: 'User Status',
        value: this.booleanLabel(user?.userStatusActiveFlag, 'Active', 'Inactive'),
      },
      {
        label: 'Lock Status',
        value: this.booleanLabel(user?.lockedFlag, 'Locked', 'Unlocked'),
      },
      { label: 'Auth Status', value: this.authStatusLabel(user?.authStatusId) },
      {
        label: 'Authentication Type',
        value: this.displayValue(user?.authenticationTypeId),
      },
      {
        label: 'T-PIN Enabled',
        value: this.booleanLabel(user?.tpinEnabledFlag, 'Yes', 'No'),
      },
    ];
  });

  readonly activeDeviceColumns = ['deviceType', 'deviceToken', 'imeiNo', 'createDt'];
  readonly activeDeviceColumnNames: Record<string, string> = {
    deviceType: 'Device Type',
    deviceToken: 'Device Token',
    imeiNo: 'IMEI',
    createDt: 'Registered On',
  };

  readonly removedDeviceColumns = [
    'deviceType',
    'deviceToken',
    'imeiNo',
    'createDt',
    'removeDt',
  ];
  readonly removedDeviceColumnNames: Record<string, string> = {
    deviceType: 'Device Type',
    deviceToken: 'Device Token',
    imeiNo: 'IMEI',
    createDt: 'Registered On',
    removeDt: 'Removed On',
  };

  readonly cellRenderFunctions = {
    createDt: (value: unknown) => this.formatDate(value),
    removeDt: (value: unknown) => this.formatDate(value),
    deviceToken: (value: unknown) => this.formatDeviceToken(value),
  };

  constructor() {
    effect(() => {
      const message = this.errorMessage();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.successMessage();
      if (message) this.toast.success(message);
    });

  }

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap.pipe(
        map((params) => (params.get('userId') || '').trim()),
        distinctUntilChanged(),
      ),
      this.reload.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([userId]) => {
          this.cancelInFlightRequests();
          this.resetView(userId);

          if (!userId) {
            this.errorMessage.set('Select a user from the workspace to manage their devices.');
            return of(null);
          }

          this.loading.set(true);
          return this.api.getUser(userId).pipe(
            catchError((error: unknown) => {
              this.errorMessage.set(
                this.getErrorMessage(error, 'Unable to load the selected user.'),
              );
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((user) => {
        this.user.set(user);
        if (!user) {
          return;
        }

        const customerId = this.normalizeId(user.customerId);
        this.customerId.set(customerId);

        if (!customerId) {
          this.errorMessage.set(
            'Customer ID was not returned for the selected user, so device information cannot be loaded.',
          );
          return;
        }

        this.loadDevices(customerId);
      });
  }

  onRemoveDeviceClick(event: string | RegisteredDevice): void {
    if (this.busy()) {
      return;
    }

    const row = this.parseDeviceEvent(event);
    if (!row) {
      this.errorMessage.set('Unable to read the selected device.');
      return;
    }

    const deviceToken = row.deviceToken?.trim();
    if (!deviceToken) {
      this.errorMessage.set('The selected device does not contain a device token.');
      return;
    }

    this.selectedDeviceForRemoval = row;
    this.confirmationConfig.set({
      title: 'Remove Device',
      message: `Are you sure you want to remove "${row.deviceType || 'this device'}" from this user's active devices?`,
      variant: 'danger',
      buttons: [
        { text: 'Yes, Remove', action: 'confirm' },
        { text: 'Cancel', action: 'cancel' },
      ],
    });
    this.confirmationOpen.set(true);
  }

  onConfirmationButtonClick(event: { action: string }): void {
    const wasOpen = this.confirmationOpen();
    this.confirmationOpen.set(false);

    if (event.action !== 'confirm' || !wasOpen) {
      this.selectedDeviceForRemoval = null;
      return;
    }

    this.performRemoveDevice();
  }

  onCancelAction(): void {
    this.confirmationOpen.set(false);
    this.selectedDeviceForRemoval = null;
  }

  refresh(): void {
    if (!this.busy()) {
      this.reload.next();
    }
  }

  onClose(): void {
    if (!this.removing()) {
      void this.router.navigate(['../../'], { relativeTo: this.route });
    }
  }

  private loadDevices(customerId: string): void {
    this.deviceLoadRequest?.unsubscribe();
    this.deviceLoading.set(true);

    const warnings: string[] = [];
    this.deviceLoadRequest = forkJoin({
      active: this.api.getActiveDevice(customerId).pipe(
        catchError((error: unknown) => {
          warnings.push(this.getErrorMessage(error, 'Unable to load active devices.'));
          return of([] as RegisteredDevice[]);
        }),
      ),
      removed: this.api.getRemovedDevice(customerId).pipe(
        catchError((error: unknown) => {
          warnings.push(this.getErrorMessage(error, 'Unable to load removed devices.'));
          return of([] as RemovedDevice[]);
        }),
      ),
    })
      .pipe(
        finalize(() => this.deviceLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ active, removed }) => {
        this.activeDevices.set(active);
        this.removedDevices.set(removed);
        if (warnings.length) {
          this.errorMessage.set(warnings.join(' '));
        }
      });
  }

  private performRemoveDevice(): void {
    const customerId = this.customerId();
    const device = this.selectedDeviceForRemoval;
    const deviceToken = device?.deviceToken?.trim() || '';

    if (!customerId || !device || !deviceToken || this.removing()) {
      this.selectedDeviceForRemoval = null;
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.removing.set(true);

    this.removeRequest = this.api
      .removeRegisteredDevice(customerId, deviceToken)
      .pipe(
        finalize(() => this.removing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (message) => {
          this.successMessage.set(message);
          this.selectedDeviceForRemoval = null;
          this.loadDevices(customerId);
        },
        error: (error: unknown) => {
          this.selectedDeviceForRemoval = null;
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to remove the selected device.'),
          );
        },
      });
  }

  private resetView(userId: string): void {
    this.selectedUserId.set(userId);
    this.customerId.set('');
    this.user.set(null);
    this.activeDevices.set([]);
    this.removedDevices.set([]);
    this.loading.set(false);
    this.deviceLoading.set(false);
    this.removing.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.informationOpen.set(true);
    this.activeDeviceOpen.set(true);
    this.removedDeviceOpen.set(true);
    this.confirmationOpen.set(false);
    this.selectedDeviceForRemoval = null;
  }

  private cancelInFlightRequests(): void {
    this.deviceLoadRequest?.unsubscribe();
    this.removeRequest?.unsubscribe();
  }

  private parseDeviceEvent(event: string | RegisteredDevice): RegisteredDevice | null {
    if (typeof event !== 'string') {
      return event;
    }

    try {
      return JSON.parse(event) as RegisteredDevice;
    } catch {
      return null;
    }
  }

  private displayValue(value: string | number | null | undefined): string | number {
    return value === null || value === undefined || value === '' ? '—' : value;
  }

  private normalizeId(value: string | number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  private booleanLabel(
    value: boolean | number | string | null | undefined,
    trueLabel: string,
    falseLabel: string,
  ): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const normalized = String(value).trim().toLowerCase();
    const truthy = value === true || value === 1 || ['1', 'true', 'y', 'yes'].includes(normalized);
    return truthy ? trueLabel : falseLabel;
  }

  private authStatusLabel(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '—';
    }
    return value.trim().toUpperCase() === 'A' ? 'Authorized' : 'Pending';
  }

  private formatDate(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${date.getFullYear()}`;
  }

  private formatDeviceToken(value: unknown): string {
    if (typeof value !== 'string') {
      return value === null || value === undefined ? '' : String(value);
    }
    return value.length > 24 ? `${value.slice(0, 24)}…` : value;
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
