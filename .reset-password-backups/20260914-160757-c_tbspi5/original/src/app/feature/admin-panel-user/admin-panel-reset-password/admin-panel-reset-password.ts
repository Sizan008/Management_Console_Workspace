import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminPanelUserCase } from '../admin-panel-user-cases/admin-panel-user.model';
import { MOCK_ADMIN_PANEL_USERS } from '../admin-panel-user-cases/admin-panel-user.data';

@Component({
  selector: 'app-admin-panel-reset-password',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel-reset-password.html'
})
export class AdminPanelResetPasswordComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  userData: AdminPanelUserCase | null = null;
  private routeSub: Subscription | null = null;

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(p => {
      if (p['userId']) {
        this.userData = MOCK_ADMIN_PANEL_USERS.find(u => u.userId === p['userId']) ?? null;
      }
    });
  }

  ngOnDestroy(): void { this.routeSub?.unsubscribe(); }

  onClose(): void { this.router.navigate(['../../'], { relativeTo: this.route }); }
}
