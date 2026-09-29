import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-employee-onboard',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-onboard.html',
  styleUrl: './employee-onboard.scss'
})
export class EmployeeOnboard implements OnInit{
  form: FormGroup;
  submitting = false;
  departments = ['Engineering', 'Product', 'Design', 'HR', 'Sales', 'Finance'];
  positions = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];


  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(40)]],
      lastName: ['', [Validators.required, Validators.maxLength(40)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\\+?[0-9 \-]{7,20}$/)]],
      department: ['', Validators.required],
      position: ['', Validators.required],
      startDate: ['', Validators.required],
      manager: [''],
      salary: [''],
      photo: [null],
      agreements: [false, Validators.requiredTrue]
    });
  }


  ngOnInit(): void {}


  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      this.form.patchValue({ photo: file });
    }
  }


  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }


    this.submitting = true;
    const payload = { ...this.form.value };


// Simulate API request - replace with your service call
    setTimeout(() => {
      this.submitting = false;
      alert('Employee onboarded successfully!\n' + JSON.stringify(payload, null, 2));
      this.form.reset();
    }, 900);
  }


  get f() { return this.form.controls; }
}
