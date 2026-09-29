import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonUtils, ONCLICK_EXIT } from '../../../shared/constant/button-signals.constant';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { ExpansionPanelHeader } from '../../../shared/common-components/expansion-panel-header/expansion-panel-header';

/** One row in the permissions matrix — a module and the actions the role may perform on it. */
interface PermissionRow {
  module: string;
  view:    boolean;
  create:  boolean;
  edit:    boolean;
  delete:  boolean;
  approve: boolean;
}

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

@Component({
  selector: 'app-user-roles-create-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField,
    ExpansionPanelHeader
  ],
  templateUrl: './user-roles-create-page.html',
  styleUrls: ['./user-roles-create-page.scss']
})
export class UserRolesCreatePageComponent implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private router = inject(Router);

  constructor() {
    // The shared page toolbar's Exit button raises ONCLICK_EXIT — mirror the
    // Register page so this master page cancels back to the list the same way.
    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.onCancel();
      }
    });
  }

  roleForm!: FormGroup;

  isDetailsOpen     = signal(true);
  isPermissionsOpen = signal(true);

  workspaceOptions = [
    { key: 'user-management', value: 'User Management' },
    { key: 'work-schedule',   value: 'Work Schedule' },
    { key: 'approval',        value: 'Approval' },
    { key: 'report',          value: 'Reporting' }
  ];

  statusOptions = [
    { key: 'Active',   value: 'Active' },
    { key: 'Inactive', value: 'Inactive' }
  ];

  /** Actions shown as columns in the permissions matrix. */
  readonly permissionActions: { key: PermissionAction; label: string }[] = [
    { key: 'view',    label: 'View' },
    { key: 'create',  label: 'Create' },
    { key: 'edit',    label: 'Edit' },
    { key: 'delete',  label: 'Delete' },
    { key: 'approve', label: 'Approve' }
  ];

  /** Modules the role can be granted permissions on. */
  permissions: PermissionRow[] = [
    { module: 'User Management', view: true, create: false, edit: false, delete: false, approve: false },
    { module: 'Work Schedule',   view: true, create: false, edit: false, delete: false, approve: false },
    { module: 'Approval',        view: true, create: false, edit: false, delete: false, approve: false },
    { module: 'Reporting',       view: true, create: false, edit: false, delete: false, approve: false }
  ];

  ngOnInit(): void {
    ButtonUtils.setPageButtons({ exit: true });
    this.roleForm = this.fb.group({
      roleName:    ['', [Validators.required, Validators.minLength(3)]],
      roleCode:    ['', Validators.required],
      workspace:   ['user-management', Validators.required],
      status:      ['Active', Validators.required],
      description: ['']
    });
  }

  ngOnDestroy(): void {
    ButtonUtils.resetAllButtons();
  }

  /** Grant/revoke a single action on a module. */
  togglePermission(row: PermissionRow, action: PermissionAction): void {
    row[action] = !row[action];
  }

  /** True when every action in a module row is granted (drives the row-level "all" toggle). */
  isRowFullyGranted(row: PermissionRow): boolean {
    return this.permissionActions.every(a => row[a.key]);
  }

  /** Grant or clear every action on a module in one click. */
  toggleRowAll(row: PermissionRow): void {
    const grant = !this.isRowFullyGranted(row);
    this.permissionActions.forEach(a => (row[a.key] = grant));
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      const payload = {
        ...this.roleForm.value,
        permissions: this.permissions
      };
      console.log('New User Role:', payload);
      alert('User role created successfully!');
      this.router.navigate(['/feature/user-management']);
    } else {
      this.roleForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/feature/user-management']);
  }
}
