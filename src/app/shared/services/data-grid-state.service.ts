import { Injectable } from '@angular/core';

export interface DataGridState {
  // No pageSize/pageIndex/searchTerm: every visit to a grid starts from that grid's own
  // `initPageSize`, on page 1, with an empty search box. Coming back to a screen and
  // finding it still rendering 500 rows — or sitting on a page index that belonged to a
  // different page size — read as the grid having loaded the wrong thing.
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class DataGridStateService {
  private readonly STORAGE_KEY_PREFIX = 'datagrid_state_';

  /**
   * Save the state of a data grid
   * @param id Unique identifier for the data grid
   * @param state State object to save
   */
  saveState(id: string, state: DataGridState): void {
    if (!id) return;

    try {
      // Load existing state to merge if necessary, or just overwrite
      const currentState = this.getState(id) || {};
      const newState = { ...currentState, ...state };

      sessionStorage.setItem(this.STORAGE_KEY_PREFIX + id, JSON.stringify(newState));
    } catch (e) {
      console.warn('Failed to save DataGrid state to sessionStorage', e);
    }
  }

  /**
   * Retrieve the saved state of a data grid
   * @param id Unique identifier for the data grid
   * @returns The saved state or null if not found
   */
  getState(id: string): DataGridState | null {
    if (!id) return null;

    try {
      const savedState = sessionStorage.getItem(this.STORAGE_KEY_PREFIX + id);
      return savedState ? JSON.parse(savedState) : null;
    } catch (e) {
      console.warn('Failed to load DataGrid state from sessionStorage', e);
      return null;
    }
  }

  /**
   * Clear the state of a data grid
   * @param id Unique identifier for the data grid
   */
  clearState(id: string): void {
    if (!id) return;
    sessionStorage.removeItem(this.STORAGE_KEY_PREFIX + id);
  }
}
