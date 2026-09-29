import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { InputTextBox } from '../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputDate } from '../../../../shared/common-components/input-types/input-date/input-date';
import { LoaderService } from '../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../shared/common-componets/action-confirmation-host';
import { AdminPanelActivityLogService } from '../../services/admin-panel-activity-log.service';
import {
  ActivityLogPayload,
  ActivityLogRow,
} from '../../models/activity-log.model';
@Component({
  selector: 'app-user-activity-log',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    InputTextBox,
    InputSelectOptionField,
    InputDate,
    ActionConfirmationHost,
  ],
  templateUrl: './user-activity-log.html',
})
export class UserActivityLog implements OnInit, OnDestroy {
  private readonly api = inject(AdminPanelActivityLogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly loaderService = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly loading = signal(false);
  readonly isActivityPanelOpen = signal(true);
  readonly isActivityDetailsPanel = signal(true);
  readonly data = signal<ActivityLogRow[]>([]);
  userId = '';
  readonly formGroup = new FormGroup({
    userType: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    userId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  readonly userTypeOptions = [
    { key: 'Admin', value: 'Admin' },
    { key: 'Client', value: 'Client' },
  ];
  readonly selectedColumns = [
    'activityAt',
    'userName',
    'activityType',
    'comment',
  ];
  readonly customColumnNames: Record<string, string> = {
    activityAt: 'Activity Time',
    userName: 'User Name',
    activityType: 'Activity Type',
    comment: 'Comment',
  };
  get hasFilterValue(): boolean {
    const value = this.formGroup.getRawValue();
    return !!value.userType || !!value.startDate || !!value.endDate;
  }
  ngOnInit(): void {
    this.loadRouteUser();
  }
  private loadRouteUser(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.toast.error('User ID not found in route.', 'Error');
      return;
    }
    this.userId = userId;
    this.formGroup.patchValue({
      userId,
    });
    this.formGroup.controls.userId.markAsPristine();
  }
  requestView(): void {
    if (this.loading()) return;
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      this.isActivityPanelOpen.set(true);
      const controlName = this.getFirstInvalidControl();
      if (controlName) {
        this.scrollToField('activity-log-form', controlName);
      }
      this.toast.warning('Please provide all required fields.', 'Validation');
      return;
    }
    this.loadActivity();
  }
  private loadActivity(): void {
    const value = this.formGroup.getRawValue();
    const userType = value.userType === 'Client' ? 2 : 1;
    const payload: ActivityLogPayload = {
      activityType: '',
      userType,
      UserID: this.userId,
      startDate: value.startDate,
      endTime: value.endDate,
    };
    this.loading.set(true);
    this.loaderService.show();
    this.api
      .getActivityLog(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loaderService.hide();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.Status?.trim().toUpperCase() === 'OK') {
            this.data.set(response.Result || []);
            if (response.Result?.length) {
              this.toast.success(
                'Activity log loaded successfully.',
                'Success',
              );
            } else {
              this.toast.info(
                response?.Message || 'No activity log found.',
                'Information',
              );
            }
            return;
          }
          this.data.set([]);
          this.toast.warning(
            response?.Message || 'No activity log found.',
            'Warning',
          );
        },
        error: (error) => {
          this.data.set([]);
          this.toast.error(
            this.getErrorMessage(error, 'Unable to load activity log.'),
            'Error',
          );
        },
      });
  }
  async requestReset(): Promise<void> {
    if (this.loading() || !this.hasFilterValue) return;
    this.resetForm();
    this.toast.info('Activity log filters have been reset.', 'Reset');
  }
  private resetForm(): void {
    this.formGroup.reset({
      userType: '',
      userId: this.userId,
      startDate: '',
      endDate: '',
    });
    this.formGroup.markAsPristine();
    this.formGroup.markAsUntouched();
    this.data.set([]);
  }
  requestClose(): void {
    this.router.navigate(['../../'], {
      relativeTo: this.route,
    });
  }
  private getFirstInvalidControl(): string | null {
    const controls = ['userType', 'userId', 'startDate', 'endDate'];
    return (
      controls.find(
        (controlName) => this.formGroup.get(controlName)?.invalid,
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
  onGridStateChange(event: any): void {}
  onRowDoubleClick(data: any): void {}
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
  ngOnDestroy(): void {}
}
