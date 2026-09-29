import { ChangeDetectionStrategy, Component, input, effect, inject, output, computed } from '@angular/core';
import { UserPreferencesService } from '../../../services/user-preferences.service';
import { FormGroup, FormsModule, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatInput, MatSuffix } from '@angular/material/input';
import { NgClass } from '@angular/common';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { CustomDateAdapter } from './adapter/custom-date.adapter';
import { AppDateFormatsConstant } from '../../../constant/app-date-formats.constant';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime } from 'rxjs';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' | 'DD MMM, YYYY';

@Component({
  selector: 'input-date',
  imports: [
    FormsModule,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    FormControlHighlightDirective,
    MatInput,
    ReactiveFormsModule,
    MatSuffix,
    MatTooltipModule,
    NgClass
  ],
  templateUrl: './input-date.html',
  standalone: true,
  styleUrl: './input-date.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: AppDateFormatsConstant }
  ],
})
export class InputDate {
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly isReadonly = input<boolean>(false);
  /**
   * Optional per-instance override. When not provided, the date format falls
   * back to the user's preference (Settings → Preferences → Date Format).
   */
  readonly dateFormatInput = input<DateFormat | undefined>(undefined, { alias: 'dateFormat' });
  readonly isVertical = input<boolean>(false);

  private readonly prefsService = inject(UserPreferencesService);
  /**
   * Effective format: explicit input wins; otherwise the user preference.
   * When the preference is 'none', fall back to the per-instance input or the
   * built-in default.
   */
  readonly dateFormat = computed<DateFormat>(() => {
    const explicit = this.dateFormatInput();
    if (explicit) return explicit;
    const pref = this.prefsService.prefs().dateFormat;
    return pref && pref !== 'none' ? pref : 'DD/MM/YYYY';
  });

  private dateAdapter = inject(DateAdapter) as CustomDateAdapter;
  readonly tooltip = input<string>('Select a date');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipDelay = input<number>(500);
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly minYear = input<number>(1900);
  readonly maxYear = input<number>(2050);
  readonly enableYearRangeValidation = input<boolean>(true);
  readonly minDate = input<Date | string | null>(null);
  readonly maxDate = input<Date | string | null>(null);
  readonly onBlurred = output<any>();
  readonly includeTime = input<number>(1);
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  readonly customErrorMessages = input<{ [key: string]: string }>({});

  hasCustomMessage(errorKey: string): boolean {
    const messages = this.customErrorMessages();
    return !!messages && errorKey in messages;
  }

  getCustomErrorMessage(errorKey: string): string {
    const control = this.frmGroup().get(this.controlName());
    let message = `${this.label()} has validation error: ${errorKey}`;

    if (typeof this.customErrorMessages()[errorKey] === 'string') {
      message = this.customErrorMessages()[errorKey];
    } else if (control?.errors?.[errorKey]) {
      const errorValue = control.errors[errorKey];
      if (typeof errorValue === 'string') {
        message = errorValue;
      }
    }
    return message;
  }

  getCustomErrorKeys(): string[] {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.errors) return [];

    const defaultErrorKeys = ['required', 'yearOutOfRange', 'invalidDateFormat'];
    return Object.keys(control.errors).filter(key => !defaultErrorKeys.includes(key));
  }

  hasCustomErrors(): boolean {
    return this.getCustomErrorKeys().length > 0;
  }

  constructor() {
    // Add custom validator when component initializes
    effect(() => {
      const control = this.frmGroup().get(this.controlName());
      if (control) {
        const existingValidators = control.validator;
        control.setValidators([
          ...(existingValidators ? [existingValidators] : []),
          this.dateFormatValidator.bind(this)
        ]);
        control.updateValueAndValidity();
      }
    });

    // Update date adapter format when dateFormat input changes
    effect(() => {
      this.dateAdapter.setFormat(this.dateFormat());
    });

     effect(() => {
      const control = this.frmGroup().get(this.controlName());
      if (control) {
        // Subscribe to value changes
        const subscription = control.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
          if (value instanceof Date) {
            if (this.includeTime()===1) {
              const isoString = this.convertDateToISO8601(value);
              control.setValue(isoString, { emitEvent: false });

              // Update the input element to show the display format
              const displayValue = this.formatDateToDisplay(value);
              const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
              if (inputElement) {
                inputElement.value = displayValue;
              }
            } else {
              const isoDateTime = this.convertDateToISO8601DateTime(value);
              control.setValue(isoDateTime, { emitEvent: false });

              // Update the input element to show the display format
              const displayValue = this.formatDateToDisplay(value);
              const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
              if (inputElement) {
                inputElement.value = displayValue;
              }
            }
          }
        });

        // Clean up subscription when effect is destroyed
        return () => subscription.unsubscribe();
      }
      return () => {}; // Return empty cleanup function if no subscription
    });
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  // Method to get display format (follows the selected/preferred date format)
  getDisplayFormat(): string {
    return this.dateFormat();
  }

  /** Format a Date into the currently selected/preferred display format. */
  formatDateToDisplay(date: Date): string {
    if (!date || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (this.dateFormat()) {
      case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
      case 'YYYY/MM/DD': return `${year}/${month}/${day}`;
      case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
      case 'MM-DD-YYYY': return `${month}-${day}-${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      case 'DD MMM, YYYY': return `${day} ${monthNames[date.getMonth()]}, ${year}`;
      case 'DD/MM/YYYY':
      default: return `${day}/${month}/${year}`;
    }
  }

  // Method to get the actual date format for validation
  getActualDateFormat(): DateFormat {
    return this.dateFormat();
  }

    clearInput(): void {
  const control = this.frmGroup().get(this.controlName());
  if (control) {
    control.setValue('');
    control.markAsTouched();
  }
}

  getDateSeparator(): string {
    if (this.dateFormat() === 'DD MMM, YYYY') {
      return ' ';
    }
    return this.dateFormat().includes('/') ? '/' : '-';
  }

  // Handle date selection from calendar
onDateSelected(event: any): void {
  if (event.value instanceof Date) {
    let date = event.value as Date;
    const selectedYear = date.getFullYear();
    const control = this.frmGroup().get(this.controlName());


    if (!this.includeTime()) {
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    if (control) {
      // Validate year range before setting the value
      if (selectedYear < 1900 || selectedYear > 2030) {
        // Don't set the invalid date
        control.setValue('');

        // Set specific error for year range
        control.setErrors({
          ...control.errors,
          yearOutOfRange: {
            selectedYear: selectedYear,
            minYear: 1900,
            maxYear: 2030
          }
        });

        // Clear the input display
        const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
        if (inputElement) {
          inputElement.value = '';
        }

        // Show user-friendly message
        this.showYearValidationMessage(selectedYear);
        return;
      }

      // Validate minDate
      const minDate = this.getMinDate();
      if (minDate && date < minDate) {
        control.setValue('');
        control.setErrors({
          ...control.errors,
          minDate: {
            selectedDate: date,
            minDate: minDate
          }
        });
        const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
        if (inputElement) {
          inputElement.value = '';
        }
        return;
      }

      // Validate maxDate
      const maxDate = this.getMaxDate();
      if (maxDate && date > maxDate) {
        control.setValue('');
        control.setErrors({
          ...control.errors,
          maxDate: {
            selectedDate: date,
            maxDate: maxDate
          }
        });
        const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
        if (inputElement) {
          inputElement.value = '';
        }
        return;
      }

      // Clear any existing year range, minDate, or maxDate errors
      if (control.errors?.['yearOutOfRange'] || control.errors?.['minDate'] || control.errors?.['maxDate']) {
        const errors = { ...control.errors };
        delete errors['yearOutOfRange'];
        delete errors['minDate'];
        delete errors['maxDate'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }

      // Set the valid date
      control.setValue(date);

      // Update the input display immediately
      const displayValue = this.formatDateToDisplay(date);

      const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.value = displayValue;
      }

     
      this.onBlur();
    }
  }
}

private showYearValidationMessage(selectedYear: number): void {
  let message = '';

  if (selectedYear < 1900) {
    message = `Year ${selectedYear} is too old. Please select a year between 1900 and 2030.`;
  } else if (selectedYear > 2030) {
    message = `Year ${selectedYear} is too far in the future. Please select a year between 1900 and 2030.`;
  }

  console.warn(message);

}

 onKeyDown(event: KeyboardEvent): void {
  const format = this.dateFormat();
  const input = event.target as HTMLInputElement;
  const currentValue = input.value;
  const cursorPosition = input.selectionStart || 0;
  const separator = this.getDateSeparator();

  // Allowed keys
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End',
    'ArrowLeft', 'ArrowRight', 'Clear', 'Copy', 'Paste'
  ];

  // The 'DD MMM, YYYY' format is text-based (e.g. "18 Aug, 2025"), so it needs
  // letters, a comma and spaces in addition to digits. Allow free typing here
  // and let the blur handler validate the final value.
  if (format === 'DD MMM, YYYY') {
    const isAllowedChar =
      (event.key >= '0' && event.key <= '9') ||
      /^[a-zA-Z]$/.test(event.key) ||
      event.key === ',' ||
      event.key === ' ';

    if (!allowedKeys.includes(event.key) && !isAllowedChar && !(event.ctrlKey || event.metaKey)) {
      event.preventDefault();
    }
    return;
  }

  const isNumberKey = (event.key >= '0' && event.key <= '9');
  const isSeparatorKey = event.key === separator;

  if (!allowedKeys.includes(event.key) && !isNumberKey && !isSeparatorKey) {
    event.preventDefault();
    return;
  }

  // PREVENT CONSECUTIVE SEPARATORS
  if (isSeparatorKey) {
    // Check if the last character is already a separator
    if (currentValue.charAt(cursorPosition - 1) === separator) {
      event.preventDefault();
      return;
    }

    // Check if adding this separator would create consecutive separators
    const newValue = currentValue.substring(0, cursorPosition) + separator + currentValue.substring(cursorPosition);
    if (this.hasConsecutiveSeparators(newValue)) {
      event.preventDefault();
      return;
    }
  }

  if (isNumberKey) {
    const newValue = currentValue.substring(0, cursorPosition) + event.key + currentValue.substring(cursorPosition);

    // Check validity of the partial input before allowing
    if (!this.isPartialInputValid(newValue)) {
      event.preventDefault();
      return;
    }

    // If we should add a separator next, do it safely
    if (this.shouldAddSeparator(newValue, cursorPosition + 1)) {
      event.preventDefault();

      const valueWithSeparator = newValue + separator;
      input.value = valueWithSeparator;
      input.setSelectionRange(valueWithSeparator.length, valueWithSeparator.length);

      // Fire Angular change detection
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
    }
  }
}


// onInputChange(event: Event): void {
//   const input = event.target as HTMLInputElement;
//   let value = input.value;

//   // Ensure we're working with a string
//   if (typeof value !== 'string') {
//     value = String(value || '');
//   }

//   const format = this.dateFormat();
//   const control = this.frmGroup().get(this.controlName());

//   // Handle the 'DD MMM, YYYY' display format
//   if (format === 'DD MMM, YYYY') {
//     // Allow letters, numbers, spaces, and commas for month abbreviation format
//     const cleanValue = value.replace(/[^0-9A-Za-z\s,]/g, '');
//     if (cleanValue !== value) {
//       input.value = cleanValue;
//       control?.setValue(cleanValue);
//       control?.setErrors({ ...control.errors, invalidCharacters: true });
//       return;
//     } else {
//       if (control?.errors?.['invalidCharacters']) {
//         const errors = { ...control.errors };
//         delete errors['invalidCharacters'];
//         control.setErrors(Object.keys(errors).length ? errors : null);
//       }
//     }
//   } else {
//     // Remove any characters that are not numbers or the expected separator
//     const separator = this.getDateSeparator();
//     const cleanValue = value.replace(new RegExp(`[^0-9\\${separator}]`, 'g'), '');

//     if (cleanValue !== value) {
//       input.value = cleanValue;
//       control?.setValue(cleanValue);
//       control?.setErrors({ ...control.errors, invalidCharacters: true });
//       return;
//     }

//     // CHECK FOR CONSECUTIVE SEPARATORS AND INVALID PATTERNS
//     if (this.hasConsecutiveSeparators(cleanValue) || this.hasInvalidSeparatorPattern(cleanValue)) {
//       control?.setErrors({ ...control.errors, invalidDateFormat: true });
//       return;
//     } else {
//       // Remove invalidCharacters and invalidDateFormat errors if input is clean
//       if (control?.errors?.['invalidCharacters'] || control?.errors?.['invalidDateFormat']) {
//         const errors = { ...control.errors };
//         delete errors['invalidCharacters'];
//         delete errors['invalidDateFormat'];
//         control.setErrors(Object.keys(errors).length ? errors : null);
//       }
//     }
//   }

//   // Only validate if the input looks like it might be complete or nearly complete
//   if (value.length > 0) {
//     if (!this.isPartialInputValid(value)) {
//       this.clearField();
//     }
//   }
// }


private hasConsecutiveSeparators(value: string): boolean {
  const separator = this.getDateSeparator();
  const consecutivePattern = new RegExp(`\\${separator}{2,}`, 'g');
  return consecutivePattern.test(value);
}

private hasInvalidSeparatorPattern(value: string): boolean {
  const separator = this.getDateSeparator();

  // Check if starts or ends with separator
  if (value.startsWith(separator) ) {
    return true; // Allow trailing separator during typing
  }

  const part = value.split(separator);
  if (value.endsWith(separator) && part.length > 3) {
    return true;
  }

  if (value.endsWith(separator)) {
    return false;
  }

  // Check if there are more than 2 separators
  const separatorCount = (value.match(new RegExp(`\\${separator}`, 'g')) || []).length;
  if (separatorCount > 2) {
    return true;
  }

  // Check for empty segments (like "12//12" or "12/12/")
  const parts = value.split(separator);
  let emptySegments = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].trim() === '') {
      emptySegments++;
    }
  }

  // Allow one empty segment at the end (for typing), but not in the middle
  if (emptySegments > 1) {
    return true;
  }

  if (emptySegments === 1 && parts[parts.length - 1] !== '') {
    return true; // Empty segment in the middle
  }

  return false;
}




  // onKeyDown(event: KeyboardEvent): void {
  //   const format = this.dateFormat();

  //   // Handle the 'DD MMM, YYYY' display format
  //   if (format === 'DD MMM, YYYY') {
  //     const allowedKeys = [
  //       'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End',
  //       'ArrowLeft', 'ArrowRight', 'Clear', 'Copy', 'Paste', ' '
  //     ];

  //     const isNumberKey = (event.key >= '0' && event.key <= '9');
  //     const isLetterKey = (event.key >= 'a' && event.key <= 'z') || (event.key >= 'A' && event.key <= 'Z');
  //     const isCommaKey = event.key === ',';

  //     if (!allowedKeys.includes(event.key) && !isNumberKey && !isLetterKey && !isCommaKey) {
  //       event.preventDefault();
  //       return;
  //     }
  //     return; // Don't apply auto-separator logic for this format
  //   }

  //   // Original logic for other formats
  //   const allowedKeys = [
  //     'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End',
  //     'ArrowLeft', 'ArrowRight', 'Clear', 'Copy', 'Paste'
  //   ];

  //   const isNumberKey = (event.key >= '0' && event.key <= '9');
  //   const isSeparatorKey = event.key === this.getDateSeparator();

  //   if (!allowedKeys.includes(event.key) && !isNumberKey && !isSeparatorKey) {
  //     event.preventDefault();
  //     return;
  //   }

  //   // Auto-add separators but be less aggressive
  //   const input = event.target as HTMLInputElement;
  //   const currentValue = input.value;
  //   const cursorPosition = input.selectionStart || 0;

  //   if (isNumberKey) {
  //     const newValue = currentValue.substring(0, cursorPosition) + event.key + currentValue.substring(cursorPosition);
  //     console.log("New value:", newValue);
  //     // Only auto-add separator if we're at the right position and not in the middle of editing
  //     if (this.shouldAddSeparator(newValue, cursorPosition) && cursorPosition === currentValue.length) {
  //       event.preventDefault();
  //       const separator = this.getDateSeparator();
  //       const valueWithSeparator = currentValue + event.key + separator;
  //       input.value = valueWithSeparator;
  //       input.setSelectionRange(valueWithSeparator.length, valueWithSeparator.length);

  //       // Trigger Angular change detection
  //       const changeEvent = new Event('input', { bubbles: true });
  //       input.dispatchEvent(changeEvent);
  //     }
  //   }
  // }

  onInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  let value = input.value;

  // Ensure we're working with a string
  if (typeof value !== 'string') {
    value = String(value || '');
  }

  const format = this.dateFormat();
  const control = this.frmGroup().get(this.controlName());

  // Handle the 'DD MMM, YYYY' display format
  if (format === 'DD MMM, YYYY') {
    // Allow letters, numbers, spaces, and commas for month abbreviation format
    const cleanValue = value.replace(/[^0-9A-Za-z\s,]/g, '');
    if (cleanValue !== value) {
      input.value = cleanValue;
      control?.setValue(cleanValue);
      // Set invalid characters error
      control?.setErrors({ ...control.errors, invalidCharacters: true });
      return;
    } else {
      // Remove invalidCharacters error if input is clean
      if (control?.errors?.['invalidCharacters']) {
        const errors = { ...control.errors };
        delete errors['invalidCharacters'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  } else {
    // Remove any characters that are not numbers or the expected separator
    const separator = this.getDateSeparator();
    const cleanValue = value.replace(new RegExp(`[^0-9\\${separator}]`, 'g'), '');

    if (cleanValue !== value) {
      input.value = cleanValue;
      control?.setValue(cleanValue);
      // Set invalid characters error
      control?.setErrors({ ...control.errors, invalidCharacters: true });
      return;
    } else {
      // Remove invalidCharacters error if input is clean
      if (control?.errors?.['invalidCharacters']) {
        const errors = { ...control.errors };
        delete errors['invalidCharacters'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  }

  // Only validate if the input looks like it might be complete or nearly complete
  if (value.length > 0) {
    if (!this.isPartialInputValid(value)) {
      this.clearField();
    }
  }
}


getDetailedErrorMessage(): string {
  const control = this.frmGroup().get(this.controlName());
  if (!control || !control.touched) return '';

  const errors = control.errors;
  if (!errors) return '';

  // Check for required error first
  if (errors['required']) {
    return this.hasCustomMessage('required')
      ? this.getCustomErrorMessage('required')
      : `${this.label()} is required!`;
  }

  // Check for year out of range error
  if (errors['yearOutOfRange']) {
    return this.hasCustomMessage('yearOutOfRange')
      ? this.getCustomErrorMessage('yearOutOfRange')
      : (() => {
          const yearInfo = errors['yearOutOfRange'];
          return `Year ${yearInfo.selectedYear} is not allowed. Please select a year between ${yearInfo.minYear} and ${yearInfo.maxYear}.`;
        })();
  }

  // Check for invalid characters
  if (errors['invalidCharacters']) {
    return this.hasCustomMessage('invalidCharacters')
      ? this.getCustomErrorMessage('invalidCharacters')
      : (() => {
          if (this.dateFormat() === 'DD MMM, YYYY') {
            return 'Only numbers, letters, spaces and commas are allowed';
          } else {
            return `Only numbers and ${this.getDateSeparator()} are allowed`;
          }
        })();
  }

  // Check for format errors
  if (errors['invalidDateFormat']) {
    return this.hasCustomMessage('invalidDateFormat')
      ? this.getCustomErrorMessage('invalidDateFormat')
      : (() => {
          const currentValue = control.value || '';
          if (this.hasConsecutiveSeparators(currentValue)) {
            return `Consecutive ${this.getDateSeparator()} separators are not allowed`;
          }
          if (this.hasInvalidSeparatorPattern(currentValue)) {
            return `Invalid date format - please use ${this.dateFormat()} format`;
          }
          return `Please enter date in ${this.dateFormat()} format`;
        })();
  }

  // Check for invalid date with detailed info
  if (errors['invalidDate']) {
    return this.hasCustomMessage('invalidDate')
      ? this.getCustomErrorMessage('invalidDate')
      : (() => {
          const details = errors['invalidDateDetails'];
          if (details) {
            return `${details.monthName} ${details.year} only has ${details.maxDays} days. You entered day ${details.enteredDay}`;
          }
          return 'Please enter a valid date';
        })();
  }

  // Check for min date error
  if (errors['minDate']) {
    return this.hasCustomMessage('minDate')
      ? this.getCustomErrorMessage('minDate')
      : (() => {
          const minDateInfo = errors['minDate'];
          const minDateStr = this.formatDateForDisplay(minDateInfo.minDate);
          return `Date must be on or after ${minDateStr}`;
        })();
  }

  // Check for max date error
  if (errors['maxDate']) {
    return this.hasCustomMessage('maxDate')
      ? this.getCustomErrorMessage('maxDate')
      : (() => {
          const maxDateInfo = errors['maxDate'];
          const maxDateStr = this.formatDateForDisplay(maxDateInfo.maxDate);
          return `Date must be on or before ${maxDateStr}`;
        })();
  }

  return 'Please enter a valid date';
}
onFocus(event: FocusEvent): void {
  const control = this.frmGroup().get(this.controlName());
  if (!control) return;

  let currentValue = control.value;

  // If value is a Date, convert to editable format (respecting the selected format)
  if (currentValue instanceof Date) {
    const date = currentValue as Date;
    const editable = this.convertDateObjectToInputFormat(date) ?? this.formatDateToDisplay(date);

    const input = event.target as HTMLInputElement;
    input.value = editable;
  }
   else if (typeof currentValue === 'string' && this.isISOFormat(currentValue)) {
    const date = new Date(currentValue);
    if (!isNaN(date.getTime())) {
      const convertedValue = this.convertDateObjectToInputFormat(date);
      if (convertedValue) {
        const input = event.target as HTMLInputElement;
        input.value = convertedValue;
      }
    }
  }
  else if (this.isDisplayFormat(currentValue)) {
    const convertedValue = this.convertDisplayFormatToInputFormat(currentValue);
    if (convertedValue) {

      const input = event.target as HTMLInputElement;
      input.value = convertedValue;
    }
  }
}

// Add this helper method to check if the value is in ISO format
private isISOFormat(value: string): boolean {
  // Check for ISO date format (YYYY-MM-DD) or ISO datetime format (YYYY-MM-DDTHH:MM:SS)
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2})?)?$/;
  return isoDatePattern.test(value);
}

// Add this helper method to convert Date object to input format based on dateFormat
private convertDateObjectToInputFormat(date: Date): string | null {
  const format = this.dateFormat();
  const separator = this.getDateSeparator();

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      return `${day}${separator}${month}${separator}${year}`;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      return `${month}${separator}${day}${separator}${year}`;
    case 'YYYY/MM/DD':
    case 'YYYY-MM-DD':
      return `${year}${separator}${month}${separator}${day}`;
    case 'DD MMM, YYYY':
      // For this format, return as is since it's already user-friendly
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${monthNames[date.getMonth()]}, ${year}`;
    default:
      return null;
  }
}





private isDisplayFormat(value: string): boolean {
  // Check if the value matches "DD MMM, YYYY" format (e.g., "18 Aug, 2025")
  const displayFormatPattern = /^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/;
  return displayFormatPattern.test(value);
}


private convertDisplayFormatToInputFormat(displayValue: string): string | null {
  const match = displayValue.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const monthAbbr = match[2].toLowerCase();
  const year = match[3];

  // Month abbreviation to number mapping
  const monthMap: { [key: string]: string } = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  const month = monthMap[monthAbbr];
  if (!month) return null;

  const format = this.dateFormat();
  const separator = this.getDateSeparator();

  // Convert based on the current format
  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      return `${day}${separator}${month}${separator}${year}`;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      return `${month}${separator}${day}${separator}${year}`;
    case 'YYYY/MM/DD':
    case 'YYYY-MM-DD':
      return `${year}${separator}${month}${separator}${day}`;
    default:
      return null;
  }
}



onBlur(): void {
  const control = this.frmGroup().get(this.controlName());
  const value = control ? control.value : undefined;
  this.onBlurred.emit(value);

  if (control && control.value) {
    let stringValue: string;

    // Handle Date objects
    if (control.value instanceof Date) {
      const date = control.value as Date;

      // Validate against minDate
      const minDate = this.getMinDate();
      if (minDate) {
        const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        if (selectedDate < minDateOnly) {
          control.setValue('');
          control.setErrors({
            ...control.errors,
            minDate: {
              selectedDate: date,
              minDate: minDate
            }
          });
          const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
          if (inputElement) {
            inputElement.value = '';
          }
          return;
        }
      }

      // Validate against maxDate
      const maxDate = this.getMaxDate();
      if (maxDate) {
        const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
        if (selectedDate > maxDateOnly) {
          control.setValue('');
          control.setErrors({
            ...control.errors,
            maxDate: {
              selectedDate: date,
              maxDate: maxDate
            }
          });
          const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
          if (inputElement) {
            inputElement.value = '';
          }
          return;
        }
      }

      stringValue = this.formatDateToDisplay(date);

      // Update the input element to show the display format
      const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
      if (inputElement) {
        inputElement.value = stringValue;
      }

      // Clear any min/max date errors if date is valid
      if (control.errors?.['minDate'] || control.errors?.['maxDate']) {
        const errors = { ...control.errors };
        delete errors['minDate'];
        delete errors['maxDate'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }

      return;
    } else {
      stringValue = typeof control.value === 'string' ? control.value : String(control.value);
    }

    // Only validate complete dates on blur - don't clear partial input
    if (this.isCompleteInputDate(stringValue)) {
      const format = this.dateFormat();
      let isValid = false;

      if (format === 'DD MMM, YYYY') {
        isValid = this.isValidMonthAbbreviationFormat(stringValue);

        // If valid, validate against min/max dates
        if (isValid) {
          const match = stringValue.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);
          if (match) {
            const day = parseInt(match[1]);
            const monthAbbr = match[2].toLowerCase();
            const year = parseInt(match[3]);

            const monthMap: { [key: string]: number } = {
              'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
              'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
            };

            const month = monthMap[monthAbbr];
            if (month) {
              const dateObj = new Date(year, month - 1, day);

              // Validate against minDate
              const minDate = this.getMinDate();
              if (minDate) {
                const selectedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                if (selectedDate < minDateOnly) {
                  control.setValue('');
                  control.setErrors({
                    ...control.errors,
                    minDate: {
                      selectedDate: dateObj,
                      minDate: minDate
                    }
                  });
                  const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
                  if (inputElement) {
                    inputElement.value = '';
                  }
                  return;
                }
              }

              // Validate against maxDate
              const maxDate = this.getMaxDate();
              if (maxDate) {
                const selectedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                if (selectedDate > maxDateOnly) {
                  control.setValue('');
                  control.setErrors({
                    ...control.errors,
                    maxDate: {
                      selectedDate: dateObj,
                      maxDate: maxDate
                    }
                  });
                  const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
                  if (inputElement) {
                    inputElement.value = '';
                  }
                  return;
                }
              }

              // Store the Date object if valid
              setTimeout(() => {
                control.setValue(dateObj, { emitEvent: false });
                // Clear any min/max date errors if date is valid
                if (control.errors?.['minDate'] || control.errors?.['maxDate']) {
                  const errors = { ...control.errors };
                  delete errors['minDate'];
                  delete errors['maxDate'];
                  control.setErrors(Object.keys(errors).length ? errors : null);
                }
              }, 0);
            }
          }
        }
      } else {
        isValid = this.isValidDateFormat(stringValue);

        // If valid and not already in display format, convert to display format
        if (isValid && !this.isDisplayFormat(stringValue)) {
          const displayValue = this.convertInputFormatToDisplayFormat(stringValue);
          if (displayValue) {
            // Create a Date object first to validate against min/max dates
            const dateObj = this.createDateFromInputString(stringValue);
            if (dateObj) {
              // Validate against minDate
              const minDate = this.getMinDate();
              if (minDate) {
                const selectedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                if (selectedDate < minDateOnly) {
                  control.setValue('');
                  control.setErrors({
                    ...control.errors,
                    minDate: {
                      selectedDate: dateObj,
                      minDate: minDate
                    }
                  });
                  const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
                  if (inputElement) {
                    inputElement.value = '';
                  }
                  return;
                }
              }

              // Validate against maxDate
              const maxDate = this.getMaxDate();
              if (maxDate) {
                const selectedDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                if (selectedDate > maxDateOnly) {
                  control.setValue('');
                  control.setErrors({
                    ...control.errors,
                    maxDate: {
                      selectedDate: dateObj,
                      maxDate: maxDate
                    }
                  });
                  const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
                  if (inputElement) {
                    inputElement.value = '';
                  }
                  return;
                }
              }

              // Update the input element value directly
              const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
              if (inputElement) {
                inputElement.value = displayValue;
              }

              // Store the Date object in the control for consistency
              setTimeout(() => {
                control.setValue(dateObj, { emitEvent: false });
                // Clear any min/max date errors if date is valid
                if (control.errors?.['minDate'] || control.errors?.['maxDate']) {
                  const errors = { ...control.errors };
                  delete errors['minDate'];
                  delete errors['maxDate'];
                  control.setErrors(Object.keys(errors).length ? errors : null);
                }
              }, 0);
            }
          }
        }
      }

      if (!isValid) {
        this.clearField();
      }
    }
  }
}

private createDateFromInputString(inputValue: string): Date | null {
  const format = this.dateFormat();
  const separator = this.getDateSeparator();
  const parts = inputValue.split(separator);

  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
      break;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      month = parseInt(parts[0]);
      day = parseInt(parts[1]);
      year = parseInt(parts[2]);
      break;
    case 'YYYY/MM/DD':
    case 'YYYY-MM-DD':
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
      break;
    default:
      return null;
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  return new Date(year, month - 1, day);
}

private convertInputFormatToDisplayFormat(inputValue: string): string | null {
  const format = this.dateFormat();
  const separator = this.getDateSeparator();
  const parts = inputValue.split(separator);

  if (parts.length !== 3) return null;

  let day: string, month: string, year: string;

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      [day, month, year] = parts;
      break;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      [month, day, year] = parts;
      break;
    case 'YYYY/MM/DD':
    case 'YYYY-MM-DD':
      [year, month, day] = parts;
      break;
    default:
      return null;
  }

  const monthNum = parseInt(month);
  const dayNum = parseInt(day);
  const yearNum = parseInt(year);

  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return null;
  if (isNaN(dayNum) || isNaN(yearNum)) return null;

  // Render in the selected/preferred display format
  return this.formatDateToDisplay(new Date(yearNum, monthNum - 1, dayNum));
}

  private isCompleteInputDate(value: string): boolean {
    if (!value) return false;

    const format = this.dateFormat();

    // Handle the 'DD MMM, YYYY' display format
    if (format === 'DD MMM, YYYY') {
      // Check if it matches the pattern "18 Aug, 2025" or "18 Aug 2025"
      const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);
      return !!match;
    }

    const separator = this.getDateSeparator();
    const parts = value.split(separator);

    // Don't validate if it ends with separator (still typing)
    if (value.endsWith(separator)) return false;

    // Check if we have 3 non-empty parts
    if (parts.length !== 3) return false;

    // Check that all parts have content and reasonable lengths
    if (format.startsWith('YYYY')) {
      return parts[0].length === 4 && parts[1].length >= 1 && parts[1].length <= 2 && parts[2].length >= 1 && parts[2].length <= 2;
    } else {
      return parts[0].length >= 1 && parts[0].length <= 2 && parts[1].length >= 1 && parts[1].length <= 2 && parts[2].length === 4;
    }
  }

private clearField(): void {
  const control = this.frmGroup().get(this.controlName());
  if (control) {
    // Only clear if the field is not currently focused
    const inputElement = document.querySelector(`[formcontrolname="${this.controlName()}"]`) as HTMLInputElement;
    const isCurrentlyFocused = inputElement === document.activeElement;

    if (!isCurrentlyFocused) {
      control.setValue('');
      control.markAsTouched();

      // Clear the input element as well
      if (inputElement) {
        inputElement.value = '';
      }
    }
  }
}

  private preventFurtherWriting(): void {
  const control = this.frmGroup().get(this.controlName());
  if (control && !this.isPartialInputValid(control.value)) {
    const inputEl = document.querySelector(
      `[formcontrolname="${this.controlName()}"]`
    ) as HTMLInputElement;

    if (inputEl) {
      inputEl.readOnly = true; // 🚫 stops further writing
    }
  }
}


private isPartialInputValid(value: string): boolean {
  if (!value) return true;

  const format = this.dateFormat();

  // Handle the 'DD MMM, YYYY' display format
  if (format === 'DD MMM, YYYY') {
    return this.isPartialMonthAbbreviationInputValid(value);
  }

  const separator = this.getDateSeparator();

  // Check for consecutive separators
  if (this.hasConsecutiveSeparators(value)) {
    return false;
  }

  // Check for invalid separator patterns
  if (this.hasInvalidSeparatorPattern(value)) {
    return false;
  }

  const parts = value.split(separator);

  // Allow trailing separators during typing (e.g., "02/03/")
  if (value.endsWith(separator)) {
    return true;
  }

  // Very lenient validation for partial input - only check obvious errors
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();

    // Allow completely empty parts during typing
    if (part === '') continue;

    const num = parseInt(part);
    if (isNaN(num)) return false;

    // Basic range checks based on position and format
    if (format.startsWith('YYYY')) {
      if (i === 0) { // Year position
        if (part.length > 4) return false;
        if (part.length === 4 && (num < 1900 || num > 2030)) return false;
        if (part.length === 3 && num > 203) return false;
        if (part.length === 2 && num > 29) return false;
        if (part.length === 1 && num > 2) return false;
      } else if (i === 1) { // Month position
        if (part.length > 2) return false;
        if (part.length === 2 && (num > 12 || num < 1)) return false;
      } else if (i === 2) { // Day position
        if (part.length > 2) return false;
        if (part.length === 2 && (num > 31 || num < 1)) return false;
        if (part.length === 1 && num > 3) return false;
      }
    } else if (format.startsWith('DD')) {
      if (i === 0) { // Day position
        if (part.length === 2 && (num > 31 || num < 1)) return false;
        if (part.length > 2) return false;
        if (part.length === 1 && num > 3) return false;
      } else if (i === 1) { // Month position
        if (part.length > 2) return false;
        if (part.length == 2 && (num > 12 || num < 1)) return false;
      } else if (i === 2) { // Year position
        if (part.length > 4) return false;
        if (part.length === 4 && (num < 1900 || num > 2030)) return false;
        if (part.length === 3 && num > 299) return false;
        if (part.length === 2 && num > 29) return false;
        if (part.length === 1 && num > 2) return false;
      }
    } else if (format.startsWith('MM')) {
      if (i === 0) { // Month position
        if (part.length > 2) return false;
        if (part.length === 2 && (num > 12 || num < 1)) return false;
      } else if (i === 1) { // Day position
        if (part.length > 2) return false;
        if (part.length === 2 && (num > 31 || num < 1)) return false;
        if (part.length === 1 && num > 3) return false;
      } else if (i === 2) { // Year position
        if (part.length > 4) return false;
        if (part.length === 4 && (num < 1900 || num > 2030)) return false;
        if (part.length === 3 && num > 299) return false;
        if (part.length === 2 && num > 29) return false;
        if (part.length === 1 && num > 2) return false;
      }
    }
  }

  return true;
}



  private shouldAddSeparator(value: string, cursorPosition: number): boolean {
    const format = this.dateFormat();
    const separator = this.getDateSeparator();
    const parts = value.split(separator);
    const isSecondMonth = this.dateFormat().split(this.getDateSeparator())[1] === 'MM';
    const isFirstMonth = this.dateFormat().split(this.getDateSeparator())[0] === 'MM';
    if (parts.length === 1) {
      // First separator
      if (format.startsWith('YYYY')) {
        return parts[0].length === 4; // After year
      } else {
        if(isFirstMonth){
          if(parts[0]>'1') return true;
        }
        return parts[0].length === 2; // After day/month
      }
    } else if (parts.length === 2) {
      // Second separator
      if (format.startsWith('YYYY')) {
        return parts[1].length === 2; // After month
      } else {
        if(isSecondMonth){
          if(parts[1]>'1') return true;
        }
        return parts[1].length === 2; // After month/day
      }
    }

    return false;
  }

// Fixed validation methods - replace the existing ones in your component

private isValidDateFormat(value: any): boolean {
  if (!value) return true; // Empty is valid (let required validator handle it)

  // Convert to string if it's not already
  const stringValue = typeof value === 'string' ? value : String(value);

  const format = this.dateFormat();
  const separator = format.includes('/') ? '/' : '-';
  const parts = stringValue.split(separator);

  if (parts.length !== 3) return false;

  let day: number, month: number, year: number;

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      [day, month, year] = parts.map(p => parseInt(p));
      break;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      [month, day, year] = parts.map(p => parseInt(p));
      break;
    case 'YYYY/MM/DD':
    case 'YYYY-MM-DD':
      [year, month, day] = parts.map(p => parseInt(p));
      break;
    default:
      return false;
  }

  // Check for NaN values
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;

  // Validate ranges
  if (year < 1900 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // FIXED: Proper date validation - this will catch invalid dates like June 31
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
         date.getMonth() === (month - 1) &&
         date.getDate() === day;
}

private isValidMonthAbbreviationFormat(value: string): boolean {
  // Expected format: "18 Aug, 2025" or "18 Aug 2025"
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);

  if (!match) return false;

  const day = parseInt(match[1]);
  const monthAbbr = match[2].toLowerCase();
  const year = parseInt(match[3]);

  // Check for NaN values
  if (isNaN(day) || isNaN(year)) return false;

  // Month abbreviation mapping
  const monthMap: { [key: string]: number } = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };

  const month = monthMap[monthAbbr];
  if (month === undefined) return false;

  // Validate ranges
  if (year < 1900 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // FIXED: Proper date validation - this will catch invalid dates like "31 Jun, 2025"
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
         date.getMonth() === (month - 1) &&
         date.getDate() === day;
}

private isPartialMonthAbbreviationInputValid(value: string): boolean {
  // Allow partial input during typing
  if (!value.trim()) return true;

  // For partial input, be more lenient
  // Check if it's a complete date first
  const completeMatch = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);

  if (completeMatch) {
    // If it looks complete, validate it properly
    return this.isValidMonthAbbreviationFormat(value);
  }

  // For partial input, just check basic patterns
  const partialPattern = /^(\d{0,2})(\s+([A-Za-z]{0,3})(\s*,?\s*(\d{0,4}))?)?$/;
  const match = value.match(partialPattern);

  if (!match) return false;

  const dayPart = match[1];
  const monthPart = match[3] || '';
  const yearPart = match[5] || '';

  // Basic validation for partial input
  if (dayPart) {
    const day = parseInt(dayPart);
    if (!isNaN(day) && (day < 1 || day > 31)) return false;
  }

  if (monthPart && monthPart.length === 3) {
    const monthMap: { [key: string]: number } = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    if (!monthMap[monthPart.toLowerCase()]) return false;
  }

  if (yearPart && yearPart.length === 4) {
    const year = parseInt(yearPart);
    if (!isNaN(year) && (year < 1900 || year > 2030)) return false;
  }

  return true;
}

  /**
   * Get minDate as Date object
   */
  getMinDate(): Date | null {
    const minDateValue = this.minDate();
    if (!minDateValue) return null;

    if (minDateValue instanceof Date) {
      return new Date(minDateValue.getFullYear(), minDateValue.getMonth(), minDateValue.getDate());
    }

    if (typeof minDateValue === 'string') {
      const date = new Date(minDateValue);
      if (!isNaN(date.getTime())) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
    }

    return null;
  }

  /**
   * Get maxDate as Date object
   */
  getMaxDate(): Date | null {
    const maxDateValue = this.maxDate();
    if (!maxDateValue) return null;

    if (maxDateValue instanceof Date) {
      return new Date(maxDateValue.getFullYear(), maxDateValue.getMonth(), maxDateValue.getDate());
    }

    if (typeof maxDateValue === 'string') {
      const date = new Date(maxDateValue);
      if (!isNaN(date.getTime())) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
    }

    return null;
  }

  /**
   * Format date for display in error messages
   */
  private formatDateForDisplay(date: Date | string): string {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return String(date);
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(dateObj.getDate()).padStart(2, '0')} ${monthNames[dateObj.getMonth()]}, ${dateObj.getFullYear()}`;
  }

private dateFormatValidator(control: AbstractControl): { [key: string]: any } | null {
  if (!control.value) return null;

  let value: string;
  let dateObject: Date | null = null;

  // Check if the value is a Date object
  if (control.value instanceof Date) {
    dateObject = control.value as Date;

    // Check year range for Date objects
    const year = dateObject.getFullYear();
    if (year < 1900 || year > 2030) {
      return {
        yearOutOfRange: {
          selectedYear: year,
          minYear: 1900,
          maxYear: 2030
        }
      };
    }

    // Check minDate
    const minDate = this.getMinDate();
    if (minDate) {
      const selectedDate = new Date(dateObject.getFullYear(), dateObject.getMonth(), dateObject.getDate());
      const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
      if (selectedDate < minDateOnly) {
        return {
          minDate: {
            selectedDate: dateObject,
            minDate: minDate
          }
        };
      }
    }

    // Check maxDate
    const maxDate = this.getMaxDate();
    if (maxDate) {
      const selectedDate = new Date(dateObject.getFullYear(), dateObject.getMonth(), dateObject.getDate());
      const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
      if (selectedDate > maxDateOnly) {
        return {
          maxDate: {
            selectedDate: dateObject,
            maxDate: maxDate
          }
        };
      }
    }

    // Date objects are valid - they're already validated
    return null;
  } else if (typeof control.value === 'string') {
    value = control.value;

    // Check if it's an ISO format string (from previous conversion)
    if (this.isISOFormat(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        if (year < 1900 || year > 2030) {
          return {
            yearOutOfRange: {
              selectedYear: year,
              minYear: 1900,
              maxYear: 2030
            }
          };
        }

        // Check minDate
        const minDate = this.getMinDate();
        if (minDate) {
          const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
          if (selectedDate < minDateOnly) {
            return {
              minDate: {
                selectedDate: date,
                minDate: minDate
              }
            };
          }
        }

        // Check maxDate
        const maxDate = this.getMaxDate();
        if (maxDate) {
          const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
          if (selectedDate > maxDateOnly) {
            return {
              maxDate: {
                selectedDate: date,
                maxDate: maxDate
              }
            };
          }
        }

        return null;
      }
    }

    // Check if it's already in display format
    if (this.isDisplayFormat(value)) {
      return this.validateMonthAbbreviationFormat(value);
    }

    // Otherwise validate against the configured dateFormat
    return this.validateStandardDateFormat(value);
  } else {
    value = String(control.value || '');
  }

  // Validate based on the current format
  const format = this.dateFormat();

  if (format === 'DD MMM, YYYY') {
    return this.validateMonthAbbreviationFormat(value);
  } else {
    return this.validateStandardDateFormat(value);
  }
}

private validateMonthAbbreviationFormat(value: string): { [key: string]: any } | null {
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*,?\s*(\d{4})$/);

  if (!match) {
    return { invalidDateFormat: true };
  }

  const day = parseInt(match[1]);
  const monthAbbr = match[2].toLowerCase();
  const year = parseInt(match[3]);

  // Check for NaN values
  if (isNaN(day) || isNaN(year)) {
    return { invalidDateFormat: true };
  }

  // Validate year range specifically
  if (year < 1900 || year > 2030) {
    return {
      yearOutOfRange: {
        selectedYear: year,
        minYear: 1900,
        maxYear: 2030
      }
    };
  }

  // Month abbreviation mapping
  const monthMap: { [key: string]: number } = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };

  const month = monthMap[monthAbbr];
  if (month === undefined) {
    return { invalidDateFormat: true };
  }

  // Validate day range
  if (day < 1 || day > 31) {
    return { invalidDate: true };
  }

  // Check if the date actually exists
  const date = new Date(year, month - 1, day);
  const isValidDate = date.getFullYear() === year &&
                      date.getMonth() === (month - 1) &&
                      date.getDate() === day;

  if (!isValidDate) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const daysInMonth = new Date(year, month, 0).getDate();

    return {
      invalidDate: true,
      invalidDateDetails: {
        monthName: monthNames[month - 1],
        year: year,
        maxDays: daysInMonth,
        enteredDay: day
      }
    };
  }

  // Check minDate
  const minDate = this.getMinDate();
  if (minDate) {
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    if (selectedDate < minDateOnly) {
      return {
        minDate: {
          selectedDate: date,
          minDate: minDate
        }
      };
    }
  }

  // Check maxDate
  const maxDate = this.getMaxDate();
  if (maxDate) {
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    if (selectedDate > maxDateOnly) {
      return {
        maxDate: {
          selectedDate: date,
          maxDate: maxDate
        }
      };
    }
  }

  return null;
}
private validateStandardDateFormat(value: string): { [key: string]: any } | null {
  const format = this.dateFormat();
  const separator = format.includes('/') ? '/' : '-';
  const parts = value.split(separator);

  if (parts.length !== 3) {
    return { invalidDateFormat: true };
  }

  let day: number, month: number, year: number;

  switch (format) {
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
      [day, month, year] = parts.map(p => parseInt(p));
      break;
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      [month, day, year] = parts.map(p => parseInt(p));
      break;
    case 'YYYY/MM/DD':
    case 'YYYY-MM-DD':
      [year, month, day] = parts.map(p => parseInt(p));
      break;
    default:
      return { invalidDateFormat: true };
  }

  // Check for NaN values
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { invalidDateFormat: true };
  }

  // Validate year range specifically
  if (year < 1900 || year > 2030) {
    return {
      yearOutOfRange: {
        selectedYear: year,
        minYear: 1900,
        maxYear: 2030
      }
    };
  }

  // Validate other basic ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { invalidDate: true };
  }

  // Check if the date actually exists (catches cases like June 31)
  const date = new Date(year, month - 1, day);
  const isValidDate = date.getFullYear() === year &&
                      date.getMonth() === (month - 1) &&
                      date.getDate() === day;

  if (!isValidDate) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const daysInMonth = new Date(year, month, 0).getDate();

    return {
      invalidDate: true,
      invalidDateDetails: {
        monthName: monthNames[month - 1],
        year: year,
        maxDays: daysInMonth,
        enteredDay: day
      }
    };
  }

  // Check minDate
  const minDate = this.getMinDate();
  if (minDate) {
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    if (selectedDate < minDateOnly) {
      return {
        minDate: {
          selectedDate: date,
          minDate: minDate
        }
      };
    }
  }

  // Check maxDate
  const maxDate = this.getMaxDate();
  if (maxDate) {
    const selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    if (selectedDate > maxDateOnly) {
      return {
        maxDate: {
          selectedDate: date,
          maxDate: maxDate
        }
      };
    }
  }

  return null;
}

// Helper method to get days in a specific month (you can add this for additional validation if needed)
private getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

  hasError(errorCode: string): boolean {
    const control = this.frmGroup().get(this.controlName());
    return !!control?.hasError(errorCode) && control.touched;
  }



   private convertDateToISO8601(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert Date object to ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS) with time
   */
  private convertDateToISO8601DateTime(date: Date): string {
   const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const seconds = String(date.getSeconds()).padStart(2, '0');
const miliSecond = String(date.getMilliseconds()).padStart(3, '0');

// Calculate the timezone offset correctly
const totalOffsetMinutes = -date.getTimezoneOffset();
const offsetSign = totalOffsetMinutes >= 0 ? '+' : '-';
const offsetHours = String(Math.floor(Math.abs(totalOffsetMinutes / 60))).padStart(2, '0');
const offsetMinutes = String(Math.abs(totalOffsetMinutes % 60)).padStart(2, '0');
const timezoneOffset = `${offsetSign}${offsetHours}:${offsetMinutes}`;

// Combine all parts into a complete ISO 8601 string
if(this.includeTime()===1){
  const isoString = `${year}-${month}-${day}`;
  return isoString;
}
if(this.includeTime()===2){
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  return isoString;
}
if(this.includeTime()===3){
  const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${miliSecond}`;
  return isoString;
}
else{
    const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${miliSecond}${timezoneOffset}`
    return isoString;
}

  }
}

