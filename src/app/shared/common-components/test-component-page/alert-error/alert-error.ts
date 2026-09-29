import { Component, input, output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ErrorModalConfig {
  title?: string;
  message?: string;
  showCloseButton?: boolean;
  showBackdrop?: boolean;
  customClass?: string;
  buttons?: ErrorModalButton[];
}

export interface ErrorModalButton {
  text: string;
  action?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-alert-error',
  imports: [CommonModule],
  templateUrl: './alert-error.html'
})
export class AlertErrorComponent {
  readonly isOpen = input<boolean>(false);
  readonly config = input<ErrorModalConfig>({});
  readonly title = input<string>('Error!');
  readonly message = input<string>('');
  readonly showCloseButton = input<boolean>(true);
  readonly showBackdrop = input<boolean>(true);
  readonly customClass = input<string>('');

  readonly close = output<void>();
  readonly buttonClick = output<{ action: string; button: ErrorModalButton }>();

  get titleText(): string {
    return this.config().title || this.title();
  }

  get messageText(): string {
    return this.config().message || this.message();
  }

  get showClose(): boolean {
    return this.config().showCloseButton ?? this.showCloseButton();
  }

  get showBackdropValue(): boolean {
    return this.config().showBackdrop ?? this.showBackdrop();
  }

  get buttons(): ErrorModalButton[] {
    return this.config().buttons || this.getDefaultButtons();
  }

  getButtonClasses(button: ErrorModalButton, index: number): string {
    // Primary button (first button) - red for error (like Delete button)
    if (index === 0) {
      return 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500';
    }
    
    // Secondary button (second button) - gray border (like Cancel button)
    return 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500';
  }

  private getDefaultButtons(): ErrorModalButton[] {
    return [
      { text: 'OK', action: 'ok' }
    ];
  }

  onClose(): void {
    this.close.emit();
  }

  onButtonClick(button: ErrorModalButton): void {
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