import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BUTTON_VISIBILITY, ONCLICK_SAVE } from '../../../constant/button-signals.constant';
import { InputNumber } from '../../../common-components/input-types/input-number/input-number';
import { InputTextBox } from '../../../common-components/input-types/input-text-box/input-text-box';

@Component({
  selector: 'app-person-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputNumber
  ],
  templateUrl: './person-form.component.html',
  styleUrls: ['./person-form.component.scss']
})
export class PersonFormComponent implements OnInit {
  frmGroup!: FormGroup;
  toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

  constructor() {
    // Listen to global Save button click
    effect(() => {
      if (ONCLICK_SAVE()) {
        this.onSubmit();
        ONCLICK_SAVE.set(false); // Reset signal
      }
    });
  }

  ngOnInit(): void {
    // Enable Save button in navbar
    BUTTON_VISIBILITY.set({
      ...BUTTON_VISIBILITY(),
      save: true,
      reset: true,
      exit: true
    });

    this.frmGroup = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z\s'-]+$/)
      ]],
      age: ['', [
        Validators.required,
        Validators.min(1),
        Validators.max(120)
      ]]
    });
  }

  onSubmit(): void {
    if (this.frmGroup.invalid) {
      this.markAllFieldsAsTouched();
      this.toastr.error('Please fix the errors in the form.', 'Validation Failed');
      return;
    }

    const data = this.frmGroup.value;
    console.log('Person Data:', data);
    this.toastr.success(`Saved: ${data.name}, Age: ${data.age}`, 'Success');
  }

  markAllFieldsAsTouched(): void {
    Object.keys(this.frmGroup.controls).forEach(key => {
      this.frmGroup.get(key)?.markAsTouched();
    });
  }

  onNameChanged(value: string): void {
    console.log('Name changed:', value);
  }

  onAgeChanged(value: string): void {
    console.log('Age changed:', value);
  }

  // Optional: Reset form via Navbar Reset
  resetForm(): void {
    this.frmGroup.reset();
    this.toastr.info('Form reset', 'Reset');
  }
}