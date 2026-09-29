import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { LoaderService } from '../../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../../shared/common-componets/action-confirmation-host';
import {
  BUTTON_VISIBILITY,
  ONCLICK_SAVE,
  ONCLICK_UPDATE,
  ONCLICK_RESET,
} from '../../../../../shared/constant/button-signals.constant';
import { AdminPanelMerchantTypeService } from '../../../services/admin-panel-merchant-type.service';
import {
  MerchantTypeModel,
  MerchantTypeRow,
} from '../../../models/merchant-type.model';
@Component({
  selector: 'app-merchant-type',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    InputTextBox,
    GenericDataGrid,
    ActionConfirmationHost,
  ],
  templateUrl: './merchant-type.html',
})
export class MerchantType implements OnInit {
  private readonly api = inject(AdminPanelMerchantTypeService);
  private readonly loader = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly isMerchantInputOpen = signal(true);
  readonly merchantPanel = signal(true);
  readonly merchantPanelGrid = signal(true);
  readonly loading = signal(false);
  readonly merchantTypeGrid = signal<MerchantTypeRow[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly merchantForm = new FormGroup({
    merchantType: new FormControl('', [Validators.required]),
  });
  readonly columns = ['id', 'name'];
  readonly columnNames = {
    id: 'ID',
    name: 'Name',
  };
  constructor() {
    this.initializeButtonVisibility();
    this.initializeGlobalActions();
    this.merchantForm.valueChanges.subscribe(() => {
      this.updateResetVisibility();
    });
  }
  private initializeButtonVisibility(): void {
    BUTTON_VISIBILITY.set({
      save: true,
      saveNext: false,
      update: false,
      updateNext: false,
      view: false,
      delete: false,
      exit: false,
      reset: false,
    });
  }
  private initializeGlobalActions(): void {
    effect(() => {
      if (ONCLICK_SAVE()) {
        ONCLICK_SAVE.set(false);
        this.requestSave();
      }
    });
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
  private updateResetVisibility(): void {
    BUTTON_VISIBILITY.update((value) => ({
      ...value,
      reset: this.merchantForm.dirty,
    }));
  }
  ngOnInit(): void {
    this.loadMerchantTypes();
  }
  private loadMerchantTypes(): void {
    this.loading.set(true);
    this.loader.show();
    this.api
      .getMerchantTypes()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.Status?.toUpperCase() === 'OK') {
            this.merchantTypeGrid.set(response.Result ?? []);
          } else {
            this.toast.error(
              response.Message || 'Failed to load merchant types.',
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Failed to load merchant types.'),
            'Error',
          );
        },
      });
  }
  onEdit(event: any): void {
    const data = this.parseGridEvent(event);
    if (!data) return;
    const id = Number(data['id']);
    if (!id) {
      this.toast.error('Invalid Merchant Type information.', 'Error');
      return;
    }
    this.selectedId.set(id);
    this.merchantForm.reset({
      merchantType: String(data['name'] ?? ''),
    });
    this.merchantForm.markAsPristine();
    this.merchantForm.markAsUntouched();
    BUTTON_VISIBILITY.set({
      save: false,
      saveNext: false,
      update: true,
      updateNext: false,
      view: false,
      delete: false,
      exit: false,
      reset: false,
    });
    this.isMerchantInputOpen.set(true);
    this.scrollToForm();
  }
  async requestSave(): Promise<void> {
    if (this.loading()) return;
    if (this.selectedId() !== null) {
      this.toast.warning(
        'You are currently editing a Merchant Type. Please use Update.',
        'Validation',
      );
      return;
    }
    if (!this.validateForm()) return;
    const value = this.merchantForm.getRawValue();
    const merchantType = value.merchantType?.trim() || '';
    const confirmed = await this.confirmation.confirm('save', {
      title: 'Save Merchant Type',
      message: `Are you sure you want to save "${merchantType}"?`,
      confirmText: 'Yes, Save',
    });
    if (!confirmed) return;
    this.saveMerchantType('ADD');
  }
  async requestUpdate(): Promise<void> {
    if (this.loading()) return;
    if (this.selectedId() === null) {
      this.toast.warning(
        'Please select a Merchant Type from the list first.',
        'Validation',
      );
      return;
    }
    if (!this.validateForm()) return;
    const value = this.merchantForm.getRawValue();
    const merchantType = value.merchantType?.trim() || '';
    const confirmed = await this.confirmation.confirm('update', {
      title: 'Update Merchant Type',
      message: `Are you sure you want to update "${merchantType}"?`,
      confirmText: 'Yes, Update',
    });
    if (!confirmed) return;
    this.saveMerchantType('EDT');
  }
  private validateForm(): boolean {
    if (this.merchantForm.invalid) {
      this.merchantForm.markAllAsTouched();
      this.isMerchantInputOpen.set(true);
      this.toast.warning('Merchant Type is required.', 'Validation');
      this.scrollToForm();
      return false;
    }
    const merchantType = this.merchantForm.controls.merchantType.value?.trim();
    if (!merchantType) {
      this.merchantForm.controls.merchantType.markAsTouched();
      this.toast.warning('Merchant Type is required.', 'Validation');
      this.scrollToForm();
      return false;
    }
    return true;
  }
  private saveMerchantType(changeStatus: 'ADD' | 'EDT'): void {
    const value = this.merchantForm.getRawValue();
    const payload: MerchantTypeModel = {
      typeID: changeStatus === 'EDT' ? (this.selectedId() ?? 0) : 0,
      typeName: value.merchantType?.trim() || '',
      changeStatus,
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .addOrEditOrChangeStatus(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.Status?.toUpperCase() === 'OK') {
            this.toast.success(
              response.Message ||
                (changeStatus === 'ADD'
                  ? 'Merchant Type saved successfully.'
                  : 'Merchant Type updated successfully.'),
              'Success',
            );
            this.resetForm();
            this.loadMerchantTypes();
          } else {
            this.toast.error(
              response.Message ||
                (changeStatus === 'ADD'
                  ? 'Failed to save Merchant Type.'
                  : 'Failed to update Merchant Type.'),
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(
              error,
              changeStatus === 'ADD'
                ? 'Failed to save Merchant Type.'
                : 'Failed to update Merchant Type.',
            ),
            'Error',
          );
        },
      });
  }
  async onDelete(event: any): Promise<void> {
    if (this.loading()) return;
    const data = this.parseGridEvent(event);
    if (!data) return;
    const id = Number(data['id']);
    const name = String(data['name'] ?? '');
    if (!id) {
      this.toast.error('Invalid Merchant Type information.', 'Error');
      return;
    }
    const confirmed = await this.confirmation.confirm('delete', {
      title: 'Delete Merchant Type',
      message: `Are you sure you want to delete "${name}"?`,
      confirmText: 'Yes, Delete',
    });
    if (!confirmed) return;
    this.deleteMerchantType({
      id,
      name,
    } as MerchantTypeRow);
  }
  private deleteMerchantType(data: MerchantTypeRow): void {
    const payload: MerchantTypeModel = {
      typeID: data.id,
      typeName: data.name,
      changeStatus: 'DEL',
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .addOrEditOrChangeStatus(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.Status?.toUpperCase() === 'OK') {
            this.toast.success(
              response.Message || 'Merchant Type deleted successfully.',
              'Success',
            );
            if (this.selectedId() === data.id) {
              this.resetForm();
            }
            this.loadMerchantTypes();
          } else {
            this.toast.error(
              response.Message || 'Failed to delete Merchant Type.',
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Failed to delete Merchant Type.'),
            'Error',
          );
        },
      });
  }
  requestReset(): void {
    if (this.loading() || !this.merchantForm.dirty) return;
    this.resetForm();
    this.toast.info('Merchant Type form reset successfully.', 'Reset');
  }
  private resetForm(): void {
    this.merchantForm.reset({
      merchantType: '',
    });
    this.merchantForm.markAsPristine();
    this.merchantForm.markAsUntouched();
    this.selectedId.set(null);
    BUTTON_VISIBILITY.set({
      save: true,
      saveNext: false,
      update: false,
      updateNext: false,
      view: false,
      delete: false,
      exit: false,
      reset: false,
    });
  }
  private parseGridEvent(event: any): Record<string, any> | null {
    if (!event) return null;
    if (typeof event === 'string') {
      try {
        const data = JSON.parse(event);
        return data && typeof data === 'object' ? data : null;
      } catch {
        this.toast.error('Invalid Merchant Type row data.', 'Error');
        return null;
      }
    }
    return typeof event === 'object' ? event : null;
  }
  private scrollToForm(): void {
    setTimeout(() => {
      document.getElementById('merchant-type-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
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
