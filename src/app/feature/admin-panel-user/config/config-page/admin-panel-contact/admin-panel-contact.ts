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
  ContactInformation,
  ContactUpdateRequest,
} from '../../../models/contact.model';
import { ContactService } from '../../../services/contact.service';

import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-contact',
  standalone: true,
  imports: [ExpansionPanelHeader, InputTextBox],
  templateUrl: './admin-panel-contact.html',
})
export class AdminPanelContactComponent implements OnInit {
  private readonly api = inject(ContactService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebarService = inject(SidebarService);
  private readonly toast = inject(ToastHelperService);

  readonly contactInformationPanelOpen = signal(true);
  readonly contactDetailsPanelOpen = signal(true);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly isEditMode = signal(false);
  readonly pageError = signal('');
  readonly pageNotice = signal('');
  readonly contactInformation = signal<ContactInformation | null>(null);

  readonly contactForm = this.formBuilder.nonNullable.group({
    callCenterHotlineNumber: ['', Validators.required],
    emailAddress: ['', Validators.required],
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
      const hasDetails = this.contactInformation() !== null;

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
      this.saveContactDetails();
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
    this.loadContactDetails();
  }

  loadContactDetails(): void {
    if (this.loading() || this.saving()) {
      return;
    }

    this.loading.set(true);
    this.pageError.set('');

    this.api
      .getContactDetails()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (details) => {
          this.contactInformation.set(details);
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to load Contact information.'),
          );
        },
      });
  }

  startEdit(): void {
    const details = this.contactInformation();
    if (!details) {
      this.pageError.set('Contact details are not available yet.');
      return;
    }

    if (this.loading() || this.saving()) {
      return;
    }

    this.pageError.set('');
    this.pageNotice.set('');
    this.contactForm.enable({ emitEvent: false });
    this.contactForm.reset(
      {
        callCenterHotlineNumber: details.callCenterHotlineNumber,
        emailAddress: details.emailAddress,
      },
      { emitEvent: false },
    );
    this.isEditMode.set(true);
  }

  saveContactDetails(): void {
    if (!this.isEditMode() || this.saving()) {
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.pageError.set('Please complete all required fields before saving.');
      return;
    }

    const value = this.contactForm.getRawValue();
    const payload: ContactUpdateRequest = {
      callCenterHotLine: value.callCenterHotlineNumber.trim(),
      contactEmailAddress: value.emailAddress.trim(),
    };

    this.saving.set(true);
    this.pageError.set('');
    this.pageNotice.set('');

    this.api
      .updateContactDetails(payload)
      .pipe(
        switchMap(() => this.api.getContactDetails()),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedDetails) => {
          this.contactInformation.set(updatedDetails);
          this.resetEditForm();
          this.pageNotice.set('Contact information updated successfully.');
        },
        error: (error: unknown) => {
          this.pageError.set(
            this.getErrorMessage(error, 'Unable to update Contact information.'),
          );
        },
      });
  }

  resetEditForm(): void {
    if (this.saving()) {
      return;
    }

    this.isEditMode.set(false);
    this.contactForm.reset(
      {
        callCenterHotlineNumber: '',
        emailAddress: '',
      },
      { emitEvent: false },
    );
    this.contactForm.disable({ emitEvent: false });
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
