import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Subscription, catchError, combineLatest, distinctUntilChanged, finalize, map, of, startWith, switchMap } from 'rxjs';
import { SummaryDetailsComponent, SummaryDetailItem } from '../../../../shared/common-components/case-quick-view/summary-details/summary-details.component';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { ConfirmationDialogue, DeleteConfirmationModalConfig } from '../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
import { ResetPasswordUser } from '../../models/reset-password.model';
import { ResetPasswordService } from '../../services/reset-password.service';

import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-reset-password',
  standalone: true,
  imports: [SummaryDetailsComponent, ExpansionPanelHeader, GenericButton, ConfirmationDialogue],
  templateUrl: './admin-panel-reset-password.html',
})
export class AdminPanelResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ResetPasswordService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastHelperService);
  private readonly reload = new Subject<void>();
  private saveRequest?: Subscription;

  readonly selectedUserId = signal('');
  readonly user = signal<ResetPasswordUser | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly informationOpen = signal(true);
  readonly confirmationOpen = signal(false);
  readonly busy = computed(() => this.loading() || this.saving());
  readonly canReset = computed(() => !!this.user() && !this.busy() && !this.submitted());

  readonly confirmationConfig: DeleteConfirmationModalConfig = {
    title: 'Reset User Password',
    message: 'Submit a password reset request for the user shown in this panel?',
    variant: 'warning',
    buttons: [
      { text: 'Reset Password', action: 'confirm' },
      { text: 'Cancel', action: 'cancel' },
    ],
  };

  readonly userDetails = computed<SummaryDetailItem[]>(() => {
    const user = this.user();
    return [
      { label: 'User ID', value: user?.userId || '—' },
      { label: 'User Name', value: user?.userNm || '—' },
      { label: 'Branch ID', value: user?.orgId ?? '—' },
      { label: 'Customer ID', value: user?.customerId ?? '—' },
      { label: 'User Address', value: user?.userAddress || '—' },
      { label: 'User Description', value: user?.userDescrip || '—' },
      { label: 'Email', value: user?.emailAddress || '—' },
      { label: 'Mobile', value: user?.mobileNumber || '—' },
    ];
  });

  constructor() {
    effect(() => {
      const message = this.errorMessage();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.successMessage();
      if (message) this.toast.success(message);
    });

  }

  ngOnInit(): void {
    // RUSRPASS/:userId is already supplied by the workspace action.
    // switchMap cancels a previous lookup when a different row is opened.
    combineLatest([
      this.route.paramMap.pipe(
        map(params => (params.get('userId') || '').trim()),
        distinctUntilChanged(),
      ),
      this.reload.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([userId]) => {
        this.saveRequest?.unsubscribe();
        this.selectedUserId.set(userId);
        this.user.set(null);
        this.confirmationOpen.set(false);
        this.errorMessage.set('');
        this.successMessage.set('');
        this.submitted.set(false);
        this.informationOpen.set(true);
        if (!userId) {
          this.loading.set(false);
          this.errorMessage.set('Select a user from the workspace to reset their password.');
          return of(null);
        }
        this.loading.set(true);
        return this.api.getUser(userId).pipe(
          catchError((error: unknown) => {
            this.errorMessage.set(this.getErrorMessage(error, 'Unable to load the selected user.'));
            return of(null);
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(user => this.user.set(user));
  }

  requestReset(): void {
    if (this.canReset()) this.confirmationOpen.set(true);
  }

  onConfirmationButtonClick(event: { action: string }): void {
    const wasOpen = this.confirmationOpen();
    this.confirmationOpen.set(false);
    if (event.action !== 'confirm' || !wasOpen || !this.canReset()) return;
    const user = this.user();
    if (!user) return;
    this.errorMessage.set('');
    this.successMessage.set('');
    this.saving.set(true);
    this.saveRequest = this.api.resetPassword(user.userId).pipe(
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: message => {
        this.submitted.set(true);
        this.successMessage.set(message);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Unable to submit the password reset request.'));
      },
    });
  }

  refreshUser(): void {
    if (!this.busy()) this.reload.next();
  }

  onClose(): void {
    if (!this.saving()) void this.router.navigate(['../../'], { relativeTo: this.route });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { Message?: unknown } | null;
      if (typeof body?.Message === 'string' && body.Message.trim()) return body.Message.trim();
      if (error.status === 0) return 'Unable to reach the server. Please try again.';
      return fallback;
    }
    return error instanceof Error && error.message.trim() ? error.message : fallback;
  }
}
