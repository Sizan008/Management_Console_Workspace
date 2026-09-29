/**
 * localStorage keys that hold user preferences rather than session state.
 *
 * Logout wipes storage to drop the session, but preferences are meant to outlive
 * it — otherwise every setting on the User Preferences page silently resets when
 * the user signs out. Anything matching these prefixes is carried across.
 *
 * Keys listed here MUST be built with scopedKey(), since surviving logout means
 * surviving into the next person's session on a shared browser.
 *
 * (The theme is not here: ThemeService persists it in a cookie, which logout
 * never touched in the first place.)
 */
export const PERSISTENT_PREFERENCE_PREFIXES = ['ws_default', 'user_preferences'];

/**
 * Whose preferences we are reading or writing. Falls back to 'anonymous' when
 * called before Keycloak has decoded the token, so a key is always well-formed;
 * services that can be constructed that early re-read once the id is known.
 */
export function currentUserScope(): string {
  return sessionStorage.getItem('userId') || localStorage.getItem('userId') || 'anonymous';
}

/** Per-user storage key, e.g. `user_preferences:jdoe`. */
export function scopedKey(base: string): string {
  return `${base}:${currentUserScope()}`;
}

/**
 * Clears storage the way logout needs, minus the preference keys above.
 */
export function clearStorageKeepingPreferences(): void {
  const preserved: Array<[string, string]> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !PERSISTENT_PREFERENCE_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
    const value = localStorage.getItem(key);
    if (value !== null) preserved.push([key, value]);
  }

  localStorage.clear();
  sessionStorage.clear();

  preserved.forEach(([key, value]) => localStorage.setItem(key, value));
}
