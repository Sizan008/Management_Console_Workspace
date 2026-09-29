import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ExpansionPanelHeader } from '../../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { GenericDataGrid } from '../../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericButton } from '../../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericModal } from '../../../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { LoaderService } from '../../../../../shared/services/loader.service';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import { ActionConfirmationService } from '../../../shared/service/action-confirmation.service';
import { ActionConfirmationHost } from '../../../shared/common-componets/action-confirmation-host';
import {
  ButtonUtils,
  FormGroupSignal,
  ONCLICK_SAVE,
  ONCLICK_UPDATE,
  ONCLICK_RESET,

} from '../../../../../shared/constant/button-signals.constant';
import { AdminPanelDefineService } from '../../../services/admin-panel-define.service';
import {
  RoleAccessMethod,
  RoleListItem,
  RoleAddOrUpdateRequest,
} from '../../../models/define-role.model';
import { ConfirmationDialogue } from '../../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
interface InitialDefineRolesData {
  methods: RoleAccessMethod[];
  roles: RoleListItem[];
}
interface DefineRoleMethodGridRow {
  methodId: string;
  methodDescription: string;
}
interface DefineRoleGridRow {
  roleId: string;
  roleName: string;
  roleDescription: string;
}
interface GridCheckedEvent {
  data: string;
  checked: boolean;
}
interface GridSelectAllEvent {
  isSelectAll: boolean;
  selectedRows: DefineRoleMethodGridRow[];
  count: number;
}
interface RoleDetailsSummary {
  roleId: string;
  roleName: string;
  roleDescription: string;
}
@Component({
  selector: 'app-define-role',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExpansionPanelHeader,
    GenericDataGrid,
    GenericButton,
    GenericModal,
    InputTextBox,
    ActionConfirmationHost,
  ],
  templateUrl: './define-role.html',
})
export class DefineRole implements OnInit {
  readonly detailsActionSvg = `
<path d="M12 5c-4.8 0-8.8 3-10.5 7 1.7 4 5.7 7 10.5 7s8.8-3 10.5-7C20.8 8 16.8 5 12 5Z" fill="none" stroke="currentColor" stroke-width="2"></path>
<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"></circle>
`;
  readonly editActionSvg = `
<path d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5Z" fill="none" stroke="currentColor" stroke-width="2"></path>
<path d="M13.8 7.7 16.3 5.2c.4-.4 1-.4 1.4 0l1.1 1.1c.4.4.4 1 0 1.4l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="2"></path>
`;
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdminPanelDefineService);
  private readonly loader = inject(LoaderService);
  private readonly toast = inject(ToastHelperService);
  private readonly confirmation = inject(ActionConfirmationService);
  readonly loading = signal(false);
  readonly editingRoleId = signal<string | null>(null);
  readonly roleDetailsPanelOpen = signal(true);
  readonly methodAssignPanelOpen = signal(true);
  readonly roleListPanelOpen = signal(true);
  readonly allMethods = signal<RoleAccessMethod[]>([]);
  readonly allRoles = signal<RoleListItem[]>([]);
  readonly assignedMethodIds = signal<string[]>([]);
  readonly originalAssignedMethodIds = signal<string[]>([]);
  readonly selectedUnassignedMethodIds = signal<string[]>([]);
  readonly selectedAssignedMethodIds = signal<string[]>([]);
  readonly detailsModalVisible = signal(false);
  readonly selectedDetailsRole = signal<RoleDetailsSummary | null>(null);
  readonly detailsModalGridRows = signal<DefineRoleMethodGridRow[]>([]);
  readonly roleForm = this.fb.nonNullable.group({
    roleName: ['', [Validators.required, Validators.maxLength(100)]],
    roleDescription: ['', [Validators.required, Validators.maxLength(250)]],
  });
  readonly methodGridColumns = ['methodId', 'methodDescription'];
  readonly methodGridColumnNames = {
    methodId: 'Method',
    methodDescription: 'Method Description',
  };
  readonly roleGridColumns = ['roleName', 'roleDescription'];
  readonly roleGridColumnNames = {
    roleName: 'Role Name',
    roleDescription: 'Role Description',
  };
  readonly unassignedMethodGridRows = computed<DefineRoleMethodGridRow[]>(
    () => {
      const assigned = new Set(this.assignedMethodIds());
      return this.allMethods()
        .filter((method) => !assigned.has(method.methodId))
        .map((method) => ({
          methodId: method.methodId,
          methodDescription: method.description,
        }));
    },
  );
  readonly assignedMethodGridRows = computed<DefineRoleMethodGridRow[]>(() => {
    const methodMap = new Map(
      this.allMethods().map((method) => [method.methodId, method]),
    );
    return this.assignedMethodIds()
      .map((id) => methodMap.get(id))
      .filter((item): item is RoleAccessMethod => Boolean(item))
      .map((item) => ({
        methodId: item.methodId,
        methodDescription: item.description,
      }));
  });
  readonly roleGridRows = computed<DefineRoleGridRow[]>(() => {
    return this.allRoles().map((role) => ({
      roleId: role.roleId,
      roleName: role.roleId,
      roleDescription: role.description,
    }));
  });
  constructor() {
    this.initializeButtonEvents();
    
  }
  ngOnInit(): void {
    this.configureNavbarButtons();
    this.loadInitialData();
  }
  private configureNavbarButtons(): void {
    ButtonUtils.resetAllButtons();
    ButtonUtils.resetAllClickSignals();
    FormGroupSignal.set(this.roleForm);
    ButtonUtils.setPageButtons({
      save: true,
      update: false,
      reset: true,
      exit: false,
    });
  }
  private initializeButtonEvents(): void {
    effect(() => {
      if (ONCLICK_SAVE()) {
        ONCLICK_SAVE.set(false);
        this.requestSave();
      }
    });
    effect(() => {
      if (ONCLICK_UPDATE()) {
        ONCLICK_UPDATE.set(false);
        this.requestSave();
      }
    });
    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.resetDraft();
      }
    });
  }
  private loadInitialData(): void {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.loader.show();
    forkJoin({
      methods: this.api.getAccessMethods(),
      roles: this.api.getAllRoleNames(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (result: InitialDefineRolesData) => {
          this.allMethods.set(result.methods ?? []);
          this.allRoles.set(result.roles ?? []);
          this.resetDraft();
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Unable to load role information.'),
            'Error',
          );
        },
      });
  }
  onUnassignedMethodChecked(event: GridCheckedEvent): void {
    const methodId = this.getMethodIdFromValue(event.data);
    if (!methodId) {
      return;
    }
    this.selectedUnassignedMethodIds.update((ids) =>
      event.checked
        ? this.uniqueTextList([...ids, methodId])
        : ids.filter((id) => id !== methodId),
    );
  }
  onAssignedMethodChecked(event: GridCheckedEvent): void {
    const methodId = this.getMethodIdFromValue(event.data);
    if (!methodId) {
      return;
    }
    this.selectedAssignedMethodIds.update((ids) =>
      event.checked
        ? this.uniqueTextList([...ids, methodId])
        : ids.filter((id) => id !== methodId),
    );
  }
  onUnassignedMethodsSelectAll(event: GridSelectAllEvent): void {
    if (!event.isSelectAll) {
      this.selectedUnassignedMethodIds.set([]);
      return;
    }
    this.selectedUnassignedMethodIds.set(
      this.uniqueTextList(
        (event.selectedRows ?? []).map((row) => row.methodId),
      ),
    );
  }
  onAssignedMethodsSelectAll(event: GridSelectAllEvent): void {
    if (!event.isSelectAll) {
      this.selectedAssignedMethodIds.set([]);
      return;
    }
    this.selectedAssignedMethodIds.set(
      this.uniqueTextList(
        (event.selectedRows ?? []).map((row) => row.methodId),
      ),
    );
  }
  moveSelectedToAssigned(): void {
    const selected = this.selectedUnassignedMethodIds();
    if (!selected.length) {
      this.toast.warning('Select unassigned method first.', 'Validation');
      return;
    }
    this.assignedMethodIds.update((ids) =>
      this.uniqueTextList([...ids, ...selected]),
    );
    this.clearSelections();
    this.markRoleDirty();
  }
  moveSelectedToUnassigned(): void {
    const selected = new Set(this.selectedAssignedMethodIds());
    if (!selected.size) {
      this.toast.warning('Select assigned method first.', 'Validation');
      return;
    }
    this.assignedMethodIds.update((ids) =>
      ids.filter((id) => !selected.has(id)),
    );
    this.clearSelections();
    this.markRoleDirty();
  }
  moveAllToAssigned(): void {
    const methodIds = this.uniqueTextList(
      this.allMethods().map((item) => item.methodId),
    );
    if (this.sameTextList(this.assignedMethodIds(), methodIds)) {
      return;
    }
    this.assignedMethodIds.set(methodIds);
    this.clearSelections();
    this.markRoleDirty();
  }
  moveAllToUnassigned(): void {
    if (!this.assignedMethodIds().length) {
      return;
    }
    this.assignedMethodIds.set([]);
    this.clearSelections();
    this.markRoleDirty();
  }
  private markRoleDirty(): void {
    this.roleForm.markAsDirty();
  }
  private clearSelections(): void {
    this.selectedUnassignedMethodIds.set([]);
    this.selectedAssignedMethodIds.set([]);
  }
  editRole(event: any): void {
    if (this.loading()) {
      return;
    }
    const roleId = this.getRoleIdFromValue(event);
    if (!roleId) {
      this.toast.error('Unable to identify selected role.', 'Error');
      return;
    }
    const role = this.allRoles().find((item) => String(item.roleId) === roleId);
    if (!role) {
      this.toast.error('Selected role was not found.', 'Error');
      return;
    }
    this.loading.set(true);
    this.loader.show();
    this.api
      .getRoleDetails(roleId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (details) => {
          const methodIds = this.uniqueTextList(
            (details ?? []).map((item) => item.methodId),
          );
          this.editingRoleId.set(roleId);
          this.roleForm.reset({
            roleName: role.roleId,
            roleDescription: role.description ?? '',
          });
          this.roleForm.markAsPristine();
          this.roleForm.markAsUntouched();
          this.assignedMethodIds.set(methodIds);
          this.originalAssignedMethodIds.set([...methodIds]);
          this.clearSelections();
          this.roleDetailsPanelOpen.set(true);
          this.methodAssignPanelOpen.set(true);
          ButtonUtils.setPageButtons({
            save: false,
            update: true,
            reset: true,
            exit: false,
          });
          this.scrollToRoleForm();
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Unable to load role details.'),
            'Error',
          );
        },
      });
  }
  async requestSave(): Promise<void> {
    if (this.loading()) {
      return;
    }
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      this.roleDetailsPanelOpen.set(true);
      this.toast.warning(
        'Role name and description are required.',
        'Validation',
      );
      this.scrollToRoleForm();
      return;
    }
    if (!this.assignedMethodIds().length) {
      this.methodAssignPanelOpen.set(true);
      this.toast.warning('Please assign at least one method.', 'Validation');
      return;
    }
    const update = this.editingRoleId() !== null;
    const confirmed = await this.confirmation.confirm(
      update ? 'update' : 'save',
      {
        title: update ? 'Update Role' : 'Save Role',
        message: update
          ? 'Are you sure you want to update this role?'
          : 'Are you sure you want to save this role?',
        confirmText: update ? 'Yes, Update' : 'Yes, Save',
      },
    );
    if (!confirmed) {
      return;
    }
    this.saveRole();
  }
  private saveRole(): void {
    const value = this.roleForm.getRawValue();
    const update = this.editingRoleId() !== null;
    const payload: RoleAddOrUpdateRequest = {
      RoleID: this.editingRoleId() || value.roleName.trim(),
      RoleName: value.roleName.trim(),
      RoleDescription: value.roleDescription.trim(),
      MethodID: this.assignedMethodIds(),
    };
    this.loading.set(true);
    this.loader.show();
    this.api
      .saveOrUpdateRole(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (message) => {
          this.toast.success(
            message ||
              (update
                ? 'Role updated successfully.'
                : 'Role saved successfully.'),
            'Success',
          );
          this.resetDraft();
          this.loadInitialData();
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(
              error,
              update ? 'Role update failed.' : 'Role save failed.',
            ),
            'Error',
          );
        },
      });
  }
  private resetDraft(): void {
    this.editingRoleId.set(null);
    this.roleForm.reset({
      roleName: '',
      roleDescription: '',
    });
    this.roleForm.markAsPristine();
    this.roleForm.markAsUntouched();
    this.assignedMethodIds.set([]);
    this.originalAssignedMethodIds.set([]);
    this.clearSelections();
    this.roleDetailsPanelOpen.set(true);
    ButtonUtils.setPageButtons({
      save: true,
      update: false,
      reset: true,
      exit: false,
    });
  }
  openRoleDetails(event: any): void {
    if (this.loading()) {
      return;
    }
    const roleId = this.getRoleIdFromValue(event);
    if (!roleId) {
      this.toast.error('Unable to identify selected role.', 'Error');
      return;
    }
    const role = this.allRoles().find((item) => String(item.roleId) === roleId);
    if (!role) {
      this.toast.error('Selected role was not found.', 'Error');
      return;
    }
    this.loading.set(true);
    this.loader.show();
    this.api
      .getRoleDetails(roleId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loader.hide();
        }),
      )
      .subscribe({
        next: (details) => {
          this.selectedDetailsRole.set({
            roleId: role.roleId,
            roleName: role.roleId,
            roleDescription: role.description,
          });
          this.detailsModalGridRows.set(
            (details ?? []).map((item) => ({
              methodId: item.methodId,
              methodDescription:
                this.allMethods().find(
                  (method) => method.methodId === item.methodId,
                )?.description || '',
            })),
          );
          this.detailsModalVisible.set(true);
        },
        error: (error) => {
          this.toast.error(
            this.getErrorMessage(error, 'Unable to load role details.'),
            'Error',
          );
        },
      });
  }
  closeRoleDetailsModal(): void {
    this.detailsModalVisible.set(false);
    this.selectedDetailsRole.set(null);
    this.detailsModalGridRows.set([]);
  }
  private getRoleIdFromValue(value: unknown): string {
    const row = this.parseGridValue(value);
    return this.text(
      row?.['roleId'] ?? row?.['RoleID'] ?? row?.['roleID'] ?? row?.['id'],
    );
  }
  private getMethodIdFromValue(value: unknown): string {
    const row = this.parseGridValue(value);
    return this.text(
      row?.['methodId'] ??
        row?.['MethodID'] ??
        row?.['methodID'] ??
        row?.['id'],
    );
  }
  private parseGridValue(value: unknown): Record<string, unknown> | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    if (typeof value === 'string') {
      try {
        const data = JSON.parse(value);
        return data && typeof data === 'object'
          ? (data as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
    return null;
  }
  private uniqueTextList(values: string[]): string[] {
    return [
      ...new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ];
  }
  private sameTextList(first: string[], second: string[]): boolean {
    const left = [...first].sort();
    const right = [...second].sort();
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }
  private scrollToRoleForm(): void {
    setTimeout(() => {
      document.getElementById('define-role-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  }
  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }
    if (error && typeof error === 'object') {
      const httpError = error as {
        message?: unknown;
        error?: {
          Message?: unknown;
          message?: unknown;
        };
      };
      const message =
        httpError.error?.Message ??
        httpError.error?.message ??
        httpError.message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }
    return fallback;
  }
  private text(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim();
  }

}
