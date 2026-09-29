import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputDate } from '../../../../../shared/common-components/input-types/input-date/input-date';
import { LoaderService } from '../../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../../shared/common-componets/action-confirmation-host';
import {
  BUTTON_VISIBILITY,
  ONCLICK_SAVE,
  ONCLICK_UPDATE,
  ONCLICK_RESET,
  ONCLICK_EXIT,
} from '../../../../../shared/constant/button-signals.constant';
import { AdminPanelNewsEventService } from '../../../services/admin-panel-news-event.service';
import { NewsEvent, NewsPayload } from '../../../models/news-event.model';
@Component({
  selector: 'app-admin-panel-news-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    GenericDataGrid,
    InputTextBox,
    InputDate,
    ActionConfirmationHost,
  ],
  templateUrl: './news-event.html',
})
export class AdminPanelNewsEvent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminPanelNewsEventService);
  private readonly loader = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly loading = signal(false);
  readonly isNewsPanelOpen = signal(true);
  readonly isNewsListOpen = signal(true);
  readonly newsEventList = signal<NewsEvent[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly newsEventForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    url: ['', [Validators.required]],
    date: ['', [Validators.required]],
  });
  readonly columns = ['id', 'title', 'url', 'date'];
  readonly columnNames = {
    id: 'ID',
    title: 'Title',
    url: 'URL',
    date: 'Date',
  };
  constructor() {
    this.initializeButtonVisibility();
    this.initializeGlobalActions();
    this.newsEventForm.valueChanges.subscribe(() => {
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
      exit: true,
      reset: false,
    });
  }
  private initializeGlobalActions(): void {
    effect(() => {
      if (ONCLICK_SAVE()) {
        this.requestSave();
        ONCLICK_SAVE.set(false);
      }
    });
    effect(() => {
      if (ONCLICK_UPDATE()) {
        this.requestUpdate();
        ONCLICK_UPDATE.set(false);
      }
    });
    effect(() => {
      if (ONCLICK_RESET()) {
        this.requestReset();
        ONCLICK_RESET.set(false);
      }
    });
    effect(() => {
      if (ONCLICK_EXIT()) {
        this.onClose();
        ONCLICK_EXIT.set(false);
      }
    });
  }
  private updateResetVisibility(): void {
    BUTTON_VISIBILITY.update((value) => ({
      ...value,
      reset: this.newsEventForm.dirty,
    }));
  }
  ngOnInit(): void {
    this.loadNewsEvents();
  }
  private loadNewsEvents(): void {
    this.loading.set(true);
    this.loader.show();
    this.api
      .getNewsEventList()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.Status?.toUpperCase() === 'OK') {
            this.newsEventList.set(res.Result ?? []);
          } else {
            this.toast.error(
              res.Message || 'Failed to load News & Events.',
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Failed to load News & Events.'),
            'Error',
          );
        },
      });
  }
  onEdit(event: any): void {
    const data = this.parseGridEvent(event);
    if (!data) {
      return;
    }
    const id = Number(data['id']);
    if (!id) {
      this.toast.error('Invalid News & Event information.', 'Error');
      return;
    }
    this.editingId.set(id);
    this.newsEventForm.reset({
      title: String(data['title'] ?? ''),
      url: String(data['url'] ?? ''),
      date: String(data['date'] ?? ''),
    });
    this.newsEventForm.markAsPristine();
    this.newsEventForm.markAsUntouched();
    BUTTON_VISIBILITY.set({
      save: false,
      saveNext: false,
      update: true,
      updateNext: false,
      view: false,
      delete: false,
      exit: true,
      reset: false,
    });
    this.isNewsPanelOpen.set(true);
    this.scrollToForm();
  }
  async requestSave(): Promise<void> {
    if (this.loading()) {
      return;
    }
    if (this.editingId() !== null) {
      this.toast.warning(
        'You are currently editing a News & Event. Please use Update.',
        'Validation',
      );
      return;
    }
    if (!this.validateForm()) {
      return;
    }
    const value = this.newsEventForm.getRawValue();
    const confirmed = await this.confirmation.confirm('save', {
      title: 'Save News & Event',
      message: `Are you sure you want to save "${value.title.trim()}"?`,
      confirmText: 'Yes, Save',
    });
    if (!confirmed) {
      return;
    }
    this.saveNews('ADD');
  }
  async requestUpdate(): Promise<void> {
    if (this.loading()) {
      return;
    }
    if (this.editingId() === null) {
      this.toast.warning(
        'Please select a News & Event from the list first.',
        'Validation',
      );
      return;
    }
    if (!this.validateForm()) {
      return;
    }
    const value = this.newsEventForm.getRawValue();
    const confirmed = await this.confirmation.confirm('update', {
      title: 'Update News & Event',
      message: `Are you sure you want to update "${value.title.trim()}"?`,
      confirmText: 'Yes, Update',
    });
    if (!confirmed) {
      return;
    }
    this.saveNews('UPDATE');
  }
  private validateForm(): boolean {
    if (this.newsEventForm.invalid) {
      this.newsEventForm.markAllAsTouched();
      this.isNewsPanelOpen.set(true);
      const invalidControl = this.getFirstInvalidControl();
      if (invalidControl) {
        this.scrollToField(invalidControl);
      }
      this.toast.warning('Please provide Title, URL and Date.', 'Validation');
      return false;
    }
    const value = this.newsEventForm.getRawValue();
    if (!value.title.trim()) {
      this.toast.warning('Title is required.', 'Validation');
      this.scrollToField('title');
      return false;
    }
    if (!value.url.trim()) {
      this.toast.warning('URL is required.', 'Validation');
      this.scrollToField('url');
      return false;
    }
    if (!value.date.trim()) {
      this.toast.warning('Date is required.', 'Validation');
      this.scrollToField('date');
      return false;
    }
    return true;
  }
  private saveNews(action: 'ADD' | 'UPDATE'): void {
    const value = this.newsEventForm.getRawValue();
    const payload: NewsPayload = {
      id: action === 'UPDATE' ? (this.editingId() ?? undefined) : undefined,
      title: value.title.trim(),
      url: value.url.trim(),
      date: value.date,
      action,
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .addUpdateOrDeleteNewsEvent(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.Status?.toUpperCase() === 'OK') {
            this.toast.success(
              res.Message ||
                (action === 'ADD'
                  ? 'News & Event saved successfully.'
                  : 'News & Event updated successfully.'),
              'Success',
            );
            this.resetForm();
            this.loadNewsEvents();
          } else {
            this.toast.error(
              res.Message ||
                (action === 'ADD'
                  ? 'Failed to save News & Event.'
                  : 'Failed to update News & Event.'),
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(
              error,
              action === 'ADD'
                ? 'Failed to save News & Event.'
                : 'Failed to update News & Event.',
            ),
            'Error',
          );
        },
      });
  }
  async onDelete(event: any): Promise<void> {
    if (this.loading()) {
      return;
    }
    const data = this.parseGridEvent(event);
    if (!data) {
      return;
    }
    const id = Number(data['id']);
    const title = String(data['title'] ?? '');
    if (!id) {
      this.toast.error('Invalid News & Event information.', 'Error');
      return;
    }
    const confirmed = await this.confirmation.confirm('delete', {
      title: 'Delete News & Event',
      message: title
        ? `Are you sure you want to delete "${title}"?`
        : 'Are you sure you want to delete this News & Event?',
      confirmText: 'Yes, Delete',
    });
    if (!confirmed) {
      return;
    }
    this.deleteNews(id);
  }
  private deleteNews(id: number): void {
    const payload: NewsPayload = {
      id,
      title: '',
      url: '',
      date: '',
      action: 'DELETE',
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .addUpdateOrDeleteNewsEvent(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (res) => {
          if (res.Status?.toUpperCase() === 'OK') {
            this.toast.success(
              res.Message || 'News & Event deleted successfully.',
              'Success',
            );
            if (this.editingId() === id) {
              this.resetForm();
            }
            this.loadNewsEvents();
          } else {
            this.toast.error(
              res.Message || 'Failed to delete News & Event.',
              'Error',
            );
          }
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Failed to delete News & Event.'),
            'Error',
          );
        },
      });
  }
  async requestReset(): Promise<void> {
    if (this.loading()) {
      return;
    }
    if (!this.newsEventForm.dirty) {
      return;
    }
    const confirmed = await this.confirmation.confirm('reset', {
      title: 'Reset News & Event',
      message: 'Are you sure you want to reset the News & Event form?',
      confirmText: 'Yes, Reset',
    });
    if (!confirmed) {
      return;
    }
    this.resetForm();
    this.toast.info('News & Event form reset successfully.', 'Reset');
  }
  private resetForm(): void {
    this.newsEventForm.reset({
      title: '',
      url: '',
      date: '',
    });
    this.newsEventForm.markAsPristine();
    this.newsEventForm.markAsUntouched();
    this.editingId.set(null);
    BUTTON_VISIBILITY.set({
      save: true,
      saveNext: false,
      update: false,
      updateNext: false,
      view: false,
      delete: false,
      exit: true,
      reset: false,
    });
  }
  onClose(): void {
    window.history.back();
  }
  private parseGridEvent(event: any): Record<string, any> | null {
    if (!event) {
      return null;
    }
    if (typeof event === 'string') {
      try {
        const data = JSON.parse(event);
        return data && typeof data === 'object' ? data : null;
      } catch {
        this.toast.error('Invalid News & Event row data.', 'Error');
        return null;
      }
    }
    return typeof event === 'object' ? event : null;
  }
  private getFirstInvalidControl(): string | null {
    const controls = ['title', 'url', 'date'];
    return (
      controls.find(
        (controlName) => this.newsEventForm.get(controlName)?.invalid,
      ) ?? null
    );
  }
  private scrollToForm(): void {
    setTimeout(() => {
      document.getElementById('news-event-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  }
  private scrollToField(controlName: string): void {
    setTimeout(() => {
      const form = document.getElementById('news-event-form');
      if (!form) {
        return;
      }
      const field = form.querySelector(
        `[controlname="${controlName}"]`,
      ) as HTMLElement | null;
      if (!field) {
        this.scrollToForm();
        return;
      }
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
