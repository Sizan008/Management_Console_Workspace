import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';
import { SummaryDetailsComponent, SummaryDetailItem } from '../../../shared/common-components/case-quick-view/summary-details/summary-details.component';

export interface PermissionGroup {
  module: string;
  permissions: { label: string; granted: boolean }[];
}

const ROLE_PERMISSIONS: Record<string, PermissionGroup[]> = {
  Admin: [
    {
      module: 'User Management',
      permissions: [
        { label: 'Create Users',    granted: true  },
        { label: 'Edit Users',      granted: true  },
        { label: 'Delete Users',    granted: true  },
        { label: 'View Users',      granted: true  },
        { label: 'Manage Roles',    granted: true  }
      ]
    },
    {
      module: 'System',
      permissions: [
        { label: 'System Config',   granted: true  },
        { label: 'Audit Log',       granted: true  },
        { label: 'Full Reports',    granted: true  }
      ]
    }
  ],
  Manager: [
    {
      module: 'User Management',
      permissions: [
        { label: 'Create Users',    granted: false },
        { label: 'Edit Users',      granted: true  },
        { label: 'Delete Users',    granted: false },
        { label: 'View Users',      granted: true  },
        { label: 'Manage Roles',    granted: false }
      ]
    },
    {
      module: 'Operations',
      permissions: [
        { label: 'Approve Requests', granted: true  },
        { label: 'View Reports',     granted: true  },
        { label: 'Generate Reports', granted: true  }
      ]
    }
  ],
  Officer: [
    {
      module: 'User Management',
      permissions: [
        { label: 'Create Users',    granted: false },
        { label: 'Edit Users',      granted: false },
        { label: 'View Users',      granted: true  },
        { label: 'Edit Own Profile', granted: true  }
      ]
    },
    {
      module: 'Operations',
      permissions: [
        { label: 'Submit Requests', granted: true  },
        { label: 'View Reports',    granted: true  },
        { label: 'Approve Requests', granted: false }
      ]
    }
  ],
  Analyst: [
    {
      module: 'User Management',
      permissions: [
        { label: 'View Users',       granted: true  },
        { label: 'Edit Users',       granted: false },
        { label: 'Edit Own Profile', granted: true  }
      ]
    },
    {
      module: 'Reports',
      permissions: [
        { label: 'View Reports',    granted: true  },
        { label: 'Generate Reports', granted: true  },
        { label: 'Data Export',     granted: true  },
        { label: 'Approve Reports', granted: false }
      ]
    }
  ]
};

@Component({
  selector: 'app-user-role-page',
  standalone: true,
  imports: [CommonModule, SummaryDetailsComponent],
  templateUrl: './user-role-page.html',
  styleUrls: ['./user-role-page.scss']
})
export class UserRolePageComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  userData: UserCase | null = null;
  permissionGroups: PermissionGroup[] = [];
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      const userId = params['userId'];
      if (userId) this.loadUser(userId);
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  loadUser(userId: string): void {
    this.userData        = MOCK_USERS.find(u => u.userId === userId) ?? null;
    this.permissionGroups = this.userData
      ? (ROLE_PERMISSIONS[this.userData.role] ?? [])
      : [];
  }

  onClose(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  get userSummary(): SummaryDetailItem[] {
    return [
      { label: 'User ID',    value: this.userData?.userId     || '-' },
      { label: 'Full Name',  value: this.userData?.fullName   || '-' },
      { label: 'Department', value: this.userData?.department || '-' },
      { label: 'Branch',     value: this.userData?.branch     || '-' },
      { label: 'Stage',      value: this.userData?.stage      || '-' }
    ];
  }

  get grantedCount(): number {
    return this.permissionGroups
      .flatMap(g => g.permissions)
      .filter(p => p.granted).length;
  }

  get totalCount(): number {
    return this.permissionGroups.flatMap(g => g.permissions).length;
  }
}
