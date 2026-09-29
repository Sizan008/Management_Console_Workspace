import { Component, OnInit, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, distinctUntilChanged, finalize, map, switchMap, catchError, of } from 'rxjs';
import { GenericButton } from '../../../../shared/common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../shared/common-components/generic-component-type/generic-data-grid/generic-data-grid';
import { GenericModal } from '../../../../shared/common-components/generic-component-type/generic-modal/generic-modal';
import { SummaryDetailsComponent, SummaryDetailItem } from '../../../../shared/common-components/case-quick-view/summary-details/summary-details.component';
import { ExpansionPanelHeader } from '../../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { RoleAssignService } from '../../services/role-assign.service';
import { RoleAssignmentRole, RoleAssignmentRoleDetail, RoleAssignmentSearchResult, RoleAssignmentUser } from '../../models/role-assign.model';

import { ToastHelperService } from '../../../../shared/services/toast-helper.service';
@Component({
  selector: 'app-admin-panel-role-assign',
  standalone: true,
  imports: [GenericButton, GenericDataGrid, GenericModal, SummaryDetailsComponent, ExpansionPanelHeader],
  templateUrl: './admin-panel-role-assign.html',
})
export class AdminPanelRoleAssignComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(RoleAssignService);
  private readonly toast = inject(ToastHelperService);
  private routeSub?: Subscription;
  private loadSub?: Subscription;
  private saveSub?: Subscription;
  private detailSub?: Subscription;
  readonly availableGrid = viewChild<GenericDataGrid<RoleAssignmentRole>>('availableGrid');
  readonly assignedGrid = viewChild<GenericDataGrid<RoleAssignmentRole>>('assignedGrid');
  readonly userId = signal('');
  readonly user = signal<RoleAssignmentUser | null>(null);
  readonly available = signal<RoleAssignmentRole[]>([]);
  readonly assigned = signal<RoleAssignmentRole[]>([]);
  readonly selectedAvailable = signal<string[]>([]);
  readonly selectedAssigned = signal<string[]>([]);
  private readonly savedIds = signal<string[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly detailLoading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly success = signal('');
  readonly informationOpen = signal(true);
  readonly rolesOpen = signal(true);
  readonly confirmOpen = signal(false);
  readonly detailsOpen = signal(false);
  readonly detailError = signal('');
  readonly detailsRole = signal<RoleAssignmentRole | null>(null);
  readonly methods = signal<RoleAssignmentRoleDetail[]>([]);
  readonly busy = computed(() => this.loading() || this.saving());
  readonly editable = computed(() => !!this.user() && !this.busy() && !this.confirmOpen());
  readonly changed = computed(() => JSON.stringify([...this.savedIds()].sort()) !==
    JSON.stringify(this.assigned().map(role => role.roleId).sort()));
  readonly userDetails = computed<SummaryDetailItem[]>(() => [
    {label: 'User ID', value: this.user()?.userId || this.userId() || '—'},
    {label: 'User Name', value: this.user()?.userName || '—'},
    {label: 'Customer ID', value: this.user()?.customerId || '—'},
  ]);
  readonly roleDetails = computed<SummaryDetailItem[]>(() => [
    {label: 'Role Name', value: this.detailsRole()?.roleName || '—'},
    {label: 'Description', value: this.detailsRole()?.roleDescription || '—'},
  ]);
  readonly columns = ['roleName', 'roleDescription'];
  readonly columnNames = {roleName: 'Role Name', roleDescription: 'Description'};
  readonly methodColumns = ['methodId', 'methodDescription'];
  readonly methodNames = {methodId: 'Method', methodDescription: 'Method Description'};
  readonly detailsSvg = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>';

  constructor() {
    effect(() => {
      const message = this.error();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.detailError();
      if (message) this.toast.error(message);
    });

    effect(() => {
      const message = this.notice();
      if (message) this.toast.warning(message);
    });

    effect(() => {
      const message = this.success();
      if (message) this.toast.success(message);
    });

  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.pipe(
      map(params => (params.get('userId') || '').trim()), distinctUntilChanged(),
    ).subscribe(id => {
      this.loadSub?.unsubscribe();
      this.saveSub?.unsubscribe();
      this.closeDetails();
      this.userId.set(id);
      this.confirmOpen.set(false);
      this.refresh();
    });
  }

  refresh(): void {
    if (this.saving()) return;
    this.loadSub?.unsubscribe();
    this.closeDetails();
    this.clearData();
    this.error.set(''); this.notice.set(''); this.success.set('');
    if (!this.userId()) { this.error.set('Select a user from the workspace.'); return; }
    this.loading.set(true);
    this.loadSub = this.api.searchUserAndLoadRoles(this.userId()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({next: result => this.applyData(result), error: error => this.error.set(this.message(error))});
  }

  checked(side: 'available' | 'assigned', event: {data: string; checked: boolean}): void {
    if (!this.editable()) return;
    const role = this.parseRole(event.data);
    if (!role) return;
    const selection = side === 'available' ? this.selectedAvailable : this.selectedAssigned;
    selection.update(ids => event.checked ? [...new Set([...ids, role.roleId])] : ids.filter(id => id !== role.roleId));
  }

  selectAll(side: 'available' | 'assigned', event: {selectedRows: RoleAssignmentRole[]}): void {
    if (!this.editable()) return;
    (side === 'available' ? this.selectedAvailable : this.selectedAssigned).set(event.selectedRows.map(role => role.roleId));
  }

  transfer(toAssigned: boolean, all = false): void {
    if (!this.editable()) return;
    const source = toAssigned ? this.available : this.assigned;
    const target = toAssigned ? this.assigned : this.available;
    const ids = new Set(all ? source().map(role => role.roleId) :
      (toAssigned ? this.selectedAvailable() : this.selectedAssigned()));
    const moved = source().filter(role => ids.has(role.roleId));
    target.set(this.sort([...new Map([...target(), ...moved].map(role => [role.roleId, role])).values()]));
    source.set(source().filter(role => !ids.has(role.roleId)));
    this.clearSelections(); this.success.set('');
  }

  openDetails(event: string): void {
    if (this.busy()) return;
    const role = this.parseRole(event);
    if (!role) return;
    this.closeDetails();
    this.detailsRole.set(role); this.detailsOpen.set(true); this.detailLoading.set(true);
    this.detailSub = this.api.getRoleDetails(role.roleId).pipe(finalize(() => this.detailLoading.set(false))).subscribe({
      next: rows => {
        this.methods.set(rows);
        this.detailsRole.set({...role, roleName: rows[0]?.roleName || role.roleName,
          roleDescription: rows[0]?.roleDescription || role.roleDescription});
      },
      error: error => this.detailError.set(this.message(error)),
    });
  }

  closeDetails(): void {
    this.detailSub?.unsubscribe(); this.detailsOpen.set(false); this.methods.set([]);
    this.detailsRole.set(null); this.detailError.set('');
  }

  requestSave(): void {
    if (this.editable() && this.changed()) this.confirmOpen.set(true);
  }

  save(): void {
    if (!this.confirmOpen() || this.busy() || !this.user() || !this.changed()) return;
    const payload = {UserID: this.user()!.userId, RoleIDs: this.assigned().map(role => role.roleId)};
    this.confirmOpen.set(false); this.saving.set(true); this.error.set(''); this.notice.set(''); this.success.set('');
    this.saveSub = this.api.assignRoles(payload).pipe(
      switchMap(message => {
        this.success.set(message);
        return this.api.searchUserAndLoadRoles(payload.UserID).pipe(
          catchError(() => {
            this.clearData();
            this.notice.set('Request submitted, but the latest roles could not be loaded. Click Refresh.');
            return of(null);
          }),
        );
      }),
      finalize(() => this.saving.set(false)),
    ).subscribe({next: result => { if (result) this.applyData(result); }, error: error => this.error.set(this.message(error))});
  }

  onClose(): void { if (!this.saving()) void this.router.navigate(['../../'], {relativeTo: this.route}); }
  ngOnDestroy(): void {
    this.routeSub?.unsubscribe(); this.loadSub?.unsubscribe(); this.saveSub?.unsubscribe(); this.detailSub?.unsubscribe();
  }
  private applyData(result: RoleAssignmentSearchResult): void {
    this.user.set(result.user); this.available.set(this.sort(result.unassignedRoles));
    this.assigned.set(this.sort(result.assignedRoles)); this.savedIds.set(result.assignedRoles.map(role => role.roleId));
    this.clearSelections();
  }
  private clearData(): void {
    this.user.set(null); this.available.set([]); this.assigned.set([]); this.savedIds.set([]); this.clearSelections();
  }
  private clearSelections(): void {
    this.selectedAvailable.set([]); this.selectedAssigned.set([]);
    this.availableGrid()?.clearSelection(); this.assignedGrid()?.clearSelection();
  }
  private sort(roles: RoleAssignmentRole[]): RoleAssignmentRole[] {
    return [...roles].sort((a, b) => a.roleName.localeCompare(b.roleName));
  }
  private parseRole(event: string): RoleAssignmentRole | null {
    try {
      const value = JSON.parse(event) as {roleId?: string};
      return [...this.available(), ...this.assigned()].find(role => role.roleId === value.roleId) || null;
    } catch { return null; }
  }
  private message(error: unknown): string {
    const value = error as {error?: {Message?: string}; message?: string};
    return value?.error?.Message || value?.message || 'The request could not be completed. Please try again.';
  }
}
