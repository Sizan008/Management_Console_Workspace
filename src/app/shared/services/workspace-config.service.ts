import { Injectable, signal, inject } from '@angular/core';
import { Workspace, WorkspaceMasterPage, WorkspaceService, STATIC_WORKSPACES } from './workspace.service';

export type EditableWorkspace = Workspace & {
  isEnabled: boolean;
  sortOrder: number;
};

const ADMIN_CONFIG_KEY = 'ws_admin_config';

@Injectable({ providedIn: 'root' })
export class WorkspaceConfigService {
  private readonly workspaceService = inject(WorkspaceService);

  /** Live editable list — bound directly to the settings UI */
  readonly editableList = signal<EditableWorkspace[]>([]);
  readonly isDirty      = signal(false);

  /** Load editable list from saved config → current workspaces → static fallback */
  init(): void {
    const saved = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (saved) {
      try {
        this.editableList.set(JSON.parse(saved));
        this.isDirty.set(false);
        return;
      } catch { /* fall through */ }
    }

    // Seed from whatever is currently active in the service
    const current = this.workspaceService.workspaces();
    const source   = current.length ? current : STATIC_WORKSPACES;
    this.editableList.set(
      source.map((ws, i) => ({ ...ws, isEnabled: true, sortOrder: i }))
    );
    this.isDirty.set(false);
  }

  // ── Workspace-level operations ────────────────────────────────────────────

  toggleEnabled(id: string): void {
    this.editableList.update(list =>
      list.map(ws => ws.id === id ? { ...ws, isEnabled: !ws.isEnabled } : ws)
    );
    this.isDirty.set(true);
  }

  moveUp(id: string): void {
    this.editableList.update(list => {
      const idx = list.findIndex(ws => ws.id === id);
      if (idx <= 0) return list;
      const copy = [...list];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy.map((ws, i) => ({ ...ws, sortOrder: i }));
    });
    this.isDirty.set(true);
  }

  moveDown(id: string): void {
    this.editableList.update(list => {
      const idx = list.findIndex(ws => ws.id === id);
      if (idx < 0 || idx >= list.length - 1) return list;
      const copy = [...list];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy.map((ws, i) => ({ ...ws, sortOrder: i }));
    });
    this.isDirty.set(true);
  }

  updateField(id: string, field: keyof EditableWorkspace, value: string): void {
    this.editableList.update(list =>
      list.map(ws => ws.id === id ? { ...ws, [field]: value } : ws)
    );
    this.isDirty.set(true);
  }

  addWorkspace(): void {
    const next: EditableWorkspace = {
      id:          `ws-${Date.now()}`,
      label:       'New Workspace',
      description: '',
      icon:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`,
      route:       '/feature/',
      masterPages: [],
      isEnabled:   true,
      sortOrder:   this.editableList().length
    };
    this.editableList.update(list => [...list, next]);
    this.isDirty.set(true);
  }

  removeWorkspace(id: string): void {
    this.editableList.update(list =>
      list.filter(ws => ws.id !== id).map((ws, i) => ({ ...ws, sortOrder: i }))
    );
    this.isDirty.set(true);
  }

  // ── MasterPage operations ─────────────────────────────────────────────────

  addMasterPage(id: string): void {
    this.editableList.update(list =>
      list.map(ws => ws.id === id
        ? { ...ws, masterPages: [...ws.masterPages, { kind: 'new', label: 'New Action', icon: '', route: ws.route } as WorkspaceMasterPage] }
        : ws
      )
    );
    this.isDirty.set(true);
  }

  removeMasterPage(wsId: string, index: number): void {
    this.editableList.update(list =>
      list.map(ws => ws.id === wsId
        ? { ...ws, masterPages: ws.masterPages.filter((_, i) => i !== index) }
        : ws
      )
    );
    this.isDirty.set(true);
  }

  updateMasterPage(wsId: string, index: number, field: keyof WorkspaceMasterPage, value: string): void {
    this.editableList.update(list =>
      list.map(ws => ws.id === wsId
        ? {
            ...ws,
            masterPages: ws.masterPages.map((p, i) =>
              i === index ? { ...p, [field]: value } : p
            )
          }
        : ws
      )
    );
    this.isDirty.set(true);
  }

  // ── Persist & Apply ────────────────────────────────────────────────────────

  /** Save to localStorage and immediately apply to WorkspaceService */
  saveAndApply(): void {
    const list = this.editableList();
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(list));

    const applied = list
      .filter(ws => ws.isEnabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    this.workspaceService.applyCustomConfig(applied);
    this.isDirty.set(false);
  }

  /** Revert all unsaved changes back to last saved state */
  discardChanges(): void {
    this.init();
  }

  /** Remove admin config — next reload will use API / static fallback */
  resetToDefault(): void {
    localStorage.removeItem(ADMIN_CONFIG_KEY);
    const source = STATIC_WORKSPACES;
    this.editableList.set(source.map((ws, i) => ({ ...ws, isEnabled: true, sortOrder: i })));
    this.workspaceService.applyCustomConfig(source);
    this.isDirty.set(false);
  }
}
