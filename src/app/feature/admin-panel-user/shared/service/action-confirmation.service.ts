import { Injectable, signal } from '@angular/core';
import { DeleteConfirmationModalConfig } from '../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';

export type ConfirmAction = 'save' | 'update' | 'delete' | 'reset';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActionConfirmationService {
  readonly isOpen = signal(false);

  readonly config = signal<DeleteConfirmationModalConfig>({
    title: 'Confirm Action',
    message: 'Are you sure you want to continue?',
    variant: 'info',

    buttons: [
      {
        text: 'Yes',
        action: 'confirm',
      },
      {
        text: 'Cancel',
        action: 'cancel',
      },
    ],
  });

  private resolver: ((confirmed: boolean) => void) | null = null;

  /*
    ============================================================
    MAIN CONFIRM
    ============================================================
  */

  confirm(
    action: ConfirmAction,
    options: ConfirmOptions = {},
  ): Promise<boolean> {
    const preset = this.getPreset(action);

    this.config.set({
      title: options.title || preset.title,

      message: options.message || preset.message,

      variant: preset.variant,

      buttons: [
        {
          text: options.confirmText || preset.confirmText,

          action: 'confirm',
        },

        {
          text: 'Cancel',

          action: 'cancel',
        },
      ],
    });

    this.isOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /*
    ============================================================
    DIALOG BUTTON
    ============================================================
  */

  handleButtonClick(event: { action: string; button?: unknown }): void {
    const confirmed = event.action === 'confirm';

    this.finish(confirmed);
  }

  /*
    ============================================================
    CLOSE / CANCEL
    ============================================================
  */

  cancel(): void {
    this.finish(false);
  }

  /*
    ============================================================
    FINISH
    ============================================================
  */

  private finish(confirmed: boolean): void {
    this.isOpen.set(false);

    if (this.resolver) {
      this.resolver(confirmed);

      this.resolver = null;
    }
  }

  /*
    ============================================================
    DEFAULT CONFIG
    ============================================================
  */

  private getPreset(action: ConfirmAction): {
    title: string;
    message: string;
    confirmText: string;
    variant: 'info' | 'warning' | 'danger';
  } {
    switch (action) {
      case 'save':
        return {
          title: 'Save Confirmation',

          message: 'Are you sure you want to save this information?',

          confirmText: 'Yes, Save',

          variant: 'info',
        };

      case 'update':
        return {
          title: 'Update Confirmation',

          message: 'Are you sure you want to update this information?',

          confirmText: 'Yes, Update',

          variant: 'info',
        };

      case 'delete':
        return {
          title: 'Delete Confirmation',

          message: 'Are you sure you want to delete this information?',

          confirmText: 'Yes, Delete',

          variant: 'danger',
        };

      case 'reset':
        return {
          title: 'Reset Confirmation',

          message: 'Are you sure you want to reset the entered information?',

          confirmText: 'Yes, Reset',

          variant: 'warning',
        };
    }
  }
}
