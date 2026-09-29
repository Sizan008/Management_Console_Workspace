import { Injectable } from '@angular/core';
import { WidgetLayoutPosition } from '../models/dashboard.model';

/**
 * Browser-level persistence for per-user dashboard layouts.
 *
 * Uses IndexedDB on purpose — NOT localStorage. The app's logout handlers
 * (auth.service.ts, sidebar.ts) call localStorage.clear() / sessionStorage.clear(),
 * which would wipe a layout stored there. IndexedDB is a separate browser store
 * those calls do not touch, so a user's saved layout survives logout/login.
 *
 * Entries are keyed by `${userId}_${dashboardId}` so each user keeps their own
 * layout per dashboard on the same browser.
 */
@Injectable({ providedIn: 'root' })
export class LayoutStorageService {
  private static readonly DB_NAME = 'acquirehub_ui';
  private static readonly STORE   = 'dashboard_layouts';
  private static readonly VERSION = 1;

  private dbPromise?: Promise<IDBDatabase>;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(LayoutStorageService.DB_NAME, LayoutStorageService.VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LayoutStorageService.STORE)) {
          db.createObjectStore(LayoutStorageService.STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private key(userId: string, dashboardId: number): string {
    return `${userId}_${dashboardId}`;
  }

  /** Returns the saved layout for this user+dashboard, or `{}` if none / on error. */
  async load(userId: string, dashboardId: number): Promise<Record<number, WidgetLayoutPosition>> {
    try {
      const db = await this.openDb();
      return await new Promise((resolve) => {
        const tx  = db.transaction(LayoutStorageService.STORE, 'readonly');
        const req = tx.objectStore(LayoutStorageService.STORE).get(this.key(userId, dashboardId));
        req.onsuccess = () => resolve((req.result as Record<number, WidgetLayoutPosition>) ?? {});
        req.onerror   = () => resolve({});
      });
    } catch {
      return {};
    }
  }

  /** Persists the layout for this user+dashboard. Best-effort — errors are swallowed. */
  async save(userId: string, dashboardId: number, layout: Record<number, WidgetLayoutPosition>): Promise<void> {
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(LayoutStorageService.STORE, 'readwrite');
        tx.objectStore(LayoutStorageService.STORE).put(layout, this.key(userId, dashboardId));
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
      });
    } catch {
      // best-effort; ignore
    }
  }
}
