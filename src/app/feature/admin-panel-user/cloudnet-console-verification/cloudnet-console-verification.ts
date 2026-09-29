import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Home } from '../../../layout/home/home';
import { GenericButton } from '../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericModal } from '../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { CloudNetConsoleSessionService } from '../services/cloudnet-console-session.service';
import { CloudNetConsoleVerificationService } from '../services/cloudnet-console-verification.service';

import { ToastHelperService } from '../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-cloudnet-console-verification',
  standalone: true,
  imports: [
    Home,
    ReactiveFormsModule,
    GenericModal,
    InputTextBox,
    GenericButton,
  ],
  templateUrl: './cloudnet-console-verification.html',
})
export class CloudNetConsoleVerificationComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly verificationService = inject(CloudNetConsoleVerificationService);
  private readonly session = inject(CloudNetConsoleSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastHelperService);

  readonly busy = signal(false);
  readonly errorMessage = signal('');
  readonly verified = signal(false);
  readonly verificationModalVisible = signal(false);
  readonly canContinue = computed(
    () => !this.busy() && !!this.form.controls.username.value.trim(),
  );

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const message = this.errorMessage();
      if (message) this.toast.error(message);
    });

  }

  ngOnInit(): void {
    const userName = this.authService.getKeycloakUserId().trim();
    this.form.controls.username.setValue(userName);

    const alreadyVerified = this.session.hasValidSession();
    this.verified.set(alreadyVerified);
    this.verificationModalVisible.set(!alreadyVerified);

    if (!userName) {
      this.errorMessage.set(
        'Unable to resolve the signed-in Keycloak username. Please sign in again.',
      );
    }
  }

  continueVerification(): void {
    if (this.busy()) {
      return;
    }

    this.errorMessage.set('');
    const { username, password } = this.form.getRawValue();

    if (this.form.invalid || !username.trim() || !password) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please enter your password to continue.');
      return;
    }

    this.busy.set(true);
    this.verificationService.login(username, password)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          const isVerified = this.session.hasValidSession();
          if (!isVerified) {
            this.errorMessage.set(
              'The server returned an invalid or expired CloudNetConsole session.',
            );
            return;
          }

          this.verified.set(true);
          this.form.controls.password.reset();
          this.verificationModalVisible.set(false);
          void this.navigateToRequestedConsolePage();
        },
        error: (error: unknown) => {
          this.verificationService.clearLocalSession();
          this.verified.set(false);
          this.form.controls.password.reset();
          this.errorMessage.set(this.getErrorMessage(error));
          this.verificationModalVisible.set(true);
        },
      });
  }

  keycloakLogout(): void {
    if (this.busy()) {
      return;
    }

    this.verificationService.clearLocalSession();
    this.verified.set(false);
    this.form.controls.password.reset();
    this.errorMessage.set('');
    this.authService.logout();
  }

  onModalVisibilityChanged(visible: boolean): void {
    this.verificationModalVisible.set(visible);

    // GenericModal's shared X/Escape behaviour remains untouched. Verification
    // is mandatory, so an unverified close is immediately restored here.
    if (!visible && !this.verified()) {
      setTimeout(() => this.verificationModalVisible.set(true));
    }
  }

  private async navigateToRequestedConsolePage(): Promise<void> {
    const returnUrl = (this.route.snapshot.queryParamMap.get('returnUrl') || '').trim();
    if (!this.isSafeInternalReturnUrl(returnUrl)) {
      return;
    }

    await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
  }

  private isSafeInternalReturnUrl(returnUrl: string): boolean {
    return returnUrl.startsWith('/feature/admin-panel-user') && !returnUrl.startsWith('//');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const responseBody = error.error as
        | { Message?: unknown; message?: unknown; error?: unknown }
        | string
        | null;

      if (typeof responseBody === 'string' && responseBody.trim()) {
        return responseBody.trim();
      }

      if (responseBody && typeof responseBody === 'object') {
        const candidates = [
          responseBody.Message,
          responseBody.message,
          responseBody.error,
        ];
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
      }

      if (error.status === 0) {
        return 'Unable to connect to the CloudNetConsole server.';
      }

      if (error.status === 401) {
        return 'Invalid username or password.';
      }

      return error.message || 'CloudNetConsole verification failed.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'CloudNetConsole verification failed.';
  }
}
