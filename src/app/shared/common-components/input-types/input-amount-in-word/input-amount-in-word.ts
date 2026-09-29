import {Component, input, output, effect} from '@angular/core';
import {MatInput} from "@angular/material/input";
import {FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors} from "@angular/forms";
import {NgClass} from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

export interface CurrencyConfig {
  code: string;
  name: string;
  subunit: string;
  symbol: string;
}

@Component({
  selector: 'input-amount-in-word',
  imports: [
    MatInput,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    MatTooltipModule,
    NgClass,
    MatIconModule,
  ],
  templateUrl: './input-amount-in-word.html',
  standalone: true,
  styleUrl: './input-amount-in-word.scss'
})
export class InputAmountInWord {
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly isReadonly = input<boolean>();
  readonly placeholder = input<any>();
  readonly valueChange = output<any>();
  readonly isVertical = input<boolean>(false);
  readonly valueChanged = output<string>();
  readonly onChanged = output<any>();
  // Currency parameter - defaults to BDT
  readonly currency = input<string>('BDT');
  readonly onBlurred = output<any>();
  // Validation inputs (same as InputAmount)
  readonly decimalPlaces = input<number>(2);
  readonly allowNegative = input<boolean>(false);
  readonly allowLeadingZeros = input<boolean>(false);
  readonly maxLen = input<number>();
  readonly maxAmt = input<number>();
  readonly minAmt = input<number>();
  readonly tooltip = input<string>();
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipDelay = input<number>(500);
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  // Custom error messages
  readonly customErrorMessages = input<{ [key: string]: string }>({});

  // Currency configurations
  private currencyConfigs: { [key: string]: CurrencyConfig } = {
  'BDT': {
    code: 'BDT',
    name: 'Taka',
    subunit: 'Paisa',
    symbol: '৳'
  },
  'USD': {
    code: 'USD',
    name: 'Dollar',
    subunit: 'Cent',
    symbol: '$'
  },
  'EUR': {
    code: 'EUR',
    name: 'Euro',
    subunit: 'Cent',
    symbol: '€'
  },
  'GBP': {
    code: 'GBP',
    name: 'Pound',
    subunit: 'Pence',
    symbol: '£'
  },
  'INR': {
    code: 'INR',
    name: 'Rupee',
    subunit: 'Paisa',
    symbol: '₹'
  },
  'JPY': {
    code: 'JPY',
    name: 'Yen',
    subunit: 'Sen',
    symbol: '¥'
  },
  'CAD': {
    code: 'CAD',
    name: 'Canadian Dollar',
    subunit: 'Cent',
    symbol: 'C$'
  },
  'AUD': {
    code: 'AUD',
    name: 'Australian Dollar',
    subunit: 'Cent',
    symbol: 'A$'
  },
  'ACU': {
    code: 'ACU',
    name: 'Asian Clearing Union Dollar',
    subunit: 'Cent',
    symbol: 'ACU$'
  },
  'DEM': {
    code: 'DEM',
    name: 'Deutsche Mark',
    subunit: 'Pfennig',
    symbol: 'DM'
  },
  'CHF': {
    code: 'CHF',
    name: 'Swiss Franc',
    subunit: 'Rappen',
    symbol: 'CHF'
  },
  'RUP': {
    code: 'RUP',
    name: 'Rupee',
    subunit: 'Paisa',
    symbol: 'Rs'
  },
  'AED': {
    code: 'AED',
    name: 'UAE Dirham',
    subunit: 'Fils',
    symbol: 'د.إ'
  },
  'SAR': {
    code: 'SAR',
    name: 'Saudi Riyal',
    subunit: 'Halala',
    symbol: '﷼'
  }
};


  constructor() {
    // Effect to update validators when validation inputs change
    effect(() => {
      this.updateValidators();
    });
  }

  // Custom validators (same as InputAmount)
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
      validators.push(InputAmountInWord.maxLengthNumberValidator(this.maxLen()!));
    }
    
    // Add custom amount validator
    validators.push(InputAmountInWord.amountValidator(
      this.decimalPlaces(), 
      this.allowLeadingZeros()
    ));
    
    // Add negative validator
    validators.push(InputAmountInWord.negativeAmountValidator(this.allowNegative()));
    
    // Update the control's validators
    control.setValidators(validators);
    control.updateValueAndValidity();
  }

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

  // Enhanced input handler with all validations
  onChangeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const control = this.frmGroup().get(this.controlName());
    let value = input.value;
    
    // Remove leading zeros (convert "0345" to "345", but keep "0" and "0.5")
    if (value && !this.allowLeadingZeros()) {
      if (value !== '0' && !value.startsWith('0.') && /^0+/.test(value)) {
        value = value.replace(/^0+/, '') || '0';
      }
    }
    
    // Handle decimal places restriction
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length > this.decimalPlaces()) {
        value = parts[0] + '.' + parts[1].substring(0, this.decimalPlaces());
      }
    }
    
    // Apply maxLength restriction if specified
    if (this.maxLen() && value.length > this.maxLen()!) {
      value = value.slice(0, this.maxLen()!);
    }
    
    // Update input and form control if value changed
    if (input.value !== value) {
      input.value = value;
      control?.setValue(value);
    }
    
    this.valueChange.emit(control?.value);
  }

  // Prevent typing beyond decimal places and restrictions
  onKeyPress(event: KeyboardEvent): boolean {
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    const currentLength = currentValue.length;
    const char = event.key;
    const cursorPosition = input.selectionStart || 0;
    
    // Allow control keys
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
        (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase()))) {
      return true;
    }
    
    // Only allow numbers and decimal point
    if (!/[\d.]/.test(char)) {
      event.preventDefault();
      return false;
    }
    
    // Handle decimal point restrictions
    if (char === '.') {
      if (currentValue.includes('.') || this.decimalPlaces() === 0) {
        event.preventDefault();
        return false;
      }
      return true;
    }
    
    // Handle digit input after decimal point
    if (currentValue.includes('.')) {
      const decimalIndex = currentValue.indexOf('.');
      const afterDecimal = currentValue.substring(decimalIndex + 1);
      
      if (cursorPosition > decimalIndex && afterDecimal.length >= this.decimalPlaces()) {
        event.preventDefault();
        return false;
      }
    }
    
    // Prevent leading zeros
    if (char === '0' && currentValue === '' && !this.allowLeadingZeros()) {
      return true;
    }
    
    if (currentValue === '0' && /\d/.test(char) && char !== '.' && !this.allowLeadingZeros()) {
      event.preventDefault();
      return false;
    }
    
    // Check max length
    if (this.maxLen() && currentLength >= this.maxLen()!) {
      event.preventDefault();
      return false;
    }
    
    return true;
  }

  // Handle paste events
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    
    const paste = event.clipboardData?.getData('text') || '';
    const input = event.target as HTMLInputElement;
    const control = this.frmGroup().get(this.controlName());
    
    // Clean the pasted value
    let cleanValue = paste.replace(/[^0-9.]/g, '');
    
    // Remove multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const firstDecimalIndex = cleanValue.indexOf('.');
      cleanValue = cleanValue.substring(0, firstDecimalIndex + 1) + 
                   cleanValue.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }
    
    // Handle decimal places
    if (cleanValue.includes('.')) {
      const parts = cleanValue.split('.');
      if (parts[1] && parts[1].length > this.decimalPlaces()) {
        cleanValue = parts[0] + '.' + parts[1].substring(0, this.decimalPlaces());
      }
      
      if (this.decimalPlaces() === 0) {
        cleanValue = parts[0];
      }
    }
    
    // Remove leading zeros
    if (cleanValue && !this.allowLeadingZeros()) {
      if (cleanValue !== '0' && !cleanValue.startsWith('0.') && /^0+/.test(cleanValue)) {
        cleanValue = cleanValue.replace(/^0+/, '') || '0';
      }
    }
    
    // Apply max length
    if (this.maxLen() && cleanValue.length > this.maxLen()!) {
      cleanValue = cleanValue.slice(0, this.maxLen()!);
    }
    
    input.value = cleanValue;
    control?.setValue(cleanValue);
    this.valueChange.emit(control?.value);
  }

  // Helper method for step attribute
  getStepValue(): string {
    if (this.decimalPlaces() === 0) return '1';
    return '0.' + '0'.repeat(this.decimalPlaces() - 1) + '1';
  }

  // Get current currency configuration
  public getCurrencyConfig(): CurrencyConfig {
    return this.currencyConfigs[this.currency()] || this.currencyConfigs['BDT'];
  }

  // Enhanced amount to words with currency support
  amountToWord(): string {
    const value = this.frmGroup().get(this.controlName())?.value;
    if (!value || isNaN(value)) return '';
    
    const currencyConfig = this.getCurrencyConfig();
    const [wholeStr, decimalStr] = value.toString().split('.');
    const wholeNumber = parseInt(wholeStr, 10);
    
    let result = '';
    
    // Convert whole number part
    if (wholeNumber === 0) {
      result = 'Zero';
    } else {
      result = this.convertNumberToWords(wholeNumber);
    }
    
    // Add currency name for whole part
    if (wholeNumber === 1) {
      result += ` ${currencyConfig.name}`;
    } else if (wholeNumber > 1) {
      // For most currencies, plural form is same as singular + 's'
      // Special handling for specific currencies can be added here
      const pluralName = this.getPluralCurrencyName(currencyConfig.name);
      result += ` ${pluralName}`;
    } else {
      result += ` ${currencyConfig.name}`;
    }
    
    // Handle decimal part (subunit)
    if (decimalStr && decimalStr.length > 0 && parseInt(decimalStr) > 0) {
      // Convert decimal part to proper subunit value
      const decimalPadded = decimalStr.padEnd(2, '0'); // Ensure 2 digits for most currencies
      const subunitValue = parseInt(decimalPadded, 10);
      
      if (subunitValue > 0) {
        const subunitWords = this.convertNumberToWords(subunitValue);
        const subunitName = subunitValue === 1 
          ? currencyConfig.subunit 
          : this.getPluralSubunitName(currencyConfig.subunit);
        
        result += ` and ${subunitWords} ${subunitName}`;
      }
    }
    
    return result;
  }

  // Helper method to get plural form of currency name
  private getPluralCurrencyName(currencyName: string): string {
    const pluralMap: { [key: string]: string } = {
      'Taka': 'Taka', // BDT doesn't change in plural
      'Dollar': 'Dollars',
      'Euro': 'Euros',
      'Pound': 'Pounds',
      'Rupee': 'Rupees',
      'Yen': 'Yen', // JPY doesn't change in plural
    };
    
    return pluralMap[currencyName] || currencyName + 's';
  }

  // Helper method to get plural form of subunit name
  private getPluralSubunitName(subunitName: string): string {
    const pluralMap: { [key: string]: string } = {
      'Paisa': 'Paisa', // Doesn't change in plural
      'Cent': 'Cents',
      'Pence': 'Pence', // Already plural
      'Sen': 'Sen', // Doesn't change in plural
    };
    
    return pluralMap[subunitName] || subunitName + 's';
  }

  // Enhanced number to words conversion with currency-specific formatting
  convertNumberToWords(num: number): string {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    if ((num = num || 0) === 0) return 'Zero';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + this.convertNumberToWords(num % 100) : '');
    
    // Use different number systems based on currency
    const currencyConfig = this.getCurrencyConfig();
    if (this.shouldUseIndianNumberSystem(currencyConfig.code)) {
      // Indian number system (Lakh, Crore) for BDT, INR
      if (num < 100000) return this.convertNumberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.convertNumberToWords(num % 1000) : '');
      if (num < 10000000) return this.convertNumberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + this.convertNumberToWords(num % 100000) : '');
      return this.convertNumberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + this.convertNumberToWords(num % 10000000) : '');
    } else {
      // Western number system (Million, Billion) for USD, EUR, GBP, etc.
      if (num < 1000000) return this.convertNumberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + this.convertNumberToWords(num % 1000) : '');
      if (num < 1000000000) return this.convertNumberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + this.convertNumberToWords(num % 1000000) : '');
      return this.convertNumberToWords(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + this.convertNumberToWords(num % 1000000000) : '');
    }
  }

  // Determine if currency should use Indian number system
  private shouldUseIndianNumberSystem(currencyCode: string): boolean {
    return ['BDT', 'INR'].includes(currencyCode);
  }

  // Method to add new currency configurations dynamically
  addCurrencyConfig(currencyConfig: CurrencyConfig): void {
    this.currencyConfigs[currencyConfig.code] = currencyConfig;
  }

  // Method to get available currencies
  getAvailableCurrencies(): CurrencyConfig[] {
    return Object.values(this.currencyConfigs);
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