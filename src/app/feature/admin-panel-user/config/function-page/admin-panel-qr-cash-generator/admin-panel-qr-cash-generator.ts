import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ConfirmationDialogue,
  DeleteConfirmationModalConfig,
} from '../../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { InputSelectOptionField } from '../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import {
  ButtonUtils,
  ONCLICK_RESET,
} from '../../../../../shared/constant/button-signals.constant';
import { SidebarService } from '../../../../../layout/service/sidebar.service';
import {
  QrCashBranch,
  QrCashSelectOption,
} from '../../../models/qr-cash-generator.model';
import { QrCashGeneratorService } from '../../../services/qr-cash-generator.service';

import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-qr-cash-generator',
  standalone: true,
  imports: [
    ExpansionPanelHeader,
    GenericButton,
    InputSelectOptionField,
    InputTextBox,
    ConfirmationDialogue,
  ],
  templateUrl: './admin-panel-qr-cash-generator.html',
})
export class AdminPanelQrCashGeneratorComponent implements OnInit {
  private readonly api = inject(QrCashGeneratorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebarService = inject(SidebarService);
  private readonly toast = inject(ToastHelperService);

  readonly searchPanelOpen = signal(true);
  readonly qrPanelOpen = signal(true);

  readonly branchOptions = signal<QrCashSelectOption[]>([]);
  readonly qrCode = signal('');

  readonly loadingBranches = signal(false);
  readonly generating = signal(false);
  readonly pageError = signal('');
  readonly pageNotice = signal('');
  readonly downloadConfirmationOpen = signal(false);

  readonly busy = computed(() => this.loadingBranches() || this.generating());

  readonly searchForm = new FormGroup({
    branchId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    tellerId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly downloadConfirmationConfig: DeleteConfirmationModalConfig = {
    title: 'Download QR Code',
    message: 'Are you sure you want to download this QR Code?',
    variant: 'info',
    buttons: [
      { text: 'Yes, Download', action: 'confirm' },
      { text: 'Cancel', action: 'cancel' },
    ],
  };

  constructor() {
    effect(() => {
      const message = this.pageError();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.pageNotice();
      if (message) this.toast.success(message);
    });

    ButtonUtils.resetAllButtons();
    ButtonUtils.resetAllClickSignals();
    ButtonUtils.resetFormGroup();

    effect(() => {
      untracked(() => {
        ButtonUtils.setPageButtons({
          reset: { visible: true, enabled: this.busy() },
        });
      });
    });

    effect(() => {
      if (!ONCLICK_RESET()) return;
      ONCLICK_RESET.set(false);
      this.reset();
    });

    this.destroyRef.onDestroy(() => ButtonUtils.resetAllClickSignals());
  }

  ngOnInit(): void {
    this.applyRouteTitle();
    this.loadBranchList();
  }

  loadBranchList(): void {
    this.loadingBranches.set(true);
    this.pageError.set('');

    this.api
      .getBranchList()
      .pipe(
        finalize(() => this.loadingBranches.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response.Status)) {
            this.branchOptions.set([]);
            this.pageError.set(
              response.Message?.trim() || 'Unable to load branch list.',
            );
            return;
          }

          const branches = Array.isArray(response.Result) ? response.Result : [];
          this.branchOptions.set(this.buildBranchOptions(branches));

          if (!branches.length) {
            this.pageError.set('No branches are available.');
          }
        },
        error: (error: unknown) => {
          this.branchOptions.set([]);
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load branch list.'),
          );
        },
      });
  }

  generateQrCode(): void {
    if (this.generating()) {
      return;
    }

    const { branchId, tellerId } = this.searchForm.getRawValue();
    const normalizedBranchId = branchId.trim();
    const normalizedTellerId = tellerId.trim();

    if (!normalizedBranchId || !normalizedTellerId) {
      this.searchForm.markAllAsTouched();
      this.pageError.set('Please select Branch and enter Teller ID.');
      return;
    }

    this.pageError.set('');
    this.pageNotice.set('');
    this.qrCode.set('');
    this.generating.set(true);

    this.api
      .generateQrCode(normalizedBranchId, normalizedTellerId)
      .pipe(
        finalize(() => this.generating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response.Status)) {
            this.pageError.set(
              response.Message?.trim() || 'Failed to generate QR Code.',
            );
            return;
          }

          const generatedQrCode = String(response.Result ?? '').trim();
          if (!generatedQrCode) {
            this.pageError.set(
              response.Message?.trim() ||
                'QR Code generation succeeded but no QR image was returned.',
            );
            return;
          }

          this.qrCode.set(generatedQrCode);
          this.qrPanelOpen.set(true);
          this.pageNotice.set(
            response.Message?.trim() || 'QR Code generated successfully.',
          );
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'An error occurred while generating QR Code.'),
          );
        },
      });
  }

  requestDownload(): void {
    if (!this.qrCode()) {
      this.pageError.set('No QR Code is available to download.');
      return;
    }

    this.downloadConfirmationOpen.set(true);
  }

  onDownloadConfirmation(event: { action: string }): void {
    this.downloadConfirmationOpen.set(false);
    if (event.action === 'confirm') {
      this.downloadQrCode();
    }
  }

  reset(): void {
    if (this.generating()) {
      return;
    }

    this.searchForm.reset({
      branchId: '',
      tellerId: '',
    });
    this.qrCode.set('');
    this.pageError.set('');
    this.pageNotice.set('');
    this.downloadConfirmationOpen.set(false);
  }

  private downloadQrCode(): void {
    const qrCode = this.qrCode();
    if (!qrCode) {
      return;
    }

    const { branchId, tellerId } = this.searchForm.getRawValue();
    const suffix = [branchId, tellerId]
      .map((value) => this.safeFilePart(value))
      .filter(Boolean)
      .join('-');

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = suffix ? `qr-cash-${suffix}.png` : 'qr-cash.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private buildBranchOptions(branches: QrCashBranch[]): QrCashSelectOption[] {
    const options: QrCashSelectOption[] = [];
    const seen = new Set<string>();

    for (const branch of branches) {
      // The current backend uses brancH_ID/brancH_NM. The fallbacks keep this
      // feature compatible with the older Management Console response variants.
      const id = String(
        branch?.brancH_ID ?? branch?.branchId ?? branch?.BRANCH_ID ?? branch?.id ?? '',
      ).trim();
      const name = String(
        branch?.brancH_NM ?? branch?.branchNm ?? branch?.BRANCH_NM ?? branch?.name ?? '',
      ).trim();

      if (!id || seen.has(id)) {
        continue;
      }

      seen.add(id);
      options.push({
        key: id,
        value: name ? `${id} : ${name}` : id,
      });
    }

    return options;
  }

  private safeFilePart(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private isOk(status: unknown): boolean {
    return String(status ?? '').trim().toUpperCase() === 'OK';
  }

  private applyRouteTitle(): void {
    const title = String(this.route.snapshot.data['title'] ?? '').trim();
    if (!title) return;

    const timer = setTimeout(() => this.sidebarService.setCurrentPageName(title));
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as
        | { Message?: unknown; message?: unknown; error?: unknown }
        | string
        | null;

      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }

      if (body && typeof body === 'object') {
        for (const candidate of [body.Message, body.message, body.error]) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
      }

      if (error.status === 0) {
        return 'Unable to connect to the CloudNetConsole server.';
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return fallback;
  }
}
