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
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import {
  AdminPanelUserUpdateService,
  GlobalResponse,
  UpdateContactInfoPayload,
  UpdateCustomerIdPayload,
} from '../../services/admin-panel-user-updateApiService';
type UpdateType = 'contact' | 'customer';
@Component({
  selector: 'app-admin-panel-user-update',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    InputTextBox,
    GenericButton,
    ActionConfirmationHost,
  ],
  templateUrl: './admin-panel-user-update.html',
})
export class AdminPanelUserUpdate implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userUpdateService = inject(AdminPanelUserUpdateService);
  private readonly loaderService = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  private readonly subscriptions = new Subscription();
  userId = '';
  userInfo: any = null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly updateType = signal<UpdateType>('contact');
  readonly accountInfoPanelOpen = signal(true);
  readonly updateInfoPanelOpen = signal(true);
  readonly contactInfoForm = new FormGroup({
    email: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    mobileNumber: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    cbsEmail: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@cbs\.com$/),
      ],
    }),
    cbsMobile: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.pattern(
          /^(\+?\d{1,3}[-.\s]?)?(\(?\d{1,4}\)?[\s.-]?)?\d{1,4}[\s.-]?\d{1,9}$/,
        ),
      ],
    }),
  });
  readonly customerIdForm = new FormGroup({
    presentCustomerId: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    newCustomerId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  get hasActiveUpdateValue(): boolean {
    if (this.updateType() === 'contact') {
      return (
        !!this.contactInfoForm.controls.cbsEmail.value.trim() ||
        !!this.contactInfoForm.controls.cbsMobile.value.trim()
      );
    }
    return !!this.customerIdForm.controls.newCustomerId.value.trim();
  }
  ngOnInit(): void {
    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        const userId = params['userId'];
        if (!userId) {
          this.toast.error('User ID not found in route.', 'Error');
          return;
        }
        this.userId = String(userId);
        this.loadUserInformation();
      }),
    );
  }
  private loadUserInformation(): void {
    if (!this.userId) return;
    this.loading.set(true);
    this.loaderService.show();
    this.userUpdateService
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
            response?.Status?.trim().toUpperCase() === 'OK' &&
            response?.Result
          ) {
            this.userInfo = response.Result;
            this.contactInfoForm.patchValue({
              email: response.Result?.regCustUser?.emailAddress ?? '',
              mobileNumber: response.Result?.regCustUser?.mobileNumber ?? '',
              cbsEmail: '',
              cbsMobile: '',
            });
            this.customerIdForm.patchValue({
              presentCustomerId: response.Result?.regCustUser?.customerId ?? '',
              newCustomerId: '',
            });
            this.markFormsClean();
            return;
          }
          this.userInfo = null;
          this.toast.error(
            response?.Message || 'User information not found.',
            'Error',
          );
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
  selectUpdateType(type: UpdateType): void {
    if (this.loading() || this.saving() || this.updateType() === type) {
      return;
    }
    this.updateType.set(type);
  }
  getUpdateTypeButtonStyle(type: UpdateType): string {
    return this.updateType() === type
      ? 'background: var(--theme-secondary); color: #ffffff;'
      : 'background: #e5e7eb; color: #4b5563;';
  }
  async requestUpdate(): Promise<void> {
    if (this.loading() || this.saving()) return;
    if (!this.userInfo) {
      this.toast.warning('User information is not available.', 'Validation');
      return;
    }
    if (this.updateType() === 'contact') {
      if (this.contactInfoForm.invalid) {
        this.contactInfoForm.markAllAsTouched();
        if (
          this.contactInfoForm.controls.cbsEmail.invalid &&
          this.contactInfoForm.controls.cbsEmail.value.trim()
        ) {
          this.scrollToField('contact-update-form', 'cbsEmail');
        } else if (
          this.contactInfoForm.controls.cbsMobile.invalid &&
          this.contactInfoForm.controls.cbsMobile.value.trim()
        ) {
          this.scrollToField('contact-update-form', 'cbsMobile');
        }
        this.toast.warning(
          'Please provide valid contact information.',
          'Validation',
        );
        return;
      }
      const cbsEmail = this.contactInfoForm.controls.cbsEmail.value.trim();
      const cbsMobile = this.contactInfoForm.controls.cbsMobile.value.trim();
      if (!cbsEmail && !cbsMobile) {
        this.contactInfoForm.controls.cbsEmail.markAsTouched();
        this.contactInfoForm.controls.cbsMobile.markAsTouched();
        this.scrollToField('contact-update-form', 'cbsEmail');
        this.toast.warning(
          'Please enter a new Email or Mobile Number.',
          'Validation',
        );
        return;
      }
      const confirmed = await this.confirmation.confirm('update', {
        title: 'Update Contact Information',
        message: `Are you sure you want to update contact information for user "${this.userId}"?`,
        confirmText: 'Yes, Update',
      });
      if (!confirmed) return;
      this.saveContactInfo();
      return;
    }
    if (this.customerIdForm.invalid) {
      this.customerIdForm.markAllAsTouched();
      this.scrollToField('customer-update-form', 'newCustomerId');
      this.toast.warning('Please enter New Customer ID.', 'Validation');
      return;
    }
    const currentCustomerId =
      this.customerIdForm.controls.presentCustomerId.value.trim();
    const newCustomerId =
      this.customerIdForm.controls.newCustomerId.value.trim();
    if (!newCustomerId) {
      this.customerIdForm.controls.newCustomerId.markAsTouched();
      this.scrollToField('customer-update-form', 'newCustomerId');
      this.toast.warning('Please enter New Customer ID.', 'Validation');
      return;
    }
    if (currentCustomerId === newCustomerId) {
      this.customerIdForm.controls.newCustomerId.markAsTouched();
      this.scrollToField('customer-update-form', 'newCustomerId');
      this.toast.warning(
        'New Customer ID must be different from current Customer ID.',
        'Validation',
      );
      return;
    }
    const confirmed = await this.confirmation.confirm('update', {
      title: 'Update Customer ID',
      message: `Are you sure you want to change Customer ID from "${currentCustomerId}" to "${newCustomerId}"?`,
      confirmText: 'Yes, Update',
    });
    if (!confirmed) return;
    this.saveCustomerId();
  }
  requestReset(): void {
    if (this.loading() || this.saving() || !this.hasActiveUpdateValue) {
      return;
    }
    this.resetActiveForm();
    this.toast.info('Update form has been reset.', 'Reset');
  }
  requestClose(): void {
    if (this.loading() || this.saving()) return;
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private saveContactInfo(): void {
    const payload: UpdateContactInfoPayload = {
      UserID: this.userInfo?.regCustUser?.userId ?? '',
      CustomerId: this.userInfo?.regCustUser?.customerId ?? '',
      Address1: '',
      Address2: '',
      Mobile: this.contactInfoForm.controls.cbsMobile.value.trim(),
      Email: this.contactInfoForm.controls.cbsEmail.value.trim(),
    };
    this.saving.set(true);
    this.loaderService.show();
    this.userUpdateService
      .updateContactInfo(payload)
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          this.handleUpdateResponse(
            response,
            'Contact information updated successfully.',
          );
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Contact information update failed.'),
            'Error',
          );
        },
      });
  }
  private saveCustomerId(): void {
    const payload: UpdateCustomerIdPayload = {
      UserID: this.userInfo?.regCustUser?.userId ?? '',
      CurrentCustomerId:
        this.customerIdForm.controls.presentCustomerId.value.trim(),
      NewCustomerId: this.customerIdForm.controls.newCustomerId.value.trim(),
    };
    this.saving.set(true);
    this.loaderService.show();
    this.userUpdateService
      .updateCustomerId(payload)
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          this.handleUpdateResponse(
            response,
            'Customer ID updated successfully.',
          );
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Customer ID update failed.'),
            'Error',
          );
        },
      });
  }
  private handleUpdateResponse(
    response: GlobalResponse,
    fallbackMessage: string,
  ): void {
    if (response?.Status?.trim().toUpperCase() !== 'OK') {
      this.toast.error(response?.Message || 'Update failed.', 'Error');
      return;
    }
    this.toast.success(response?.Message || fallbackMessage, 'Success');
    this.loadUserInformation();
  }
  private resetActiveForm(): void {
    if (this.updateType() === 'contact') {
      this.contactInfoForm.patchValue({
        email: this.userInfo?.regCustUser?.emailAddress ?? '',
        mobileNumber: this.userInfo?.regCustUser?.mobileNumber ?? '',
        cbsEmail: '',
        cbsMobile: '',
      });
      this.contactInfoForm.markAsPristine();
      this.contactInfoForm.markAsUntouched();
      return;
    }
    this.customerIdForm.patchValue({
      presentCustomerId: this.userInfo?.regCustUser?.customerId ?? '',
      newCustomerId: '',
    });
    this.customerIdForm.markAsPristine();
    this.customerIdForm.markAsUntouched();
  }
  private markFormsClean(): void {
    this.contactInfoForm.markAsPristine();
    this.contactInfoForm.markAsUntouched();
    this.customerIdForm.markAsPristine();
    this.customerIdForm.markAsUntouched();
  }
  private getErrorMessage(error: unknown, fallbackMessage: string): string {
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
      const apiMessage = httpError.error?.Message ?? httpError.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage.trim();
      }
    }
    return fallbackMessage;
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
}
