import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {WorkspaceService} from '../workspace-service';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {GenericButton} from '../../../common-components/generic-component-type/generic-button/generic-button';
import {InputSelectOptionField} from '../../../common-components/input-types/input-select-option-field/input-select-option-field';

@Component({
  selector: 'app-workspace-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputSelectOptionField, GenericDataGrid, GenericButton],
  templateUrl: './workspace-modal.html',
  styleUrl: './workspace-modal.scss',
})
export class WorkspaceModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();

  private readonly fb = inject(FormBuilder);
  workspaceService = inject(WorkspaceService);

  filterForm = this.fb.group({
    app_id: [''],
  });

  rows: any[] = [];
  appOptions: { key: any; value: string }[] = [];
  showFilters = false;
  showAppFilter = false;
  showSearchButton = false;
  selectedColumns: string[] = ['workspace_id', 'workspace_name'];
  customColumnNames: Record<string, string> = {
    workspace_id: 'Workspace ID',
    workspace_name: 'Workspace Name',
  };

  ngOnInit(): void {
    this.rows = this.modalComponentData?.items || [];
    this.appOptions = this.modalComponentData?.appOptions || [];
    this.showFilters = !!this.modalComponentData?.showFilters;
    this.showAppFilter = !!this.modalComponentData?.showAppFilter;
    this.showSearchButton = !!this.modalComponentData?.showSearchButton;
    if (this.modalComponentData?.selectedColumns) {
      this.selectedColumns = this.modalComponentData.selectedColumns;
    }
    if (this.modalComponentData?.customColumnNames) {
      this.customColumnNames = this.modalComponentData.customColumnNames;
    }
  }

  onAppChange(event: any): void {
    if (typeof this.modalComponentData?.onAppChange === 'function') {
      this.modalComponentData.onAppChange(event.selectedKey);
    }
  }

 /* async onSearch(): Promise<void> {
    const filters = this.filterForm.getRawValue();
    const result = typeof this.modalComponentData?.searchCallback === 'function'
      ? await this.modalComponentData.searchCallback(filters)
      : this.rows;
    this.rows = Array.isArray(result) ? result : [];
  }*/

  onSearch(): void {
    const filters = this.filterForm.getRawValue();
    const workspaceId = filters.app_id;

    if (workspaceId == null) {
      console.error('App ID is required');
      this.rows = [];
      return;
    }

    this.workspaceService
      .getWorkspaceByAppId(Number(workspaceId))
      .subscribe({
        next: (res) => {
          const data =
            Array.isArray(res) ? res :
              Array.isArray(res?.data) ? res.data :
                Array.isArray(res?.result) ? res.result :
                  [];

          this.rows = data.map((r: any) => ({
            workspace_id: r.workspace_id ?? r.workspaceId,
            workspace_name: r.workspace_name ?? r.workspaceName,
            display_order: r.display_order ?? r.displayOrder,
          }));
        },
        error: (err) => {
          console.error('Failed to load workspaces', err);
          this.rows = [];
        }
      });
  }


  onSelectRow(rowJson: string): void {
    const row = JSON.parse(rowJson);

    console.log('Parsed row:', row);

    const normalized = {
      key: String(row.workspace_id ?? row.workspaceId ??row.app_id ?? row.appId ?? ''),
      label: row.workspace_name ?? row.workspaceName ?? '',
      app_id: row.app_id ?? row.appId,
      app_name: row.app_name ?? row.appName,
      workspace_id: row.workspace_id ?? row.workspaceId,
      workspace_name: row.workspace_name ?? row.workspaceName,
      workspace_desc: row.workspace_desc ?? row.workspaceDesc,
      display_order: row.display_order ?? row.displayOrder,
      is_active: row.is_active ?? row.isActive,
      new_page_identifier: row.new_page_identifier ?? row.newPageIdentifier,
      new_page_selector: row.new_page_selector ?? row.newPageSelector,
      search_identifier: row.search_identifier ?? row.searchIdentifier,
      search_selector: row.search_selector ?? row.searchSelector,
      home_identifier: row.home_identifier ?? row.homeIdentifier,
      home_selector: row.home_selector ?? row.homeSelector,
    };

    this.modalResult.emit(normalized);
  }
}
