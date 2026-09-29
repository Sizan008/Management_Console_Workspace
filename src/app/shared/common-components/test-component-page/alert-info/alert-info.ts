import { Component, input, output, EventEmitter, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface InfoModalConfig {
  title?: string;
  message?: string;
  showCloseButton?: boolean;
  showBackdrop?: boolean;
  customClass?: string;
  buttons?: InfoModalButton[];
}

export interface InfoModalButton {
  text: string;
  action?: string;
  disabled?: boolean;
}

@Component({
    selector: 'app-alert-info',
    imports: [CommonModule],
    standalone: true,
    templateUrl: './alert-info.html'
})
export class AlertInfoComponent {
  readonly isOpen = input<boolean>(false);
  readonly config = input<InfoModalConfig>({});
  readonly title = input<string>('Information');
  readonly message = input<string>('');
  readonly showCloseButton = input<boolean>(true);
  readonly showBackdrop = input<boolean>(true);
  readonly customClass = input<string>('');

  readonly close = output<void>();
  readonly buttonClick = output<{ action: string; button: InfoModalButton }>();

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) private dialogData: InfoModalConfig | null) {}

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

  get buttons(): InfoModalButton[] {
    return this.dialogData?.buttons || this.config().buttons || this.getDefaultButtons();
  }

  getButtonClasses(button: InfoModalButton, index: number): string {
    // Primary button (first button) - blue for info (like Delete button)
    if (index === 0) {
      return 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }

    // Secondary button (second button) - gray border (like Cancel button)
    return 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500';
  }

  private getDefaultButtons(): InfoModalButton[] {
    return [
      { text: 'Close', action: 'ok' }
    ];
  }

  onClose(): void {
    this.close.emit();
  }

  onButtonClick(button: InfoModalButton): void {
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
