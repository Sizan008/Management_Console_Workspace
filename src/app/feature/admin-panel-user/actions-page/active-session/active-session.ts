import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  Subscription,
  catchError,
  combineLatest,
  distinctUntilChanged,
  finalize,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import {
  ConfirmationDialogue,
  DeleteConfirmationModalConfig,
} from '../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { IActiveSession } from '../../models/active-session.model';
import { ActiveSessionService } from '../../services/active-session.service';

import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-active-session',
  standalone: true,
  imports: [
    ExpansionPanelHeader,
    GenericButton,
    GenericDataGrid,
    ConfirmationDialogue,
  ],
  templateUrl: './active-session.html',
})
export class ActiveSessionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ActiveSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastHelperService);
  private readonly reload = new Subject<void>();

  private clearRequest?: Subscription;

  readonly selectedUserId = signal('');
  readonly activeSessions = signal<IActiveSession[]>([]);
  readonly loading = signal(false);
  readonly clearing = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly infoMessage = signal('');
  readonly sessionPanelOpen = signal(true);
  readonly confirmationOpen = signal(false);
  readonly confirmationConfig = signal<DeleteConfirmationModalConfig>({
    title: 'Clear Active Sessions',
    message: 'Are you sure you want to clear the selected user active sessions?',
    variant: 'warning',
    buttons: [
      { text: 'Clear Sessions', action: 'confirm' },
      { text: 'Cancel', action: 'cancel' },
    ],
  });

  readonly busy = computed(() => this.loading() || this.clearing());
  readonly hasSessions = computed(() => this.activeSessions().length > 0);

  readonly customColumnNames: Record<string, string> = {
    userId: 'User ID',
    ipAddress: 'IP Address',
    startTime: 'Start Time',
    lastAccessTime: 'Last Access Time',
    activeFlag: 'Status',
  };
  readonly selectedColumns = Object.keys(this.customColumnNames);

  readonly cellRenderFunctions = {
    activeFlag: (cellValue: unknown, rowData: IActiveSession) =>
      this.formatStatusBadge(cellValue, rowData),
  };

  constructor() {
    effect(() => {
      const message = this.errorMessage();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.successMessage();
      if (message) this.toast.success(message);
    });

    effect(() => {
      const message = this.infoMessage();
      if (message) this.toast.info(message);
    });

  }

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap.pipe(
        map((params) => (params.get('userId') || '').trim()),
        distinctUntilChanged(),
      ),
      this.reload.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([userId]) => {
          this.clearRequest?.unsubscribe();
          this.resetView(userId);

          if (!userId) {
            this.errorMessage.set(
              'Select a user from the workspace to view their active sessions.',
            );
            return of(null);
          }

          this.loading.set(true);
          return this.api.getUserActiveSession(userId).pipe(
            catchError((error: unknown) => {
              this.errorMessage.set(
                this.getErrorMessage(error, 'Unable to load active sessions.'),
              );
              return of([] as IActiveSession[]);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => {
        if (rows === null) {
          return;
        }

        const formattedRows = rows.map((row) => ({
          ...row,
          startTime: this.formatDate(row.startTime),
          lastAccessTime: this.formatDate(row.lastAccessTime),
          activeFlag: this.coerceActiveFlag(row),
        }));

        this.activeSessions.set(formattedRows);

        if (!formattedRows.length && !this.errorMessage()) {
          this.infoMessage.set(
            `No active session found for ${this.selectedUserId()}.`,
          );
        }
      });
  }

  refresh(): void {
    if (!this.busy() && this.selectedUserId()) {
      this.reload.next();
    }
  }

  onClose(): void {
    if (!this.clearing()) {
      void this.router.navigate(['../../'], { relativeTo: this.route });
    }
  }

  requestClearAll(): void {
    const userId = this.selectedUserId();
    if (!userId || !this.hasSessions() || this.busy()) {
      return;
    }

    this.openClearConfirmation(userId);
  }

  onRowDelete(payload: string): void {
    if (!payload || this.busy()) {
      return;
    }

    let row: IActiveSession;
    try {
      row = JSON.parse(payload) as IActiveSession;
    } catch {
      this.errorMessage.set('Unable to read the selected active session.');
      return;
    }

    const userId = (row.userId || this.selectedUserId()).trim();
    if (!userId) {
      this.errorMessage.set('User ID was not found for the selected session.');
      return;
    }

    this.openClearConfirmation(userId);
  }

  onConfirmationButtonClick(event: { action: string }): void {
    const wasOpen = this.confirmationOpen();
    this.confirmationOpen.set(false);

    if (event.action !== 'confirm' || !wasOpen) {
      return;
    }

    this.clearSelectedUserSessions();
  }

  onCancelConfirmation(): void {
    this.confirmationOpen.set(false);
  }

  private openClearConfirmation(userId: string): void {
    this.confirmationConfig.set({
      title: 'Clear Active Sessions',
      message: `Are you sure you want to clear all active sessions for "${userId}"?`,
      variant: 'warning',
      buttons: [
        { text: 'Clear Sessions', action: 'confirm' },
        { text: 'Cancel', action: 'cancel' },
      ],
    });
    this.confirmationOpen.set(true);
  }

  private clearSelectedUserSessions(): void {
    const userId = this.selectedUserId();
    if (!userId || this.clearing()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.infoMessage.set('');
    this.clearing.set(true);

    this.clearRequest = this.api
      .clearUserActiveSession(userId)
      .pipe(
        finalize(() => this.clearing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (!this.isOk(response?.Status)) {
            this.errorMessage.set(
              response?.Message?.trim() || 'Unable to clear active sessions.',
            );
            return;
          }

          this.activeSessions.set([]);
          this.successMessage.set(
            response?.Message?.trim() ||
              `Active sessions for ${userId} were cleared successfully.`,
          );
          this.infoMessage.set(`No active session found for ${userId}.`);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            this.getErrorMessage(error, 'Unable to clear active sessions.'),
          );
        },
      });
  }

  private resetView(userId: string): void {
    this.selectedUserId.set(userId);
    this.activeSessions.set([]);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.infoMessage.set('');
    this.confirmationOpen.set(false);
    this.sessionPanelOpen.set(true);
  }

  private formatDate(raw?: string): string {
    if (!raw) {
      return '';
    }

    const cleaned = raw.replace('T', ' ').trim();
    const [datePart = '', timePart = ''] = cleaned.split(' ');
    const bits = datePart.split('-');
    if (bits.length !== 3) {
      return cleaned;
    }

    const [yyyy = '', mm = '', dd = ''] = bits;
    const time = timePart ? ` ${timePart.split('.')[0]}` : '';
    return `${dd}/${mm}/${yyyy}${time}`;
  }

  private extractStatus(row: IActiveSession | Record<string, unknown>): unknown {
    const source = row as Record<string, unknown>;
    const candidates = [
      source['activeFlag'],
      source['ActiveFlag'],
      source['status'],
      source['Status'],
      source['isActive'],
      source['IsActive'],
    ];

    return candidates.find(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== '',
    );
  }

  private coerceActiveFlag(row: IActiveSession): string {
    const raw = this.extractStatus(row);
    return raw === null || raw === undefined ? '' : String(raw);
  }

  private formatStatusBadge(
    cellValue: unknown,
    rowData: IActiveSession,
  ): string {
    const raw =
      cellValue !== null && cellValue !== undefined && cellValue !== ''
        ? cellValue
        : rowData?.activeFlag ?? this.coerceActiveFlag(rowData ?? {});

    const display =
      raw === null || raw === undefined || raw === '' ? '—' : String(raw);
    const value = display.trim().toLowerCase();

    if (
      value === 'y' ||
      value === '1' ||
      value === 'true' ||
      value === 'active' ||
      value === 'enabled' ||
      value === 'logged in'
    ) {
      return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;font-size:11px;font-weight:700;line-height:1.4;">Active</span>';
    }

    if (
      value === 'n' ||
      value === '0' ||
      value === 'false' ||
      value === 'inactive' ||
      value === 'disabled' ||
      value === 'logged out'
    ) {
      return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;font-size:11px;font-weight:700;line-height:1.4;">Inactive</span>';
    }

    return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;font-size:11px;font-weight:700;line-height:1.4;">${this.escapeHtml(display)}</span>`;
  }

  private isOk(status: unknown): boolean {
    return String(status ?? '').trim().toUpperCase() === 'OK';
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { Message?: unknown } | null;
      if (typeof body?.Message === 'string' && body.Message.trim()) {
        return body.Message.trim();
      }
      if (error.status === 0) {
        return 'Unable to reach the server. Please try again.';
      }
      return fallback;
    }

    return error instanceof Error && error.message.trim()
      ? error.message
      : fallback;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
