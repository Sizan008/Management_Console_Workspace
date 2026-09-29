import {Component, input, output, OnInit, signal} from '@angular/core';
import {FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatInput} from "@angular/material/input";
import {NgClass} from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

@Component({
  selector: 'input-office-box',
  imports: [
    FormsModule,
    MatInput,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    MatTooltipModule,
    MatIconModule,
    NgClass,
  ],
  templateUrl: './input-office-box.html',
  standalone: true,
  styleUrl: './input-office-box.scss'
})
export class InputOfficeBox implements OnInit {

  // Required inputs
  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();

  // Optional inputs
  readonly id = input<string>('');
  readonly placeholder = input<any>('Enter Office Code');
  readonly enable = input<boolean>(true);
  readonly visible = input<boolean>(true);
  readonly tooltip = input<string>('');
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly tooltipDelay = input<number>(500);
  readonly errorMessage = input<string>('Invalid Office Code');
  readonly isReadonly = input<boolean>(false);
  readonly allowSpecialChars = input<boolean>(false);
  readonly maxLen = input<number>();
  readonly minLen = input<number>();
  readonly isVertical = input<boolean>(false);
  // Custom error messages
  readonly customErrorMessages = input<{ [key: string]: string }>({});
 readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  // Outputs
  readonly valueChanged = output<number>();
  readonly onChanged = output<{ officeCode: string; officeName: string }>();
  readonly onBlurred = output<any>();

  // Internal state
  readonly officeName = signal('');

  ngOnInit() {
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.valueChanges.subscribe(value => {
        this.onOfficeCodeChange(value || '');
      });
    }
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  onOfficeCodeChange(newCode: string): void {
    const officeName = this.lookupOfficeName(newCode); // Use the lookup logic
    this.officeName.set(officeName);
    this.valueChanged.emit(Number(newCode));
    this.onChanged.emit({ officeCode: newCode, officeName });
  }

  // Simulate backend lookup for office name
  private lookupOfficeName(code: string): string {
    const officeLookup: { [key: string]: string } = {
      '1001': 'Head Office',
      '1002': 'Dhaka Corporate Office',
      '1003': 'Chittagong Branch',
      '1004': 'Sylhet Branch',
    };
    return officeLookup[code] || '';
  }

  preventSpecialChars(event: KeyboardEvent): void {
    if (!this.allowSpecialChars()) {
      const specialCharRegex = /^[a-zA-Z0-9 ]$/; // Allow only alphanumeric and spaces
      const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab']; // Allow navigation and editing keys
      if (!specialCharRegex.test(event.key) && !allowedKeys.includes(event.key)) {
        event.preventDefault();
      }
    }
  }

  // Get custom error message for a specific error key
  getCustomErrorMessage(errorKey: string): string {
    const customMessages = this.customErrorMessages();
    return customMessages[errorKey] || `${this.label()} has validation error: ${errorKey}`;
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
    
  }
}

onInput(event: Event): void {
  const value = (event.target as HTMLInputElement)?.value;
  this.valueChanged.emit(Number(value));
  this.onChanged.emit({ officeCode: value, officeName: this.officeName() });
}

onChange(event: Event): void {
  const value = (event.target as HTMLInputElement)?.value;
  this.onChanged.emit({ officeCode: value, officeName: this.officeName() });
}

onBlur(): void {
  const control = this.frmGroup().get(this.controlName());
  const value = control ? control.value : undefined;
  this.onChanged.emit(value); 
  this.onBlurred.emit(value);  
}

}