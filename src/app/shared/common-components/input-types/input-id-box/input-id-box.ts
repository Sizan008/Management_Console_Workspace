import {Component, computed, input, output, signal, effect} from '@angular/core';
import {MatInput} from "@angular/material/input";
import {FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors} from "@angular/forms";
import {NgClass} from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

@Component({
  selector: 'input-id-box',
  imports: [
    FormsModule,
    FormsModule,
    MatInput,
    MatTooltipModule,
    MatRippleModule,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    NgClass,
    MatIconModule,
  ],
  templateUrl: './input-id-box.html',
  standalone: true,
  styleUrl: './input-id-box.scss'
})
export class InputIdBox {

  // Required inputs
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();

  // Optional inputs with defaults
  readonly id = input<string>('');
  readonly value = input<string>('');
  readonly isReadonly = input<boolean>();
  readonly label = input.required<string>();
  readonly valueChange = output<any>();
  readonly placeholder = input<any>();
  readonly tooltip = input<string>();
  readonly labelText = input<string>('');
  readonly leadingZero = input<string>('');
  readonly visible = input<boolean>(true);
  readonly isAllowSpecialChars = input<boolean>(false);
  readonly onBlurred = output<any>();
  // New validation inputs
  readonly minLen = input<number>();
  readonly maxLen = input<number>();
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipDelay = input<number>(500);
  readonly tooltipClass = input<string>('custom-tooltip');
  // readonly isRequired = input<boolean>(false);
  readonly isVertical = input<boolean>(false);
  // Custom error messages support
  readonly customErrorMessages = input<{ [key: string]: string }>({});
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  // Outputs
  readonly valueChanged = output<string>();
  readonly onChanged = output<any>();
  // readonly onInput = output<any>();
  readonly onDoubleClick = output<void>();
  readonly dotsClicked = output<void>();
  readonly isDotsVisible = input<boolean>(true);

  // Internal state
  isInvalidState = signal(false);
  errorMessage = signal('');

  constructor() {
    // Effect to update validators when validation inputs change
    effect(() => {
      const minLen = this.minLen();
      const maxLen = this.maxLen();
      const allowSpecialChars = this.isAllowSpecialChars();
      const isRequired = this.isRequired();

      this.updateValidators();
    });
  }

  private specialCharacterValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null; // Don't validate empty values here

    const specialCharRegex = /^[a-zA-Z0-9 ]*$/; // Allow only alphanumeric and spaces
    if (!specialCharRegex.test(control.value)) {
      return { specialCharacterNotAllowed: true };
    }
    return null;
  }

  private updateValidators(): void {
    const control = this.frmGroup().get(this.controlName());
    if (!control) return;

    // Start with parent validators (they may already be a composed function)
    let validators: any[] = [];

    const parentValidatorFn = control.validator;
    if (parentValidatorFn) {
      validators.push(parentValidatorFn);
    }
    // console.log('Existing Validators:', parentValidatorFn);





    // Add required validator if needed
    if (this.isRequired()) {
      validators.push(Validators.required);
    }

    // Add special character validator if not allowing special chars
    if (!this.isAllowSpecialChars()) {
      validators.push(this.specialCharacterValidator);
    }

    // Handle length/range rules depending on input type
    const inputType = this.getInputType();

    if (this.minLen() !== undefined && this.minLen()! > 0) {
      validators.push(Validators.minLength(this.minLen()!));
    }
    if (this.maxLen() !== undefined && this.maxLen()! > 0) {
      validators.push(Validators.maxLength(this.maxLen()!));
    }

    // ✅ Combine parent + child validators properly
    control.setValidators(Validators.compose(validators));
    control.updateValueAndValidity();
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  private getInputType(): string {
    // Check template or return default based on your logic
    return 'number'; // Since your template shows type="number"
  }

  // Computed signals for reactive styling
  inputClasses = computed(() => {
    const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
    const errorClasses = this.isInvalid() ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-300' : 'border-gray-300';
    const visibilityClasses = this.visible() ? '' : 'hidden';

    return `${baseClasses} ${errorClasses} ${visibilityClasses}`;
  });

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
    return error;
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

    const defaultErrorKeys = ['required', 'min', 'max', 'minlength', 'maxlength', 'pattern', 'specialCharacterNotAllowed'];
    return Object.keys(control.errors).filter(key => !defaultErrorKeys.includes(key));
  }

  // Check if there are any custom errors to display
  hasCustomErrors(): boolean {
    return this.getCustomErrorKeys().length > 0;
  }

  onChangeInput() {
    const control = this.frmGroup().get(this.controlName());
    this.valueChange.emit(control?.value);
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
    // this.onChanged.emit(value);
    this.onBlurred.emit(value);
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

  onDotsClick() {
    this.dotsClicked.emit();
  }

  preventSpecialChars(event: KeyboardEvent): void {
    if (!this.isAllowSpecialChars()) {
      // const specialCharRegex = /^[a-zA-Z0-9 ]$/;
      const specialCharRegex = /^[0-9 ]$/;
      const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab', 'Enter']; // Allow navigation and editing keys

      if (!specialCharRegex.test(event.key) && !allowedKeys.includes(event.key)) {
        event.preventDefault();
      }
    }
  }
}
