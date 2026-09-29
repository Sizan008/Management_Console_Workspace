import {
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { LoaderService } from '../../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../../shared/common-componets/action-confirmation-host';
import { AdminPanelManageNpsbBankService } from '../../../services/admin-panel-manage-npsb-bank.service';
import { NpsbBank } from '../../../models/manage-npsb-bank.model';
import {
  BUTTON_VISIBILITY,
  ONCLICK_UPDATE,
  ONCLICK_RESET,
} from '../../../../../shared/constant/button-signals.constant';
interface GridCheckedEvent {
  data: unknown;
  checked: boolean;
}
interface GridSelectAllEvent {
  isSelectAll: boolean;
  selectedRows: unknown[];
}
interface BankUpdateResult {
  bank: NpsbBank;
  response: any;
  error: unknown | null;
}
@Component({
  selector: 'app-manage-npsb-bank',
  standalone: true,
  imports: [
    CommonModule,
    ExpansionPanelHeader,
    GenericDataGrid,
    ActionConfirmationHost,
  ],
  templateUrl: './manage-npsb-bank.html',
})
export class ManageNpsbBank implements OnInit, OnDestroy {
  private readonly api = inject(AdminPanelManageNpsbBankService);
  private readonly loader = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly isNpsbBankPanelOpen = signal(true);
  readonly loading = signal(false);
  readonly banks = signal<NpsbBank[]>([]);
  readonly selectedBankCodes = signal<string[]>([]);
  readonly gridVisible = signal(true);
  readonly columns = ['bankCode', 'bankName', 'bankShName', 'isEnabled'];
  readonly columnNames = {
    bankCode: 'Bank Code',
    bankName: 'Bank Name',
    bankShName: 'Bank Short Name',
    isEnabled: 'Status',
  };
  private readonly statusChangeHandler = (event: Event): void => {
    const customEvent = event as CustomEvent<string>;
    const bankCode = String(customEvent.detail ?? '');
    const bank = this.banks().find(
      (item) => String(item.bankCode) === bankCode,
    );
    if (!bank) {
      this.toast.error('Bank information not found.', 'Error');
      return;
    }
    this.requestStatusChange([bank]);
  };
  constructor() {
    this.initializeButtonVisibility();
    this.initializeGlobalActions();
  }
  private initializeButtonVisibility(): void {
    BUTTON_VISIBILITY.set({
      save: false,
      saveNext: false,
      update: true,
      updateNext: false,
      view: false,
      delete: false,
      reset: true,
      exit: false,
    });
  }
  private initializeGlobalActions(): void {
    effect(() => {
      if (ONCLICK_UPDATE()) {
        ONCLICK_UPDATE.set(false);
        this.requestGlobalUpdate();
      }
    });
    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.requestReset();
      }
    });
  }
  ngOnInit(): void {
    this.loadBanks();
    window.addEventListener(
      'npsbStatusChange',
      this.statusChangeHandler as EventListener,
    );
  }
  ngOnDestroy(): void {
    window.removeEventListener(
      'npsbStatusChange',
      this.statusChangeHandler as EventListener,
    );
  }
  requestReset(): void {
    if (this.loading()) return;
    window.location.reload();
  }
  onBankChecked(event: GridCheckedEvent): void {
    const bank = this.parseBank(event.data);
    if (!bank) return;
    const bankCode = String(bank.bankCode);
    this.selectedBankCodes.update((codes) => {
      if (event.checked) {
        return codes.includes(bankCode) ? codes : [...codes, bankCode];
      }
      return codes.filter((code) => code !== bankCode);
    });
  }
  onBankSelectAll(event: GridSelectAllEvent): void {
    if (!event.isSelectAll) {
      this.selectedBankCodes.set([]);
      return;
    }
    const codes = event.selectedRows
      .map((row) => this.parseBank(row))
      .filter((bank): bank is NpsbBank => !!bank)
      .map((bank) => String(bank.bankCode));
    this.selectedBankCodes.set([...new Set(codes)]);
  }
  requestGlobalUpdate(): void {
    if (this.loading()) return;
    const selectedCodes = new Set(this.selectedBankCodes());
    const selectedBanks = this.banks().filter((bank) =>
      selectedCodes.has(String(bank.bankCode)),
    );
    if (!selectedBanks.length) {
      this.toast.warning(
        'Please select at least one bank from the list.',
        'Validation',
      );
      return;
    }
    this.requestStatusChange(selectedBanks);
  }
  onStatusAction(event: unknown): void {
    const bank = this.parseBank(event);
    if (!bank) {
      this.toast.error('Bank information not found.', 'Error');
      return;
    }
    this.requestStatusChange([bank]);
  }
  private async requestStatusChange(banks: NpsbBank[]): Promise<void> {
    if (this.loading() || !banks.length) return;
    let message = '';
    if (banks.length === 1) {
      const bank = banks[0];
      const action = bank.isEnabled ? 'disable' : 'enable';
      message = `Are you sure you want to ${action} "${bank.bankName}"?`;
    } else {
      message = `Are you sure you want to update status for ${banks.length} selected banks? Each selected bank will switch to the opposite of its current status.`;
    }
    const confirmed = await this.confirmation.confirm('update', {
      title:
        banks.length === 1
          ? 'Bank Status Change'
          : 'Update Selected Bank Status',
      message,
      confirmText: banks.length === 1 ? 'Yes, Confirm' : 'Yes, Update All',
    });
    if (!confirmed) return;
    this.performStatusUpdate(banks);
  }
  private performStatusUpdate(selectedBanks: NpsbBank[]): void {
    if (this.loading() || !selectedBanks.length) return;
    this.loading.set(true);
    this.loader.show();
    const requests = selectedBanks.map((bank) =>
      this.api
        .changeBankStatus({
          npsbBankId: bank.bankCode,
          isEnabled: !bank.isEnabled,
        })
        .pipe(
          map(
            (response): BankUpdateResult => ({
              bank,
              response,
              error: null,
            }),
          ),
          catchError((error) =>
            of<BankUpdateResult>({
              bank,
              response: null,
              error,
            }),
          ),
        ),
    );
    forkJoin(requests)
      .pipe(
        switchMap((results: BankUpdateResult[]) => {
          const successfulResults = results.filter((result) =>
            this.isSuccessResponse(result.response),
          );
          if (successfulResults.length) {
            const successfulCodes = new Set(
              successfulResults.map((result) => String(result.bank.bankCode)),
            );
            this.banks.update((rows) =>
              rows.map((row) => {
                if (!successfulCodes.has(String(row.bankCode))) return row;
                return {
                  ...row,
                  isEnabled: !row.isEnabled,
                };
              }),
            );
          }
          this.clearSelection();
          return this.api.getAllNpsbBank().pipe(
            map((refreshResponse) => ({
              results,
              refreshResponse,
              refreshError: null as unknown,
            })),
            catchError((refreshError) =>
              of({
                results,
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
        next: ({ results, refreshResponse, refreshError }) => {
          if (refreshResponse?.Status?.toUpperCase() === 'OK') {
            this.banks.set(refreshResponse.Result ?? []);
          } else if (refreshResponse) {
            this.toast.warning(
              refreshResponse.Message || 'Bank list refresh failed.',
              'Warning',
            );
          } else if (refreshError) {
            this.toast.warning(
              this.getErrorMessage(
                refreshError,
                'Bank status updated, but bank list refresh failed.',
              ),
              'Warning',
            );
          }
          const successResults = results.filter((result) =>
            this.isSuccessResponse(result.response),
          );
          const failedResults = results.filter(
            (result) => !this.isSuccessResponse(result.response),
          );
          if (successResults.length && failedResults.length === 0) {
            this.toast.success(
              successResults.length === 1
                ? successResults[0].response?.Message ||
                    'Bank status updated successfully.'
                : `${successResults.length} bank statuses updated successfully.`,
              'Success',
            );
            return;
          }
          if (successResults.length && failedResults.length) {
            this.toast.warning(
              `${successResults.length} bank(s) updated successfully and ${failedResults.length} bank(s) failed to update.`,
              'Partial Success',
            );
            return;
          }
          const firstFailure = failedResults[0];
          if (firstFailure?.error) {
            this.toast.error(
              this.getErrorMessage(
                firstFailure.error,
                'Bank status update failed.',
              ),
              'Error',
            );
            return;
          }
          this.toast.error(
            firstFailure?.response?.Message || 'Bank status update failed.',
            'Error',
          );
        },
        error: (error) => {
          this.clearSelection();
          this.toast.error(
            this.getErrorMessage(error, 'Bank status update failed.'),
            'Error',
          );
        },
      });
  }
  private clearSelection(): void {
    this.selectedBankCodes.set([]);
    this.gridVisible.set(false);
    setTimeout(() => {
      this.gridVisible.set(true);
    }, 0);
  }
  private loadBanks(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loader.show();
    this.api
      .getAllNpsbBank()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.Status?.toUpperCase() === 'OK') {
            this.banks.set(response.Result ?? []);
            this.clearSelection();
          } else {
            this.toast.error(
              response.Message || 'Unable to load bank list.',
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Unable to load bank list.'),
            'Error',
          );
        },
      });
  }
  private isSuccessResponse(response: any): boolean {
    return response?.Status?.trim().toUpperCase() === 'OK';
  }
  private parseBank(value: unknown): NpsbBank | null {
    if (!value) return null;
    let row: unknown = value;
    if (typeof row === 'string') {
      try {
        row = JSON.parse(row);
      } catch {
        return (
          this.banks().find((bank) => String(bank.bankCode) === String(row)) ??
          null
        );
      }
    }
    if (typeof row !== 'object' || row === null) return null;
    const record = row as Record<string, unknown>;
    const bankCode = String(record['bankCode'] ?? '');
    if (!bankCode) return null;
    return (
      this.banks().find((bank) => String(bank.bankCode) === bankCode) ?? null
    );
  }
  readonly cellRenderFunctions = {
    isEnabled: (value: boolean, row: NpsbBank) => {
      const statusText = value ? 'Enabled' : 'Disabled';
      const statusColor = value ? '#15803d' : '#b91c1c';
      const statusBackground = value ? '#dcfce7' : '#fee2e2';
      const buttonText = value ? 'Disable' : 'Enable';
      const buttonColor = value ? '#dc2626' : '#16a34a';
      const encodedBankCode = encodeURIComponent(String(row.bankCode));
      return `
<div style="display:flex;align-items:center;gap:7px;min-height:24px;">
<span style="display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;background:${statusBackground};color:${statusColor};font-size:11px;font-weight:600;line-height:17px;white-space:nowrap;">${statusText}</span>
<button type="button" style="height:22px;min-width:56px;display:inline-flex;align-items:center;justify-content:center;background:${buttonColor};color:#fff;border:0;padding:0 8px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;line-height:1;box-shadow:0 1px 2px rgba(15,23,42,.12);" onclick="window.dispatchEvent(new CustomEvent('npsbStatusChange',{detail:decodeURIComponent('${encodedBankCode}')}))">${buttonText}</button>
</div>
`;
    },
  };
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
}
