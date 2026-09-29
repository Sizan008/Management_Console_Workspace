import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HighlightService {
    private mapSubject = new BehaviorSubject<Record<string, boolean>>({});
    map$ = this.mapSubject.asObservable();

    /** Set once from the container/page (e.g., API result) */
    setMap(map: Record<string, boolean> | null | undefined) {
        this.mapSubject.next(map ?? {});
    }

    /** Synchronous check if a single path is highlighted */
    isOn(path: string | undefined | null): boolean {
        if (!path) return false;
        return !!this.mapSubject.getValue()[path];
    }

    /** Check if any of the candidate keys are highlighted */
    anyOn(paths: string[]): boolean {
        const m = this.mapSubject.getValue();
        return paths.some(p => !!m[p]);
    }
}
