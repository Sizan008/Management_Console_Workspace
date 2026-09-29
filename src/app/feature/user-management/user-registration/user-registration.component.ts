import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonUtils, ONCLICK_EXIT } from '../../../shared/constant/button-signals.constant';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputDate } from '../../../shared/common-components/input-types/input-date/input-date';
import { ExpansionPanelHeader } from '../../../shared/common-components/expansion-panel-header/expansion-panel-header';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password        = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-user-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField,
    InputDate,
    ExpansionPanelHeader
  ],
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.scss']
})
export class UserRegistrationComponent implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private router = inject(Router);

  constructor() {
    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.onCancel();
      }
    });
  }

  registrationForm!: FormGroup;

  isPersonalOpen  = signal(true);
  isWorkOpen      = signal(true);
  isAccessOpen    = signal(true);

  departmentOptions = [
    { key: 'IT',          value: 'Information Technology' },
    { key: 'Finance',     value: 'Finance & Accounts' },
    { key: 'Operations',  value: 'Operations' },
    { key: 'HR',          value: 'Human Resources' },
    { key: 'Compliance',  value: 'Compliance & Risk' },
    { key: 'Credit',      value: 'Credit & Recovery' },
    { key: 'Treasury',    value: 'Treasury' }
  ];

  branchOptions = [
    { key: 'Head Office',  value: 'Head Office' },
    { key: 'Dhaka North',  value: 'Dhaka North Branch' },
    { key: 'Dhaka South',  value: 'Dhaka South Branch' },
    { key: 'Chittagong',   value: 'Chittagong Branch' },
    { key: 'Sylhet',       value: 'Sylhet Branch' },
    { key: 'Rajshahi',     value: 'Rajshahi Branch' },
    { key: 'Khulna',       value: 'Khulna Branch' }
  ];

  roleOptions = [
    { key: 'Admin',   value: 'System Administrator' },
    { key: 'Manager', value: 'Branch Manager' },
    { key: 'Officer', value: 'Banking Officer' },
    { key: 'Analyst', value: 'Data Analyst' }
  ];

  statusOptions = [
    { key: 'Active',  value: 'Active' },
    { key: 'Pending', value: 'Pending Approval' },
    { key: 'Inactive', value: 'Inactive' }
  ];

  ngOnDestroy(): void {
    ButtonUtils.resetAllButtons();
  }

  ngOnInit(): void {
    ButtonUtils.setPageButtons({ exit: true });
    this.registrationForm = this.fb.group({
      // Personal Information
      fullName:    ['', [Validators.required, Validators.minLength(3)]],
      email:       ['', [Validators.required, Validators.email]],
      phone:       ['', Validators.required],
      dateOfBirth: [''],

      // Work Information
      employeeId:   ['', Validators.required],
      department:   ['', Validators.required],
      branch:       ['', Validators.required],
      designation:  [''],

      // System Access
      userId:          ['', Validators.required],
      role:            ['Officer', Validators.required],
      status:          ['Pending', Validators.required],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      console.log('New User Registration:', this.registrationForm.value);
      alert('User registered successfully!');
      this.router.navigate(['/feature/user-management']);
    } else {
      this.registrationForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/feature/user-management']);
  }

  get passwordMismatch(): boolean {
    return !!(this.registrationForm.errors?.['passwordMismatch'] &&
      this.registrationForm.get('confirmPassword')?.touched);
  }
}
