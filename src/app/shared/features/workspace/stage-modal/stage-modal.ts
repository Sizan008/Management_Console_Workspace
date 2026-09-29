import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {WorkspaceService} from '../workspace-service';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';

@Component({
  selector: 'app-stage-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericDataGrid],
  templateUrl: './stage-modal.html',
  styleUrl: './stage-modal.scss',
})
export class StageModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();

  workspaceService = inject(WorkspaceService);

  private readonly fb = inject(FormBuilder);

  rows: any[] = [];
  initialWorkspaceId: any = '';
  selectedColumns: string[] = ['workspace_id', 'stage_id', 'stage_name'];
  customColumnNames: Record<string, string> = {
    workspace_id: 'Workspace ID',
    stage_id: 'Stage ID',
    stage_name: 'Stage Name',
  };

  ngOnInit(): void {
    this.rows = this.modalComponentData?.items || [];
    this.initialWorkspaceId = this.modalComponentData?.workspaceId ?? this.modalComponentData?.initialWorkspaceId ?? '';
    if (this.modalComponentData?.selectedColumns) {
      this.selectedColumns = this.modalComponentData.selectedColumns;
    }
    if (this.modalComponentData?.customColumnNames) {
      this.customColumnNames = this.modalComponentData.customColumnNames;
    }

    if (this.initialWorkspaceId) {
      this.loadStagesByWorkspace(this.initialWorkspaceId);
    }
  }

  private loadStagesByWorkspace(workspaceId: any): void {
    this.workspaceService.getStageByWorkspaceId(Number(workspaceId)).subscribe({
      next: (res) => {
        const data =
          Array.isArray(res) ? res :
            Array.isArray(res?.data) ? res.data :
              Array.isArray(res?.result) ? res.result :
                [];

        this.rows = data.map((r: any) => ({
          stage_id: r.stage_id ?? r.stageId,
          stage_name: r.stage_name ?? r.stageName,
          display_order: r.display_order ?? r.displayOrder,
          workspace_id: r.workspace_id ?? r.workspaceId,
          quick_route: r.quick_route ?? r.quickRoute,
          is_active: r.is_active ?? r.isActive,
          stage_colour: r.stage_colour ?? r.stageColour,
        }));
      },
      error: (err) => {
        console.error('Failed to load stages', err);
        this.rows = [];
      }
    });
  }

  onSelectRow(rowJson: string): void {
    const row = JSON.parse(rowJson);
    console.log("onSelectedRow", row);

    const normalized = {
      key: String(row.stage_id ?? row.stageId ?? ''),
      label: row.stage_name ?? row.stageName ?? '',
      workspace_id: row.workspace_id ?? row.workspaceId,
      stage_id: row.stage_id ?? row.stageId,
      stage_name: row.stage_name ?? row.stageName,
      display_order: row.display_order ?? row.displayOrder,
      is_active: row.is_active ?? row.isActive,
      quick_route: row.quick_route ?? row.quickRoute,
      stage_colour: row.stage_colour ?? row.stageColour,
    };

    this.modalResult.emit(normalized);
  }
}
