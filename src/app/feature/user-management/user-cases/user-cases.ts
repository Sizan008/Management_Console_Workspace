import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserCase } from '../shared/models/user.model';
import { MOCK_USERS } from '../shared/mock-data/users.data';
import { GenericWorkspace } from '../../../shared/common-components/generic-workspace/generic-workspace';
import { ActionDefinition, WorkspaceConfig } from '../../../shared/common-components/generic-workspace/workspace-config.model';
import { BaseWorkspaceComponent } from '../../../shared/common-components/generic-workspace/base-workspace.component';
import { buildUserConfig, mapUserActionDtos, USER_META } from './user-management.config';
import { WorkspaceMeta } from '../../../shared/models/workspace-meta.model';
import { WorkspaceApiService } from '../../../core/workspace-api/workspace-api.service';
import { ServiceRequestService } from '../../../core/services/service-request.service';

@Component({
  selector: 'app-user-cases',
  standalone: true,
  imports: [CommonModule, GenericWorkspace],
  templateUrl: './user-cases.html',
  styleUrl: './user-cases.scss'
})
export class UserCases extends BaseWorkspaceComponent<UserCase> {
  private workspaceApi    = inject(WorkspaceApiService);
  private serviceRequests = inject(ServiceRequestService);

  allCases: UserCase[] = MOCK_USERS;

  // Department master for the advanced-search dropdown. Empty until the API
  // answers, which keeps the field on its optionsFromData fallback in the
  // meantime (see buildUserConfig).
  private departmentOptions = signal<string[]>([]);

  constructor() {
    super();
    // buildConfig() reads this signal, and buildConfig() runs inside the base
    // class's rebuild effect — so assigning here regenerates workspaceConfig and
    // the dropdown swaps to the API list without any further plumbing.
    this.serviceRequests.getDepartmentOptions()
      .pipe(takeUntilDestroyed())
      .subscribe(opts => this.departmentOptions.set(opts.map(o => o.value)));
  }

  getMeta(): WorkspaceMeta { return USER_META; }
  getItemKey(item: UserCase): string { return item.userId; }

  buildConfig(dynamicActions?: ActionDefinition<UserCase>[]): WorkspaceConfig<UserCase> {
    // Rows may carry only the stage name. Resolve the numeric stageId that the
    // action API requires from META_STAGE (stageName → stageId), keyed by the
    // same normalization getStageIdMap uses (trimmed + lower-cased).
    const stageIdMap = this.resolver.getStageIdMap(USER_META.routeSegment);

    return buildUserConfig({
      router: this.router,
      route:  this.route,
      dynamicActions,
      stageColourMap: this.resolver.getStageColourMap(USER_META.routeSegment),   // badge colours from the API
      departmentOptions: this.departmentOptions(),                               // department master from the API
      resolveActionsForItem: (item: UserCase) => {
        const stageId =   stageIdMap[item.stage?.trim().toLowerCase() ?? ''];
        console.log('stageiddddd',stageId);
        return stageId != null
          ? this.workspaceApi.getActionsByStage(stageId).pipe(
              map(dtos => mapUserActionDtos(dtos, this.router, this.route))
            )
          : of([]);
      }
    });
  }
}
