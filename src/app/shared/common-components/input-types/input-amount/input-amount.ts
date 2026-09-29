import {Component, computed, input, output, signal, effect} from '@angular/core';
import {MatInput} from "@angular/material/input";
import {FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors} from "@angular/forms";
import {NgClass} from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';
import { AmountFormatDirective, stripAmountGrouping } from './amount-format.directive';

@Component({
  selector: 'input-amount',
  imports: [
    MatInput,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    AmountFormatDirective,
    MatTooltipModule,
    NgClass,
    MatIconModule,
  ],
  templateUrl: './input-amount.html',
  standalone: true,
  styleUrl: './input-amount.scss'
})
export class InputAmount {

  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly isReadonly = input<boolean>();
  readonly placeholder = input<any>();
  readonly enable = input<boolean>(true);
  readonly valueChange = output<any>();
  readonly cssClass = input<string>('');
  readonly maxLen = input<number>();
  readonly maxAmt = input<number>();
  readonly minAmt = input<number>();
  readonly labelText = input<string>('');
  readonly tooltip = input<string>();
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipDelay = input<number>(500);
  readonly tooltipClass = input<string>('custom-tooltip');
  // New validation inputs
  readonly decimalPlaces = input<number>(2); // Default to 2 decimal places
  readonly allowNegative = input<boolean>(false);
  readonly allowLeadingZeros = input<boolean>(false);
  readonly isVertical = input<boolean>(false);
  readonly onBlurred = output<any>();

  readonly customErrorMessages = input<{ [key: string]: string }>({});
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  // Outputs
  readonly valueChanged = output<string>();
  readonly onChanged = output<any>();
  // readonly onInput = output<any>();

  // Internal state
  isInvalidState = signal(false);
  errorMessage = signal('');

  constructor() {
    // Effect to update validators when validation inputs change
    effect(() => {
      this.updateValidators();
    });
  }

  // Custom validators
  static amountValidator(decimalPlaces: number, allowLeadingZeros: boolean) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();

      // Check for leading zeros (like 0987)
      if (!allowLeadingZeros && /^0\d+/.test(value)) {
        return { leadingZeros: { value: control.value } };
      }

      // Create regex based on decimal places
      const decimalRegex = decimalPlaces > 0
        ? new RegExp(`^\\d+(\\.\\d{1,${decimalPlaces}})?$`)
        : /^\d+$/;

      if (!decimalRegex.test(value)) {
        return { invalidAmount: {
          value: control.value,
          maxDecimals: decimalPlaces
        } };
      }

      return null;
    };
  }

  static negativeAmountValidator(allowNegative: boolean) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const numValue = parseFloat(control.value);
      if (!allowNegative && numValue < 0) {
        return { negativeNotAllowed: { value: control.value } };
      }

      return null;
    };
  }

  // Custom validator for maximum length on numbers
  static maxLengthNumberValidator(maxLength: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const value = control.value.toString();
      if (value.length > maxLength) {
        return {
          maxLengthNumber: {
            actualLength: value.length,
            requiredLength: maxLength,
            value: control.value
          }
        };
      }

      return null;
    };
  }

  hasCustomMessage(errorKey: string): boolean {
  const messages = this.customErrorMessages();
  return !!messages && errorKey in messages;
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

    // Add min/max validators if specified
    if (this.minAmt() !== undefined) {
      validators.push(Validators.min(this.minAmt()!));
    }

    if (this.maxAmt() !== undefined) {
      validators.push(Validators.max(this.maxAmt()!));
    }

    // Add max length validator for numbers
    if (this.maxLen() !== undefined && this.maxLen()! > 0) {
      validators.push(InputAmount.maxLengthNumberValidator(this.maxLen()!));
      validators.push(Validators.maxLength(this.maxLen()!));
    }

    // Add custom amount validator
    validators.push(InputAmount.amountValidator(
      this.decimalPlaces(),
      this.allowLeadingZeros()
    ));

    // Add negative validator
    validators.push(InputAmount.negativeAmountValidator(this.allowNegative()));

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

    // For min and max errors, Angular returns an object {min: x, actual: y}
    if (errorCode === 'min' && error) {
      return error.min;
    }
    if (errorCode === 'max' && error) {
      return error.max;
    }

    // For custom validators
    if (typeof error === 'object' && error !== null) {
      return error;
    }
    return error;
  }

  get isDisabled(): boolean {
    return !this.enable();
  }

  // Format amount to have the correct decimal places
  private formatAmountValue(value: string | number): string {
    if (!value && value !== 0) return '';

    let val = value.toString().trim();

    // Return empty if value is empty after trim
    if (!val) return '';

    // If value ends with a decimal point, don't format yet (user is still typing)
    if (val.endsWith('.')) return val;

    // Parse as number
    const num = parseFloat(val);
    if (isNaN(num)) return val;

    // Format with correct number of decimal places
    return num.toFixed(this.decimalPlaces());
  }

  // Typing rules (allowed characters, decimal places, max length), grouping and
  // caret handling all live in AmountFormatDirective, which is the value accessor
  // for this input. Everything below only reports the raw value outwards.
  onChangeInput(event: Event) {
    this.valueChange.emit(this.rawValueOf(event));
  }

  // Reads the raw (ungrouped) value straight off the element, so it does not
  // depend on whether the value accessor has already pushed it to the control.
  private rawValueOf(event: Event): string {
    return stripAmountGrouping((event.target as HTMLInputElement)?.value);
  }

  // Helper method to format step attribute based on decimal places
  getStepValue(): string {
    if (this.decimalPlaces() === 0) return '1';
    return '0.' + '0'.repeat(this.decimalPlaces() - 1) + '1';
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

// The events below carry the raw (ungrouped) value so consumers keep receiving
// a parseable amount, not the display text.
onInput(event: Event): void {
  const value = this.rawValueOf(event);
  this.valueChanged.emit(value);
  this.onChanged.emit(value);
}

onChange(event: Event): void {
  this.onChanged.emit(this.rawValueOf(event));
}

onBlur(): void {
  const control = this.frmGroup().get(this.controlName());
  let value = control ? control.value : undefined;

  // Format amount to show decimal places on blur. Writing to the control makes
  // the value accessor repaint the input with the grouping in place.
  if (value && value !== '' && value !== null) {
    const formattedValue = this.formatAmountValue(value);
    if (formattedValue !== value) {
      control?.setValue(formattedValue);
      value = formattedValue;
    }
  }

  this.onChanged.emit(value);
  this.onBlurred.emit(value);
}

}
