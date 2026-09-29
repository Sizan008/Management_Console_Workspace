import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { InputTextBox } from '../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import {
  AdminPanelUserStatusChangeService,
  GlobalResponse,
} from '../../services/user-status-change-apiService';
type UserState = '' | 'inactive' | 'closed' | 'lock';
@Component({
  selector: 'app-admin-panel-user-status-change',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputSelectOptionField,
    InputTextBox,
    ExpansionPanelHeader,
    GenericButton,
    ActionConfirmationHost,
  ],
  templateUrl: './admin-panel-user-status-change.html',
})
export class AdminPanelUserStatusChangeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userStateChangeApi = inject(
    AdminPanelUserStatusChangeService,
  );
  private readonly loaderService = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  userId = '';
  customerInfo: any = null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly mandatoryPanelOpen = signal(true);
  readonly accountInfoPanelOpen = signal(true);
  readonly addressPanelOpen = signal(true);
  readonly userStateOptions = [
    {
      key: 'inactive',
      value: 'Inactive',
    },
    {
      key: 'closed',
      value: 'Closed',
    },
    {
      key: 'lock',
      value: 'Locked',
    },
  ];
  readonly statusForm = new FormGroup({
    userState: new FormControl<UserState>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    remarks: new FormControl('', {
      nonNullable: true,
    }),
  });
  get selectedState(): UserState {
    return this.statusForm.controls.userState.value;
  }
  get hasFormValue(): boolean {
    const value = this.statusForm.getRawValue();
    return !!value.userState || !!value.remarks.trim();
  }
  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const userId = params.get('userId');
      if (!userId) {
        this.toast.error('User ID not found in route.', 'Error');
        return;
      }
      this.userId = userId;
      this.loadUserInformation();
    });
  }
  loadUserInformation(): void {
    if (!this.userId) return;
    this.loading.set(true);
    this.loaderService.show();
    this.userStateChangeApi
      .getUserByUserId(this.userId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (res: GlobalResponse) => {
          if (res?.Status?.trim().toUpperCase() === 'OK' && res?.Result) {
            this.customerInfo = res.Result;
            return;
          }
          this.customerInfo = null;
          this.toast.error(
            res?.Message || 'User information not found.',
            'Error',
          );
        },
        error: (err) => {
          this.customerInfo = null;
          this.toast.error(
            this.getErrorMessage(err, 'Unable to retrieve user information.'),
            'Error',
          );
        },
      });
  }
  async requestApply(): Promise<void> {
    if (this.loading() || this.saving()) return;
    const userState = this.selectedState;
    const remarks = this.statusForm.controls.remarks.value.trim();
    if (!userState) {
      this.statusForm.controls.userState.markAsTouched();
      this.toast.warning('Please select a User State.', 'Validation');
      return;
    }
    if (userState === 'lock' && !remarks) {
      this.statusForm.controls.remarks.markAsTouched();
      this.toast.warning('Please enter Remarks for Lock action.', 'Validation');
      return;
    }
    const stateLabel = this.getStateLabel(userState);
    const confirmed = await this.confirmation.confirm('update', {
      title: `Apply ${stateLabel}`,
      message: `Are you sure you want to change user "${this.userId}" state to "${stateLabel}"?`,
      confirmText: 'Yes, Apply',
    });
    if (!confirmed) return;
    this.performStateChange();
  }
  requestReset(): void {
    if (this.loading() || this.saving() || !this.hasFormValue) {
      return;
    }
    this.resetForm();
    this.toast.info('User status form has been reset.', 'Reset');
  }
  requestClose(): void {
    if (this.loading() || this.saving()) return;
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private performStateChange(): void {
    const userState = this.selectedState;
    if (!userState) {
      this.toast.warning('Please select a User State.', 'Validation');
      return;
    }
    this.saving.set(true);
    this.loaderService.show();
    if (userState === 'lock') {
      this.userStateChangeApi
        .lockUser(this.userId, true)
        .pipe(
          finalize(() => {
            this.saving.set(false);
            this.loaderService.hide();
          }),
        )
        .subscribe({
          next: (res) => {
            this.handleActionResponse(res, 'User locked successfully.');
          },
          error: (err) => {
            this.handleActionError(err, 'Unable to lock user.');
          },
        });
      return;
    }
    if (userState === 'inactive') {
      this.userStateChangeApi
        .inactivateUser(this.userId)
        .pipe(
          finalize(() => {
            this.saving.set(false);
            this.loaderService.hide();
          }),
        )
        .subscribe({
          next: (res) => {
            this.handleActionResponse(res, 'User inactivated successfully.');
          },
          error: (err) => {
            this.handleActionError(err, 'Unable to inactivate user.');
          },
        });
      return;
    }
    if (userState === 'closed') {
      this.userStateChangeApi
        .deRegisterUser(this.userId, true)
        .pipe(
          finalize(() => {
            this.saving.set(false);
            this.loaderService.hide();
          }),
        )
        .subscribe({
          next: (res) => {
            this.handleActionResponse(res, 'User closed successfully.');
          },
          error: (err) => {
            this.handleActionError(err, 'Unable to close user.');
          },
        });
      return;
    }
    this.saving.set(false);
    this.loaderService.hide();
  }
  private handleActionResponse(
    res: GlobalResponse,
    fallbackMessage: string,
  ): void {
    if (res?.Status?.trim().toUpperCase() !== 'OK') {
      this.toast.error(res?.Message || 'Operation failed.', 'Error');
      return;
    }
    this.toast.success(res?.Message || fallbackMessage, 'Success');
    this.resetForm();
    this.loadUserInformation();
  }
  private handleActionError(error: unknown, fallbackMessage: string): void {
    this.toast.error(this.getErrorMessage(error, fallbackMessage), 'Error');
  }
  private resetForm(): void {
    this.statusForm.reset({
      userState: '',
      remarks: '',
    });
    this.statusForm.markAsPristine();
    this.statusForm.markAsUntouched();
  }
  private getStateLabel(state: UserState): string {
    switch (state) {
      case 'lock':
        return 'Locked';
      case 'inactive':
        return 'Inactive';
      case 'closed':
        return 'Closed';
      default:
        return 'User State';
    }
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
      const message = httpError.error?.Message ?? httpError.error?.message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
    return fallbackMessage;
  }
}
