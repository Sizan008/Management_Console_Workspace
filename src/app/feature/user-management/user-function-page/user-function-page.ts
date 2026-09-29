import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';

interface FunctionItem { id: string; name: string; module: string; assigned: boolean; }

const MOCK_FUNCTIONS: FunctionItem[] = [
  { id: 'FN-001', name: 'Create User',        module: 'User Management',  assigned: false },
  { id: 'FN-002', name: 'Edit User',          module: 'User Management',  assigned: false },
  { id: 'FN-003', name: 'Delete User',        module: 'User Management',  assigned: false },
  { id: 'FN-004', name: 'Approve User',       module: 'User Management',  assigned: false },
  { id: 'FN-005', name: 'View Reports',       module: 'Reports',          assigned: false },
  { id: 'FN-006', name: 'Generate Reports',   module: 'Reports',          assigned: false },
  { id: 'FN-007', name: 'Export Data',        module: 'Reports',          assigned: false },
  { id: 'FN-008', name: 'System Config',      module: 'Settings',         assigned: false },
  { id: 'FN-009', name: 'Password Policy',    module: 'Settings',         assigned: false },
  { id: 'FN-010', name: 'Submit LC',          module: 'LC Management',    assigned: false },
  { id: 'FN-011', name: 'Approve LC',         module: 'LC Management',    assigned: false },
  { id: 'FN-012', name: 'View LC',            module: 'LC Management',    assigned: false },
];

@Component({
  selector: 'app-user-function-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-function-page.html'
})
export class UserFunctionPageComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  userData: UserCase | null = null;
  functions: FunctionItem[] = MOCK_FUNCTIONS.map(f => ({ ...f }));
  private routeSub: Subscription | null = null;

  get modules(): string[] {
    return [...new Set(this.functions.map(f => f.module))];
  }

  getFunctionsForModule(module: string): FunctionItem[] {
    return this.functions.filter(f => f.module === module);
  }

  get assignedCount(): number { return this.functions.filter(f => f.assigned).length; }

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(p => {
      if (p['userId']) this.userData = MOCK_USERS.find(u => u.userId === p['userId']) ?? null;
    });
  }

  ngOnDestroy(): void { this.routeSub?.unsubscribe(); }

  toggle(fn: FunctionItem): void { fn.assigned = !fn.assigned; }

  toggleModule(module: string): void {
    const items = this.getFunctionsForModule(module);
    const allOn = items.every(f => f.assigned);
    items.forEach(f => f.assigned = !allOn);
  }

  isModuleAllOn(module: string): boolean {
    return this.getFunctionsForModule(module).every(f => f.assigned);
  }

  isModulePartial(module: string): boolean {
    const items = this.getFunctionsForModule(module);
    return items.some(f => f.assigned) && !items.every(f => f.assigned);
  }

  onClose(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }

  save(): void { console.log('Assign Functions saved for', this.userData?.userId, this.functions.filter(f => f.assigned)); }
}
