import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { ExpansionPanelHeader } from '../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';

@Component({
  selector: 'app-user-edit-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField,
    ExpansionPanelHeader
  ],
  templateUrl: './user-edit-page.html',
  styleUrls: ['./user-edit-page.scss']
})
export class UserEditPageComponent implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  isOpen   = false;
  userData: UserCase | null = null;
  userForm!: FormGroup;
  private routeSub: Subscription | null = null;
  isUserFieldsOpen = signal(true);

  roleOptions = [
    { key: 'Admin',   value: 'Admin'   },
    { key: 'Manager', value: 'Manager' },
    { key: 'Officer', value: 'Officer' },
    { key: 'Analyst', value: 'Analyst' }
  ];

  ngOnInit(): void {
    setTimeout(() => this.isOpen = true, 50);

    this.userForm = this.fb.group({
      userId:     [{ value: '', disabled: true }],
      fullName:   ['', Validators.required],
      email:      ['', [Validators.required, Validators.email]],
      role:       ['Officer', Validators.required],
      department: ['', Validators.required],
      branch:     ['']
    });

    this.routeSub = this.route.params.subscribe(params => {
      const userId = params['userId'];
      if (userId) this.loadUserData(userId);
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  loadUserData(userId: string): void {
    const match = MOCK_USERS.find(u => u.userId === userId);
    this.userData = match ?? null;

    if (match) {
      this.userForm.patchValue({
        userId:     match.userId,
        fullName:   match.fullName,
        email:      match.email,
        role:       match.role,
        department: match.department,
        branch:     match.branch || ''
      });
    }
  }

  onClose(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      console.log('User Edit Form Submitted:', this.userForm.getRawValue());
      alert('User updated successfully!');
    } else {
      this.userForm.markAllAsTouched();
    }
  }
}
