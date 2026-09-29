import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WorkspaceStateService {
  isFullscreen = signal(false);
  selectedRow = signal<any>(null);

  toggle(): void {
    this.isFullscreen.update(v => !v);
  }
}
