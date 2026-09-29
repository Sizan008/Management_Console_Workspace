import { CommonModule } from '@angular/common';
import {Component, EventEmitter, Input, OnInit, Output, inject, signal, WritableSignal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {InputTextBox} from '../../../common-components/input-types/input-text-box/input-text-box';
import {GenericSwitch} from '../../../common-components/generic-component-type/generic-switch/generic-switch';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {GenericButton} from '../../../common-components/generic-component-type/generic-button/generic-button';
import {InputSelectOptionField} from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import {ExpansionPanelHeader} from '../../../common-components/expansion-panel-header/expansion-panel-header';



export interface StageEditorRow {
  workspace_id: string;
  stage_id: string;
  stage_name: string;
  stage_colour: string;
  display_order: number | null;
  quick_route: string;
  is_active: number;
}

@Component({
  selector: 'app-stage-editor-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextBox, InputSelectOptionField, GenericButton, GenericSwitch, GenericDataGrid,ExpansionPanelHeader],
  templateUrl: './stage-editor-modal.html',
  styleUrl: './stage-editor-modal.scss',
})
export class StageEditorModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();
  @Output() modalClosed = new EventEmitter<void>();
  readonly stageHeaderPanel: WritableSignal<boolean> = signal(true);

  private fb = inject(FormBuilder);
  form = this.fb.group({
    workspace_id: ['', [Validators.required]],
    stage_id: [''],
    stage_name: ['', [Validators.required]],
    stage_colour: [''],
    display_order: [null],
    quick_route: [''],
    is_active: [1],
  });
  colorOptions: { key: any; value: string }[] = [];
  rows: StageEditorRow[] = [];
  editingIndex = -1;
  showBatchMode = true;

  ngOnInit(): void {
    const data = this.modalComponentData?.initialData ?? {};
    this.colorOptions = this.modalComponentData?.stageColourOptions ?? [];
    this.rows = Array.isArray(this.modalComponentData?.existingRows) ? this.modalComponentData.existingRows : [];
    this.showBatchMode = this.modalComponentData?.allowBatch !== false;

    this.form.patchValue({
      workspace_id: data.workspace_id ?? data.workspaceId ?? '',
      stage_id: data.stage_id ?? data.stageId ?? '',
      stage_name: data.stage_name ?? data.stageName ?? '',
      stage_colour: data.stage_colour ?? data.stageColour ?? '',
      display_order: data.display_order ?? data.displayOrder ?? null,
      quick_route: data.quick_route ?? data.quickRoute ?? '',
      is_active: data.is_active ?? data.isActive ?? 1,
    });

    if (this.modalComponentData?.mode === 'edit') {
      this.showBatchMode = false;
      this.rows = [];
    }
  }

  addRow(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const row: StageEditorRow = {
      workspace_id: String(value.workspace_id ?? ''),
      stage_id: String(value.stage_id ?? ''),
      stage_name: value.stage_name ?? '',
      stage_colour: value.stage_colour ?? '',
      display_order: value.display_order ?? null,
      quick_route: value.quick_route ?? '',
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
      stage_id: '',
      stage_name: '',
      stage_colour: '',
      display_order: null,
      quick_route: '',
      is_active: 1,
    });
  }

  editRow(row: StageEditorRow | string): void {
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
    const payload = typeof row === 'string' ? JSON.parse(row) : row;

    this.rows = this.rows.filter(
      item => item !== payload && item.stage_id !== payload.stage_id
    );

    if (this.editingIndex >= this.rows.length) {
      this.editingIndex = -1;
    }
  }

  submit(): void {
    console.log("this.rows",this.rows);
    if (this.showBatchMode) {
      if (this.rows.length === 0) {
        this.addRow();
      }
      if (this.rows.length === 0) {
        return;
      }
      this.modalResult.emit({ stages: this.rows });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalResult.emit({ stage: this.form.getRawValue() });
  }

  getDotClass(cssClass: string): string {
    const match = cssClass.match(/\bbg-[^\s]+\b/);
    return match ? match[0] : '';
  }
  close(): void {
    this.modalClosed.emit();
  }
}
