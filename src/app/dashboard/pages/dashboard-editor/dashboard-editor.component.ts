import {
  Component, HostListener, inject, OnInit, signal, WritableSignal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WidgetPreviewComponent } from '../../components/widget-preview/widget-preview.component';
import { LayoutDesignerComponent } from '../../components/layout-designer/layout-designer.component';
import { DashboardApi } from '../../services/dashboard.api';
import { WidgetApi } from '../../services/widget.api';
import { Dashboard, UpdateDashboardCommand } from '../../models/dashboard.model';
import { Widget, WidgetType, AddWidgetCommand, UpdateWidgetCommand } from '../../models/widget.model';
import { GenericButton } from '../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericSwitch } from '../../../shared/common-components/generic-component-type/generic-switch/generic-switch';
import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../shared/common-components/input-types/input-text-area/input-text-area';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { InputNumber } from '../../../shared/common-components/input-types/input-number/input-number';

@Component({
  selector: 'app-dashboard-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    CdkDrag, CdkDropList,
    MatCardModule, MatButtonModule, MatIconModule, WidgetPreviewComponent,
    GenericButton, GenericSwitch, InputTextBox, InputTextArea,
    InputSelectOptionField, InputNumber
  ],
  templateUrl: './dashboard-editor.component.html',
  styleUrl: './dashboard-editor.component.scss'
})
export class DashboardEditorComponent implements OnInit {
  private dashboardApi = inject(DashboardApi);
  private widgetApi   = inject(WidgetApi);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private fb     = inject(FormBuilder);

  // ── Core signals ──────────────────────────────────────────────────────────────
  dashboardId:     number | null = null;
  dashboard:       WritableSignal<Dashboard | null> = signal(null);
  widgets:         WritableSignal<Widget[]>          = signal([]);
  selectedWidget:  WritableSignal<Widget | null>     = signal(null);
  isLoading:       WritableSignal<boolean>           = signal(false);
  hasChanges:      WritableSignal<boolean>           = signal(false);
  showConfigPanel: WritableSignal<boolean>           = signal(false);
  isEditingWidget: WritableSignal<boolean>           = signal(false);
  activeTab:       WritableSignal<'canvas' | 'list'> = signal('canvas');
  editMode:        WritableSignal<'widgets' | 'layout'> = signal('widgets');
  zoomedWidget:    WritableSignal<Widget | null>     = signal(null);

  // ── Forms ─────────────────────────────────────────────────────────────────────
  roleInput        = '';
  viewNameInput    = '';  // display-only: plain view name shortcut for VIEW type

  dashboardForm: FormGroup = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: ['', Validators.maxLength(500)],
    isActive:    [true]
  });

  widgetForm: FormGroup = this.fb.group({
    name:            ['', [Validators.required, Validators.minLength(2)]],
    widgetType:      ['BAR_CHART', Validators.required],
    cacheTtlMinutes: [15, Validators.required],
    permittedRoles:  [[]]
  });

  widgetTypeOptions = Object.values(WidgetType).map(t => ({ key: t, value: t }));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.dashboardId = parseInt(id); this.loadDashboard(); }
  }

  // ── Load ──────────────────────────────────────────────────────────────────────

  private loadDashboard(): void {
    if (!this.dashboardId) return;
    this.isLoading.set(true);
    this.dashboardApi.getDashboard(this.dashboardId).subscribe({
      next: d => {
        this.dashboard.set(d);
        this.dashboardForm.patchValue({ name: d.name, description: d.description, isActive: d.isActive });
        this.loadWidgets();
        this.isLoading.set(false);
      },
      error: () => { this.toastr.error('Failed to load dashboard'); this.isLoading.set(false); }
    });
  }

  private loadWidgets(): void {
    if (!this.dashboardId) return;
    this.widgetApi.getWidgetsByDashboard(this.dashboardId).subscribe({
      next:  ws => this.widgets.set(ws),
      error: () => this.toastr.error('Failed to load widgets')
    });
  }

  // ── Dashboard save ────────────────────────────────────────────────────────────

  saveDashboard(): void {
    if (!this.dashboardForm.valid || !this.dashboardId) return;
    const currentDashboard = this.dashboard();
    const cmd: UpdateDashboardCommand = {
      name:        this.dashboardForm.get('name')?.value,
      description: this.dashboardForm.get('description')?.value,
      isActive:    this.dashboardForm.get('isActive')?.value,
      applicationId: currentDashboard?.applicationId || 151,
    };
    this.isLoading.set(true);
    this.dashboardApi.updateDashboard(this.dashboardId, cmd).subscribe({
      next:  () => { this.toastr.success('Saved'); this.hasChanges.set(false); this.isLoading.set(false); },
      error: () => { this.toastr.error('Save failed'); this.isLoading.set(false); }
    });
  }

  // ── Widget CRUD ───────────────────────────────────────────────────────────────

  openNewWidget(): void {
    this.isEditingWidget.set(false);
    this.selectedWidget.set(null);
    this.viewNameInput = '';
    this.widgetForm.reset({ widgetType: 'BAR_CHART', cacheTtlMinutes: 15, permittedRoles: [] });
    this.showConfigPanel.set(true);
  }

  openEditWidget(widget: Widget, event?: Event): void {
    event?.stopPropagation();
    this.isEditingWidget.set(true);
    this.selectedWidget.set(widget);
    // Resolve display name: extract viewName from JSON if already a VIEW config
    const raw = widget.queryConfig ?? '';
    if (raw.trim().startsWith('{')) {
      try { this.viewNameInput = JSON.parse(raw)?.viewName ?? ''; } catch { this.viewNameInput = ''; }
    } else {
      this.viewNameInput = raw;
    }
    this.widgetForm.patchValue({
      name:            widget.name,
      widgetType:      widget.widgetType,
      cacheTtlMinutes: widget.cacheTtlMinutes,
      permittedRoles:  [...(widget.permittedRoles ?? [])]
    });
    this.showConfigPanel.set(true);
  }

  closeConfigPanel(): void {
    this.showConfigPanel.set(false);
    this.selectedWidget.set(null);
    this.widgetForm.reset();
    this.viewNameInput = '';
  }

  saveWidget(): void {
    if (!this.widgetForm.valid || !this.dashboardId) return;
    this.isLoading.set(true);

    if (this.isEditingWidget() && this.selectedWidget()) {
      const viewName = this.viewNameInput.trim().toUpperCase();
      const cmd: UpdateWidgetCommand = {
        name:            this.widgetForm.get('name')?.value,
        widgetType:      this.widgetForm.get('widgetType')?.value,
        queryConfig:     viewName ? JSON.stringify({ sourceType: 'VIEW', viewName, filters: [] }) : null,
        permittedRoles:  this.widgetForm.get('permittedRoles')?.value ?? [],
        cacheTtlMinutes: this.widgetForm.get('cacheTtlMinutes')?.value,
        isConfigured:    viewName ? 1 : 0
      };
      this.widgetApi.updateWidget(this.selectedWidget()!.id, cmd).subscribe({
        next:  () => { this.toastr.success('Updated'); this.closeConfigPanel(); this.loadWidgets(); this.isLoading.set(false); },
        error: () => { this.toastr.error('Update failed'); this.isLoading.set(false); }
      });
    } else {
      // Append to the end of the 3-column grid.
      const count = this.widgets().length;
      const viewName = this.viewNameInput.trim().toUpperCase();
      const cmd: AddWidgetCommand = {
        dashboardId: this.dashboardId,
        name:            this.widgetForm.get('name')?.value,
        widgetType:      this.widgetForm.get('widgetType')?.value,
        queryConfig:     viewName ? JSON.stringify({ sourceType: 'VIEW', viewName, filters: [] }) : null,
        permittedRoles:  this.widgetForm.get('permittedRoles')?.value ?? [],
        cacheTtlMinutes: this.widgetForm.get('cacheTtlMinutes')?.value,
        posX: (count % 3) * 4, posY: Math.floor(count / 3) * 3, width: 4, height: 3
      };
      this.widgetApi.addWidget(cmd).subscribe({
        next:  () => { this.toastr.success('Added'); this.closeConfigPanel(); this.loadWidgets(); this.hasChanges.set(true); this.isLoading.set(false); },
        error: () => { this.toastr.error('Add failed'); this.isLoading.set(false); }
      });
    }
  }

  deleteWidget(widget: Widget, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`Delete "${widget.name}"?`)) return;
    this.widgetApi.removeWidget(widget.id).subscribe({
      next:  () => { this.toastr.success('Deleted'); this.loadWidgets(); this.hasChanges.set(true); },
      error: () => this.toastr.error('Delete failed')
    });
  }

  // ── List tab drag-to-reorder ──────────────────────────────────────────────────

  onDrop(event: CdkDragDrop<Widget[]>): void {
    const list = [...this.widgets()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.widgets.set(list);
    list.forEach((w, i) => {
      this.widgetApi.updateLayout(w.id, {
        posX: (i % 3) * 4, posY: Math.floor(i / 3) * 3, width: 4, height: 3
      }).subscribe();
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────────────────

  addRole(): void {
    const role = this.roleInput.trim();
    if (!role) return;
    const curr: string[] = this.widgetForm.get('permittedRoles')?.value ?? [];
    if (!curr.includes(role)) this.widgetForm.get('permittedRoles')?.setValue([...curr, role]);
    this.roleInput = '';
  }

  removeRole(role: string): void {
    const curr: string[] = this.widgetForm.get('permittedRoles')?.value ?? [];
    this.widgetForm.get('permittedRoles')?.setValue(curr.filter(r => r !== role));
  }

  onRoleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.addRole(); }
  }

  // ── Zoom / preview ──────────────────────────────────────────────────────────

  openZoom(widget: Widget, event?: Event): void {
    event?.stopPropagation();
    this.zoomedWidget.set(widget);
  }

  closeZoom(): void { this.zoomedWidget.set(null); }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.zoomedWidget()) this.closeZoom(); }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  isConfigured(widget: Widget): boolean { return widget.isConfigured === 1; }

  widgetTypeIcon(type: string): string {
    const map: Record<string, string> = {
      BAR_CHART: '📊', LINE_CHART: '📈', PIE_CHART: '🥧',
      KPI_CARD: '🎯', TABLE: '📋', APPROVAL_LIST: '✅'
    };
    return map[type] ?? '📦';
  }

  goBack(): void {
    if (this.hasChanges() && !confirm('You have unsaved changes. Leave?')) return;
    this.router.navigate(['../..'], { relativeTo: this.route });
  }
}
