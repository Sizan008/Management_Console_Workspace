import { Component, input, output, EventEmitter, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface WarningModalConfig {
  title?: string;
  message?: string;
  showCloseButton?: boolean;
  showBackdrop?: boolean;
  customClass?: string;
  buttons?: WarningModalButton[];
}

export interface WarningModalButton {
  text: string;
  action?: string;
  disabled?: boolean;
}

@Component({
    selector: 'app-alert-warning',
    imports: [CommonModule],
    standalone: true,
    templateUrl: './alert-warning.html'
})
export class AlertWarningComponent {
  readonly isOpen = input<boolean>(false);
  readonly config = input<WarningModalConfig>({});
  readonly title = input<string>('Warning!');
  readonly message = input<string>('');
  readonly showCloseButton = input<boolean>(true);
  readonly showBackdrop = input<boolean>(true);
  readonly customClass = input<string>('');

  readonly close = output<void>();
  readonly buttonClick = output<{ action: string; button: WarningModalButton }>();

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) private dialogData: WarningModalConfig | null) {}

  get titleText(): string {
    return this.dialogData?.title || this.config().title || this.title();
  }

  get messageText(): string {
    return this.dialogData?.message || this.config().message || this.message();
  }

  get showClose(): boolean {
    return this.dialogData?.showCloseButton ?? this.config().showCloseButton ?? this.showCloseButton();
  }

  get showBackdropValue(): boolean {
    return this.dialogData?.showBackdrop ?? this.config().showBackdrop ?? this.showBackdrop();
  }

  get buttons(): WarningModalButton[] {
    return this.dialogData?.buttons || this.config().buttons || this.getDefaultButtons();
  }

  getButtonClasses(button: WarningModalButton, index: number): string {
    // Primary button (first button) - yellow for warning (like Delete button)
    if (index === 0) {
      return 'border-transparent text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
    }

    // Secondary button (second button) - gray border (like Cancel button)
    return 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500';
  }

  private getDefaultButtons(): WarningModalButton[] {
    return [
      { text: 'OK', action: 'ok' }
    ];
  }

  onClose(): void {
    this.close.emit();
  }

  onButtonClick(button: WarningModalButton): void {
    if (!button.disabled) {
      this.buttonClick.emit({ action: button.action || 'click', button });
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && this.showBackdropValue) {
      this.onClose();
    }
  }
}
