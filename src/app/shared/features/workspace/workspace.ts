import {CommonModule} from '@angular/common';
import {Component, Type, effect, inject, signal, WritableSignal, ViewChild} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatTabsModule} from '@angular/material/tabs';
import {of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ActionModal} from './action-modal/action-modal';
import {StageModal} from './stage-modal/stage-modal';
import {WorkspaceModal} from './workspace-modal/workspace-modal';
import {WorkspaceService} from './workspace-service';
import {ToastrService} from 'ngx-toastr';

import {WorkspaceEditorColumnRow, WorkspaceEditorModal} from './workspace-editor-modal/workspace-editor-modal';
import {StageEditorModal, StageEditorRow} from './stage-editor-modal/stage-editor-modal';
import {ActionEditorModal, ActionEditorRow} from './action-editor-modal/action-editor-modal';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatDialog} from '@angular/material/dialog';
import {Delete} from '../../../layout/layouts/navbar/actions/delete/delete';
import {SelectOptionsModel} from '../../models/select-options-model';
import {GenericDataGrid} from '../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {BUTTON_VISIBILITY, ONCLICK_RESET, ONCLICK_SAVE, ONCLICK_UPDATE} from '../../constant/button-signals.constant';
import {ActivityLogService} from '../../services/activity-log.service';
import {GenericModal} from '../../common-components/generic-component-type/generic-modal/generic-modal';
import {GenericButton} from '../../common-components/generic-component-type/generic-button/generic-button';
import {InputSelectOptionField} from '../../common-components/input-types/input-select-option-field/input-select-option-field';
import {InputIdBox} from '../../common-components/input-types/input-id-box/input-id-box';
import {UserProfileModel} from '../../../core/auth/login/login';
import {environment} from '../../../../environments/environment';
import {UserListModal} from './user-list-modal/user-list-modal';
import { MetaAppListItem } from './MetaAppListItem';
import { WorkspaceResolverService } from '../../../core/workspace-api/workspace-resolver.service';
// The navbar/sidebar workspace list. Aliased because this file's `WorkspaceService`
// is the meta-CRUD service in this folder — different service, same class name.
import { WorkspaceService as NavWorkspaceService } from '../../services/workspace.service';

type LookupField = 'app_id' | 'workspace_id' | 'stage_id' | 'action_id' | 'user_id';
type TreeNodeType = 'workspace' | 'stage' | 'action';

interface WorkspaceTreeNode {
  id: string;
  type: TreeNodeType;
  title: string;
  subtitle?: string;
  expanded: boolean;
  data: any;
  children: WorkspaceTreeNode[];
}

@Component({
  selector: 'app-Workspace',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    InputIdBox,
    GenericModal,
    GenericDataGrid,
    InputSelectOptionField,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    GenericButton,
  ],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace {
  @ViewChild(Delete, { static: false }) deleteComponent!: Delete;
  private readonly fb = inject(FormBuilder);
  private readonly workspaceResolver = inject(WorkspaceResolverService);
  private readonly navWorkspaces = inject(NavWorkspaceService);
  readonly activeTab = signal(0);
  readonly isLookupVisible = signal(false);
  readonly lookupTitle = signal('Select Item');
  readonly workspaceHeaderPanel: WritableSignal<boolean> = signal(true);
  readonly stageHeaderPanel: WritableSignal<boolean> = signal(true);
  readonly actionHeaderPanel: WritableSignal<boolean> = signal(true);
  readonly assignPanel: WritableSignal<boolean> = signal(true);
  readonly onClickSave = ONCLICK_SAVE;
  readonly onClickUpdate = ONCLICK_UPDATE;
  readonly onClickReset = ONCLICK_RESET;

  modalComponent?: Type<any>;
  modalComponentData: any = {};
  editorComponent?: Type<any>;
  editorComponentData: any = {};
  editorTitle = '';
  isEditorVisible = false;
  private activeLookupField: LookupField | null = null;
  user!: UserProfileModel;

  private readonly applications = signal<MetaAppListItem[]>([]);
  private readonly workspaces = signal<any[]>([]);
  private readonly stages = signal<any[]>([]);
  private readonly actions = signal<any[]>([]);
  treeNodes: WorkspaceTreeNode[] = [];
  currentAppId = environment.workSpaceSessionAppId === true
    ? sessionStorage.getItem('appId')?.trim() ?? environment.appId ?? ''
    : '';
  readonly appSelectionForm = this.fb.group({
    app_id: [''],
  });
  appOptions: SelectOptionsModel[] = [];
  workspaceOptions: SelectOptionsModel[] = [];
  stageOptions: SelectOptionsModel[] = [];
  actionOptions: SelectOptionsModel[] = [];
  stageColourOptions: { key: any; value: string }[] = [];

  toastr = inject(ToastrService);
  onEditMode :boolean=false;
  actiongrid: any[] = [];
  showAssignedGrid = true;
  selectedRow: any = null;
  private pendingWorkspaceNode: WorkspaceTreeNode | null = null;
  private pendingStageNode: WorkspaceTreeNode | null = null;

  readonly workspaceForm = this.fb.group({
    app_id: ['',[Validators.required]],
    workspace_id: [''],
    workspace_name: ['',[Validators.required]],
    workspace_desc: ['',[Validators.required]],
    new_page_identifier: [''],
    new_page_selector: [''],
    search_identifier: [''],
    search_selector: [''],
    home_identifier: [''],
    home_selector: [''],
    display_order: [null],
    is_active: [1],
  });

  readonly stageForm = this.fb.group({
    workspace_id: [{value: '', disabled: true}],
    stage_id: [''],
    stage_name: ['',[Validators.required]],
    stage_colour: [''],
    display_order: [null],
    is_active: [1],
    quick_route: [''],
  });

  readonly actionForm = this.fb.group({
    stage_id: [{value: '', disabled: true}],
    action_id: [''],
    action_name: ['',[Validators.required]],
    quick_route: [''],
    action_type: [null],
    display_order: [null],
    is_active: [1],
  });

  readonly grantForm = this.fb.group({
    user_id: ['',[Validators.required]],
    app_id: [{value: '', disabled: true}],
    workspace_id: [{value: '', disabled: true}],
    stage_id: [{value: '', disabled: true}],
    action_id: [{value: '', disabled: true}],
  });
  readonly useSessionAppId = environment.workSpaceSessionAppId === true;

  constructor(
    private workspaceService: WorkspaceService,
    private activityLog: ActivityLogService,
    private dialog: MatDialog,
  ) {
    BUTTON_VISIBILITY.set({
      save: false,
      update: false,
      view: false,
      delete: false,
      exit: false,
      reset: true,
    });

    effect(() => {
      if (this.onClickSave()) {
        this.saveCurrentTab();
        ONCLICK_SAVE.set(false);
      }
      if (this.onClickUpdate()) {
        this.saveCurrentTab();
        ONCLICK_UPDATE.set(false);
      }
      if (this.onClickReset()) {
        this.resetForms();
        ONCLICK_RESET.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.refreshTree();

    const originalLogEvent = this.activityLog.logEvent.bind(this.activityLog);

    this.activityLog.logEvent = (
      eventType: string,
      functionId?: string,
      extra?: any
    ) => {
      originalLogEvent(eventType, functionId, extra);

      if (eventType === 'DELETE_CLICK' && this.selectedRow) {
        this.performDelete(this.selectedRow);
        this.selectedRow = null;
      }
    };
  }

  ngAfterViewInit(): void {
    console.log('Delete component:', this.deleteComponent);
  }

  get isActiveWorkspace(): boolean {
    return this.workspaceForm.get('is_active')?.value === 1;
  }

  get isActiveStage(): boolean {
    return this.stageForm.get('is_active')?.value === 1;
  }

  get isActiveAction(): boolean {
    return this.actionForm.get('is_active')?.value === 1;
  }

  setTab(index: number): void {
    this.activeTab.set(index);
    this.closeEditor();
  }

  async saveCurrentTab(): Promise<void> {
    await this.saveActiveTab();

    // Once, after the whole cascade — per-save calls hit load()'s in-flight guard
    // and would leave a fetch that predates the later writes.
    this.afterMetaWrite();
  }

  /**
   * Invalidate every session-long cache that holds workspace meta. Two of them
   * exist and both outlive a write, so anything saved here stays invisible until
   * a full page reload unless both are dropped:
   *   - WorkspaceResolverService — the workspace boards' stages/actions
   *   - WorkspaceService (shared/services) — the navbar switcher, sidebar and
   *     the default-Workspace list in user preferences
   * Call this from EVERY write path (button bar, editor modals, unassign), not
   * just the button-bar save — that omission was the original stale-data bug.
   */
  private afterMetaWrite(): void {
    this.workspaceResolver.reload();
    this.navWorkspaces.refresh();
  }

  private async saveActiveTab(): Promise<void> {
    switch (this.activeTab()) {
      case 0:
        await this.saveWorkspace();
        return;
      case 1:
        const stageWorkspaceId = await this.saveWorkspace();
        if (stageWorkspaceId === null) {
          return;
        }
        if (stageWorkspaceId !== null) {
          this.stageForm.patchValue({ workspace_id: String(stageWorkspaceId) });
        }
        await this.saveStage();
        return;
      case 2:
        const actionWorkspaceId = await this.saveWorkspace();
        if (actionWorkspaceId === null) {
          return;
        }
        if (actionWorkspaceId !== null) {
          this.stageForm.patchValue({ workspace_id: String(actionWorkspaceId) });
        }
        const stageId = await this.saveStage();
        if (stageId === null) {
          return;
        }
        if (stageId !== null) {
          this.actionForm.patchValue({ stage_id: String(stageId) });
        }
        await this.saveAction();
        return;
        case 3:
          const grantWorkspaceId = await this.saveWorkspace();
          if (grantWorkspaceId === null) {
            return;
          }

          this.stageForm.patchValue({ workspace_id: String(grantWorkspaceId) });
          this.grantForm.patchValue({ app_id: this.workspaceForm.get('app_id')?.value ?? '' });

          const grantStageId = await this.saveStage();
          if (grantStageId === null) {
            return;
          }

          this.actionForm.patchValue({ stage_id: String(grantStageId) });
          this.grantForm.patchValue({ workspace_id: this.stageForm.get('workspace_id')?.value ?? '' });
          this.grantForm.patchValue({ stage_id: String(grantStageId) });

          const grantActionId = await this.saveAction();
          if (grantActionId === null) {
            return;
          }

          this.grantForm.patchValue({
            action_id: String(grantActionId),
          });
          await this.saveGrantActions(grantActionId, true);
          return;
      default:
        return;
    }
  }

  private extractCreatedId(response: any, keys: string[]): number | null {
    const candidates = [
      response,
      response?.data,
      response?.result,
      response?.body,
      response?.payload,
    ];

    for (const candidate of candidates) {
      if (candidate == null) {
        continue;
      }

      if (typeof candidate === 'number' || typeof candidate === 'string') {
        const parsed = this.toNumber(candidate);
        if (parsed !== null) {
          return parsed;
        }
      }

      if (typeof candidate === 'object') {
        for (const key of keys) {
          const parsed = this.toNumber(candidate[key]);
          if (parsed !== null) {
            return parsed;
          }
        }
      }
    }

    return null;
  }

  async saveWorkspace(): Promise<number | null> {
    const payload = this.workspaceForm.getRawValue();
    const workspaceId = payload.workspace_id;

    const request = {
      appId: Number(payload.app_id),
      workspaceId: workspaceId ? Number(workspaceId) : null,
      workspaceName: payload.workspace_name ?? '',
      workspaceDesc: payload.workspace_desc ?? '',
      newPageIdentifier: payload.new_page_identifier ?? '',
      newPageSelector: payload.new_page_selector ?? '',
      searchIdentifier: payload.search_identifier ?? '',
      searchSelector: payload.search_selector ?? '',
      homeIdentifier: payload.home_identifier ?? '',
      homeSelector: payload.home_selector ?? '',
      displayOrder: Number(payload.display_order),
      isActive: Number(payload.is_active),
    };
    if (request.workspaceId == null) {
      return await new Promise<number | null>((resolve) => {
        this.workspaceService.saveWorkspace(request).subscribe({
          next: (res) => {
            console.log('Workspace saved', res);
            const createdId = this.extractCreatedId(res, ['workspaceId', 'workspace_id', 'id']);
            if (createdId !== null) {
              this.workspaceForm.patchValue({ workspace_id: String(createdId) });
            }
            this.toastr.success('Workspace saved successfully!', 'Save Successful');
            this.refreshWorkspaceData();
            resolve(createdId);
          },
          error: (err) => {
            console.error('Workspace save failed', err);
            this.toastr.error(err, 'Error');
            resolve(null);
          },
        });
      });
    } else {
      return await new Promise<number | null>((resolve) => {
        this.workspaceService.updateWorkspace(request).subscribe({
          next: (res) => {
            console.log('Workspace updated', res);
            const updatedId = this.extractCreatedId(res, ['workspaceId', 'workspace_id', 'id']) ?? this.toNumber(request.workspaceId);
            if (updatedId !== null) {
              this.workspaceForm.patchValue({ workspace_id: String(updatedId) });
            }
            this.toastr.success('Workspace updated successfully!', 'Update Successful');
            this.refreshWorkspaceData();
            resolve(updatedId);
          },
          error: (err) => {
            console.error('Workspace update failed', err);
            this.toastr.error(err, 'Error');
            resolve(null);
          },
        });
      });
    }

  }

  async saveStage(): Promise<number | null> {
    const payload = this.stageForm.getRawValue();
    const stageId = payload.stage_id;
    console.log("this.stageColourOptions;;;", payload);
    const request = {
      workspaceId: this.toNumber(payload.workspace_id),
      stageId: stageId ? Number(stageId) : null,
      stageName: payload.stage_name || '',
      stageColour: this.toString(payload.stage_colour) || '',
      displayOrder: this.toNumber(payload.display_order),
      isActive: this.toNumber(payload.is_active),
      quickRoute: payload.quick_route || '',
    };
    if (request.stageId == null) {
      return await new Promise<number | null>((resolve) => {
        this.workspaceService.saveStage(request).subscribe({
          next: (res) => {
            console.log('Stage saved', res);
            const createdId = this.extractCreatedId(res, ['stageId', 'stage_id', 'id']);
            if (createdId !== null) {
              this.stageForm.patchValue({ stage_id: String(createdId) });
            }
            this.toastr.success('Stage saved successfully!', 'Save Successful');
            this.refreshWorkspaceData();
            resolve(createdId);
          },
          error: (err) => {
            console.error('Stage save failed', err);
            this.toastr.error(err, 'Error');
            resolve(null);
          },
        });
      });
    } else {
      return await new Promise<number | null>((resolve) => {
        this.workspaceService.updateStage(request).subscribe({
          next: (res) => {
            console.log('Stage saved', res);
            const updatedId = this.extractCreatedId(res, ['stageId', 'stage_id', 'id']) ?? this.toNumber(request.stageId);
            if (updatedId !== null) {
              this.stageForm.patchValue({ stage_id: String(updatedId) });
            }
            this.toastr.success('Stage updated successfully!', 'Update Successful');
            this.refreshWorkspaceData();
            resolve(updatedId);
          },
          error: (err) => {
            console.error('Stage update failed', err);
            this.toastr.error(err, 'Error');
            resolve(null);
          },
        });
      });
    }

  }

  async saveAction(): Promise<number | null> {
    const payload = this.actionForm.getRawValue();
    const actionId = payload.action_id;
    // const actionId = rawId != null ? Number(rawId) : null;

    const request = {
      stageId: this.toNumber(payload.stage_id),
      actionId: actionId ? Number(actionId) : null,
      actionName: payload.action_name || '',
      quickRoute: payload.quick_route || '',
      actionType: payload.action_type,
      displayOrder: this.toNumber(payload.display_order),
      isActive: this.toNumber(payload.is_active),
    };

    if (request.actionId == null) {
      return await new Promise<number | null>((resolve) => {
        this.workspaceService.saveAction(request).subscribe({
          next: (res) => {
            const createdId = this.extractCreatedId(res, ['actionId', 'action_id', 'id']);
            if (createdId !== null) {
              this.actionForm.patchValue({ action_id: String(createdId) });
            }
            this.toastr.success('Action saved successfully!', 'Save Successful');
            this.refreshWorkspaceData();
            resolve(createdId);
          },
          error: (err) => {
            this.toastr.error(err, 'Error');
            resolve(null);
          },
        });
      });
    } else {
      return await new Promise<number | null>((resolve) => {
        this.workspaceService.updateAction(request).subscribe({
          next: (res) => {
            const updatedId = this.extractCreatedId(res, ['actionId', 'action_id', 'id']) ?? this.toNumber(request.actionId);
            if (updatedId !== null) {
              this.actionForm.patchValue({ action_id: String(updatedId) });
            }
            this.toastr.success('Action updated successfully!', 'Update Successful');
            this.refreshWorkspaceData();
            resolve(updatedId);
          },
          error: (err) => {
            this.toastr.error(err, 'Error');
            resolve(null);
          },
        });
      });
    }

  }

  async saveGrantActions(actionIdOverride?: unknown, resetAfterSave = true): Promise<void> {
    const payload = this.grantForm.getRawValue();
    const request = {
      userId: payload.user_id || '',
      appId: this.toNumber(payload.app_id),
      workspaceId: this.toNumber(payload.workspace_id),
      stageId: this.toNumber(payload.stage_id),
      actionId: this.toNumber(actionIdOverride ?? payload.action_id),
    };

    await new Promise<void>((resolve) => {
      this.workspaceService.assignActionToUser(request).subscribe({
        next: (res) => {
          console.log('Grant saved', res);
          this.toastr.success('User assigned successfully!', 'Save Successful');
          resolve();
        },
        error: (err) => {
          console.error('Grant save failed', err);
          this.toastr.error('Failed to assign action', 'Error');
          resolve();
        },
      });
    });

    if (resetAfterSave) {
      this.resetForms();
    }
  }

  resetForms(): void {
    this.onEditMode = false;
    this.activeTab.set(0);
    this.closeEditor();
    this.showAssignedGrid = false;
    this.actiongrid = [];
    this.selectedRow = null;

    // Clear the selected application and loaded data
    this.currentAppId = '';
    this.appSelectionForm.reset({ app_id: '' }, { emitEvent: false });
    this.workspaceService.setActiveApplication(null);
    this.workspaces.set([]);
    this.stages.set([]);
    this.actions.set([]);
    this.treeNodes = [];

    this.workspaceForm.reset({
      app_id: '',
      workspace_id: '',
      workspace_name: '',
      workspace_desc: '',
      display_order: null,
      is_active: 1,
    });
    this.stageForm.reset({
      workspace_id: '',
      stage_id: '',
      stage_name: '',
      stage_colour: '',
      display_order: null,
      is_active: null,
      quick_route: '',
    });
    this.actionForm.reset({
      stage_id: '',
      action_id: '',
      action_name: '',
      quick_route: '',
      action_type: null,
      display_order: null,
      is_active: 1,
    });
    this.grantForm.reset({
      user_id: '',
      app_id: '',
      workspace_id: '',
      stage_id: '',
      action_id: '',
    });

    this.setupButtonVisibility();
    this.loadInitialData();
    this.refreshTree();
    this.refreshDropdownOptions();
  }

  private refreshWorkspaceData(): void {
    this.loadInitialData();
    if (this.hasSelectedApplication) {
      this.loadContextData();
    }
    this.refreshTree();
  }

  private loadInitialData(): void {
    this.workspaceService.getApplicationList()
      .pipe(catchError(() => of([])))
      .subscribe((apps: any) => {
        this.applications.set(this.unwrapListResponse(apps));
        this.refreshDropdownOptions();

        const preferredAppId = this.useSessionAppId
          ? this.resolveWorkspaceAppId()
          : this.toString(this.appSelectionForm.get('app_id')?.value) ?? '';

        if (preferredAppId) {
          this.syncSelectedApplication(preferredAppId, true, true);
        } else {
          this.currentAppId = '';
          this.appSelectionForm.patchValue({ app_id: '' }, { emitEvent: false });
          this.workspaceService.setActiveApplication(null);
        }

        if (this.useSessionAppId && this.currentAppId) {
          this.loadContextData();
        }

        this.refreshTree();
      });
  }

  private unwrapListResponse(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (Array.isArray(response?.result)) {
      return response.result;
    }
    return [];
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  private toString(value: unknown): string | null {
    return value != null ? String(value) : null;
  }

  private getStoredWorkspaceAppId(): string {
    return sessionStorage.getItem('appId')?.trim() ?? '';
  }

  private resolveWorkspaceAppId(appId?: unknown): string {
    if (this.useSessionAppId) {
      return this.getStoredWorkspaceAppId()
        || this.toString(appId)
        || this.toString(environment.appId)
        || '';
    }

    return this.toString(appId)
      || this.toString(this.appSelectionForm.get('app_id')?.value)
      || this.currentAppId
      || this.toString(environment.appId)
      || '';
  }

  private normalizeYesNo(value: unknown): string {
    const text = String(value ?? '').trim().toUpperCase();
    if (text === 'Y' || text === 'YES' || text === 'TRUE' || text === '1') {
      return 'Y';
    }
    return 'N';
  }

  private refreshTree(): void {
    this.treeNodes = this.buildWorkspaceTree();
  }

  private loadContextData(): void {
    this.workspaceService.getAllWorkspace()
      .pipe(catchError(() => of([])))
      .subscribe((resp: any) => {
        this.workspaces.set(this.unwrapListResponse(resp));
        this.refreshDropdownOptions();
        this.refreshTree();
      });

    this.workspaceService.getAllStage()
      .pipe(catchError(() => of([])))
      .subscribe((resp: any) => {
        this.stages.set(this.unwrapListResponse(resp));
        this.refreshDropdownOptions();
        this.refreshTree();
      });

    this.workspaceService.getAllAction()
      .pipe(catchError(() => of([])))
      .subscribe((resp: any) => {
        this.actions.set(this.unwrapListResponse(resp));
        this.refreshDropdownOptions();
        this.refreshTree();
      });

    this.workspaceService.getAllStageColour()
      .pipe(
        map((resp: any) => this.unwrapListResponse(resp)),
        map((list: any[]) =>
          list.map(item => ({
            key: item.cssClassName,
            value: item.colorName
          }))
        ),
        catchError(() => of([]))
      )
      .subscribe(mapped => {
        this.stageColourOptions = mapped;
      });
  }

  private syncSelectedApplication(appId: unknown, fallbackToFirst = false, reload = false): void {
    const previousAppId = this.currentAppId;
    const resolvedAppId = this.resolveWorkspaceAppId(appId);
    const selectedApp = this.applications().find(app => String(app.appId) === resolvedAppId) ?? null;

    if (selectedApp) {
      this.currentAppId = String(selectedApp.appId);
      this.appSelectionForm.patchValue({ app_id: this.currentAppId }, { emitEvent: false });
      this.workspaceService.setActiveApplication(selectedApp);
      if (reload && previousAppId !== this.currentAppId) {
        this.loadContextData();
      }
      return;
    }

    if (!fallbackToFirst) {
      return;
    }

    const fallbackApp = this.applications().find(app => String(app.appId) === String(environment.appId))
      ?? this.applications()[0]
      ?? null;

    if (!fallbackApp) {
      this.currentAppId = '';
      this.appSelectionForm.patchValue({ app_id: '' }, { emitEvent: false });
      this.workspaceService.setActiveApplication(null);
      return;
    }

    this.currentAppId = String(fallbackApp.appId);
    this.appSelectionForm.patchValue({ app_id: this.currentAppId }, { emitEvent: false });
    this.workspaceService.setActiveApplication(fallbackApp);
    if (reload && previousAppId !== this.currentAppId) {
      this.loadContextData();
    }
  }

  get hasSelectedApplication(): boolean {
    return !!this.currentAppId;
  }

  get currentApplicationName(): string {
    return this.applications().find(app => String(app.appId) === String(this.currentAppId))?.appName
      ?? (this.useSessionAppId ? 'Session Application' : 'Selected Application');
  }

  private buildWorkspaceTree(): WorkspaceTreeNode[] {
    const appId = this.toNumber(this.currentAppId);
    const workspaceNodes = this.workspaces()
      .filter(workspace => appId == null || this.toNumber(workspace.appId ?? workspace.app_id) === appId)
      .map(workspace => {
      const workspaceId = String(workspace.workspaceId ?? workspace.workspace_id ?? '');
      const stageNodes = this.stages()
        .filter(stage => String(stage.workspaceId ?? stage.workspace_id ?? '') === workspaceId)
        .map(stage => {
          const stageId = String(stage.stageId ?? stage.stage_id ?? '');
          const actionNodes = this.actions()
            .filter(action => String(action.stageId ?? action.stage_id ?? '') === stageId)
            .map(action => ({
              id: String(action.actionId ?? action.action_id ?? ''),
              type: 'action' as const,
              title: `${action.actionName ?? action.action_name ?? ''}`,
              subtitle: action.quickRoute ?? action.quick_route ?? '',
              expanded: false,
              data: action,
              children: [],
            }));

          return {
            id: stageId,
            type: 'stage' as const,
            title: `${stage.stageName ?? stage.stage_name ?? ''}`,
            subtitle: stage.quickRoute ?? stage.quick_route ?? '',
            expanded: false,
            data: stage,
            children: actionNodes,
          };
        });

      return {
        id: workspaceId,
        type: 'workspace' as const,
        title: `${workspace.workspaceName ?? workspace.workspace_name ?? ''}`,
        subtitle: workspace.workspaceDesc ?? workspace.workspace_desc ?? '',
        expanded: false,
        data: workspace,
        children: stageNodes,
      };
      });

    return workspaceNodes;
  }

  toggleNode(node: WorkspaceTreeNode): void {
    node.expanded = !node.expanded;
  }

  expandTree(): void {
    this.walkTree(this.treeNodes, node => node.expanded = true);
  }

  collapseTree(): void {
    this.walkTree(this.treeNodes, node => node.expanded = false);
  }

  private walkTree(nodes: WorkspaceTreeNode[], fn: (node: WorkspaceTreeNode) => void): void {
    nodes.forEach(node => {
      fn(node);
      if (node.children?.length) {
        this.walkTree(node.children, fn);
      }
    });
  }

  private findParentNode(childId: string, parentType: TreeNodeType): WorkspaceTreeNode | null {
    for (const workspace of this.treeNodes) {
      if (parentType === 'workspace' && workspace.children.some(stage => stage.id === childId)) {
        return workspace;
      }
      for (const stage of workspace.children ?? []) {
        if (parentType === 'stage' && stage.children.some(action => action.id === childId)) {
          return stage;
        }
      }
    }
    return null;
  }

  openWorkspaceEditor(node?: WorkspaceTreeNode): void {
    this.editorComponent = WorkspaceEditorModal;
    this.editorTitle = node ? 'Edit Workspace' : 'Create Workspace';

    if (node) {
      const workspaceId = this.toNumber(node.data?.workspaceId ?? node.data?.workspace_id);
      if (workspaceId != null) {
        this.workspaceService.getWorkspaceById(workspaceId).subscribe({
          next: (res) => {
            const data = res?.data ?? res?.result ?? res ?? {};
            this.editorComponentData = {
              mode: 'edit',
              initialData: data,
            };
            this.isEditorVisible = true;
          },
          error: () => {
            this.editorComponentData = {
              mode: 'edit',
              initialData: node.data,
            };
            this.isEditorVisible = true;
          },
        });
        return;
      }
    }

    this.editorComponentData = {
      mode: 'add',
      initialData: { app_id: this.currentAppId, is_active: 1 },
    };
    this.isEditorVisible = true;
  }

  openStageEditor(node?: WorkspaceTreeNode, parentNode?: WorkspaceTreeNode): void {
    this.editorComponent = StageEditorModal;
    this.editorTitle = node ? 'Edit Stage' : 'Create Stage';
    this.pendingWorkspaceNode = parentNode ?? (node?.type === 'stage' ? this.findParentNode(node.id, 'workspace') : null);
    this.editorComponentData = {
      mode: node ? 'edit' : 'add',
      initialData: node?.data ?? { workspace_id: this.pendingWorkspaceNode?.id ?? parentNode?.id ?? '', is_active: 1 },
      stageColourOptions: this.stageColourOptions,
      allowBatch: !node,
      existingRows: [],
    };
    this.isEditorVisible = true;
  }

  openActionEditor(node?: WorkspaceTreeNode, parentNode?: WorkspaceTreeNode): void {
    this.editorComponent = ActionEditorModal;
    this.editorTitle = node ? 'Edit Action' : 'Create Action';
    this.pendingStageNode = parentNode ?? (node?.type === 'action' ? this.findParentNode(node.id, 'stage') : null);
    this.editorComponentData = {
      mode: node ? 'edit' : 'add',
      initialData: node?.data ?? { stage_id: this.pendingStageNode?.id ?? parentNode?.id ?? '', is_active: 1 },
      allowBatch: !node,
      existingRows: [],
    };
    this.isEditorVisible = true;
  }

  closeEditor(): void {
    this.isEditorVisible = false;
    this.editorComponent = undefined;
    this.editorComponentData = {};
    this.editorTitle = '';
    this.pendingWorkspaceNode = null;
    this.pendingStageNode = null;
  }

  onEditorResult(result: any): void {
    if (!result) {
      return;
    }
    if (result.workspace) {
      const payload = result.workspace;
      const currentColumns: WorkspaceEditorColumnRow[] = Array.isArray(result.columns) ? result.columns : [];
      const originalColumns: WorkspaceEditorColumnRow[] = Array.isArray(result.originalColumns) ? result.originalColumns : [];
      const request = {
        appId: Number(this.currentAppId),
        workspaceId: payload.workspace_id ? Number(payload.workspace_id) : null,
        workspaceName: payload.workspace_name ?? '',
        workspaceDesc: payload.workspace_desc ?? '',
        newPageIdentifiers: Array.isArray(result.newPageIdentifiers) ? result.newPageIdentifiers : [],
        searchIdentifier: payload.search_identifier ?? '',
        searchSelector: payload.search_selector ?? '',
        homeIdentifier: payload.home_identifier ?? '',
        homeSelector: payload.home_selector ?? '',
        displayOrder: this.toNumber(payload.display_order),
        isActive: this.toNumber(payload.is_active),
      };
      const action$ = request.workspaceId == null
        ? this.workspaceService.saveWorkspace(request)
        : this.workspaceService.updateWorkspace(request);
      action$.subscribe({
        next: async (res) => {
          const workspaceId = this.extractCreatedId(res, ['workspaceId', 'workspace_id', 'id']) ?? request.workspaceId;

          /*if (workspaceId != null) {
            try {
              await this.saveWorkspaceColumnsSequentially(workspaceId, currentColumns, originalColumns);
            } catch (err) {
              console.error('Workspace column save failed', err);
              this.toastr.error('Workspace saved, but one or more columns failed to persist.', 'Partial Save');
              this.loadInitialData();
              this.refreshTree();
              this.closeEditor();
              return;
            }
          }*/

          this.toastr.success('Workspace saved successfully', 'Success');
          this.refreshWorkspaceData();
          this.afterMetaWrite();
          this.closeEditor();
        },
        error: (err) => this.toastr.error(err, 'Error'),
      });
      return;
    }

    if (Array.isArray(result.stages)) {
      void this.saveStagesSequentially(result.stages);
      return;
    }

    if (result.stage) {
      void this.saveStageRow(result.stage);
      return;
    }

    if (Array.isArray(result.actions)) {
      void this.saveActionsSequentially(result.actions);
      return;
    }

    if (result.action) {
      void this.saveActionRow(result.action);
    }
  }

  private async saveStageRow(row: StageEditorRow): Promise<void> {
    const request = {
      workspaceId: this.toNumber(row.workspace_id),
      stageId: row.stage_id ? Number(row.stage_id) : null,
      stageName: row.stage_name ?? '',
      stageColour: row.stage_colour ?? '',
      displayOrder: this.toNumber(row.display_order),
      isActive: this.toNumber(row.is_active),
      quickRoute: row.quick_route ?? '',
    };

    await new Promise<void>((resolve) => {
      const call$ = request.stageId == null
        ? this.workspaceService.saveStage(request)
        : this.workspaceService.updateStage(request);
      call$.subscribe({
        next: () => {
          this.toastr.success('Stage saved successfully', 'Success');
          resolve();
        },
        error: (err) => {
          this.toastr.error(err, 'Error');
          resolve();
        },
      });
    });

    this.refreshWorkspaceData();
    this.afterMetaWrite();
    this.closeEditor();
  }

  private async saveActionRow(row: ActionEditorRow): Promise<void> {
    const request = {
      stageId: this.toNumber(row.stage_id),
      actionId: row.action_id ? Number(row.action_id) : null,
      actionName: row.action_name ?? '',
      quickRoute: row.quick_route ?? '',
      actionType: row.action_type ?? '',
      displayOrder: this.toNumber(row.display_order),
      isActive: this.toNumber(row.is_active),
    };

    await new Promise<void>((resolve) => {
      const call$ = request.actionId == null
        ? this.workspaceService.saveAction(request)
        : this.workspaceService.updateAction(request);
      call$.subscribe({
        next: () => {
          this.toastr.success('Action saved successfully', 'Success');
          resolve();
        },
        error: (err) => {
          this.toastr.error(err, 'Error');
          resolve();
        },
      });
    });

    this.refreshWorkspaceData();
    this.afterMetaWrite();
    this.closeEditor();
  }

  /*private async saveWorkspaceColumnsSequentially(
    workspaceId: number,
    rows: WorkspaceEditorColumnRow[],
    originalRows: WorkspaceEditorColumnRow[]
  ): Promise<void> {
    const selectedRows = rows.filter(row => !!row.isSelected);
    const selectedById = new Set(
      selectedRows
        .map(row => this.toNumber(row.id))
        .filter((id): id is number => id !== null)
        .map(id => String(id))
    );

    for (const [index, row] of selectedRows.entries()) {
      const request = {
        id: this.toNumber(row.id),
        workspaceId,
        columnName: row.columnName ?? '',
        columnLabel: row.columnLabel ?? row.columnName ?? '',
        columnType: row.columnType ?? '',
        displayOrder: this.toNumber(row.displayOrder) ?? index + 1,
        isActive: this.toNumber(row.isActive) ?? 1,
        isIdColumn: this.normalizeYesNo(row.isIdColumn),
      };

      await new Promise<void>((resolve, reject) => {
        const call$ = request.id == null
          ? this.workspaceService.saveWorkspaceColumn(request)
          : this.workspaceService.updateWorkspaceColumn(request);
        call$.subscribe({
          next: () => resolve(),
          error: (err) => reject(err),
        });
      });
    }

    for (const row of originalRows) {
      const rowId = this.toNumber(row.id);
      if (rowId == null || selectedById.has(String(rowId))) {
        continue;
      }

      await new Promise<void>((resolve, reject) => {
        this.workspaceService.deleteWorkspaceColumn(rowId).subscribe({
          next: () => resolve(),
          error: (err) => reject(err),
        });
      });
    }
  }*/

  private async saveStagesSequentially(rows: StageEditorRow[]): Promise<void> {
    for (const row of rows) {
      const request = {
        workspaceId: this.toNumber(row.workspace_id),
        stageId: row.stage_id ? Number(row.stage_id) : null,
        stageName: row.stage_name ?? '',
        stageColour: row.stage_colour ?? '',
        displayOrder: this.toNumber(row.display_order),
        isActive: this.toNumber(row.is_active),
        quickRoute: row.quick_route ?? '',
      };

      await new Promise<void>((resolve) => {
        const call$ = request.stageId == null
          ? this.workspaceService.saveStage(request)
          : this.workspaceService.updateStage(request);
        call$.subscribe({
          next: () => resolve(),
          error: (err) => {
            this.toastr.error(err, 'Error');
            resolve();
          },
        });
      });
    }

    this.toastr.success('Stages saved successfully', 'Success');
    this.refreshWorkspaceData();
    this.afterMetaWrite();
    this.closeEditor();
  }

  private async saveActionsSequentially(rows: ActionEditorRow[]): Promise<void> {
    for (const row of rows) {
      const request = {
        stageId: this.toNumber(row.stage_id),
        actionId: row.action_id ? Number(row.action_id) : null,
        actionName: row.action_name ?? '',
        quickRoute: row.quick_route ?? '',
        actionType: row.action_type ?? '',
        displayOrder: this.toNumber(row.display_order),
        isActive: this.toNumber(row.is_active),
      };

      await new Promise<void>((resolve) => {
        const call$ = request.actionId == null
          ? this.workspaceService.saveAction(request)
          : this.workspaceService.updateAction(request);
        call$.subscribe({
          next: () => resolve(),
          error: (err) => {
            this.toastr.error(err, 'Error');
            resolve();
          },
        });
      });
    }

    this.toastr.success('Actions saved successfully', 'Success');
    this.refreshWorkspaceData();
    this.afterMetaWrite();
    this.closeEditor();
  }

  private refreshDropdownOptions(): void {
    this.appOptions = this.appSelectOptions();
    this.workspaceOptions = this.workspaceSelectOptions();
    this.stageOptions = this.stageSelectOptions();
    this.actionOptions = this.actionSelectOptions();
  }

  appSelectOptions(): SelectOptionsModel[] {
    return this.applications().map(app => ({
      key: String(app.appId),
      value: app.appName,
      app_id: app.appId,
      app_name: app.appName,
    }));
  }

  workspaceSelectOptions(): SelectOptionsModel[] {
    return this.workspaceItems(this.filterWorkspacesByApp(this.workspaceForm.get('app_id')?.value)).map(row => ({
      ...row,
      value: row.label,
    }));
  }

  stageSelectOptions(): SelectOptionsModel[] {
    return this.stageItems(this.filterStagesByWorkspace(this.stageForm.get('workspace_id')?.value)).map(row => ({
      ...row,
      value: row.label,
    }));
  }

  actionSelectOptions(): SelectOptionsModel[] {
    return this.actionItems(this.filterActionsByStage(this.actionForm.get('stage_id')?.value)).map(row => ({
      ...row,
      value: row.label,
    }));
  }

  onAppSelection(event: any): void {
    if (event?.selectedKey == null) {
      return;
    }

    const resolvedAppId = this.resolveWorkspaceAppId(event.selectedKey);
    this.syncSelectedApplication(resolvedAppId, false, true);
    this.onEditMode = false;
    this.setupButtonVisibility();
    this.resetAppDownstream(resolvedAppId);
    this.refreshDropdownOptions();
  }

  onHeaderAppSelection(event: any): void {
    const appId = event?.value ?? event?.selectedKey ?? this.appSelectionForm.get('app_id')?.value;
    if (appId == null || appId === '') {
      return;
    }

    this.syncSelectedApplication(appId, false, true);
    this.refreshDropdownOptions();
  }

  onWorkspaceSelection(event: any): void {
    const value = event?.selectedKey ?? '';
    const workspaceRecord = this.workspaceItems().find(row => String(row.workspace_id) === String(value))
      || this.workspaceItems().find(row => String(row.key) === String(value))
      || event?.selectedOption;

    if (value === '' || value == null) {
      this.resetWorkspaceDownstream('');
      this.refreshDropdownOptions();
      this.onEditMode = false;
      this.setupButtonVisibility();
      return;
    }

    this.resetWorkspaceDownstream(value);
    this.workspaceForm.patchValue({
      workspace_id: value,
      workspace_name: workspaceRecord?.workspace_name ?? workspaceRecord?.label ?? workspaceRecord?.value ?? '',
      workspace_desc: workspaceRecord?.workspace_desc ?? '',
      display_order: workspaceRecord?.display_order ?? null,
      new_page_identifier: workspaceRecord?.new_page_identifier ?? '',
      new_page_selector: workspaceRecord?.new_page_selector ?? '',
      search_identifier: workspaceRecord?.search_identifier ?? '',
      search_selector: workspaceRecord?.search_selector ?? '',
      home_identifier: workspaceRecord?.home_identifier ?? '',
      home_selector: workspaceRecord?.home_selector ?? '',
      is_active: workspaceRecord?.is_active ?? 0,
    });
    this.onEditMode = true;
    this.setupButtonVisibility();
    this.refreshDropdownOptions();
  }

  onStageSelection(event: any): void {
    const value = event?.selectedKey ?? '';
    const stageRecord = this.stageItems().find(row => String(row.stage_id) === String(value))
      || this.stageItems().find(row => String(row.key) === String(value))
      || event?.selectedOption;

    if (value === '' || value == null) {
      this.resetStageDownstream('');
      this.refreshDropdownOptions();
      this.onEditMode = false;
      this.setupButtonVisibility();
      return;
    }

    this.resetStageDownstream(value);
    this.stageForm.patchValue({
      stage_id: value,
      stage_name: stageRecord?.stage_name ?? stageRecord?.label ?? stageRecord?.value ?? '',
      stage_colour: stageRecord?.stage_colour ?? '',
      display_order: stageRecord?.display_order ?? null,
      is_active: stageRecord?.is_active ?? 0,
      quick_route: stageRecord?.quick_route ?? '',
    });
    this.onEditMode = true;
    this.setupButtonVisibility();
    this.refreshDropdownOptions();
  }

  onActionSelection(event: any): void {
    const value = event?.selectedKey ?? '';
    const actionRecord = this.actionItems().find(row => String(row.action_id) === String(value))
      || this.actionItems().find(row => String(row.key) === String(value))
      || event?.selectedOption;

    if (value === '' || value == null) {
      this.onEditMode = false;
      this.setupButtonVisibility();
      return;
    }

    this.onEditMode = true;
    this.setupButtonVisibility();
    this.actionForm.patchValue({
      action_id: value,
      action_name: actionRecord?.action_name ?? actionRecord?.label ?? actionRecord?.value ?? '',
      action_type: actionRecord?.action_type ?? '',
      quick_route: actionRecord?.quick_route ?? '',
      display_order: actionRecord?.display_order ?? null,
      is_active: actionRecord?.is_active ?? 0,
    });
  }

  private filterWorkspacesByApp(appId: unknown): any[] {
    const selectedAppId = this.toNumber(appId);
    const rows = this.workspaces();
    if (selectedAppId === null) {
      return rows;
    }
    return rows.filter(row => this.toNumber(row.appId ?? row.app_id) === selectedAppId);
  }

  private getWorkspaceOptionsForApp(appId: unknown): { key: any; value: string }[] {
    return this.filterWorkspacesByApp(appId).map(row => ({
      key: row.workspaceId ?? row.workspace_id,
      value: row.workspaceName ?? row.workspace_name,
    }));
  }

  private filterStagesByWorkspace(workspaceId: unknown): any[] {
    const selectedWorkspaceId = this.toNumber(workspaceId);
    const rows = this.stages();
    if (selectedWorkspaceId === null) {
      return rows;
    }
    return rows.filter(row => this.toNumber(row.workspaceId ?? row.workspace_id) === selectedWorkspaceId);
  }

  private getStageWorkspaceOptions(): { key: any; value: string }[] {
    return this.workspaces().map(row => ({
      key: row.workspaceId ?? row.workspace_id,
      value: row.workspaceName ?? row.workspace_name,
    }));
  }

  private filterActionsByStage(stageId: unknown): any[] {
    const selectedStageId = this.toNumber(stageId);
    const rows = this.actions();
    if (selectedStageId === null) {
      return rows;
    }
    return rows.filter(row => this.toNumber(row.stageId ?? row.stage_id) === selectedStageId);
  }

  private getActionWorkspaceOptions(appId: unknown): { key: any; value: string }[] {
    return this.filterWorkspacesByApp(appId).map(row => ({
      key: row.workspaceId ?? row.workspace_id,
      value: row.workspaceName ?? row.workspace_name,
    }));
  }

  private getActionStageOptions(workspaceId: unknown): { key: any; value: string }[] {
    return this.filterStagesByWorkspace(workspaceId).map(row => ({
      key: row.stageId ?? row.stage_id,
      value: row.stageName ?? row.stage_name,
    }));
  }

  workspaceItems(rows: any[] = this.workspaces()): any[] {
    return rows.map((row) => ({
      key: String(row.workspaceId ?? row.workspace_id),
      label: row.workspaceName ?? row.workspace_name,
      value: row.workspaceName ?? row.workspace_name,
      app_id: row.appId ?? row.app_id,
      workspace_id: row.workspaceId ?? row.workspace_id,
      workspace_name: row.workspaceName ?? row.workspace_name,
      workspace_desc: row.workspaceDesc ?? row.workspace_desc,
      display_order: row.displayOrder ?? row.display_order,
      new_page_identifier: row.newPageIdentifier ?? row.new_page_identifier,
      new_page_selector: row.newPageSelector ?? row.new_page_selector,
      search_identifier: row.searchIdentifier ?? row.search_identifier,
      search_selector: row.searchSelector ?? row.search_selector,
      home_identifier: row.homeIdentifier ?? row.home_identifier,
      home_selector: row.homeSelector ?? row.home_selector,
      is_active: row.isActive ?? row.is_active,
    }));
  }

  stageItems(rows: any[] = this.stages()): any[] {
    return rows.map((row) => ({
      key: String(row.stageId ?? row.stage_id),
      label: row.stageName ?? row.stage_name,
      value: row.stageName ?? row.stage_name,
      workspace_id: row.workspaceId ?? row.workspace_id,
      stage_id: row.stageId ?? row.stage_id,
      stage_name: row.stageName ?? row.stage_name,
      stage_colour: row.stageColour ?? row.stage_colour,
      display_order: row.displayOrder ?? row.display_order,
      is_active: row.isActive ?? row.is_active,
      quick_route: row.quickRoute ?? row.quick_route,
    }));
  }

  actionItems(rows: any[] = this.actions()): any[] {
    return rows.map((row) => ({
      key: String(row.actionId ?? row.action_id),
      label: row.actionName ?? row.action_name,
      value: row.actionName ?? row.action_name,
      stage_id: row.stageId ?? row.stage_id,
      action_id: row.actionId ?? row.action_id,
      action_name: row.actionName ?? row.action_name,
      quick_route: row.quickRoute ?? row.quick_route,
      action_type: row.actionType ?? row.action_type,
      display_order: row.displayOrder ?? row.display_order,
      is_active: row.isActive ?? row.is_active,
    }));
  }

  openLookup(field: LookupField): void {
    this.activeLookupField = field;
    this.isLookupVisible.set(true);

    switch (field) {
      case 'app_id': {
        this.lookupTitle.set('Select App ID');
        const appItems = this.applications().map(app => ({
          key: String(app.appId),
          label: app.appName,
          app_id: app.appId,
          app_name: app.appName,
        }));
        this.modalComponent = WorkspaceModal;
        this.modalComponentData = {
          title: 'Select App ID',
          subtitle: 'Pick an app record from the API-backed grid.',
          items: appItems,
          selectedColumns: ['app_id', 'app_name'],
          customColumnNames: {app_id: 'App ID', app_name: 'App Name'},
        };
        return;
      }
      case 'workspace_id': {
        this.lookupTitle.set('Select Workspace');
        const workspaceScope =
          this.activeTab() === 0
            ? this.filterWorkspacesByApp(this.workspaceForm.get('app_id')?.value)
            : this.activeTab() === 3
            ? this.filterWorkspacesByApp(this.grantForm.get('app_id')?.value)
            : this.workspaces();
        this.modalComponent = WorkspaceModal;
        this.modalComponentData = {
          title: 'Select Workspace',
          subtitle:
            this.activeTab() === 0
              ? 'Filtered by selected App ID.'
              : this.activeTab() === 1
              ? 'Select an App, then search to filter workspaces.'
              : this.activeTab() === 3
              ? 'Filtered by selected App ID in the grant tab.'
              : 'Choose any workspace.',
          items: this.workspaceItems(workspaceScope),
          appOptions: this.applications().map(app => ({ key: app.appId, value: `${app.appId}-${app.appName}` })),
          showFilters: this.activeTab() === 1,
          showAppFilter: this.activeTab() === 1,
          showSearchButton: this.activeTab() === 1,
          onAppChange: (appId: any) => this.syncSelectedApplication(appId, false, true),
          searchCallback: async (filters: any) => {
            if (this.activeTab() === 1) {
              const appId = filters?.app_id;
              if (appId) {
                const result = await new Promise<any[]>((resolve, reject) => {
                  this.workspaceService.getWorkspaceByAppId(Number(appId)).pipe(catchError((err) => {
                    reject(err);
                    return of([]);
                  })).subscribe(res => resolve(this.unwrapListResponse(res)));
                });
                return result;
              }
              return this.unwrapListResponse(await Promise.resolve(this.workspaces()));
            }
            return this.workspaceItems(workspaceScope);
          },
          selectedColumns: ['workspace_id', 'workspace_name','display_order'],
          customColumnNames: {workspace_id: 'Workspace ID', workspace_name: 'Workspace Name', display_order:'Display Order'},
        };
        return;
      }
      case 'stage_id': {
        this.lookupTitle.set('Select Stage');
        const stageScope =
          this.activeTab() === 1
            ? this.filterStagesByWorkspace(this.stageForm.get('workspace_id')?.value)
            : this.activeTab() === 3
            ? this.filterStagesByWorkspace(this.grantForm.get('workspace_id')?.value)
            : this.stages();
        this.modalComponent = StageModal;
        this.modalComponentData = {
          title: 'Select Stage',
          subtitle:
            this.activeTab() === 1
              ? 'Filtered by selected Workspace ID.'
              : this.activeTab() === 2
              ? 'Filtered by selected Workspace ID from the previous step.'
              : this.activeTab() === 3
              ? 'Filtered by selected Workspace ID in the grant tab.'
              : 'Choose any stage.',
          items: this.stageItems(stageScope),
          workspaceId: this.activeTab() === 1
            ? this.workspaceForm.get('workspace_id')?.value
            : this.activeTab() === 2
              ? this.workspaceForm.get('workspace_id')?.value
              : this.workspaceForm.get('workspace_id')?.value,
          selectedColumns: ['stage_id', 'stage_name', 'display_order'],
          customColumnNames: {
            stage_id: 'Stage ID',
            stage_name: 'Stage Name',
            display_order:'Display Order'
          },
        };
        return;
      }
      case 'action_id': {
        this.lookupTitle.set('Select Action');
        const actionScope =
          this.activeTab() === 0
            ? this.filterActionsByStage(this.actionForm.get('stage_id')?.value)
            : this.activeTab() === 1
            ? this.filterActionsByStage(this.grantForm.get('stage_id')?.value)
            : this.actions();
        this.modalComponent = ActionModal;
        this.modalComponentData = {
          title: 'Select Action',
          subtitle:
            this.activeTab() === 0
              ? 'Filtered by selected Stage ID from the previous step.'
              : this.activeTab() === 1
              ? 'Use App, Workspace, and Stage to search actions.'
              : 'Choose any action.',
          items: this.actionItems(actionScope),
          selectedColumns: ['action_id', 'action_name','display_order'],
          customColumnNames: {
            action_id: 'Action ID',
            action_name: 'Action Name',
            display_order:'Display Order'
          },
          showFilters: this.activeTab() === 1,
          showAppFilter: this.activeTab() === 1,
          showWorkspaceFilter: this.activeTab() === 1,
          showStageFilter: this.activeTab() === 1,
          showSearchButton: this.activeTab() === 1,
          showSelectionAction: this.activeTab() === 1,
          appOptions: this.applications().map(app => ({ key: app.appId, value: `${app.appId}-${app.appName}` })),
          workspaceOptions: this.getActionWorkspaceOptions(this.grantForm.get('app_id')?.value),
          stageOptions: this.getActionStageOptions(this.grantForm.get('workspace_id')?.value),
          appId: this.currentAppId,
          onAppChange: (appId: any) => {
            this.syncSelectedApplication(appId, false, true);
            return this.getActionWorkspaceOptions(appId);
          },
          onWorkspaceChange: (workspaceId: any) => this.getActionStageOptions(workspaceId),
          onStageChange: (_stageId: any) => [],
          stageId: this.activeTab() === 2
            ? this.stageForm.get('stage_id')?.value
            : this.activeTab() === 1
              ? this.stageForm.get('stage_id')?.value
              : '',
          userId:this.activeTab() === 1
            ? this.grantForm.get('user_id')?.value
            : ''
        };
        return;
      }
      case 'user_id': {
        this.lookupTitle.set('Select User');
        this.modalComponent = UserListModal;
        /* this.modalComponentData = {
          title: 'Select User',
          subtitle: 'Pick a dummy user for the grant screen.',
          items: [
            {key: 'USR-001', label: 'Demo User One', user_id: 'USR-001'},
            {key: 'USR-002', label: 'Demo User Two', user_id: 'USR-002'},
            {key: 'USR-003', label: 'Demo User Three', user_id: 'USR-003'},
          ],
          selectedColumns: ['user_id', 'label'],
          customColumnNames: {user_id: 'User ID', label: 'User Name'},
        };*/
        return;
      }
    }
  }

  onLookupResult(result: any): void {
    console.log("user id result", result);
    if (!this.activeLookupField || !result) {
      this.isLookupVisible.set(false);
      return;
    }

    if (this.activeLookupField === 'action_id' && this.activeTab() === 1 && Array.isArray(result)) {
      const selectedActions = result
        .map((row: any) => ({
          key: String(row.action_id ?? row.actionId ?? ''),
          label: row.action_name ?? row.actionName ?? '',
          action_id: row.action_id ?? row.actionId,
          action_name: row.action_name ?? row.actionName,
          stage_id: row.stage_id ?? row.stageId,
          display_order: row.display_order ?? row.displayOrder,
          is_active: row.is_active ?? row.isActive,
          quick_route: row.quick_route ?? row.quickRoute,
        }))
        .filter((row: any) => row.action_id != null && row.action_id !== '');

      this.actiongrid = selectedActions;
      this.showAssignedGrid = true;

      const userId = this.grantForm.get('user_id')?.value;
      const appId = this.grantForm.get('app_id')?.value;
      const workspaceId = this.grantForm.get('workspace_id')?.value;
      const stageId = this.grantForm.get('stage_id')?.value;

      void (async () => {
        for (const action of selectedActions) {
          await this.saveGrantActions(action.action_id, false);
        }

        // Batch-assign doesn't route through saveCurrentTab, so invalidate here —
        // once, after the loop, not per assignment.
        this.afterMetaWrite();

        this.grantForm.patchValue({
          user_id: userId,
          app_id: appId,
          workspace_id: workspaceId,
          stage_id: stageId,
          action_id: '',
        });

        if (userId) {
          this.showActionList(String(userId));
        }
      })();

      this.isLookupVisible.set(false);
      this.activeLookupField = null;
      return;
    }

    const value = result.key ?? result.value ?? result.id ?? result.userNm ?? '';
    const label = result.label ?? result.label ?? '';

    switch (this.activeLookupField) {
      case 'app_id':
        const resolvedAppId = this.resolveWorkspaceAppId(value);
        this.syncSelectedApplication(resolvedAppId, false, true);
        if (this.activeTab() === 0) {
          // this.workspaceForm.patchValue({app_id: resolvedAppId});
          this.onEditMode=false;
          this.setupButtonVisibility();
          this.resetAppDownstream(resolvedAppId);
        }
        if (this.activeTab() === 3) {
          this.grantForm.patchValue({app_id: resolvedAppId});
          this.resetGrantFromApp();
        }
        break;
      case 'workspace_id':
        if (this.activeTab() === 0) {
          this.workspaceForm.patchValue({
            workspace_id: value,
            workspace_name: result.workspace_name,
            workspace_desc: result.workspace_desc,
            display_order: result.display_order,
            new_page_identifier: result.new_page_identifier,
            new_page_selector: result.new_page_selector,
            search_identifier: result.search_identifier,
            search_selector: result.search_selector,
            home_identifier: result.home_identifier,
            home_selector: result.home_selector,
            is_active: result.is_active,
          });
          this.onEditMode=true;
          this.setupButtonVisibility();
        }

        if (this.activeTab() === 1) {
          // this.stageForm.patchValue({workspace_id: value});
          this.onEditMode=false;
          this.setupButtonVisibility();
          this.resetWorkspaceDownstream(value);
        }
        if (this.activeTab() === 3) {
          this.onEditMode=false;
          this.setupButtonVisibility();
          this.grantForm.patchValue({ workspace_id: value });
          this.resetGrantFromWorkspace();
        }
        break;
      case 'stage_id':
        if (this.activeTab() === 1) {
          this.stageForm.patchValue({
            stage_id: value,
            stage_name: result.stage_name,
            stage_colour: result.stage_colour,
            display_order: result.display_order,
            is_active: result.is_active,
            quick_route: result.quick_route,
          });

          this.onEditMode = true;
          this.setupButtonVisibility();
        }

        if (this.activeTab() === 2) {
          this.onEditMode=false;
          this.setupButtonVisibility();
          this.resetStageDownstream(value);
        }

        if (this.activeTab() === 3) {
          this.onEditMode=false;
          this.setupButtonVisibility();
          this.grantForm.patchValue({ stage_id: value });
          this.grantForm.patchValue({ action_id: '' });
        }
        break;
      case 'action_id':
        if (this.activeTab() === 2) {
          this.actionForm.patchValue({
            action_id: value,
            action_name: result.action_name,
            action_type: result.action_type,
            quick_route: result.quick_route,
            display_order: result.display_order,
            is_active: result.is_active,
          });
          this.stageForm.patchValue({
            stage_name: label,
          });
          this.onEditMode=true;
          this.setupButtonVisibility();
        }
        if (this.activeTab() === 3) {
          this.onEditMode=false;
          this.setupButtonVisibility();
          this.grantForm.patchValue({action_id: value});
        }
        break;
      case 'user_id':
        console.log("user id", value);
        this.grantForm.patchValue({user_id: value});
        this.showActionList(value);
        break;
    }

    this.isLookupVisible.set(false);
    this.activeLookupField = null;
  }

  onUserIdChange(userId: any): void {

    this.workspaceService.getUserProfileById(userId).subscribe({
      next: (data) => {
        if (!data) {
          this.toastr.warning(
            'No user found with this user name.',
            'Warning'
          );
          // this.grantForm.patchValue({
          //   user_id: ''
          // })
          return;
        }

        this.user = data;
        this.toastr.success(
          'User Retrieved Successfully.',
          'Success'
        );
        this.grantForm.patchValue({
          user_id: data.userNm
        });
        this.showActionList(data.userNm);
      },
      error: () => {
        this.toastr.warning(
          'No user found with this user name.',
          'Warning'
        );
      }
    });
  }
  showActionList(userName: string) {
    this.workspaceService.getActionByUserId(userName).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.showAssignedGrid = false;
          this.toastr.warning('No action has been assigned yet.', 'Warning');
          return;
        }

        this.actiongrid = this.enrichActionGrid(data);
        this.showAssignedGrid = true;
      },
      error: (err) => console.error('Error Fetching Data', err),
    });
  }
  private enrichActionGrid(data: any[]): any[] {
    const apps = this.applications();
    const workspaces = this.workspaces();
    const stages = this.stages();
    const actions = this.actions();

    return data.map(item => ({
      ...item,

      appName: apps.find(a => a.appId === item.appId)?.appName ?? '',
      workspaceName: workspaces.find(w => w.workspaceId === item.workspaceId)?.workspaceName ?? '',
      stageName: stages.find(s => s.stageId === item.stageId)?.stageName ?? '',
      actionName: actions.find(a => a.actionId === item.actionId)?.actionName ?? '',
    }));
  }
  userActionUnassign(rowJson: string): void {
    console.log('deleteComponent at click time:', this.deleteComponent);

    const selectedData = JSON.parse(rowJson);

    this.performDelete(selectedData);
    /*this.deleteComponent?.deleteFromGrid().subscribe(result => {
      console.log('DIALOG RESULT:', result);

      if (result) {
        this.performDelete(selectedData);
      }
    });*/
  }

  performDelete(row: any): void {
    console.log('Confirmed delete:', row);
    const request = {
      userId: row.userId ?? '',
      appId: Number(row.appId),
      workspaceId: Number(row.workspaceId),
      stageId: Number(row.stageId),
      actionId: Number(row.actionId),
    };
    console.log("request CLICKED", request);
    this.workspaceService.unassignActionFromUser(request).subscribe({
      next: (res) => {
        console.log('Grant saved', res);
        this.toastr.success('User unassigned successfully!', 'Remove Successful');
        // Removing an assignment changes what the boards resolve.
        this.afterMetaWrite();
        const userId = this.grantForm.get('user_id')?.value ?? row.userId;
        if (userId) {
          this.showActionList(String(userId));
        } else {
          this.showAssignedGrid = false;
          this.actiongrid = [];
        }
      },
      error: (err) => this.toastr.error(err, 'Error'),
    });
  }

  onLookupClosed(): void {
    this.isLookupVisible.set(false);
    this.activeLookupField = null;
  }
  private resetAppDownstream(appId: any): void {
    this.workspaceForm.patchValue({
      app_id: appId,
      workspace_id: '',
      workspace_name: '',
      workspace_desc: '',
      new_page_identifier: '',
      new_page_selector: '',
      search_identifier: '',
      search_selector: '',
      home_identifier: '',
      home_selector: '',
      display_order: null,
      is_active: 0,
    });

    this.stageForm.reset({
      workspace_id: '',
      stage_id: '',
      stage_name: '',
      stage_colour: '',
      display_order: null,
      is_active: 0,
      quick_route: '',
    });

    this.actionForm.reset({
      stage_id: '',
      action_id: '',
      action_name: '',
      quick_route: '',
      action_type: null,
      display_order: null,
      is_active: 0,
    });
  }

  private resetWorkspaceDownstream(workspaceId: any): void {
    this.stageForm.patchValue({
      workspace_id: workspaceId,
      stage_id: '',
      stage_name: '',
      stage_colour: '',
      display_order: null,
      is_active: 1,
      quick_route: '',
    });

    this.actionForm.reset({
      stage_id: '',
      action_id: '',
      action_name: '',
      quick_route: '',
      action_type: null,
      display_order: null,
      is_active: 1,
    });
  }

  private resetStageDownstream(stageId: any): void {
    this.actionForm.patchValue({
      stage_id: stageId,
      action_id: '',
      action_name: '',
      quick_route: '',
      action_type: null,
      display_order: null,
      is_active: 0,
    });
  }

  private resetGrantFromApp(): void {
    this.grantForm.patchValue({
      workspace_id: '',
      stage_id: '',
      action_id: '',
    });
  }

  private resetGrantFromWorkspace(): void {
    this.grantForm.patchValue({
      stage_id: '',
      action_id: '',
    });
  }

  setupButtonVisibility(): void {
    if (this.onEditMode) {
      BUTTON_VISIBILITY.set({
        save: false,
        saveNext: false,
        update: true,
        updateNext: false,
        view: false,
        delete: false,
        exit: true,
        reset: true,
        customAction: false,
      });
    } else {
      BUTTON_VISIBILITY.set({
        save: false,
        saveNext: false,
        update: false,
        updateNext: false,
        view: false,
        delete: false,
        exit: true,
        reset: true,
        customAction: false,
      });
    }
  }
}
