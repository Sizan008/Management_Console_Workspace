import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, output, Inject, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface DeleteConfirmationModalConfig {
  title?: string;
  message?: string;
  showCloseButton?: boolean;
  showBackdrop?: boolean;
  customClass?: string;
  buttons?: DeleteConfirmationModalButton[];
  /** Variant affects icon color and primary button style: 'danger'|'info'|'success'|'warning' */
  variant?: 'danger' | 'info' | 'success' | 'warning' | 'primary';
  /** Optional icon name override (trash|info|check|exclamation) */
  icon?: 'trash' | 'info' | 'check' | 'exclamation' | string;
}

export interface DeleteConfirmationModalButton {
  text: string;
  action?: string;
  disabled?: boolean;
}

@Component({
  selector: 'confirmation-dialogue',
  imports: [CommonModule],
  templateUrl: './confirmation-dialogue.html',
  standalone: true,
  styleUrl: './confirmation-dialogue.scss'
})
export class ConfirmationDialogue {

  readonly isOpen = input<boolean>(false);
  readonly config = input<DeleteConfirmationModalConfig>({});
  readonly title = input<string>('Delete Confirmation');
  readonly message = input<string>('Are you sure you want to delete this item? This action cannot be undone.');
  readonly showCloseButton = input<boolean>(true);
  readonly showBackdrop = input<boolean>(true);
  readonly customClass = input<string>('');
  readonly variant = input<'danger' | 'info' | 'success' | 'warning' | 'primary'>('danger');

  readonly close = output<void>();
  readonly buttonClick = output<{ action: string; button: DeleteConfirmationModalButton }>();

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public data: DeleteConfirmationModalConfig,
    @Optional() public dialogRef: MatDialogRef<ConfirmationDialogue>,
    private sanitizer: DomSanitizer
  ) {
    // If used as MatDialog, merge data with config
    if (this.data) {
      // For MatDialog usage, the config will be passed via the data parameter
      // We don't need to modify the input signals here as they are read-only
      // The template will handle the display based on the data
    }
  }

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

  get buttons(): DeleteConfirmationModalButton[] {
    return this.config().buttons || this.getDefaultButtons();
  }

  private getVariant(): 'danger' | 'info' | 'success' | 'warning' | 'primary' {
    return (this.config().variant as any) || this.variant();
  }

  getIconBgClass(): string {
    const v = this.getVariant();
    switch (v) {
      case 'info': return 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 border-2 border-blue-200';
      case 'success': return 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-50 border-2 border-green-200';
      case 'warning': return 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 border-2 border-amber-200';
      default: return 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 border-2 border-red-200';
    }
  }

  getIconColorClass(): string {
    const v = this.getVariant();
    switch (v) {
      case 'info': return 'h-6 w-6 text-blue-600';
      case 'success': return 'h-6 w-6 text-green-600';
      case 'warning': return 'h-6 w-6 text-amber-600';
      default: return 'h-6 w-6 text-red-600';
    }
  }

  getIconSvgHtml(): SafeHtml {
    const v = this.getVariant();
    // Return simple SVG icons as strings
    if (v === 'info') {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 13h1v4h1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
      `);
    }
    if (v === 'success') {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      `);
    }
    if (v === 'warning') {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="0"/></svg>
      `);
    }
    // default: trash/delete icon (danger)
    return this.sanitizer.bypassSecurityTrustHtml(`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    `);
  }

  getButtonClasses(button: DeleteConfirmationModalButton, index: number): string {
    // Primary button (first button) - styled by variant
    if (index === 0) {
      const v = this.getVariant();
      switch (v) {
        case 'info': return 'border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
        case 'success': return 'border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500';
        case 'warning': return 'border-transparent text-white bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
        default: return 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500';
      }
    }

    // Secondary button (second button) - gray border for cancel/close
    return 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500';
  }

  private getDefaultButtons(): DeleteConfirmationModalButton[] {
    return [
      { text: 'Confirm', action: 'confirm' },
      { text: 'Cancel', action: 'cancel' }
    ];
  }

  onClose(): void {
    if (this.dialogRef) {
      // Used as MatDialog
      this.dialogRef.close(false);
    } else {
      // Used as regular component
      this.close.emit();
    }
  }

  onButtonClick(button: DeleteConfirmationModalButton): void {
    if (!button.disabled) {
      if (this.dialogRef) {
        // Used as MatDialog
        const result = button.action === 'confirm' || button.action === 'delete';
        this.dialogRef.close(result);
      } else {
        // Used as regular component
        this.buttonClick.emit({ action: button.action || 'click', button });
      }
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && this.showBackdropValue) {
      this.onClose();
    }
  }
}
