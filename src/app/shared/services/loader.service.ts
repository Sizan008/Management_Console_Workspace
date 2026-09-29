import { Injectable } from '@angular/core';
import { HttpContext, HttpContextToken } from '@angular/common/http';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

/**
 * Per-request opt-out for the global overlay. Prefer this over the legacy
 * `X-Skip-Loader` header — it never reaches the wire and needs no cleanup:
 *
 *   this.http.get(url, { context: skipLoader() })
 *
 * Use it for anything that already renders its own loading state (grids,
 * typeaheads, background polling). The overlay is for blocking work only.
 */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

export function skipLoader(context: HttpContext = new HttpContext()): HttpContext {
  return context.set(SKIP_LOADER, true);
}

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  /** Requests that settle faster than this never paint the overlay at all. */
  private static readonly SHOW_DELAY_MS = 250;
  /** Once painted, stay up this long so it reads as a load and not a flash. */
  private static readonly MIN_VISIBLE_MS = 400;
  /** Requests starting within this window of the last one count as the same load. */
  private static readonly HIDE_GRACE_MS = 150;
  /** Safety net: a request that never settles must not lock the screen forever. */
  private static readonly MAX_VISIBLE_MS = 20000;

  private active = 0;
  private shownAt = 0;
  private showTimer: any = null;
  private hideTimer: any = null;
  private maxTimer: any = null;

  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading$.pipe(distinctUntilChanged());

  get isLoading(): boolean {
    return this._loading$.value;
  }

  show() {
    this.active++;

    // A request arrived while we were winding the overlay down — the page is
    // still busy, so keep it up instead of hiding and re-showing.
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this._loading$.value || this.showTimer) return;

    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.paint();
    }, LoaderService.SHOW_DELAY_MS);
  }

  hide() {
    if (this.active > 0) this.active--;

    // Still other requests in flight — nothing to do yet.
    if (this.active > 0) return;

    // Finished before the show delay elapsed: cancel, never paint.
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
      return;
    }

    if (!this._loading$.value || this.hideTimer) return;

    const visibleFor = performance.now() - this.shownAt;
    const wait = Math.max(
      LoaderService.HIDE_GRACE_MS,
      LoaderService.MIN_VISIBLE_MS - visibleFor
    );

    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      this.unpaint();
    }, wait);
  }

  /** Force the overlay down and drop the in-flight count (route changes, logout). */
  reset() {
    this.active = 0;
    this.clearTimers();
    this._loading$.next(false);
  }

  private paint() {
    this.shownAt = performance.now();
    this._loading$.next(true);

    this.maxTimer = setTimeout(() => {
      console.warn(
        `[LoaderService] auto-hidden after ${LoaderService.MAX_VISIBLE_MS}ms — ` +
        `${this.active} request(s) never settled`
      );
      this.reset();
    }, LoaderService.MAX_VISIBLE_MS);
  }

  private unpaint() {
    this.clearTimers();
    this._loading$.next(false);
  }

  private clearTimers() {
    for (const timer of [this.showTimer, this.hideTimer, this.maxTimer]) {
      if (timer) clearTimeout(timer);
    }
    this.showTimer = null;
    this.hideTimer = null;
    this.maxTimer = null;
  }
}
