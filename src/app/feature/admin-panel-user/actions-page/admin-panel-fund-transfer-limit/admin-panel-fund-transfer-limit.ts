import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { InputTextBox } from '../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import {
  AdminPanelFundTransferService,
  GlobalResponse,
  IndividualFundTransferPayload,
} from '../../services/admin-panel-fund-transfer.service';
@Component({
  selector: 'app-admin-panel-fund-transfer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    InputTextBox,
    InputSelectOptionField,
    GenericButton,
    ActionConfirmationHost,
  ],
  templateUrl: './admin-panel-fund-transfer-limit.html',
})
export class AdminPanelFundTransfer implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fundTransferApi = inject(AdminPanelFundTransferService);
  private readonly loaderService = inject(LoaderService);
  private readonly confirmation = inject(ActionConfirmationService);
  private readonly toast = inject(ToastHelperService);
  private routeSub: Subscription | null = null;
  private transferTypeSub: Subscription | null = null;
  userId = '';
  userInfo: any = null;
  internalTransferTypes: any[] = [];
  userWisePolicies: any[] = [];
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly userInfoPanelOpen = signal(true);
  readonly fundLimitPanelOpen = signal(true);
  transferTypeOptions: { key: string; value: string }[] = [];
  readonly fundTransferForm = new FormGroup({
    userId: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    customerId: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    mobileNumber: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    transferType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    minAmountPerTrans: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    maxAmountPerTrans: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    maxAmountTransPerDay: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    maxNumOfTransPerDay: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  get hasFormChanges(): boolean {
    return this.fundTransferForm.dirty;
  }
  ngOnInit(): void {
    this.transferTypeSub =
      this.fundTransferForm.controls.transferType.valueChanges.subscribe(
        (transferType) => {
          if (transferType) this.populatePolicyByTransferType(transferType);
        },
      );
    this.routeSub = this.route.params.subscribe((params) => {
      const userId = params['userId'];
      if (!userId) {
        this.toast.error('User ID not found in route.', 'Error');
        return;
      }
      this.userId = String(userId);
      this.loadTransferTypes();
      this.loadUserInformation();
    });
  }
  private loadUserInformation(): void {
    if (!this.userId) return;
    this.loading.set(true);
    this.loaderService.show();
    this.fundTransferApi
      .getUserByUserId(this.userId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (response: GlobalResponse) => {
          if (
            response?.Status?.trim().toUpperCase() !== 'OK' ||
            !response?.Result
          ) {
            this.userInfo = null;
            this.toast.error(
              response?.Message || 'User information not found.',
              'Error',
            );
            return;
          }
          this.userInfo = response.Result;
          const regUser = response.Result?.regCustUser;
          this.fundTransferForm.patchValue({
            userId: regUser?.userId ?? this.userId,
            customerId: regUser?.customerId ?? '',
            mobileNumber: regUser?.mobileNumber ?? '',
          });
          this.loadUserWisePolicy(regUser?.userId || this.userId);
        },
        error: (error) => {
          this.userInfo = null;
          this.toast.error(
            this.getErrorMessage(error, 'Unable to retrieve user information.'),
            'Error',
          );
        },
      });
  }
  private loadTransferTypes(): void {
    this.fundTransferApi.getInternalFundTransferPolicy().subscribe({
      next: (response: GlobalResponse) => {
        if (
          response?.Status?.trim().toUpperCase() !== 'OK' ||
          !Array.isArray(response?.Result)
        ) {
          this.toast.warning(
            response?.Message || 'Transfer types could not be loaded.',
            'Warning',
          );
          return;
        }
        this.internalTransferTypes = response.Result;
        this.transferTypeOptions = this.internalTransferTypes.map(
          (item: any) => ({
            key: item.transferType,
            value: item.transferType,
          }),
        );
        if (
          !this.fundTransferForm.controls.transferType.value &&
          this.transferTypeOptions.length
        ) {
          this.fundTransferForm.controls.transferType.setValue(
            this.transferTypeOptions[0].key,
          );
        }
      },
      error: (error) => {
        this.toast.warning(
          this.getErrorMessage(error, 'Transfer types could not be loaded.'),
          'Warning',
        );
      },
    });
  }
  private loadUserWisePolicy(userId: string): void {
    this.fundTransferApi.getUserWiseFundTransferPolicy(userId).subscribe({
      next: (response: GlobalResponse) => {
        if (response?.Status?.trim().toUpperCase() !== 'OK') {
          this.userWisePolicies = [];
          this.populateDefaultPolicy();
          this.markFormClean();
          return;
        }
        this.userWisePolicies = Array.isArray(response?.Result)
          ? response.Result
          : [];
        if (this.userWisePolicies.length) {
          const firstPolicy = this.userWisePolicies[0];
          if (firstPolicy?.transferType) {
            this.fundTransferForm.controls.transferType.setValue(
              firstPolicy.transferType,
            );
          }
          this.patchPolicyValues(firstPolicy);
          this.markFormClean();
          return;
        }
        this.populateDefaultPolicy();
        this.markFormClean();
      },
      error: (error) => {
        this.userWisePolicies = [];
        this.toast.warning(
          this.getErrorMessage(
            error,
            'User-wise fund transfer policy could not be loaded.',
          ),
          'Warning',
        );
      },
    });
  }
  private populateDefaultPolicy(): void {
    const transferType = this.fundTransferForm.controls.transferType.value;
    if (transferType) {
      this.populatePolicyByTransferType(transferType);
    } else {
      this.clearLimitFields();
    }
  }
  private populatePolicyByTransferType(transferType: string): void {
    const userPolicy = this.userWisePolicies.find(
      (item) => item?.transferType === transferType,
    );
    if (userPolicy) {
      this.patchPolicyValues(userPolicy);
      return;
    }
    const defaultPolicy = this.internalTransferTypes.find(
      (item) => item?.transferType === transferType,
    );
    if (defaultPolicy) {
      this.patchPolicyValues(defaultPolicy);
      return;
    }
    this.clearLimitFields();
  }
  private patchPolicyValues(policy: any): void {
    this.fundTransferForm.patchValue({
      minAmountPerTrans: policy?.minAmountPerTrans ?? '',
      maxAmountPerTrans: policy?.maxAmountPerTrans ?? '',
      maxAmountTransPerDay: policy?.maxAmountTransPerDay ?? '',
      maxNumOfTransPerDay: policy?.maxNumOfTransPerDay ?? '',
    });
  }
  private clearLimitFields(): void {
    this.fundTransferForm.patchValue({
      minAmountPerTrans: '',
      maxAmountPerTrans: '',
      maxAmountTransPerDay: '',
      maxNumOfTransPerDay: '',
    });
  }
  async requestSave(): Promise<void> {
    if (this.loading() || this.saving()) return;
    if (!this.userInfo) {
      this.toast.warning('User information is not available.', 'Validation');
      return;
    }
    if (this.fundTransferForm.invalid) {
      this.fundTransferForm.markAllAsTouched();
      this.fundLimitPanelOpen.set(true);
      const invalidControl = this.getFirstInvalidControl();
      if (invalidControl)
        this.scrollToField('fund-transfer-form', invalidControl);
      this.toast.warning(
        'Please provide all required fund transfer limits.',
        'Validation',
      );
      return;
    }
    const transferType = this.fundTransferForm.controls.transferType.value;
    const confirmed = await this.confirmation.confirm('save', {
      title: 'Save Fund Transfer Limit',
      message: `Are you sure you want to save "${transferType}" fund transfer limit for user "${this.userId}"?`,
      confirmText: 'Yes, Save',
    });
    if (!confirmed) return;
    this.savePolicy();
  }
  async requestReset(): Promise<void> {
    if (this.loading() || this.saving() || !this.hasFormChanges) return;
    this.loadUserWisePolicy(this.userInfo?.regCustUser?.userId || this.userId);
    this.toast.info('Fund transfer limit has been reset.', 'Reset');
  }
  requestClose(): void {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private savePolicy(): void {
    const raw = this.fundTransferForm.getRawValue();
    const payload: IndividualFundTransferPayload = {
      TransferType: raw.transferType,
      MinAmountPerTrans: Number(raw.minAmountPerTrans) || 0,
      MaxAmountPerTrans: Number(raw.maxAmountPerTrans) || 0,
      MaxAmountTransPerDay: Number(raw.maxAmountTransPerDay) || 0,
      MaxNumOfTransPerDay: Number(raw.maxNumOfTransPerDay) || 0,
      UserId: this.userInfo?.regCustUser?.userId || this.userId,
    };
    this.saving.set(true);
    this.loaderService.show();
    this.fundTransferApi
      .saveIndividualFundTransferPolicy(payload)
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (response: GlobalResponse) => {
          if (response?.Status?.trim().toUpperCase() !== 'OK') {
            this.toast.error(
              response?.Message || 'Fund transfer limit could not be saved.',
              'Error',
            );
            return;
          }
          this.toast.success(
            response?.Message || 'Fund transfer limit updated successfully.',
            'Success',
          );
          this.loadUserWisePolicy(payload.UserId || this.userId);
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Unable to save fund transfer limit.'),
            'Error',
          );
        },
      });
  }
  private getFirstInvalidControl(): string | null {
    const controls = [
      'transferType',
      'minAmountPerTrans',
      'maxAmountPerTrans',
      'maxAmountTransPerDay',
      'maxNumOfTransPerDay',
    ];
    return (
      controls.find(
        (controlName) => this.fundTransferForm.get(controlName)?.invalid,
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
  private markFormClean(): void {
    this.fundTransferForm.markAsPristine();
    this.fundTransferForm.markAsUntouched();
  }
  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message.trim())
      return error.message.trim();
    if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as {
        error?: {
          Message?: unknown;
          message?: unknown;
        };
      };
      const message = httpError.error?.Message ?? httpError.error?.message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
    return fallbackMessage;
  }
  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.transferTypeSub?.unsubscribe();
  }
}
