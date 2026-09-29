import { CommonModule } from '@angular/common';
import {Component, EventEmitter, Input, OnInit, Output, inject, WritableSignal, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {StageEditorRow} from '../stage-editor-modal/stage-editor-modal';
import {InputTextBox} from '../../../common-components/input-types/input-text-box/input-text-box';
import {GenericSwitch} from '../../../common-components/generic-component-type/generic-switch/generic-switch';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {GenericButton} from '../../../common-components/generic-component-type/generic-button/generic-button';
import {ExpansionPanelHeader} from '../../../common-components/expansion-panel-header/expansion-panel-header';

export interface ActionEditorRow {
  stage_id: string;
  action_id: string;
  action_name: string;
  action_type: string;
  quick_route: string;
  display_order: number | null;
  is_active: number;
}

@Component({
  selector: 'app-action-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextBox, GenericButton, GenericSwitch, GenericDataGrid, ExpansionPanelHeader],
  templateUrl: './action-editor-modal.html',
  styleUrl: './action-editor-modal.scss',
})
export class ActionEditorModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();
  @Output() modalClosed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  readonly actionHeaderPanel: WritableSignal<boolean> = signal(true);

  form = this.fb.group({
    stage_id: ['', [Validators.required]],
    action_id: [''],
    action_name: ['', [Validators.required]],
    action_type: [''],
    quick_route: [''],
    display_order: [null],
    is_active: [1],
  });
  rows: ActionEditorRow[] = [];
  editingIndex = -1;
  showBatchMode = true;

  ngOnInit(): void {
    const data = this.modalComponentData?.initialData ?? {};
    this.rows = Array.isArray(this.modalComponentData?.existingRows) ? this.modalComponentData.existingRows : [];
    this.showBatchMode = this.modalComponentData?.allowBatch !== false;

    this.form.patchValue({
      stage_id: data.stage_id ?? data.stageId ?? '',
      action_id: data.action_id ?? data.actionId ?? '',
      action_name: data.action_name ?? data.actionName ?? '',
      action_type: data.action_type ?? data.actionType ?? '',
      quick_route: data.quick_route ?? data.quickRoute ?? '',
      display_order: data.display_order ?? data.displayOrder ?? null,
      is_active: data.is_active ?? data.isActive ?? 1,
    });

    if (this.modalComponentData?.mode === 'edit') {
      this.showBatchMode = false;
      this.rows = [];
    }
    console.log("this.modalComponentData in action editor", this.modalComponentData);
  }

  addRow(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const row: ActionEditorRow = {
      stage_id: String(value.stage_id ?? ''),
      action_id: String(value.action_id ?? ''),
      action_name: value.action_name ?? '',
      action_type: value.action_type ?? '',
      quick_route: value.quick_route ?? '',
      display_order: value.display_order ?? null,
      is_active: value.is_active ?? 1,
    };

    if (this.editingIndex >= 0) {
      this.rows[this.editingIndex] = row;
      this.rows = [...this.rows];
      this.editingIndex = -1;
    } else {
      this.rows = [...this.rows, row];
    }

    this.form.patchValue({
      action_id: '',
      action_name: '',
      action_type: '',
      quick_route: '',
      display_order: null,
      is_active: 1,
    });
  }

  editRow(row: StageEditorRow | string): void {
    console.log('EDIT EVENT', row);
    const payload = typeof row === 'string' ? JSON.parse(row) : row;

    const index = this.rows.findIndex(
      item => item === payload ||
        (item.stage_id && item.stage_id === payload.stage_id)
    );

    if (index < 0) return;

    this.editingIndex = index;
    this.form.patchValue(payload);
  }

  deleteRow(row: StageEditorRow | string): void {
    console.log('DELETE EVENT', row);
    const payload = typeof row === 'string' ? JSON.parse(row) : row;

    this.rows = this.rows.filter(
      item => item !== payload && item.stage_id !== payload.stage_id
    );

    if (this.editingIndex >= this.rows.length) {
      this.editingIndex = -1;
    }
  }

  submit(): void {
    if (this.showBatchMode) {
      if (this.rows.length === 0) {
        this.addRow();
      }
      if (this.rows.length === 0) {
        return;
      }
      this.modalResult.emit({ actions: this.rows });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalResult.emit({ action: this.form.getRawValue() });
  }

  close(): void {
    this.modalClosed.emit();
  }
}
