import {
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { LoaderService } from '../../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../../shared/common-componets/action-confirmation-host';
import {
  BUTTON_VISIBILITY,
  ONCLICK_RESET,
} from '../../../../../shared/constant/button-signals.constant';
import { AdminPanelTransactionBillService } from '../../../services/admin-panel-transaction-bill.service';
import {
  TransactionBillService,
  TransactionBillStatusRequest,
} from '../../../models/transaction-bill-service.model';
@Component({
  selector: 'app-transaction-bill-service',
  standalone: true,
  imports: [
    CommonModule,
    ExpansionPanelHeader,
    GenericDataGrid,
    ActionConfirmationHost,
  ],
  templateUrl: './transaction-bill-service.html',
})
export class TransactionBillServiceComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminPanelTransactionBillService);
  private readonly loader = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly isTransactionBillPanelOpen = signal(true);
  readonly loading = signal(false);
  readonly transactionBillGrid = signal<TransactionBillService[]>([]);
  readonly selectedColumns = [
    'serviceId',
    'serviceName',
    'pvCode',
    'serviceTypeName',
    'status',
  ];
  readonly customColumnNames = {
    serviceId: 'ID',
    serviceName: 'Service Name',
    pvCode: 'PV Code',
    serviceTypeName: 'Service Type',
    status: 'Status',
  };
  private readonly statusChangeHandler = (event: Event): void => {
    const customEvent = event as CustomEvent<string>;
    const serviceId = String(customEvent.detail ?? '');
    const service = this.transactionBillGrid().find(
      (item) => String(item.serviceId) === serviceId,
    );
    if (!service) {
      this.toast.error(
        'Transaction or Bill service information not found.',
        'Error',
      );
      return;
    }
    this.requestStatusChange(service);
  };
  readonly cellRenderFunctions = {
    status: (value: unknown, row: TransactionBillService) => {
      const enabled = this.isEnabledStatus(value);
      const statusText = enabled ? 'Enabled' : 'Disabled';
      const statusColor = enabled ? '#15803d' : '#b91c1c';
      const statusBackground = enabled ? '#dcfce7' : '#fee2e2';
      const statusBorder = enabled ? '#bbf7d0' : '#fecaca';
      const buttonText = enabled ? 'Disable' : 'Enable';
      const buttonColor = enabled ? '#dc2626' : '#16a34a';
      const encodedServiceId = encodeURIComponent(
        String(row.serviceId),
      ).replace(/'/g, '%27');
      return `
<div style="display:flex;align-items:center;gap:7px;min-height:24px;white-space:nowrap;">
<span style="display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:9999px;border:1px solid ${statusBorder};background:${statusBackground};color:${statusColor};font-size:11px;font-weight:600;line-height:1;">${statusText}</span>
<button type="button" style="height:22px;min-width:56px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:4px;background:${buttonColor};color:#fff;padding:0 8px;font-size:11px;font-weight:600;line-height:1;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.12);" onclick="window.dispatchEvent(new CustomEvent('transactionBillStatusChange',{detail:decodeURIComponent('${encodedServiceId}')}))">${buttonText}</button>
</div>
`;
    },
  };
  constructor() {
    this.initializeButtonVisibility();
    this.initializeGlobalActions();
  }
  private initializeButtonVisibility(): void {
    BUTTON_VISIBILITY.set({
      save: false,
      saveNext: false,
      update: false,
      updateNext: false,
      view: false,
      delete: false,
      exit: false,
      reset: true,
    });
  }
  private initializeGlobalActions(): void {
    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.requestRefresh();
      }
    });
  }
  ngOnInit(): void {
    this.loadData();
    window.addEventListener(
      'transactionBillStatusChange',
      this.statusChangeHandler as EventListener,
    );
  }
  ngOnDestroy(): void {
    window.removeEventListener(
      'transactionBillStatusChange',
      this.statusChangeHandler as EventListener,
    );
  }
  requestRefresh(): void {
    if (this.loading()) return;
    window.location.reload();
  }
  private loadData(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loader.show();
    this.api
      .getAllTransactionBillServices()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.Status?.toUpperCase() === 'OK') {
            this.transactionBillGrid.set(response.Result ?? []);
          } else {
            this.transactionBillGrid.set([]);
            this.toast.error(
              response.Message || 'Failed to load service list.',
              'Error',
            );
          }
        },
        error: (error) => {
          this.transactionBillGrid.set([]);
          this.toast.error(
            this.getErrorMessage(error, 'Failed to load service list.'),
            'Error',
          );
        },
      });
  }
  async toggleServiceStatus(event: any): Promise<void> {
    if (this.loading()) return;
    const service = this.resolveService(event);
    if (!service) {
      this.toast.error(
        'Transaction or Bill service information not found.',
        'Error',
      );
      return;
    }
    await this.requestStatusChange(service);
  }
  private async requestStatusChange(
    service: TransactionBillService,
  ): Promise<void> {
    if (this.loading()) return;
    const enabled = this.isEnabledStatus(service.status);
    const action = enabled ? 'disable' : 'enable';
    const confirmed = await this.confirmation.confirm('update', {
      title: 'Service Status Change',
      message: `Are you sure you want to ${action} "${service.serviceName}"?`,
      confirmText: enabled ? 'Yes, Disable' : 'Yes, Enable',
    });
    if (!confirmed) return;
    this.changeStatus(service);
  }
  private changeStatus(row: TransactionBillService): void {
    if (this.loading()) return;
    const nextStatus = !this.isEnabledStatus(row.status);
    const payload: TransactionBillStatusRequest = {
      ...row,
      status: nextStatus,
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .changeServiceStatus(payload)
      .pipe(
        switchMap((updateResponse) => {
          if (updateResponse.Status?.toUpperCase() !== 'OK') {
            return of({
              updateResponse,
              refreshResponse: null,
              refreshError: null as unknown,
            });
          }
          this.transactionBillGrid.update((rows) =>
            rows.map((item) =>
              String(item.serviceId) === String(row.serviceId)
                ? {
                    ...item,
                    status: nextStatus,
                  }
                : item,
            ),
          );
          return this.api.getAllTransactionBillServices().pipe(
            map((refreshResponse) => ({
              updateResponse,
              refreshResponse,
              refreshError: null as unknown,
            })),
            catchError((refreshError) =>
              of({
                updateResponse,
                refreshResponse: null,
                refreshError,
              }),
            ),
          );
        }),
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: ({ updateResponse, refreshResponse, refreshError }) => {
          if (updateResponse.Status?.toUpperCase() !== 'OK') {
            this.toast.error(
              updateResponse.Message || 'Status update failed.',
              'Error',
            );
            return;
          }
          if (refreshResponse?.Status?.toUpperCase() === 'OK') {
            this.transactionBillGrid.set(refreshResponse.Result ?? []);
            this.toast.success(
              updateResponse.Message || 'Service status updated successfully.',
              'Success',
            );
            return;
          }
          this.toast.success(
            updateResponse.Message || 'Service status updated successfully.',
            'Success',
          );
          if (refreshResponse) {
            this.toast.warning(
              refreshResponse.Message || 'Service list refresh failed.',
              'Warning',
            );
            return;
          }
          if (refreshError) {
            this.toast.warning(
              this.getErrorMessage(
                refreshError,
                'Status updated but service list refresh failed.',
              ),
              'Warning',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Status update failed.'),
            'Error',
          );
        },
      });
  }
  private resolveService(event: unknown): TransactionBillService | null {
    if (!event) return null;
    if (typeof event === 'string') {
      const directService = this.transactionBillGrid().find(
        (item) => String(item.serviceId) === event,
      );
      if (directService) return directService;
      try {
        const parsed = JSON.parse(event);
        return this.resolveService(parsed);
      } catch {
        return null;
      }
    }
    if (typeof event !== 'object' || event === null) return null;
    const row = event as Record<string, unknown>;
    const serviceId = row['serviceId'] ?? row['id'];
    if (serviceId === undefined || serviceId === null) return null;
    return (
      this.transactionBillGrid().find(
        (item) => String(item.serviceId) === String(serviceId),
      ) ?? null
    );
  }
  private isEnabledStatus(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return (
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'enabled' ||
        normalized === 'enable' ||
        normalized === 'active' ||
        normalized === 'yes'
      );
    }
    return false;
  }
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    if (error && typeof error === 'object') {
      const httpError = error as {
        message?: unknown;
        error?: {
          Message?: unknown;
          message?: unknown;
        };
      };
      const message =
        httpError.error?.Message ??
        httpError.error?.message ??
        httpError.message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
    return fallback;
  }
}
