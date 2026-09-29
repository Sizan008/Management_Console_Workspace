import { ChangeDetectionStrategy, Component, input, output, effect, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule, AbstractControl, FormControl } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgClass, CommonModule } from '@angular/common';

// Import moment
import * as _moment from 'moment';
import { default as _rollupMoment, Moment } from 'moment';
const moment = _rollupMoment || _moment;

// Date formats for month-year picker
export const MONTH_YEAR_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'month-year-picker',
  imports: [
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatTooltipModule,
    NgClass,
    CommonModule
  ],
  templateUrl: './month-year-picker.html',
  standalone: true,
  styleUrl: './month-year-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: MAT_DATE_FORMATS, useValue: MONTH_YEAR_FORMATS },
  ],
})
export class MonthYearPickerComponent {
  // Required inputs
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();

  // Optional inputs
  readonly placeholder = input<string>('MM/YYYY');
  readonly isReadonly = input<boolean>(false);
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  readonly tooltip = input<string>('');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly customErrorMessages = input<{ [key: string]: string }>({});
  readonly minYear = input<number>(1900);
  readonly maxYear = input<number>(2099);

  // Outputs
  readonly dateChange = output<Date>();
  readonly onBlurred = output<any>();

  private dateAdapter = inject(DateAdapter);

  get control(): FormControl | null {
    return this.frmGroup().get(this.controlName()) as FormControl | null;
  }

  constructor() {
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
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

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

  getDetailedErrorMessage(): string {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.errors) return '';

    if (control.hasError('required')) {
      return this.hasCustomMessage('required')
        ? this.getCustomErrorMessage('required')
        : `${this.label()} is required`;
    }

    if (control.hasError('yearOutOfRange')) {
      const error = control.errors['yearOutOfRange'];
      return `Year must be between ${error.minYear} and ${error.maxYear}`;
    }

    // Check custom errors
    const customErrorKeys = this.getCustomErrorKeys();
    if (customErrorKeys.length > 0) {
      return this.getCustomErrorMessage(customErrorKeys[0]);
    }

    return '';
  }

  private dateFormatValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) {
      return null;
    }

    if (control.value instanceof Date) {
      return null;
    }

    return null;
  }

  clearInput(): void {
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.setValue(null);
      control.markAsTouched();
    }
  }

  onBlur(): void {
    this.onBlurred.emit(null);
  }

  onFocus(event: any): void {
    // Handle focus if needed
  }

 onKeyDown(event: KeyboardEvent): void {
  // Allow tab and escape for navigation
  if (event.key === 'Tab' || event.key === 'Escape') {
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    this.clearInput();
    return;
  }

  // Prevent other keyboard input
  event.preventDefault();
}

  chosenYearHandler(normalizedYear: Moment): void {
    const control = this.control;
    if (control) {
      const ctrlValue = control.value ? moment(control.value) : moment();
      ctrlValue.year(normalizedYear.year());
      control.setValue(ctrlValue.toDate());
      control.markAsTouched();
    }
  }

  chosenMonthHandler(normalizedMonth: Moment, datepicker: any): void {
    const control = this.control;
    if (control) {
      const ctrlValue = control.value ? moment(control.value) : moment();
      ctrlValue.month(normalizedMonth.month());

      const selectedYear = ctrlValue.year();

      // Validate year range
      if (selectedYear < this.minYear() || selectedYear > this.maxYear()) {
        control.setErrors({
          yearOutOfRange: {
            selectedYear: selectedYear,
            minYear: this.minYear(),
            maxYear: this.maxYear()
          }
        });
        datepicker.close();
        return;
      }

      // Clear year range error if previously set
      if (control.errors?.['yearOutOfRange']) {
        const errors = { ...control.errors };
        delete errors['yearOutOfRange'];
        control.setErrors(Object.keys(errors).length ? errors : null);
      }

      control.setValue(ctrlValue.toDate());
      control.markAsTouched();
      control.updateValueAndValidity();

      this.dateChange.emit(ctrlValue.toDate());
      datepicker.close();
    }
  }
}
