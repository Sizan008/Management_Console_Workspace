import { Component, input, output, signal, OnInit, OnChanges, computed, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

interface TextareaAttributes {
  rows: number;
  cols?: number;
  style: string;
}

interface RowLimitExceededEvent {
  currentRows: number;
  maxRows: number;
}

interface ColLimitExceededEvent {
  line: number;
  currentCols: number;
  maxCols: number;
}

@Component({
  selector: 'input-text-area',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    MatTooltipModule
  ],
  templateUrl: './input-text-area.html',
  styleUrl: './input-text-area.scss'
})
export class InputTextArea implements OnInit, OnChanges, AfterViewInit {
  // ViewChild for direct textarea access
  @ViewChild('textareaRef', { static: false }) textareaRef!: ElementRef<HTMLTextAreaElement>;

  // Form inputs
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();

  // Inputs
  readonly id = input<string>('');
  readonly cssClass = input<string>('');
  readonly styles = input<string>('');
  readonly rows = input<number>(1);
  readonly cols = input<number | undefined>(undefined);
  readonly placeholder = input<string>('');
  readonly required = input<boolean>(false);
  readonly enable = input<boolean>(true);
  readonly visible = input<boolean>(true);
  readonly maxLen = input<number>(2147483647);
  readonly minLen = input<number>(-2147483648);
  readonly maxRows = input<number | undefined>(undefined);
  readonly minRows = input<number | undefined>(undefined);
  readonly maxCols = input<number | undefined>(undefined);
  readonly minCols = input<number | undefined>(undefined);
  readonly autoResize = input<boolean>(false);
  readonly showManualResize = input<boolean>(true);
  readonly resizeStep = input<number>(1);
  readonly label = input<string>('');
  readonly showCharacterCount = input<boolean>(true);
  readonly showRowCount = input<boolean>(false);
  readonly enforceRowLimits = input<boolean>(true);
  readonly isVertical = input<boolean>(false);
  readonly width = input<string>('100%'); // Custom width (e.g., '300px', '50%', 'auto')
  readonly maxWidth = input<string>(''); // Maximum width
  readonly minWidth = input<string>(''); // Minimum width
  readonly widthClass = input<string>(''); // CSS class for width control (e.g., 'w-1/2', 'w-96')
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  // Outputs
  readonly valueChanged = output<string>();
  readonly onChanged = output<any>();
  readonly onRowLimitExceeded = output<RowLimitExceededEvent>();
  readonly onColLimitExceeded = output<ColLimitExceededEvent>();
  readonly onManualResize = output<{ rows: number; action: 'increase' | 'decrease' }>(); // New output
  readonly tooltip = input<string>('');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly tooltipDelay = input<number>(500);
  readonly customErrorMessages = input<{ [key: string]: string }>({});
  // Internal state
  isInvalidState = signal(false);
  errorMessage = signal('');
  currentRows = signal(0);
  longestLine = signal(0);
  manualRows = signal(0); // New: tracks manually set rows

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

    const defaultErrorKeys = ['required', 'minlength', 'maxlength'];
    return Object.keys(control.errors).filter(key => !defaultErrorKeys.includes(key));
  }

  hasCustomErrors(): boolean {
    return this.getCustomErrorKeys().length > 0;
  }

  // Auto-resize related properties
  private resizeTimeout: any;
  private initialResizeDone = false;

  // Computed signals for reactive styling
  inputClasses = computed(() => {
    // const baseClasses = 'w-full  border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 placeholder-gray-400';
    // const resizeClasses = this.autoResize() ? 'resize-none overflow-hidden' : 'resize-vertical';
    // const stateClasses = this.isDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white';
    // const errorClasses = this.isInvalidState() ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-300' : 'border-gray-300';
    // const customClasses = this.cssClass() || '';

    // return ` ${resizeClasses} ${stateClasses} ${errorClasses} ${customClasses}`;
    return null;
  });

  // Computed textarea attributes
  textareaAttributes = computed((): TextareaAttributes => {
    const attrs: TextareaAttributes = {
      rows: this.getEffectiveRows(),
      style: this.getEffectiveStyles()
    };

    if (this.cols()) {
      attrs.cols = this.cols();
    }

    return attrs;
  });

  // Computed for manual resize button states
  canIncreaseSize = computed(() => {
    const currentRows = this.getEffectiveRows();
    const maxAllowed = this.maxRows();
    return !maxAllowed || currentRows < maxAllowed;
  });

  canDecreaseSize = computed(() => {
    const currentRows = this.getEffectiveRows();
    const minAllowed = this.minRows() || 1;
    return currentRows > minAllowed;
  });

  ngOnInit() {
    // Set initial manual rows
    this.manualRows.set(this.rows());

    // Set up value change listener
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.valueChanges.subscribe(value => {
        this.analyzeText(value || '');
        this.valueChanged.emit(value || '');
        this.validateInput();

        // Trigger auto-resize on programmatic value changes
        if (this.autoResize() && this.initialResizeDone) {
          setTimeout(() => this.performAutoResize(), 0);
        }
      });

      // Handle enable/disable state
      this.updateControlState();

      // Initial analysis
      this.analyzeText(control.value || '');
    }
  }

  ngOnChanges() {
    this.validateInput();
    this.updateControlState();

    // Re-analyze text when inputs change
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      this.analyzeText(control.value || '');
    }

    // Update manual rows if rows input changes
    this.manualRows.set(this.rows());
  }

  ngAfterViewInit() {
    // Initialize auto-resize after view is ready
    if (this.autoResize()) {
      setTimeout(() => {
        this.performInitialResize();
        this.initialResizeDone = true;
      }, 0);
    }
  }

  autoResizes(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto";          // reset first
  textarea.style.height = textarea.scrollHeight + "px";  // match content height
}


  private analyzeText(text: string): void {
    const lines: string[] = text.split('\n');
    this.currentRows.set(lines.length);

    const longest = lines.reduce((max: number, line: string) => Math.max(max, line.length), 0);
    this.longestLine.set(longest);
  }

  public getEffectiveRows(): number {
    if (this.autoResize()) {
      const currentRowCount = this.currentRows();
      const minRows = this.minRows() || this.rows();
      const maxRows = this.maxRows() || Math.max(currentRowCount, minRows);

      return Math.max(minRows, Math.min(currentRowCount, maxRows));
    }

    // Use manual rows when not auto-resizing
    return this.manualRows();
  }

  private getEffectiveStyles(): string {
    let styles = this.styles() || '';

    // Add width styles
    if (this.width() !== '100%') {
      styles += `; width: ${this.width()};`;
    }

    if (this.maxWidth()) {
      styles += `; max-width: ${this.maxWidth()};`;
    } else if (this.maxCols()) {
      // Set max-width based on character width (approximate) if no explicit maxWidth
      const charWidth = 8; // approximate character width in pixels
      const maxWidth = this.maxCols()! * charWidth + 24; // +24 for padding
      styles += `; max-width: ${maxWidth}px;`;
    }

    if (this.minWidth()) {
      styles += `; min-width: ${this.minWidth()};`;
    }

    return styles;
  }

  // MANUAL RESIZE METHODS
  increaseSize(): void {
    if (!this.canIncreaseSize()) return;

    const currentRows = this.manualRows();
    const step = this.resizeStep();
    const newRows = Math.min(
      currentRows + step,
      this.maxRows() || currentRows + step
    );

    this.manualRows.set(newRows);
    this.onManualResize.emit({ rows: newRows, action: 'increase' });

    // Update textarea immediately
    this.updateTextareaRows(newRows);
  }

  decreaseSize(): void {
    if (!this.canDecreaseSize()) return;

    const currentRows = this.manualRows();
    const step = this.resizeStep();
    const minAllowed = this.minRows() || 1;
    const newRows = Math.max(currentRows - step, minAllowed);

    this.manualRows.set(newRows);
    this.onManualResize.emit({ rows: newRows, action: 'decrease' });

    // Update textarea immediately
    this.updateTextareaRows(newRows);
  }

  setSize(rows: number): void {
    const minAllowed = this.minRows() || 1;
    const maxAllowed = this.maxRows() || rows;
    const constrainedRows = Math.max(minAllowed, Math.min(rows, maxAllowed));

    this.manualRows.set(constrainedRows);
    this.onManualResize.emit({
      rows: constrainedRows,
      action: rows > this.manualRows() ? 'increase' : 'decrease'
    });

    // Update textarea immediately
    this.updateTextareaRows(constrainedRows);
  }

  private updateTextareaRows(rows: number): void {
    if (this.textareaRef?.nativeElement) {
      this.textareaRef.nativeElement.rows = rows;
    }
  }

  // Preset size methods
  setSmallSize(): void {
    const smallSize = this.minRows() || 2;
    this.setSize(smallSize);
  }

  setMediumSize(): void {
    const mediumSize = Math.floor(((this.maxRows() || 10) + (this.minRows() || 2)) / 2);
    this.setSize(mediumSize);
  }

  setLargeSize(): void {
    const largeSize = this.maxRows() || 8;
    this.setSize(largeSize);
  }

  // AUTO-RESIZE METHODS (existing)
  autoResizeTextarea(event: Event): void {
    if (!this.autoResize()) return;

    const textarea = event.target as HTMLTextAreaElement;
    this.performAutoResizeOnElement(textarea);
  }

  private performAutoResize(): void {
    if (this.textareaRef?.nativeElement) {
      this.performAutoResizeOnElement(this.textareaRef.nativeElement);
    }
  }

  private performInitialResize(): void {
    if (this.textareaRef?.nativeElement && this.textareaRef.nativeElement.value) {
      this.performAutoResizeOnElement(this.textareaRef.nativeElement);
    }
  }

  private performAutoResizeOnElement(textarea: HTMLTextAreaElement): void {
    if (!textarea) return;

    // Store scroll position
    const scrollTop = textarea.scrollTop;

    // Reset height to auto to get correct scrollHeight
    textarea.style.height = 'auto';

    // Get content height
    let newHeight = textarea.scrollHeight;

    // Apply min/max constraints
    if (this.minRows() || this.maxRows()) {
      const computedStyle = getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight) ||
                        parseInt(computedStyle.fontSize) * 1.2;

      const paddingTop = parseInt(computedStyle.paddingTop) || 0;
      const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
      const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
      const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
      const totalVerticalSpace = paddingTop + paddingBottom + borderTop + borderBottom;

      if (this.minRows()) {
        const minHeight = (this.minRows()! * lineHeight) + totalVerticalSpace;
        newHeight = Math.max(newHeight, minHeight);
      }

      if (this.maxRows()) {
        const maxHeight = (this.maxRows()! * lineHeight) + totalVerticalSpace;
        newHeight = Math.min(newHeight, maxHeight);

        // Add overflow-y auto if content exceeds max height
        if (textarea.scrollHeight > maxHeight) {
          textarea.style.overflowY = 'auto';
        } else {
          textarea.style.overflowY = 'hidden';
        }
      }
    }

    // Apply the new height
    textarea.style.height = newHeight + 'px';

    // Restore scroll position
    textarea.scrollTop = scrollTop;

    // Update current rows based on actual content
    this.updateCurrentRowsFromContent(textarea.value);
  }

  // Handle paste events with debounced auto-resize
onPaste(event: ClipboardEvent): void {
  event.preventDefault();

  const textarea = event.target as HTMLTextAreaElement;
  const pastedText = event.clipboardData?.getData('text') || '';
  if (!pastedText) return;

  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const currentValue = textarea.value;

  let beforeCursor = currentValue.substring(0, selectionStart);
  let afterCursor = currentValue.substring(selectionEnd);

  // Start with full pasted text
  let allowedText = pastedText;

  // Apply row limit
  if (this.enforceRowLimits() && this.maxRows()) {
    const currentLines = beforeCursor.split('\n').length + afterCursor.split('\n').length - 1;
    const allowedRows = this.maxRows()! - currentLines;
    const pastedLines = pastedText.split('\n').slice(0, allowedRows);
    if (pastedLines.length < pastedText.split('\n').length) {
      this.onRowLimitExceeded.emit({
        currentRows: pastedText.split('\n').length + currentLines,
        maxRows: this.maxRows()!
      });
    }
    allowedText = pastedLines.join('\n');
  }

  // Apply column limit
  if (this.maxCols()) {
    const limitedLines = allowedText.split('\n').map((line, idx) => {
      if (line.length > this.maxCols()!) {
        this.onColLimitExceeded.emit({
          line: idx + 1,
          currentCols: line.length,
          maxCols: this.maxCols()!
        });
        return line.substring(0, this.maxCols()!);
      }
      return line;
    });
    allowedText = limitedLines.join('\n');
  }

  // Apply character limit
  if (this.maxLen() < 2147483647) {
    const remaining = this.maxLen() - (beforeCursor.length + afterCursor.length);
    if (remaining < allowedText.length) {
      allowedText = allowedText.substring(0, remaining);
    }
  }

  // Construct new value
  const finalValue = beforeCursor + allowedText + afterCursor;
  const cursorPosition = beforeCursor.length + allowedText.length;

  textarea.value = finalValue;

  // Update form control
  const control = this.frmGroup().get(this.controlName());
  if (control) {
    control.setValue(finalValue);
    control.markAsDirty();
    control.markAsTouched();
  }

  // Restore cursor position
  setTimeout(() => {
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    textarea.focus();
  }, 0);

  this.analyzeText(finalValue);
  this.validateInput();
  this.valueChanged.emit(finalValue);

  if (this.autoResize()) {
    setTimeout(() => this.performAutoResize(), 10);
  }
}


  // Debounced auto-resize for better performance
  private autoResizeDebounced(event: Event): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.autoResizeTextarea(event);
    }, 10);
  }

  private updateCurrentRowsFromContent(content: string): void {
    if (!content) {
      this.currentRows.set(this.minRows() || 1);
      return;
    }

    const lines = content.split('\n').length;
    const actualRows = Math.max(lines, this.minRows() || 1);
    this.currentRows.set(actualRows);
  }

  // REST OF THE EXISTING METHODS (keeping them unchanged)
  updateControlState() {
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      if (this.isDisabled) {
        control.disable();
      } else {
        control.enable();
      }
    }
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  isInvalid(): boolean {
    const control = this.frmGroup().get(this.controlName());
    const hasFormErrors = !!(control && control.invalid && (control.touched || control.dirty));
    const hasCustomErrors = this.isInvalidState();
    return hasFormErrors || hasCustomErrors;
  }

  hasError(errorCode: string): boolean {
    const control = this.frmGroup().get(this.controlName());
    return !!control?.hasError(errorCode);
  }

  getErrorValue(errorCode: string): any {
    const control = this.frmGroup().get(this.controlName());
    const error = control?.getError(errorCode);
    if (typeof error === 'object' && error !== null) {
      return error[errorCode];
    }
    return error;
  }

  validateInput() {
    const control = this.frmGroup().get(this.controlName());
    if (!control) return;

    const value: string = control.value || '';
    const lines: string[] = value.split('\n');
    let message = '';

    // Check required validation
    if (this.isRequired() && !value.trim()) {
      message = `${this.label() || 'This field'} is required!`;
    }
    // Check minimum length
    else if (this.minLen() > -2147483648 && value.length < this.minLen()) {
      message = `Minimum ${this.minLen()} characters required.`;
    }
    // Check maximum length
    else if (this.maxLen() < 2147483647 && value.length > this.maxLen()) {
      message = `Maximum ${this.maxLen()} characters allowed.`;
    }
    // Check minimum rows
    else if (this.minRows() && lines.length < this.minRows()!) {
      message = `Minimum ${this.minRows()} rows required.`;
    }
    // Check maximum rows
    else if (this.maxRows() && lines.length > this.maxRows()!) {
      message = `Maximum ${this.maxRows()} rows allowed.`;
      if (this.enforceRowLimits()) {
        this.onRowLimitExceeded.emit({
          currentRows: lines.length,
          maxRows: this.maxRows()!
        });
      }
    }
    // Check column limits
    else if (this.maxCols()) {
      const violatingLine = lines.findIndex((line: string) => line.length > this.maxCols()!);
      if (violatingLine !== -1) {
        message = `Line ${violatingLine + 1} exceeds maximum ${this.maxCols()} characters per line.`;
        this.onColLimitExceeded.emit({
          line: violatingLine + 1,
          currentCols: lines[violatingLine].length,
          maxCols: this.maxCols()!

        });
      }
    }
    // Check minimum columns
    else if (this.minCols() && value.trim()) {
      const shortLine = lines.find((line: string) => line.trim() && line.length < this.minCols()!);
      if (shortLine !== undefined) {
        message = `Each line must have at least ${this.minCols()} characters.`;
      }
    }

    // Only show validation errors if the field has been touched or is dirty
    const shouldShowError = control.touched || control.dirty;
    this.isInvalidState.set(!!message && shouldShowError);
    this.errorMessage.set(message);
  }




onInputChange(event: any) {
  const textarea = event.target as HTMLTextAreaElement;
  let value = textarea.value;
  let wasModified = false;

  // Store cursor position before modifications
  const cursorPosition = textarea.selectionStart;

  // Enforce row limits by preventing input
  if (this.enforceRowLimits() && this.maxRows()) {
    const lines = value.split('\n');
    if (lines.length > this.maxRows()!) {
      // Prevent adding new lines beyond limit
      const limitedValue = lines.slice(0, this.maxRows()).join('\n');
      value = limitedValue;
      wasModified = true;

      this.onRowLimitExceeded.emit({
        currentRows: lines.length,
        maxRows: this.maxRows()!
      });
    }
  }

  // Enforce column limits by preventing input
  if (this.maxCols()) {
    const lines: string[] = value.split('\n');
    const limitedLines = lines.map((line: string) => {
      if (line.length > this.maxCols()!) {
        wasModified = true;
        return line.substring(0, this.maxCols()!);
      }
      return line;
    });

    if (wasModified) {
      value = limitedLines.join('\n');
    }
  }

  // Enforce character length limits
  if (this.maxLen() < 2147483647 && value.length > this.maxLen()) {
    value = value.substring(0, this.maxLen());
    wasModified = true;
  }

  // If we modified the value, update the textarea and form control
  if (wasModified) {
    textarea.value = value;

    // Update the form control
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.setValue(value, { emitEvent: false }); // Prevent infinite loop
    }

    // Restore cursor position (or as close as possible)
    const newCursorPosition = Math.min(cursorPosition, value.length);
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }

  // Trigger auto-resize
  if (this.autoResize()) {
    this.autoResizeDebounced(event);
  }

  this.onChanged.emit(event);
}

  get isDisabled(): boolean {
    return !this.enable();
  }

  get isHidden(): boolean {
    return !this.visible();
  }

  get currentValue(): string {
    const control = this.frmGroup().get(this.controlName());
    return control?.value || '';
  }

  get characterCount(): number {
    return this.currentValue.length;
  }

  get rowCount(): number {
    return this.currentRows();
  }

  get longestLineLength(): number {
    return this.longestLine();
  }

  // Helper methods for template
  getRowCountDisplay(): string {
    const current = this.autoResize() ? this.currentRows() : this.manualRows();
    const max = this.maxRows();
    const min = this.minRows();

    let display = `${current} rows`;

    if (max && min) {
      display += ` (${min}-${max})`;
    } else if (max) {
      display += ` / ${max}`;
    } else if (min) {
      display += ` (min: ${min})`;
    }

    return display;
  }

  getCharacterCountDisplay(): string {
    const current = this.characterCount;
    const max = this.maxLen();

    if (max < 2147483647) {
      return `${current} / ${max}`;
    }

    return `${current}`;
  }

  // Method to manually trigger resize (for auto-resize)
  triggerResize(): void {
    if (this.autoResize()) {
      this.performAutoResize();
    }
  }

  // adjustHeight(event: Event): void {

  //   if (!this.autoResize()) return;

  //   const textarea = event.target as HTMLTextAreaElement;
  //    requestAnimationFrame(() => {
  //     textarea.style.height = 'auto';
  //     textarea.style.height = `${textarea.scrollHeight}px`;
  //   });
  // }
}
