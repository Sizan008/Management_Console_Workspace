import { Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// "1234567.5" -> "1,234,567.5". A trailing "." is kept so the user can keep typing.
export function formatAmountWithCommas(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  let val = value.toString().trim();
  if (!val) return '';

  const isNegative = val.startsWith('-');
  if (isNegative) val = val.slice(1);

  const [intPart, decPart] = val.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = val.includes('.') ? `${grouped}.${decPart ?? ''}` : grouped;

  return (isNegative ? '-' : '') + formatted;
}

// Display text -> raw value, i.e. drop the grouping commas.
export function stripAmountGrouping(value: string | null | undefined): string {
  return (value ?? '').replace(/,/g, '');
}

/**
 * Value accessor for amount inputs: the form control keeps the raw value
 * ("1234567.89") while the input displays it comma separated ("1,234,567.89").
 *
 * It replaces Angular's DefaultValueAccessor, so `formControlName` stays on the
 * input (keeping validation state, disabled state and the highlight directive
 * working) and never sees the grouped text.
 */
@Directive({
  selector: 'input[amountFormat]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AmountFormatDirective),
    multi: true
  }],
  host: {
    '(input)': 'handleInput($event)',
    '(keypress)': 'handleKeyPress($event)',
    '(paste)': 'handlePaste($event)',
    '(blur)': 'handleBlur()'
  }
})
export class AmountFormatDirective implements ControlValueAccessor {

  readonly decimalPlaces = input<number>(2);
  readonly allowNegative = input<boolean>(false);
  readonly allowLeadingZeros = input<boolean>(false);
  readonly maxLen = input<number | undefined>(undefined);

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  // ------------------------------------------------------- ControlValueAccessor

  writeValue(value: any): void {
    this.el.nativeElement.value = formatAmountWithCommas(value);
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  // --------------------------------------------------------------- host events

  handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const caret = input.selectionStart ?? input.value.length;
    const significantBeforeCaret = this.significantLength(input.value.slice(0, caret));

    const raw = this.sanitize(input.value);
    this.render(raw, significantBeforeCaret);
    this.onChange(raw);
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();

    const paste = event.clipboardData?.getData('text') || '';
    const raw = this.sanitize(paste);

    this.render(raw);
    this.onChange(raw);
  }

  handleBlur(): void {
    this.onTouched();
  }

  // Prevent typing beyond maxLength and decimal places
  handleKeyPress(event: KeyboardEvent): boolean {
    const input = event.target as HTMLInputElement;
    const char = event.key;

    // Work on the ungrouped value so the commas never count towards maxLen and
    // never shift the decimal-place checks.
    const currentValue = stripAmountGrouping(input.value);
    const currentLength = currentValue.length;
    const cursorPosition = this.significantLength(input.value.slice(0, input.selectionStart || 0));
    const hasSelection = (input.selectionEnd ?? 0) > (input.selectionStart ?? 0);

    // Allow control keys (backspace, delete, tab, escape, enter, arrows)
    if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char) ||
        // Allow Ctrl combinations
        (event.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(char.toLowerCase()))) {
      return true;
    }

    // Allow a single leading minus sign when negatives are permitted
    if (char === '-') {
      if (this.allowNegative() && cursorPosition === 0 && !currentValue.includes('-')) {
        return true;
      }
      event.preventDefault();
      return false;
    }

    // Only allow numbers and decimal point
    if (!/[\d.]/.test(char)) {
      event.preventDefault();
      return false;
    }

    // Handle decimal point restrictions
    if (char === '.') {
      // Prevent multiple decimal points
      if (currentValue.includes('.')) {
        event.preventDefault();
        return false;
      }

      // If decimal places is 0, don't allow decimal point
      if (this.decimalPlaces() === 0) {
        event.preventDefault();
        return false;
      }

      return true;
    }

    // Handle digit input after decimal point
    if (currentValue.includes('.') && !hasSelection) {
      const decimalIndex = currentValue.indexOf('.');
      const afterDecimal = currentValue.substring(decimalIndex + 1);

      // If cursor is after decimal point and we already have max decimal places
      if (cursorPosition > decimalIndex && afterDecimal.length >= this.decimalPlaces()) {
        event.preventDefault();
        return false;
      }
    }

    // Prevent leading zeros (except for decimal numbers)
    if (char === '0' && currentValue === '' && !this.allowLeadingZeros()) {
      return true; // Allow single zero
    }

    if (currentValue === '0' && /\d/.test(char) && !this.allowLeadingZeros() && !hasSelection) {
      event.preventDefault();
      return false;
    }

    // Check max length (a selection is about to be replaced, so it still fits)
    if (this.maxLen() && currentLength >= this.maxLen()! && !hasSelection) {
      event.preventDefault();
      return false;
    }

    return true;
  }

  // ------------------------------------------------------------------ internals

  // Strip grouping and anything that is not part of a valid amount, then apply
  // the decimal-places / leading-zero / max-length rules.
  private sanitize(value: string): string {
    if (!value) return '';

    const isNegative = this.allowNegative() && value.trim().startsWith('-');
    let val = value.replace(/[^\d.]/g, '');

    // Keep only the first decimal point
    const firstDot = val.indexOf('.');
    if (firstDot !== -1) {
      val = val.slice(0, firstDot + 1) + val.slice(firstDot + 1).replace(/\./g, '');
    }

    if (this.decimalPlaces() === 0) {
      val = val.split('.')[0];
    } else if (val.includes('.')) {
      const [intPart, decPart] = val.split('.');
      val = intPart + '.' + decPart.substring(0, this.decimalPlaces());
    }

    // Remove leading zeros (convert "0345" to "345", but keep "0" and "0.5")
    if (val && !this.allowLeadingZeros()) {
      if (val !== '0' && !val.startsWith('0.') && /^0+/.test(val)) {
        val = val.replace(/^0+/, '') || '0';
      }
    }

    if (this.maxLen() && val.length > this.maxLen()!) {
      val = val.slice(0, this.maxLen()!);
    }

    return isNegative && val ? '-' + val : val;
  }

  // Paint the grouped value and put the caret back where the user was typing.
  private render(raw: string, caretFromSignificant?: number): void {
    const input = this.el.nativeElement;
    const display = formatAmountWithCommas(raw);
    input.value = display;

    if (caretFromSignificant !== undefined) {
      const caret = this.caretFromSignificantLength(display, caretFromSignificant);
      input.setSelectionRange(caret, caret);
    }
  }

  // Number of value-carrying characters — everything the grouping commas and any
  // rejected characters do not contribute.
  private significantLength(text: string): number {
    return (text.match(/[\d.\-]/g) || []).length;
  }

  // Inverse of significantLength(): index in the grouped text that sits after
  // `count` value-carrying characters.
  private caretFromSignificantLength(text: string, count: number): number {
    if (count <= 0) return 0;

    let seen = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== ',') seen++;
      if (seen === count) return i + 1;
    }
    return text.length;
  }
}
