import {Component, input, output, effect} from '@angular/core';
import {FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatInput, MatInputModule} from "@angular/material/input";
import {MatTooltipModule} from "@angular/material/tooltip";
import {NgClass} from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

@Component({
  selector: 'input-text-box',
  imports: [
    FormsModule,
    MatInput,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    NgClass,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './input-text-box.html',
  standalone: true,
  styleUrl: './input-text-box.scss'
})
export class InputTextBox {
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly type = input<string>();
  readonly isReadonly = input<boolean>();
  readonly placeholder = input<any>();
  readonly minLength = input<number>();
  readonly maxLength = input<number>();
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');

  readonly onDoubleClick = output<void>();
  readonly isVertical = input<boolean>(false);
  readonly onBlurred = output<any>();
  readonly onF8 = output<void>();
  // Tooltip support
  readonly isAllowSpecialChars = input<boolean>(true);
  readonly tooltip = input<string>('');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipDelay = input<number>(500);
  readonly tooltipClass = input<string>('custom-tooltip');

  // Custom error messages support
  readonly customErrorMessages = input<{ [key: string]: string }>({});

  // Output
  readonly valueChanged = output<string>();
  readonly onChanged = output<any>();


  constructor() {
    // Effect to update validators when min/max length inputs change
    effect(() => {
      this.updateValidators();
    });
  }

  private specialCharacterValidator(control: any): { [key: string]: boolean } | null {
    const specialCharRegex = /^[a-zA-Z0-9 ]*$/;
    if (control.value && !specialCharRegex.test(control.value)) {
      return { specialCharacterNotAllowed: true };
    }
    return null;
  }

  public updateValidators(): void {
    const control = this.frmGroup().get(this.controlName());
    if (!control) return;

    const existingValidators = control.validator ? [control.validator] : [];
    const validators = [...existingValidators];

    // Add required validator if detected from outside or input()
    if (this.isRequired()) {
      validators.push(Validators.required);
    }

    // Add min length validator if specified
    if (this.minLength() !== undefined && this.minLength()! > 0) {
      validators.push(Validators.minLength(this.minLength()!));
    }

    // Add max length validator if specified
    if (this.maxLength() !== undefined && this.maxLength()! > 0) {
      validators.push(Validators.maxLength(this.maxLength()!));
    }

    // Add special character validator if not allowed
    if (!this.isAllowSpecialChars()) {
      validators.push(this.specialCharacterValidator);
    }

    // Merge validators without overwriting existing ones
    control.setValidators(validators);
    control.updateValueAndValidity();
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  preventSpecialChars(event: KeyboardEvent): void {
    if (!this.isAllowSpecialChars()) {
      const specialCharRegex = /^[a-zA-Z0-9 ]$/;
      const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'];

      // Allow navigation and editing keys
      if (!specialCharRegex.test(event.key) && !allowedKeys.includes(event.key)) {
        event.preventDefault();
      }
    }
  }
  hasCustomMessage(errorKey: string): boolean {
  const messages = this.customErrorMessages();
  return !!messages && errorKey in messages;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'F8') {
      event.preventDefault();
      event.stopPropagation();
      this.onF8.emit();
      return;
    }

    if (!this.isAllowSpecialChars()) {
      const specialCharRegex = /^[a-zA-Z0-9 ]$/;
      const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'];

      // Allow navigation and editing keys
      if (!specialCharRegex.test(event.key) && !allowedKeys.includes(event.key)) {
        event.preventDefault();
      }
    }
  }

  // Get custom error message for a specific error key
  getCustomErrorMessage(errorKey: string): string {
    const customMessages = this.customErrorMessages();
    const control = this.frmGroup().get(this.controlName());
    let message = `${this.label()} has validation error: ${errorKey}`;

    if (typeof customMessages[errorKey] === 'string') {
      message = customMessages[errorKey];
    } else if (customMessages[errorKey] && typeof customMessages[errorKey] === 'object' && 'message' in customMessages[errorKey]) {
      message = (customMessages[errorKey] as any).message;
    } else if (control?.errors?.[errorKey]) {
      const errorValue = control.errors[errorKey];
      if (typeof errorValue === 'string') {
        message = errorValue;
      } else if (errorValue && typeof errorValue === 'object' && 'message' in errorValue) {
        message = (errorValue as any).message || message;
      }
    }
    return message;
  }

  // Get all error keys that are not handled by default error messages
  getCustomErrorKeys(): string[] {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.errors) return [];

    const defaultErrorKeys = ['required', 'minlength', 'maxlength', 'specialCharacterNotAllowed'];
    return Object.keys(control.errors).filter(key => !defaultErrorKeys.includes(key));
  }

  // Check if there are any custom errors to display
  hasCustomErrors(): boolean {
    return this.getCustomErrorKeys().length > 0;
  }

  clearInput(): void {
  const control = this.frmGroup().get(this.controlName());
  console.log(control);
  if (control) {
    control.setValue('');
    control.markAsTouched();
    this.valueChanged.emit('');
    this.onChanged.emit('');
  }
}

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value;
    this.valueChanged.emit(value);
    this.onChanged.emit(value);
  }

  onChange(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value;
    this.onChanged.emit(value);
  }

  onBlur(): void {
    const control = this.frmGroup().get(this.controlName());
    const value = control ? control.value : undefined;
    this.onChanged.emit(value);
    this.onBlurred.emit(value);
  }

}
