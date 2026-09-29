import { Component, input, output, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

@Component({
  selector: 'generic-switch',
  imports: [
    ReactiveFormsModule,
    FormControlHighlightDirective,
    NgClass
],
  templateUrl: './generic-switch.html',
  styleUrl: './generic-switch.scss'
})
export class GenericSwitch implements OnInit, OnChanges {
  // Form inputs
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();

  // Inputs
  readonly id = input<string>('');
  readonly value = input<string>('');
  readonly label = input<string>('');
  readonly displayMode = input<string>('vertical');
  readonly isChecked = input<boolean>(false);
  readonly enable = input<boolean>(true);
  readonly visible = input<boolean>(true);
  readonly isVisible = input<boolean>(true);
  readonly cssClass = input<string>('');
  readonly style = input<string>('');

  // Outputs
  readonly isCheckedChanged = output<boolean>();
  readonly onSwitchChanged = output<boolean>();

  // Internal state
  isInvalidState = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    // Set up value change listener
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.valueChanges.subscribe(value => {
        const boolValue = this.toBooleanValue(value);
        this.isCheckedChanged.emit(boolValue);
        this.validateInput();
      });

      // Initialize with proper boolean conversion
      const currentBoolValue = this.toBooleanValue(control.value);
      const expectedBoolValue = this.toBooleanValue(this.isChecked());

      if (currentBoolValue !== expectedBoolValue) {
        control.setValue(expectedBoolValue);
      }

      // Handle enable/disable state
      this.updateControlState();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const control = this.frmGroup().get(this.controlName());
    if (control && changes['isChecked']) {
      // Update form control when isChecked input changes
      const currentBoolValue = this.toBooleanValue(control.value);
      const expectedBoolValue = this.toBooleanValue(this.isChecked());

      if (currentBoolValue !== expectedBoolValue) {
        control.setValue(expectedBoolValue);
      }
    }

    this.validateInput();
    this.updateControlState();
  }

  // Helper method to properly convert various values to boolean
  private toBooleanValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'on';
    }
    // For null, undefined, empty arrays, empty objects, etc.
    return !!value;
  }

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
    return !!(control && control.invalid && (control.touched || control.dirty));
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

    const value = this.toBooleanValue(control.value);
    let message = '';

    // Check required validation for switches
    if (this.isRequired() && !value) {
      message = `${this.label() || 'This field'} is required!`;
    }

    // Only show validation errors if the field has been touched or is dirty
    const shouldShowError = control.touched || control.dirty;
    this.isInvalidState.set(!!message && shouldShowError);
    this.errorMessage.set(message);
  }

  toggleSwitch() {
    const control = this.frmGroup().get(this.controlName());
    if (control && !this.isDisabled) {
      const currentValue = this.toBooleanValue(control.value);
      const newValue = !currentValue;
      control.setValue(newValue);
      this.isCheckedChanged.emit(newValue);
      this.onSwitchChanged.emit(newValue);
    }
  }

  get isDisabled(): boolean {
    return !this.enable();
  }

  get isHidden(): boolean {
    return !this.visible() || !this.isVisible();
  }

  get currentValue(): boolean {
    const control = this.frmGroup().get(this.controlName());
    return this.toBooleanValue(control?.value);
  }
}
