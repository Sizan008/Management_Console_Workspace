import {Component, computed, input, output, signal, effect} from '@angular/core';
import {MatInput} from "@angular/material/input";
import {FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {NgClass} from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

@Component({
  selector: 'input-number',
  imports: [
    MatInput,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    MatTooltipModule,
    MatIconModule,
    NgClass
  ],
  templateUrl: './input-number.html',
  standalone: true,
  styleUrl: './input-number.scss'
})
export class InputNumber {
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly isReadonly = input<boolean>();
  readonly placeholder = input<any>();
  readonly enable = input<boolean>(true);
  readonly valueChange = output<any>();
  readonly cssClass = input<string>('');
  readonly maxLen = input<number>();
  readonly minLen = input<number>();
  readonly labelText = input<string>('');
  readonly tooltip = input<string>('Enter a number');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly tooltipDelay = input<number>(500);
  readonly isVertical = input<boolean>(false);
  readonly onBlurred = output<any>();
  // Add min and max value inputs for validation
  readonly minValue = input<number>();
  readonly maxValue = input<number>();
  readonly customErrorMessages = input<{ [key: string]: string }>({});

  // Option to allow leading zeros (default: false)
  readonly allowLeadingZeros = input<boolean>(false);
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  // Outputs
  readonly valueChanged = output<string>();
  readonly onChanged = output<any>();

  // Internal state
  isInvalidState = signal(false);
  errorMessage = signal('');

  constructor() {
    // Effect to update validators when min/max value inputs change
    effect(() => {
      this.updateValidators();
    });
  }

  private updateValidators(): void {
    const control = this.frmGroup().get(this.controlName());
    if (!control) return;

      const existingValidators = control.validator ? [control.validator] : [];

      const validators = [...existingValidators];
    
    // Check if field was already required
    if (this.isRequired()) {
      validators.push(Validators.required);
    }
    
    // Add min value validator if specified
    if (this.minValue() !== undefined && this.minValue() !== null) {
      validators.push(Validators.min(this.minValue()!));
    }
    
    // Add max value validator if specified
    if (this.maxValue() !== undefined && this.maxValue() !== null) {
      validators.push(Validators.max(this.maxValue()!));
    }

    // Add min length validator if specified
    if (this.minLen() !== undefined && this.minLen()! > 0) {
      validators.push(Validators.minLength(this.minLen()!));
    }
    
    // Add max length validator if specified
    if (this.maxLen() !== undefined && this.maxLen()! > 0) {
      validators.push(Validators.maxLength(this.maxLen()!));
    }
    
    // Add pattern validator to ensure only integers (no decimals)
    validators.push(Validators.pattern(/^\d+$/));
    
    // Update the control's validators
    control.setValidators(validators);
    control.updateValueAndValidity();
  }

  // Computed signals for reactive styling
  inputClasses = computed(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none';
    const stateClasses = this.isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white';
    const errorClasses = this.isInvalidState() ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-300' : 'border-gray-300';
    const customClasses = this.cssClass() || '';
    
    return `${baseClasses} ${stateClasses} ${errorClasses} ${customClasses}`;
  });

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  isInvalid(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (this.isReadonly() || control?.disabled) return false;
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  hasError(errorCode: string): boolean {
    const control = this.frmGroup().get(this.controlName());
    return !!control?.hasError(errorCode);
  }

  getErrorValue(errorCode: string): any {
    const control = this.frmGroup().get(this.controlName());
    const error = control?.getError(errorCode);
    
    // For min and max errors, Angular returns an object {min: expectedValue, actual: actualValue}
    if (errorCode === 'min' && error) {
      return error.min;
    }
    if (errorCode === 'max' && error) {
      return error.max;
    }
    
    return error;
  }

  get isDisabled(): boolean {
    return !this.enable();
  }

  // Prevent decimal point and other non-numeric characters, and enforce max length
  onKeyPress(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const currentValue = input.value || '';
    const maxLength = this.maxLen();
    const char = event.key;
    
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    
    // Always allow navigation and control keys
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }
    
    // Prevent decimal point specifically
    if (char === '.' || char === ',') {
      event.preventDefault();
      return;
    }
    
    // Check if it's a numeric character
    if (!/^\d$/.test(char)) {
      event.preventDefault();
      return;
    }
    
    // Prevent leading zeros unless explicitly allowed
    if (!this.allowLeadingZeros()) {
      // If current value is empty and user types '0', allow it (single zero is valid)
      if (currentValue === '' && char === '0') {
        return;
      }
      
      // If current value is '0' and user types any digit, prevent the '0' from staying
      // This will be handled in onInput where we remove leading zeros
      if (currentValue === '0' && char !== '0') {
        // Allow the keystroke, onInput will handle removing the leading zero
        return;
      }
      
      // Prevent typing '0' at the beginning if there's already content
      if (currentValue.length > 0 && currentValue === '0' && char === '0') {
        return;
      }
    }
    
    // Prevent typing if max length is reached and no text is selected
    if (maxLength && currentValue.length >= maxLength) {
      // Only prevent if no text is selected (which would be replaced)
      const selectionStart = input.selectionStart || 0;
      const selectionEnd = input.selectionEnd || 0;
      
      if (selectionStart === selectionEnd) {
        // No text selected, prevent typing
        event.preventDefault();
      }
    }
  }

  // Enhanced input validation with leading zero removal and max length enforcement
  onInput(event: any): void {
    const input = event.target;
    let value = input.value;
    const maxLength = this.maxLen();
    
    // Remove any non-numeric characters (including decimal points)
    value = value.replace(/[^0-9]/g, '');
    
    // Remove leading zeros unless explicitly allowed
    if (!this.allowLeadingZeros() && value.length > 0) {
      // Special case: if value is all zeros, keep one zero
      if (/^0+$/.test(value)) {
        value = '0';
      } else {
        // Remove leading zeros: "0098" becomes "98", "000123" becomes "123"
        value = value.replace(/^0+/, '');
        // If after removing leading zeros we get empty string, set to '0'
        if (value === '') {
          value = '0';
        }
      }
    }
    
    // Enforce max length by truncating if necessary
    if (maxLength && value.length > maxLength) {
      value = value.substring(0, maxLength);
    }
    
    // Update the input value if it was changed
    if (input.value !== value) {
      input.value = value;
      
      // Update form control
      const control = this.frmGroup().get(this.controlName());
      if (control) {
        control.setValue(value ? parseInt(value, 10) : null);
      }
    }
    
    this.onChangeInput();
  }

  onChange(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value;
    // console.log('Number changed:', value);
    this.onChanged.emit(value);
  }

  // Handle paste events to clean pasted content
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    
    const paste = event.clipboardData?.getData('text') || '';
    const input = event.target as HTMLInputElement;
    const control = this.frmGroup().get(this.controlName());
    const maxLength = this.maxLen();
    
    // Clean the pasted value - remove non-numeric characters
    let cleanValue = paste.replace(/[^0-9]/g, '');
    
    // Remove leading zeros unless explicitly allowed
    if (!this.allowLeadingZeros() && cleanValue.length > 0) {
      // Special case: if value is all zeros, keep one zero
      if (/^0+$/.test(cleanValue)) {
        cleanValue = '0';
      } else {
        // Remove leading zeros
        cleanValue = cleanValue.replace(/^0+/, '');
        // If after removing leading zeros we get empty string, set to '0'
        if (cleanValue === '') {
          cleanValue = '0';
        }
      }
    }
    
    // Apply max length
    if (maxLength && cleanValue.length > maxLength) {
      cleanValue = cleanValue.slice(0, maxLength);
    }
    
    input.value = cleanValue;
    control?.setValue(cleanValue ? parseInt(cleanValue, 10) : null);
    this.onChangeInput();
  }

  // Handle blur event to ensure final cleanup
  onBlur(event: any): void {
    const input = event.target;
    let value = input.value;
    this.onBlurred.emit(value);
    // Final cleanup on blur
    if (!this.allowLeadingZeros() && value && value.length > 1 && value.startsWith('0')) {
      // Remove leading zeros one more time
      if (/^0+$/.test(value)) {
        value = '0';
      } else {
        value = value.replace(/^0+/, '') || '0';
      }
      
      if (input.value !== value) {
        input.value = value;
        const control = this.frmGroup().get(this.controlName());
        if (control) {
          control.setValue(value ? parseInt(value, 10) : null);
        }
        this.onChangeInput();
      }
    }
  }

  onChangeInput() {
    const control = this.frmGroup().get(this.controlName());
    this.valueChange.emit(control?.value);
    this.onChanged.emit(control?.value);
  }


  hasCustomMessage(errorKey: string): boolean {
    const messages = this.customErrorMessages();
    return !!messages && errorKey in messages;
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
  if (control) {
    control.setValue('');
    control.markAsTouched();
    this.valueChanged.emit('');
    this.onChanged.emit('');
  }
}


}