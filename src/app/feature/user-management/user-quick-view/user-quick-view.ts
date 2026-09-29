import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';
import { WorkspaceStateService } from '../../../shared/common-components/generic-workspace/workspace-state.service';
import { SummaryDetailsComponent, SummaryDetailItem } from '../../../shared/common-components/case-quick-view/summary-details/summary-details.component';

@Component({
  selector: 'app-user-quick-view',
  standalone: true,
  imports: [CommonModule, SummaryDetailsComponent],
  templateUrl: './user-quick-view.html',
  styleUrls: ['./user-quick-view.scss']
})
export class UserQuickView implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceState = inject(WorkspaceStateService);

  isOpen   = false;
  userData: UserCase | null = null;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    setTimeout(() => this.isOpen = true, 50);

    this.routeSub = this.route.params.subscribe(params => {
      const userId = params['userId'];
      if (userId) {
        const selected = this.workspaceState.selectedRow();
        console.log('Selected from workspace state:', selected);
        if (selected && selected.userId === userId) {
          this.userData = selected as UserCase;
        } else {
          this.loadUserData(userId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  loadUserData(userId: string): void {
    this.userData = MOCK_USERS.find(u => u.userId === userId) ?? null;
  }

  onClose(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  get overviewDetails(): SummaryDetailItem[] {
    return [
      { label: 'User ID',     value: this.userData?.userId     || '-' },
      { label: 'Full Name',   value: this.userData?.fullName   || '-' },
      { label: 'Email',       value: this.userData?.email      || '-' },
      { label: 'Department',  value: this.userData?.department || '-' },
      { label: 'Role',        value: this.userData?.role       || '-' },
      { label: 'Branch',      value: this.userData?.branch     || '-' },
      { label: 'Join Date',   value: this.userData?.joinDate   || '-' },
      { label: 'Last Login',  value: this.userData?.lastLogin  || '-' },
      { label: 'Stage',       value: this.userData?.stage      || '-' }
    ];
  }
}
