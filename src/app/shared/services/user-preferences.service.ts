import { Injectable, signal } from '@angular/core';
import type { DateFormat } from '../common-components/input-types/input-date/input-date';
import { currentUserScope, scopedKey } from './persistent-preferences';

export type RowOpenBehavior = 'panel' | 'fullpage';

/** 'none' = no global date format; date fields use their own/default format. */
export type DateFormatPreference = DateFormat | 'none';

/**
 * NOTE: the default workspace is deliberately NOT here. It is owned by
 * WorkspaceService (see applyDefaultWorkspace) so the navbar star and the
 * "Default Workspace" list in this page stay one setting instead of two stores
 * that drift — and so it survives logout, which clears this blob.
 */
export interface UserPreferences {
  rowOpenBehavior: RowOpenBehavior;
  sidebarDefaultExpanded: boolean;
  dateFormat: DateFormatPreference;
}

/**
 * Prefix, suffixed with the user id by scopedKey(). Preferences deliberately
 * outlive logout (see PERSISTENT_PREFERENCE_PREFIXES), so without the scope the
 * next person to sign in on this browser would inherit the previous user's
 * settings.
 */
const STORAGE_KEY = 'user_preferences';

export const PREFERENCE_DEFAULTS: UserPreferences = {
  rowOpenBehavior: 'panel',
  sidebarDefaultExpanded: true,
  dateFormat: 'DD/MM/YYYY'
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly _prefs = signal<UserPreferences>({ ...PREFERENCE_DEFAULTS });

  /** Scope the loaded values belong to, so a change of user triggers a re-read. */
  private loadedScope: string | null = null;

  readonly prefs = this._prefs.asReadonly();

  constructor() {
    this.load();
  }

  /**
   * Re-reads the stored preferences if the signed-in user has resolved (or
   * changed) since they were last loaded. This service is a singleton and can be
   * constructed before Keycloak decodes the token, at which point the scoped key
   * isn't readable yet; consumers call this from ngOnInit to catch up.
   */
  refresh(): void {
    if (this.loadedScope === currentUserScope()) return;
    this.load();
  }

  private load(): void {
    this.loadedScope = currentUserScope();
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEY));
      const parsed = stored ? JSON.parse(stored) as Partial<UserPreferences> : {};
      this._prefs.set({ ...PREFERENCE_DEFAULTS, ...parsed });
    } catch {
      this._prefs.set({ ...PREFERENCE_DEFAULTS });
    }
  }

  update(partial: Partial<UserPreferences>): void {
    this._prefs.update(current => ({ ...current, ...partial }));
  }

  save(): void {
    this.loadedScope = currentUserScope();
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(this._prefs()));
  }

  reset(): void {
    this._prefs.set({ ...PREFERENCE_DEFAULTS });
    localStorage.removeItem(scopedKey(STORAGE_KEY));
  }
}
