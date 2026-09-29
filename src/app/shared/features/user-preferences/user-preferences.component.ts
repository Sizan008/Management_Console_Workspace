import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UserPreferencesService, UserPreferences, RowOpenBehavior, DateFormatPreference } from '../../services/user-preferences.service';
import { WorkspaceService } from '../../services/workspace.service';
import { Theme, ThemeService } from '../../services/theme.service';
import { SidebarService } from '../../../layout/service/sidebar.service';

/** A jump target in the left rail; `icon` is an inline SVG string. */
interface PrefSection {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-user-preferences',
  standalone: true,
  templateUrl: './user-preferences.component.html',
  styleUrl: './user-preferences.component.scss'
})
export class UserPreferencesComponent implements OnInit {
  readonly prefsService = inject(UserPreferencesService);
  readonly workspaceService = inject(WorkspaceService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly sidebarService = inject(SidebarService);

  private readonly scrollBody = viewChild<ElementRef<HTMLElement>>('scrollBody');

  draft = signal<UserPreferences>({ ...this.prefsService.prefs() });
  justSaved = signal(false);
  activeSection = signal('startup');

  readonly workspaces = computed(() => this.workspaceService.workspaces());

  /**
   * Pending "Default Workspace" pick. The saved value lives in WorkspaceService
   * (same setting as the navbar star), so this only holds an unsaved override:
   * `undefined` means untouched — follow the service. That matters because the
   * service re-reads the stored default once the workspace list arrives, which is
   * after this page is constructed.
   */
  private readonly draftDefaultWorkspaceId = signal<string | null | undefined>(undefined);

  /** The option the radio list should show as selected. */
  readonly selectedDefaultWorkspaceId = computed<string | null>(() => {
    const draft = this.draftDefaultWorkspaceId();
    return draft === undefined ? this.workspaceService.defaultWorkspaceId() : draft;
  });

  /** Dirty state is derived, so re-picking the current value never arms Save. */
  readonly isDirty = computed(() => {
    const draft = this.draft();
    const saved = this.prefsService.prefs();
    const draftDefaultWs = this.draftDefaultWorkspaceId();
    return (draftDefaultWs !== undefined && draftDefaultWs !== this.workspaceService.defaultWorkspaceId())
      || draft.rowOpenBehavior !== saved.rowOpenBehavior
      || draft.sidebarDefaultExpanded !== saved.sidebarDefaultExpanded
      || draft.dateFormat !== saved.dateFormat;
  });

  /** Themes are applied straight away by ThemeService, so they sit outside the draft. */
  readonly themes: Theme[] = this.themeService.themes;
  currentTheme = signal(this.themeService.getCurrentTheme());

  readonly sections: PrefSection[] = [
    {
      id: 'startup',
      label: 'Startup',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z"/></svg>`
    },
    {
      id: 'navigation',
      label: 'Navigation',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/></svg>`
    },
    {
      id: 'formatting',
      label: 'Formatting',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>`
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18"/></svg>`
    }
  ];

  /** Selectable date formats with a worked example (sample date: 18 Aug 2025). */
  readonly dateFormatOptions: { value: DateFormatPreference; example: string }[] = [
    { value: 'DD/MM/YYYY', example: '18/08/2025' },
    { value: 'MM/DD/YYYY', example: '08/18/2025' },
    { value: 'YYYY/MM/DD', example: '2025/08/18' },
    { value: 'DD-MM-YYYY', example: '18-08-2025' },
    { value: 'MM-DD-YYYY', example: '08-18-2025' },
    { value: 'YYYY-MM-DD', example: '2025-08-18' },
    { value: 'DD MMM, YYYY', example: '18 Aug, 2025' }
  ];

  ngOnInit(): void {
    // Picks up this user's stored values if the singleton was first constructed
    // before Keycloak resolved the user id.
    this.prefsService.refresh();
    this.draft.set({ ...this.prefsService.prefs() });
    this.draftDefaultWorkspaceId.set(undefined);
    if (this.workspaces().length === 0) {
      this.workspaceService.loadWorkspaces();
    }
    this.themeService.currentTheme$.subscribe(id => this.currentTheme.set(id));
  }

  // ─── Draft edits ──────────────────────────────────────────────────────────

  /** `null` is the "No default" option. */
  setDefaultWorkspace(id: string | null): void {
    this.draftDefaultWorkspaceId.set(id);
  }

  setRowOpenBehavior(behavior: RowOpenBehavior): void {
    this.draft.update(d => ({ ...d, rowOpenBehavior: behavior }));
  }

  setSidebarDefaultExpanded(expanded: boolean): void {
    this.draft.update(d => ({ ...d, sidebarDefaultExpanded: expanded }));
  }

  setDateFormat(format: DateFormatPreference): void {
    this.draft.update(d => ({ ...d, dateFormat: format }));
  }

  // ─── Theme (applied immediately) ───────────────────────────────────────────

  selectTheme(id: string): void {
    this.themeService.applyTheme(id);
  }

  resetTheme(): void {
    this.themeService.resetTheme();
  }

  themeGradient(theme: Theme): string {
    return `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`;
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  save(): void {
    this.prefsService.update(this.draft());
    this.prefsService.save();

    // Sidebar reads this preference once per app load, so push the new choice
    // through for the current session too — otherwise picking "start collapsed"
    // appears to do nothing until the next reload.
    this.sidebarService.setSidebarState(this.draft().sidebarDefaultExpanded);

    // Hands the default workspace back to its owner, which also refreshes the
    // navbar star and the route the app opens on next login. Only written when
    // actually re-picked, so saving an unrelated preference can't disturb it.
    if (this.draftDefaultWorkspaceId() !== undefined) {
      this.workspaceService.applyDefaultWorkspace(this.selectedDefaultWorkspaceId());
      this.draftDefaultWorkspaceId.set(undefined);
    }

    this.justSaved.set(true);
    setTimeout(() => this.justSaved.set(false), 2500);
  }

  discard(): void {
    this.draft.set({ ...this.prefsService.prefs() });
    this.draftDefaultWorkspaceId.set(undefined);
  }

  reset(): void {
    if (confirm('Reset all preferences to defaults?')) {
      this.prefsService.reset();
      this.draft.set({ ...this.prefsService.prefs() });
      this.workspaceService.applyDefaultWorkspace(null);
      this.draftDefaultWorkspaceId.set(undefined);
    }
  }

  // ─── Section rail ─────────────────────────────────────────────────────────

  goToSection(id: string): void {
    const host = this.scrollBody()?.nativeElement;
    const target = host?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!host || !target) return;

    const offset = target.getBoundingClientRect().top - host.getBoundingClientRect().top;
    host.scrollTo({ top: host.scrollTop + offset - 12, behavior: 'smooth' });
    this.activeSection.set(id);
  }

  /** Highlights the rail entry for the section currently nearest the top. */
  onBodyScroll(): void {
    const host = this.scrollBody()?.nativeElement;
    if (!host) return;

    const hostTop = host.getBoundingClientRect().top;
    let current = this.sections[0].id;
    for (const node of Array.from(host.querySelectorAll<HTMLElement>('[data-section]'))) {
      if (node.getBoundingClientRect().top - hostTop <= 80) {
        current = node.dataset['section'] ?? current;
      }
    }
    this.activeSection.set(current);
  }

  goBack(): void {
    this.router.navigate(['/landing/home']);
  }
}
