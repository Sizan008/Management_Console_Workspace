import { Component, input, output, EventEmitter, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface SuccessModalConfig {
  title?: string;
  message?: string;
  showCloseButton?: boolean;
  showBackdrop?: boolean;
  customClass?: string;
  buttons?: SuccessModalButton[];
}

export interface SuccessModalButton {
  text: string;
  action?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-alert-success',
  imports: [CommonModule],
  templateUrl: './alert-success.html'
})
export class AlertSuccessComponent {
  readonly isOpen = input<boolean>(false);
  readonly config = input<SuccessModalConfig>({});
  readonly title = input<string>('Success!');
  readonly message = input<string>('');
  readonly showCloseButton = input<boolean>(true);
  readonly showBackdrop = input<boolean>(true);
  readonly customClass = input<string>('');

  readonly close = output<void>();
  readonly buttonClick = output<{ action: string; button: SuccessModalButton }>();

  constructor(@Optional() @Inject(MAT_DIALOG_DATA) private dialogData: SuccessModalConfig | null) {}

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

  get buttons(): SuccessModalButton[] {
    return this.dialogData?.buttons || this.config().buttons || this.getDefaultButtons();
  }

  getButtonClasses(button: SuccessModalButton, index: number): string {
    // Primary button (first button) - green for success (like Delete button)
    if (index === 0) {
      return 'border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500';
    }
    
    // Secondary button (second button) - gray border (like Cancel button)
    return 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500';
  }

  private getDefaultButtons(): SuccessModalButton[] {
    return [
      { text: 'OK', action: 'ok' }
    ];
  }

  onClose(): void {
    this.close.emit();
  }

  onButtonClick(button: SuccessModalButton): void {
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