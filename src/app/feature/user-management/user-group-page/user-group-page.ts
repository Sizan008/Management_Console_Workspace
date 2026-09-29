import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PanelPageComponent, PanelFooterDirective, PanelSubheaderDirective } from '../../../shared/common-components/panel-page/panel-page';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';

interface GroupItem { id: string; name: string; description: string; assigned: boolean; }

const MOCK_GROUPS: GroupItem[] = [
  { id: 'GRP-001', name: 'IT Team',          description: 'Information Technology department',   assigned: false },
  { id: 'GRP-002', name: 'Finance Team',      description: 'Finance and accounting department',   assigned: false },
  { id: 'GRP-003', name: 'Operations Team',   description: 'Operations and logistics',            assigned: false },
  { id: 'GRP-004', name: 'HR Team',           description: 'Human Resources department',          assigned: false },
  { id: 'GRP-005', name: 'Compliance Team',   description: 'Compliance and regulatory affairs',   assigned: false },
  { id: 'GRP-006', name: 'Management Team',   description: 'Senior management and leadership',    assigned: false },
  { id: 'GRP-007', name: 'LC Approvers',      description: 'LC approval authority group',         assigned: false },
  { id: 'GRP-008', name: 'Report Viewers',    description: 'Read access to all reports',          assigned: false },
];

@Component({
  selector: 'app-user-group-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-group-page.html'
})
export class UserGroupPageComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  userData: UserCase | null = null;
  groups: GroupItem[] = MOCK_GROUPS.map(g => ({ ...g }));
  private routeSub: Subscription | null = null;

  get assignedCount(): number { return this.groups.filter(g => g.assigned).length; }

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(p => {
      if (p['userId']) this.userData = MOCK_USERS.find(u => u.userId === p['userId']) ?? null;
    });
  }

  ngOnDestroy(): void { this.routeSub?.unsubscribe(); }

  toggle(group: GroupItem): void { group.assigned = !group.assigned; }

  onClose(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }

  save(): void { console.log('Assign Groups saved', this.userData?.userId, this.groups.filter(g => g.assigned)); }
}
