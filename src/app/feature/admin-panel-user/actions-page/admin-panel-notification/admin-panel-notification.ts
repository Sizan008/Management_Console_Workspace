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
import { InputTextArea } from '../../../../shared/common-components/input-types/input-text-area/input-text-area';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import {
  AdminPanelNotificationService,
  GlobalResponse,
  NotificationRequest,
} from '../../services/admin-panel-notification-apiService';

@Component({
  selector: 'app-admin-panel-notification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    InputTextBox,
    InputTextArea,
    GenericButton,
    ActionConfirmationHost,
  ],
  templateUrl: './admin-panel-notification.html',
})
export class AdminPanelNotification implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notificationApi = inject(AdminPanelNotificationService);
  private readonly loaderService = inject(LoaderService);
  private readonly confirmation = inject(ActionConfirmationService);
  private readonly toast = inject(ToastHelperService);
  private routeSub: Subscription | null = null;
  userId = '';
  userInfo: any = null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly userInfoPanelOpen = signal(true);
  readonly notificationPanelOpen = signal(true);
  readonly notificationForm = new FormGroup({
    subject: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
  });
  get hasNotificationValue(): boolean {
    const value = this.notificationForm.getRawValue();
    return !!value.subject.trim() || !!value.description.trim();
  }
  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params) => {
      const userId = params['userId'];
      if (!userId) {
        this.toast.error('User ID not found in route.', 'Error');
        return;
      }
      this.userId = String(userId);
      this.loadUserInformation();
    });
  }
  private loadUserInformation(): void {
    if (!this.userId) return;
    this.loading.set(true);
    this.loaderService.show();
    this.notificationApi
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
  async requestSendNotification(): Promise<void> {
    if (this.loading() || this.saving()) return;
    if (!this.userInfo) {
      this.toast.warning('User information is not available.', 'Validation');
      return;
    }
    const subject = this.notificationForm.controls.subject.value.trim();
    const description = this.notificationForm.controls.description.value.trim();
    if (!subject) {
      this.notificationForm.controls.subject.markAsTouched();
      this.scrollToField('notification-form', 'subject');
      this.toast.warning('Please enter notification Subject.', 'Validation');
      return;
    }
    if (!description) {
      this.notificationForm.controls.description.markAsTouched();
      this.scrollToField('notification-form', 'description');
      this.toast.warning(
        'Please enter notification Description.',
        'Validation',
      );
      return;
    }
    if (this.notificationForm.controls.subject.invalid) {
      this.notificationForm.controls.subject.markAsTouched();
      this.scrollToField('notification-form', 'subject');
      this.toast.warning(
        'Please enter a valid notification Subject.',
        'Validation',
      );
      return;
    }
    if (this.notificationForm.controls.description.invalid) {
      this.notificationForm.controls.description.markAsTouched();
      this.scrollToField('notification-form', 'description');
      this.toast.warning(
        'Please enter a valid notification Description.',
        'Validation',
      );
      return;
    }
    const customerId = this.userInfo?.regCustUser?.customerId ?? '';
    if (!customerId) {
      this.toast.error('Customer ID was not found for this user.', 'Error');
      return;
    }
    const confirmed = await this.confirmation.confirm('save', {
      title: 'Send Notification',
      message: `Are you sure you want to send "${subject}" notification to user "${this.userId}"?`,
      confirmText: 'Yes, Send',
    });
    if (!confirmed) return;
    this.sendNotification();
  }
  async requestReset(): Promise<void> {
    if (this.loading() || this.saving() || !this.hasNotificationValue) return;
    this.resetForm();
    this.toast.info('Notification form has been reset.', 'Reset');
  }
  requestClose(): void {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private sendNotification(): void {
    const customerId = this.userInfo?.regCustUser?.customerId ?? '';
    if (!customerId) {
      this.toast.error('Customer ID was not found for this user.', 'Error');
      return;
    }
    const payload: NotificationRequest = {
      CustomerId: customerId,
      NotifiTitle: this.notificationForm.controls.subject.value.trim(),
      NotifiDesc: this.notificationForm.controls.description.value.trim(),
    };
    this.saving.set(true);
    this.loaderService.show();
    this.notificationApi
      .createNotification(payload)
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
              response?.Message || 'Notification could not be created.',
              'Error',
            );
            return;
          }
          this.toast.success(
            response?.Message || 'Notification sent successfully.',
            'Success',
          );
          this.resetForm();
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(
              error,
              'An error occurred while creating notification.',
            ),
            'Error',
          );
        },
      });
  }
  private resetForm(): void {
    this.notificationForm.reset({
      subject: '',
      description: '',
    });
    this.notificationForm.markAsPristine();
    this.notificationForm.markAsUntouched();
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
      const apiMessage = httpError.error?.Message ?? httpError.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim())
        return apiMessage.trim();
    }
    return fallbackMessage;
  }
  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }



}
