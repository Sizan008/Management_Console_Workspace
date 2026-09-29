import { ChangeDetectionStrategy, Component, input, inject, Inject, EventEmitter, Output, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { CommonModule, NgClass } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';

@Component({
  selector: 'input-time',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    CommonModule
  ],
  templateUrl: './input-time.html',
  standalone: true,
  styleUrl: './input-time.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputTime {

  @Input({ required: true }) frmGroup!: FormGroup;
  readonly controlName = input.required<string>();
  @Input({ required: true }) label!: string;
  @Input() minTime: string = '00:00';
  @Input() maxTime: string = '23:59';
  @Input() isReadonly: boolean = false;
  @Input() placeholder: string = '--:--';
  @Input() displayMode: 'horizontal' | 'vertical' | 'outline' = 'vertical';
  @Input() customErrorMessages: { [key: string]: string } = {};

  @Output() timeChange = new EventEmitter<string>();

  onChange(event: any) {
    const value = event.target.value;
    this.timeChange.emit(value);
  }

  onBlur() {
    this.frmGroup.get(this.controlName())?.markAsTouched();
  }

  clearInput(): void {
    const control = this.frmGroup.get(this.controlName());
    if (control) {
      control.setValue('');
      control.markAsTouched();
      this.timeChange.emit('');
    }
  }

  getCustomErrorMessage(errorKey: string): string {
    const control = this.frmGroup.get(this.controlName());
    let message = `${this.label} has validation error: ${errorKey}`;

    if (typeof this.customErrorMessages[errorKey] === 'string') {
      message = this.customErrorMessages[errorKey];
    } else if (control?.errors?.[errorKey]) {
      const errorValue = control.errors[errorKey];
      if (typeof errorValue === 'string') {
        message = errorValue;
      }
    }
    return message;
  }

  getCustomErrorKeys(): string[] {
    const control = this.frmGroup.get(this.controlName());
    if (!control?.errors) return [];

    const defaultErrorKeys = ['required'];
    return Object.keys(control.errors).filter(key => !defaultErrorKeys.includes(key));
  }

  hasCustomErrors(): boolean {
    return this.getCustomErrorKeys().length > 0;
  }

  onTimeChange(event: any): void {
    const value = event.target.value;
    if (value) {
      const time12hr = this.convertTo12Hour(value);
      this.timeChange.emit(time12hr);
      console.log('Time changed:', {
        original: value,
        converted: time12hr
      });
    }
  }

  private convertTo12Hour(time24: string): string {
    if (!time24) return '';

    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12.toString().padStart(2, '0')}:${minutes} ${period}`;
  }

  static convertTo24Hour(time12: string): string {
    if (!time12) return '';

    const match = time12.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return '';

    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

}
