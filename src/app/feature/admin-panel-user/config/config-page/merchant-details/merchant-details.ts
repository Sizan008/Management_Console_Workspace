import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { LoaderService } from '../../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../../shared/common-componets/action-confirmation-host';
import {
  BUTTON_VISIBILITY,
  FormGroupSignal,
  ONCLICK_UPDATE,
  ONCLICK_RESET,
} from '../../../../../shared/constant/button-signals.constant';
import { AdminPanelMerchantDetailsService } from '../../../services/admin-panel-merchant-details.service';
import {
  MerchantDetail,
  MerchantGridRow,
  MerchantPageInitialData,
  MerchantBenefitType,
  SaveMerchantBenefitRequest,
} from '../../../models/merchant-details.model';
@Component({
  selector: 'app-merchant-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    GenericDataGrid,
    InputTextBox,
    InputSelectOptionField,
    ActionConfirmationHost,
  ],
  templateUrl: './merchant-details.html',
})
export class MerchantDetails implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminPanelMerchantDetailsService);
  private readonly loader = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly loading = signal(false);
  readonly merchantInformationPanelOpen = signal(true);
  readonly merchantListPanelOpen = signal(true);
  readonly merchantTypes = signal<MerchantBenefitType[]>([]);
  readonly merchants = signal<MerchantDetail[]>([]);
  readonly editingMerchant = signal<MerchantDetail | null>(null);
  readonly merchantForm = this.fb.group({
    merchantType: [{ value: '', disabled: true }, Validators.required],
    merchantName: [
      { value: '', disabled: true },
      [Validators.required, Validators.maxLength(150)],
    ],
    discountAmount: [{ value: '', disabled: true }],
    description: [{ value: '', disabled: true }],
    mobileNumber: [{ value: '', disabled: true }],
    webUrl: [{ value: '', disabled: true }],
    address: [{ value: '', disabled: true }],
  });
  readonly merchantTypeOptions = computed(() => {
    return this.merchantTypes().map((item) => ({
      key: item.id,
      value: item.name,
    }));
  });
  readonly merchantGridColumns = [
    'benefitId',
    'merchantType',
    'merchantName',
    'description',
  ];
  readonly merchantGridColumnNames = {
    benefitId: 'ID',
    merchantType: 'Merchant Type',
    merchantName: 'Merchant Name',
    description: 'Description',
  };
  readonly merchantGridRows = computed<MerchantGridRow[]>(() => {
    return this.merchants().map((item) => ({
      benefitId: item.benefitId,
      merchantType: item.merchantType,
      merchantName: item.merchantName,
      description: item.discountInfo,
    }));
  });
  readonly editActionSvg = `
<path d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5Z" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M14 7l3 3" fill="none" stroke="currentColor" stroke-width="2"/>
`;
  readonly deleteActionSvg = `
<path d="M5 7h14" stroke="currentColor" stroke-width="2"/>
<path d="M9 7V4h6v3" stroke="currentColor" stroke-width="2"/>
<path d="M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="2"/>
`;
  constructor() {
    this.initializeButtonVisibility();
    this.initializeGlobalActions();
    FormGroupSignal.set(this.merchantForm);
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
      if (ONCLICK_UPDATE()) {
        ONCLICK_UPDATE.set(false);
        this.requestUpdate();
      }
    });
    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.requestReset();
      }
    });
  }
  private updateButtonVisibility(): void {
    BUTTON_VISIBILITY.update((value) => ({
      ...value,
      save: false,
      update: !!this.editingMerchant(),
      reset: true,
      exit: false,
    }));
  }
  ngOnInit(): void {
    this.updateButtonVisibility();
    this.loadInitialData();
  }
  private loadInitialData(): void {
    this.loading.set(true);
    this.loader.show();
    this.api
      .loadInitialPageData()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (data: MerchantPageInitialData) => {
          this.merchantTypes.set(data?.merchantTypes ?? []);
          this.merchants.set(data?.merchants ?? []);
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Unable to load merchant information.'),
            'Error',
          );
        },
      });
  }
  editMerchant(event: any): void {
    if (this.loading()) return;
    const row = this.parseGridEvent(event);
    if (!row) return;
    const merchant = this.merchants().find(
      (item) => item.benefitId === String(row['benefitId'] ?? row['id'] ?? ''),
    );
    if (!merchant) {
      this.toast.error('Merchant data not found.', 'Error');
      return;
    }
    this.editingMerchant.set(merchant);
    this.merchantForm.enable();
    this.merchantForm.reset({
      merchantType: merchant.typeId,
      merchantName: merchant.merchantName,
      discountAmount: merchant.discountAmount,
      description: merchant.discountInfo,
      mobileNumber: merchant.contact,
      webUrl: merchant.webUrl,
      address: merchant.address,
    });
    this.merchantForm.markAsDirty();
    this.merchantForm.markAsUntouched();
    this.merchantInformationPanelOpen.set(true);
    this.updateButtonVisibility();
    this.scrollToMerchantForm();
  }
  async requestUpdate(): Promise<void> {
    if (this.loading()) return;
    const merchant = this.editingMerchant();
    if (!merchant) {
      this.toast.warning(
        'Please select a merchant from the list to update.',
        'Validation',
      );
      return;
    }
    if (this.merchantForm.invalid) {
      this.merchantForm.markAllAsTouched();
      this.merchantInformationPanelOpen.set(true);
      const invalidControl = this.getFirstInvalidControl();
      if (invalidControl) {
        this.scrollToField('merchant-details-form', invalidControl);
      }
      this.toast.warning(
        'Please provide all required merchant information.',
        'Validation',
      );
      return;
    }
    const confirmed = await this.confirmation.confirm('update', {
      title: 'Update Merchant',
      message: `Are you sure you want to update "${merchant.merchantName}"?`,
      confirmText: 'Yes, Update',
    });
    if (!confirmed) return;
    this.updateMerchant();
  }
  private updateMerchant(): void {
    const merchant = this.editingMerchant();
    if (!merchant) {
      this.toast.warning('Please select a merchant to update.', 'Validation');
      return;
    }
    const value = this.merchantForm.getRawValue();
    const payload: SaveMerchantBenefitRequest = {
      Typeid: Number(value.merchantType),
      Benefitid: Number(merchant.benefitId),
      Companyname: value.merchantName?.trim() || '',
      Discountinfo: value.description?.trim() || '',
      Discountamount: value.discountAmount || '',
      Address: value.address?.trim() || null,
      Weburl: value.webUrl?.trim() || null,
      Contact: value.mobileNumber?.trim() || null,
      Branchid: merchant.branchId,
      Accountno: merchant.accountNo,
      Logo: null,
      changeType: 'EDT',
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .saveOrUpdateMerchant(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (message) => {
          this.toast.success(
            message || 'Merchant updated successfully.',
            'Success',
          );
          this.resetForm();
          this.loadInitialData();
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Merchant update failed.'),
            'Error',
          );
        },
      });
  }
  async deleteMerchant(event: any): Promise<void> {
    if (this.loading()) return;
    const row = this.parseGridEvent(event);
    if (!row) return;
    const merchant = this.merchants().find(
      (item) => item.benefitId === String(row['benefitId'] ?? row['id'] ?? ''),
    );
    if (!merchant) {
      this.toast.error('Merchant data not found.', 'Error');
      return;
    }
    const confirmed = await this.confirmation.confirm('delete', {
      title: 'Delete Merchant',
      message: `Are you sure you want to delete "${merchant.merchantName}"?`,
      confirmText: 'Yes, Delete',
    });
    if (!confirmed) return;
    this.performDelete(merchant);
  }
  private performDelete(merchant: MerchantDetail): void {
    const payload: SaveMerchantBenefitRequest = {
      Typeid: Number(merchant.typeId),
      Benefitid: Number(merchant.benefitId),
      Companyname: merchant.merchantName,
      Discountinfo: merchant.discountInfo,
      Discountamount: merchant.discountAmount,
      Address: merchant.address,
      Weburl: merchant.webUrl,
      Contact: merchant.contact,
      Branchid: merchant.branchId,
      Accountno: merchant.accountNo,
      Logo: null,
      changeType: 'DEL',
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .deleteMerchant(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (message) => {
          this.toast.success(
            message || 'Merchant deleted successfully.',
            'Success',
          );
          if (this.editingMerchant()?.benefitId === merchant.benefitId) {
            this.resetForm();
          }
          this.loadInitialData();
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Merchant delete failed.'),
            'Error',
          );
        },
      });
  }
  requestReset(): void {
    if (this.loading() || this.merchantForm.pristine) return;
    this.resetForm();
    this.toast.info('Merchant form has been reset.', 'Reset');
  }
  private resetForm(): void {
    this.merchantForm.reset({
      merchantType: '',
      merchantName: '',
      discountAmount: '',
      description: '',
      mobileNumber: '',
      webUrl: '',
      address: '',
    });
    this.merchantForm.disable();
    this.merchantForm.markAsPristine();
    this.merchantForm.markAsUntouched();
    this.editingMerchant.set(null);
    this.updateButtonVisibility();
  }
  private parseGridEvent(event: any): Record<string, any> | null {
    if (!event) return null;
    if (typeof event === 'string') {
      try {
        const data = JSON.parse(event);
        return data && typeof data === 'object' ? data : null;
      } catch {
        this.toast.error('Invalid merchant row data.', 'Error');
        return null;
      }
    }
    return typeof event === 'object' ? event : null;
  }
  private getFirstInvalidControl(): string | null {
    const controls = [
      'merchantType',
      'merchantName',
      'discountAmount',
      'description',
      'mobileNumber',
      'webUrl',
      'address',
    ];
    return (
      controls.find(
        (controlName) => this.merchantForm.get(controlName)?.invalid,
      ) ?? null
    );
  }
  private scrollToMerchantForm(): void {
    setTimeout(() => {
      document.getElementById('merchant-details-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
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
      }, 300);
    }, 0);
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
}
