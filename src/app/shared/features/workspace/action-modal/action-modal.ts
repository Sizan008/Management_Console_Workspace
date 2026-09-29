import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { WorkspaceService } from '../workspace-service';
import {forkJoin} from 'rxjs';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {GenericButton} from '../../../common-components/generic-component-type/generic-button/generic-button';
import {InputSelectOptionField} from '../../../common-components/input-types/input-select-option-field/input-select-option-field';

@Component({
  selector: 'app-action-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericDataGrid, GenericButton, InputSelectOptionField],
  templateUrl: './action-modal.html',
  styleUrl: './action-modal.scss',
})
export class ActionModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();
  @ViewChild('actionGrid') actionGrid?: GenericDataGrid;

  private readonly fb = inject(FormBuilder);
  workspaceService = inject(WorkspaceService);

  filterForm = this.fb.group({
    app_id: [{ value: null as number | null, disabled: true }],
    workspace_id: [''],
    stage_id: [''],
  });

  rows: any[] = [];
  appOptions: { key: any; value: string }[] = [];
  workspaceOptions: { key: any; value: string }[] = [];
  stageOptions: { key: any; value: string }[] = [];
  showFilters = false;
  showAppFilter = false;
  showWorkspaceFilter = false;
  showStageFilter = false;
  showSearchButton = false;
  showSelectionAction = false;
  initialStageId: any = '';
  selectedUserId: any = '';
  selectedColumns: string[] = ['key', 'label'];
  customColumnNames: Record<string, string> = { key: 'Code', label: 'Name' };

  ngOnInit(): void {
    this.rows = this.modalComponentData?.items || [];
    this.appOptions = this.modalComponentData?.appOptions || [];
    this.workspaceOptions = this.modalComponentData?.workspaceOptions || [];
    this.stageOptions = this.modalComponentData?.stageOptions || [];
    this.showFilters = !!this.modalComponentData?.showFilters;
    this.showAppFilter = !!this.modalComponentData?.showAppFilter;
    this.showWorkspaceFilter = !!this.modalComponentData?.showWorkspaceFilter;
    this.showStageFilter = !!this.modalComponentData?.showStageFilter;
    this.showSearchButton = !!this.modalComponentData?.showSearchButton;
    this.showSelectionAction = !!this.modalComponentData?.showSelectionAction;
    this.initialStageId = this.modalComponentData?.stageId ?? this.modalComponentData?.initialStageId ?? '';
    this.selectedUserId = this.modalComponentData?.userId ?? this.modalComponentData?.selectedUserId ?? '';
    if (this.modalComponentData?.selectedColumns) {
      this.selectedColumns = this.modalComponentData.selectedColumns;
    }
    if (this.modalComponentData?.customColumnNames) {
      this.customColumnNames = this.modalComponentData.customColumnNames;
    }

    if (this.initialStageId) {
      this.filterForm.patchValue({ stage_id: String(this.initialStageId) });
      this.loadActionsByStage(this.initialStageId);
    }
    console.log("modalComponentData...",this.modalComponentData);
    console.log('appId', this.modalComponentData?.appId);
    console.log('appOptions', this.appOptions);
    this.filterForm.patchValue({
      app_id: Number(this.modalComponentData?.appId)
    });
    this.onAppChange({
      selectedKey: this.modalComponentData?.appId
    });
  }

  onAppChange(event: any): void {
    if (typeof this.modalComponentData?.onAppChange === 'function') {
      this.workspaceOptions = this.modalComponentData.onAppChange(event.selectedKey) || [];
      this.stageOptions = [];
      this.filterForm.patchValue({ workspace_id: '', stage_id: '' });
    }
  }

  onWorkspaceChange(event: any): void {
    if (typeof this.modalComponentData?.onWorkspaceChange === 'function') {
      this.stageOptions = this.modalComponentData.onWorkspaceChange(event.selectedKey) || [];
      this.filterForm.patchValue({ stage_id: '' });
    }
  }

  onStageChange(event: any): void {
    if (typeof this.modalComponentData?.onStageChange === 'function') {
      this.modalComponentData.onStageChange(event.selectedKey);
    }
  }

  onSearch(): void {
    const filters = this.filterForm.getRawValue();
    if (filters) {
      this.loadActionsByStage(filters);
      return;
    }

    this.rows = [];
  }

  private loadActionsByStage(filters: any): void {

    console.log("filters...",filters);
    const mapActions = (data: any[]) => {
      this.rows = data.map((r: any) => ({
        action_id: r.action_id ?? r.actionId,
        action_name: r.action_name ?? r.actionName,
        stage_id: r.stage_id ?? r.stageId,
        quick_route: r.quick_route ?? r.quickRoute,
        action_type: r.action_type ?? r.actionType,
        display_order: r.display_order ?? r.displayOrder,
      }));
    };

    const extractData = (res: any): any[] =>
      Array.isArray(res) ? res :
        Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.result) ? res.result :
            [];

    if (this.selectedUserId) {
      forkJoin({
        allActions: this.workspaceService.getFilteredAction(filters),
        userActions: this.workspaceService.getActionByUserId(this.selectedUserId)
      }).subscribe({
        next: ({ allActions, userActions }) => {

          const actions = extractData(allActions);
          const assignedActions = extractData(userActions);

          const assignedActionIds = new Set(
            assignedActions.map((a: any) => a.action_id ?? a.actionId)
          );

          const filteredActions = actions.filter(
            (a: any) =>
              !assignedActionIds.has(a.action_id ?? a.actionId)
          );

          mapActions(filteredActions);
        },
        error: (err) => {
          console.error('Failed to load actions', err);
          this.rows = [];
        }
      });

      return;
    }
    const apiFilters = {
      app_id: filters.app_id,
      workspace_id: filters.workspace_id,
      stage_id: filters.stage_id
    };
    console.log("apiFilters::", apiFilters);
    this.workspaceService.getFilteredAction(apiFilters).subscribe({
      next: (res) => {

        mapActions(extractData(res));
      },
      error: (err) => {
        console.error('Failed to load actions', err);
        this.rows = [];
      }
    });
  }

  onSelectRow(rowJson: string): void {
    const row = JSON.parse(rowJson);

    const normalized = {
      key: String(row.action_id ?? row.actionId ?? ''),
      label: row.action_name ?? row.actionName ?? '',
      action_name: row.action_name ?? row.actionName ?? '',
      action_type: row.action_type ?? row.actionType ?? '',
      stage_id: row.stage_id ?? row.stageId,
      display_order: row.display_order ?? row.displayOrder,
      is_active: row.is_active ?? row.isActive,
      quick_route: row.quick_route ?? row.quickRoute,
    };

    this.modalResult.emit(normalized);
  }

  onAddSelected(): void {
    const selectedRows = this.actionGrid?.getSelectedRows?.() || [];
    this.modalResult.emit(selectedRows);
  }
}
