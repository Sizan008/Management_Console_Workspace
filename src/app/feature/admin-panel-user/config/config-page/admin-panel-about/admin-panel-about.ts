import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import {
  ButtonUtils,
  ONCLICK_RESET,
  ONCLICK_SAVE,
  ONCLICK_UPDATE,
} from '../../../../../shared/constant/button-signals.constant';
import { SidebarService } from '../../../../../layout/service/sidebar.service';
import {
  AboutInformation,
  AboutUpdateRequest,
} from '../../../models/about.model';
import { AboutService } from '../../../services/about.service';

import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-about',
  standalone: true,
  imports: [ExpansionPanelHeader, InputTextBox],
  templateUrl: './admin-panel-about.html',
})
export class AdminPanelAboutComponent implements OnInit {
  private readonly api = inject(AboutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebarService = inject(SidebarService);
  private readonly toast = inject(ToastHelperService);

  readonly aboutInformationPanelOpen = signal(true);
  readonly aboutDetailsPanelOpen = signal(true);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly isEditMode = signal(false);
  readonly pageError = signal('');
  readonly pageNotice = signal('');
  readonly aboutInformation = signal<AboutInformation | null>(null);

  readonly aboutForm = this.formBuilder.nonNullable.group({
    internationalNumber: ['', Validators.required],
    localNumber: ['', Validators.required],
    mailAddress: ['', [Validators.required, Validators.email]],
    officeAddress: ['', Validators.required],
  });

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
      const editing = this.isEditMode();
      const loading = this.loading();
      const saving = this.saving();
      const hasDetails = this.aboutInformation() !== null;

      untracked(() => {
        ButtonUtils.setPageButtons({
          save: { visible: editing, enabled: editing && !loading && !saving },
          update: { visible: !editing, enabled: !loading && !saving && hasDetails },
          reset: { visible: true, enabled: !saving },
        });
      });
    });

    effect(() => {
      if (!ONCLICK_UPDATE()) return;
      ONCLICK_UPDATE.set(false);
      this.startEdit();
    });

    effect(() => {
      if (!ONCLICK_SAVE()) return;
      ONCLICK_SAVE.set(false);
      this.saveAboutDetails();
    });

    effect(() => {
      if (!ONCLICK_RESET()) return;
      ONCLICK_RESET.set(false);
      this.resetEditForm();
    });

    this.destroyRef.onDestroy(() => ButtonUtils.resetAllClickSignals());
  }

  ngOnInit(): void {
    this.applyRouteTitle();
    this.resetEditForm();
    this.loadAboutDetails();
  }

  loadAboutDetails(): void {
    if (this.loading() || this.saving()) {
      return;
    }

    this.loading.set(true);
    this.pageError.set('');

    this.api
      .getAboutDetails()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (details) => {
          this.aboutInformation.set(details);
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load About information.'),
          );
        },
      });
  }

  startEdit(): void {
    const details = this.aboutInformation();
    if (!details) {
      this.pageError.set('About details are not available yet.');
      return;
    }

    if (this.loading() || this.saving()) {
      return;
    }

    this.pageError.set('');
    this.pageNotice.set('');
    this.aboutForm.enable({ emitEvent: false });
    this.aboutForm.reset(
      {
        internationalNumber: details.internationalNumber,
        localNumber: details.localNumber,
        mailAddress: details.mailAddress,
        officeAddress: details.officeAddress,
      },
      { emitEvent: false },
    );
    this.isEditMode.set(true);
  }

  saveAboutDetails(): void {
    if (!this.isEditMode() || this.saving()) {
      return;
    }

    const currentDetails = this.aboutInformation();
    if (!currentDetails) {
      this.pageError.set('About details are not available yet.');
      return;
    }

    if (this.aboutForm.invalid) {
      this.aboutForm.markAllAsTouched();
      this.pageError.set('Please correct the required fields before saving.');
      return;
    }

    const value = this.aboutForm.getRawValue();
    const payload: AboutUpdateRequest = {
      aboutId: currentDetails.aboutId,
      international: value.internationalNumber.trim(),
      localNumber: value.localNumber.trim(),
      mailAddress: value.mailAddress.trim(),
      officeAddress: value.officeAddress.trim(),
    };

    this.saving.set(true);
    this.pageError.set('');
    this.pageNotice.set('');

    this.api
      .updateAboutDetails(payload)
      .pipe(
        switchMap(() => this.api.getAboutDetails()),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedDetails) => {
          this.aboutInformation.set(updatedDetails);
          this.resetEditForm();
          this.pageNotice.set('About information updated successfully.');
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to update About information.'),
          );
        },
      });
  }

  resetEditForm(): void {
    if (this.saving()) {
      return;
    }

    this.isEditMode.set(false);
    this.aboutForm.reset(
      {
        internationalNumber: '',
        localNumber: '',
        mailAddress: '',
        officeAddress: '',
      },
      { emitEvent: false },
    );
    this.aboutForm.disable({ emitEvent: false });
    this.pageError.set('');
    this.pageNotice.set('');
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
