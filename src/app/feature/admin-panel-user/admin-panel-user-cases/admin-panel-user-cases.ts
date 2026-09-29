import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GenericWorkspace } from '../../../shared/common-components/generic-workspace/generic-workspace';
import { ActionDefinition, WorkspaceConfig } from '../../../shared/common-components/generic-workspace/workspace-config.model';
import { BaseWorkspaceComponent } from '../../../shared/common-components/generic-workspace/base-workspace.component';
import { WorkspaceMeta } from '../../../shared/models/workspace-meta.model';
import { WorkspaceApiService } from '../../../core/workspace-api/workspace-api.service';

import { AdminPanelUserCase } from './admin-panel-user.model';
import { MOCK_ADMIN_PANEL_USERS } from './admin-panel-user.data';
import {
  ADMIN_PANEL_META,
  buildAdminPanelConfig,
  mapAdminPanelActionDtos,
} from './admin-panel-user.config';
import { authStatusToStage, authStatusToStageId, branchDisplayName, rolesToString, User } from '../models/user.model';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-admin-panel-user-cases',
  standalone: true,
  imports: [CommonModule, GenericWorkspace],
  templateUrl: './admin-panel-user-cases.html',
  styleUrl: './admin-panel-user-cases.scss',
})
export class AdminPanelUserCases extends BaseWorkspaceComponent<AdminPanelUserCase> implements OnInit {
  private readonly workspaceApi = inject(WorkspaceApiService);
  private readonly userService = inject(UserService);

  allCases: AdminPanelUserCase[] = MOCK_ADMIN_PANEL_USERS;
  loading = false;

  override ngOnInit(): void {
    this.loadUserList();
    super.ngOnInit();
  }

  getMeta(): WorkspaceMeta {
    return ADMIN_PANEL_META;
  }

  getItemKey(item: AdminPanelUserCase): string {
    return item.userId;
  }

  buildConfig(dynamicActions?: ActionDefinition<AdminPanelUserCase>[]): WorkspaceConfig<AdminPanelUserCase> {
    const stageIdMap = this.resolver.getStageIdMap(ADMIN_PANEL_META.routeSegment);

    return buildAdminPanelConfig({
      router:         this.router,
      route:          this.route,
      dynamicActions,
      stageColourMap: this.resolver.getStageColourMap(ADMIN_PANEL_META.routeSegment),
      stageOptions:   this.resolver.getStageNamesForWorkspace(ADMIN_PANEL_META.routeSegment),
      resolveActionsForItem: (item: AdminPanelUserCase) => {
        const stageId = stageIdMap[item.stage?.trim().toLowerCase() ?? ''] ?? authStatusToStageId(item.authStatus);
        return stageId !== null && stageId !== undefined
          ? this.workspaceApi.getActionsByStage(stageId).pipe(
              map(dtos => mapAdminPanelActionDtos(dtos, this.router, this.route))
            )
          : of([]);
      },
    });
  }

  private loadUserList(): void {
    this.loading = true;
    this.userService.getUserList().pipe(
      map(users => users.map(u => this.toAdminPanelUserCase(u))),
      catchError(() => of(MOCK_ADMIN_PANEL_USERS))
    ).subscribe(rows => {
      this.allCases = rows;
      this.loading = false;
      this.workspaceConfig = this.buildConfig();
    });
  }

  private toAdminPanelUserCase(user: User): AdminPanelUserCase {
    return {
      userId: user.userId,
      fullName: user.fullName,
      email: user.emailAddress,
      emailAddress: user.emailAddress,
      mobileNumber: user.mobileNumber,
      homeBranchId: user.homeBranchId,
      homeBranchName: user.homeBranchName,
      branch: branchDisplayName(user),
      authStatusId: user.authStatusId,
      authStatus: user.authStatus,
      stage: authStatusToStage(user.authStatus),
      stageId: authStatusToStageId(user.authStatus),
      role: rolesToString(user.roles),
      roles: user.roles,
      department: '',
      joinDate: '',
      lastLogin: '',
    };
  }
}
