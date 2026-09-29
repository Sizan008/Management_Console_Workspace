import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';

interface RoleOption { id: string; name: string; description: string; }

const AVAILABLE_ROLES: RoleOption[] = [
  { id: 'ROLE-001', name: 'Admin',    description: 'Full system access and user management' },
  { id: 'ROLE-002', name: 'Manager',  description: 'Approval rights and team oversight' },
  { id: 'ROLE-003', name: 'Officer',  description: 'Operational tasks and request submission' },
  { id: 'ROLE-004', name: 'Analyst',  description: 'Read access and report generation' },
  { id: 'ROLE-005', name: 'Auditor',  description: 'Audit log access and compliance review' },
  { id: 'ROLE-006', name: 'Viewer',   description: 'Read-only access to permitted modules' },
];

@Component({
  selector: 'app-user-assign-role-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-assign-role-page.html'
})
export class UserAssignRolePageComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private fb     = inject(FormBuilder);

  userData: UserCase | null = null;
  roles = AVAILABLE_ROLES;
  form!: FormGroup;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.form = this.fb.group({ roleId: ['', Validators.required] });
    this.routeSub = this.route.params.subscribe(p => {
      if (p['userId']) {
        this.userData = MOCK_USERS.find(u => u.userId === p['userId']) ?? null;
        const current = AVAILABLE_ROLES.find(r => r.name === this.userData?.role);
        if (current) this.form.patchValue({ roleId: current.id });
      }
    });
  }

  ngOnDestroy(): void { this.routeSub?.unsubscribe(); }

  selectRole(roleId: string): void { this.form.patchValue({ roleId }); }

  get selectedRole(): RoleOption | undefined {
    return this.roles.find(r => r.id === this.form.value.roleId);
  }

  onClose(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    console.log('Assign Role saved', this.userData?.userId, this.selectedRole?.name);
  }
}
