import { Injectable, OnDestroy, Renderer2, RendererFactory2 } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { AuthUtils } from '../../core/auth/auth.utils';

/**
 * Last-activity timestamp, in localStorage so every open tab shares one clock.
 * Without this each tab times out on its own and an idle tab logs out the tab
 * the user is actually working in (logout broadcasts to all tabs).
 */
const LAST_ACTIVITY_KEY = 'last-activity-at';

/** Whether analytics tracking is on. Session locking never consults this. */
const TRACKER_ENABLED_KEY = 'trackerEnabled';

@Injectable({ providedIn: 'root' })
export class GlobalActivityTrackerService implements OnDestroy {
  private renderer: Renderer2;
  private trackingEnabled: boolean;
  private previousRoute: string | null = null;
  private previousFunctionId: string | null = null;
  private currentRoute: string | null = null;
  private initialized = false;

  // Inactivity timeout (default fallback: 5 minutes)
  private readonly DEFAULT_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
  /** Floor, so a misconfigured 0 or 1s can't log the user out on sight. */
  private readonly MIN_INACTIVITY_TIMEOUT_MS = 10 * 1000;
  /** Ceiling: anything longer isn't a screen lock, and huge delays overflow timers. */
  private readonly MAX_INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
  /** How long before the lock the countdown warning appears. */
  private readonly WARNING_LEAD_MS = 30 * 1000;
  /** Idle check cadence. 1s so the warning countdown ticks smoothly. */
  private readonly TICK_MS = 1000;
  /** Cheapest way to survive `pointermove`: write at most one timestamp a second. */
  private readonly ACTIVITY_WRITE_THROTTLE_MS = 1000;

  private timeoutMs = this.DEFAULT_INACTIVITY_TIMEOUT_MS;
  private cachedTokenRaw: string | null = null;
  private cachedTokenPayload: any | null = null;
  private tickTimer: any;
  private lastActivityWriteAt = 0;
  private unlisteners: Array<() => void> = [];
  private routerSub?: Subscription;

  private inactivitySubject = new Subject<void>();
  public inactivity$ = this.inactivitySubject.asObservable();

  /** Seconds left before the lock while inside the warning window, else null. */
  private warningSubject = new BehaviorSubject<number | null>(null);
  public inactivityWarning$ = this.warningSubject.asObservable();

  constructor(private router: Router, rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.trackingEnabled = localStorage.getItem(TRACKER_ENABLED_KEY) !== 'false';
    this.init();
  }

  /** Enable or disable *analytics* tracking. The session lock is unaffected. */
  enable() { this.setTracking(true); }
  disable() { this.setTracking(false); }
  isTrackingEnabled(): boolean { return this.trackingEnabled; }

  private setTracking(enabled: boolean): void {
    this.trackingEnabled = enabled;
    localStorage.setItem(TRACKER_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  /** Centralized init guard (avoid reinit on hot reloads) */
  private init() {
    if (this.initialized) return;
    this.initialized = true;

    this.initRouterTracking();
    this.initActivityListeners();
    this.initClickTracking();
    this.initFormFieldTracking();

    // Start watching immediately; refreshInactivityTimer() re-reads the real
    // timeout as soon as a token is decoded.
    this.markActivity(true);
    this.startInactivityWatch();
  }

  ngOnDestroy(): void {
    this.stopInactivityWatch();
    this.unlisteners.forEach(unlisten => unlisten());
    this.unlisteners = [];
    this.routerSub?.unsubscribe();
  }

  // ---------------------------------------------------------------------------
  // Session lock
  // ---------------------------------------------------------------------------

  /**
   * Re-read the timeout from the current token and restart the watch.
   *
   * Deliberately does NOT count as activity: this runs on every silent Keycloak
   * token refresh, so treating it as activity would keep an idle session alive
   * forever. Idle time carries over from the shared timestamp instead.
   */
  public refreshInactivityTimer(): void {
    this.timeoutMs = this.resolveInactivityTimeout();
    console.log(`⏱️ Inactivity timeout set to ${this.timeoutMs}ms`);
    this.startInactivityWatch();
  }

  /** Called by the warning dialog's "Stay signed in". */
  public extendSession(): void {
    this.markActivity(true);
  }

  /** Stop locking entirely — used on logout so the timer can't fire again. */
  public stopInactivityWatch(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
    if (this.warningSubject.value !== null) {
      this.warningSubject.next(null);
    }
  }

  private startInactivityWatch(): void {
    this.stopInactivityWatch();
    this.tickTimer = setInterval(() => this.tick(), this.TICK_MS);
  }

  /**
   * Polls elapsed idle time rather than arming a long setTimeout: it reads the
   * shared timestamp (so activity in any tab counts), can't overflow a timer
   * delay, and a suspended/slept machine is detected on wake instead of firing
   * an already-stale timeout.
   */
  private tick(): void {
    const remainingMs = this.timeoutMs - (Date.now() - this.readLastActivity());

    if (remainingMs <= 0) {
      this.stopInactivityWatch();
      console.warn(`⏱️ Inactivity timeout (${this.timeoutMs}ms) reached - user will be logged out`);
      this.inactivitySubject.next();
      return;
    }

    // Short timeouts get a proportionally shorter warning, so the countdown is
    // never most of the session.
    const warnAtMs = Math.min(this.WARNING_LEAD_MS, Math.floor(this.timeoutMs / 3));
    const seconds = remainingMs <= warnAtMs ? Math.ceil(remainingMs / 1000) : null;
    if (seconds !== this.warningSubject.value) {
      this.warningSubject.next(seconds);
    }
  }

  /** Record that the user is present. Throttled; `force` bypasses the throttle. */
  private markActivity(force = false): void {
    if (this.warningSubject.value !== null) {
      this.warningSubject.next(null);
    }

    const now = Date.now();
    if (!force && now - this.lastActivityWriteAt < this.ACTIVITY_WRITE_THROTTLE_MS) return;
    this.lastActivityWriteAt = now;

    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch (error) {
      console.error('Unable to record activity timestamp', error);
    }
  }

  private readLastActivity(): number {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const parsed = raw !== null ? Number(raw) : NaN;

    // Missing or corrupt (first run, or storage cleared on logout) must not read
    // as "idle since epoch" and log the user straight out.
    if (!Number.isFinite(parsed)) {
      const now = Date.now();
      this.lastActivityWriteAt = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch { /* storage unavailable; treat this tick as active */ }
      return now;
    }

    // A future timestamp (clock change) would otherwise extend the session
    // indefinitely.
    return Math.min(parsed, Date.now());
  }

  /**
   * Every listener here feeds the session lock, deliberately outside the
   * `trackingEnabled` guard: turning analytics off must not disable the lock,
   * and a user who is typing or scrolling without clicking is still active.
   */
  private initActivityListeners(): void {
    const cheap: Array<[string, AddEventListenerOptions]> = [
      ['click', { capture: true }],
      ['keydown', { capture: true }],
      ['pointerdown', { capture: true }],
      ['touchstart', { capture: true, passive: true }],
      ['pointermove', { capture: true, passive: true }],
      ['wheel', { capture: true, passive: true }],
      // scroll doesn't bubble from inner scrollers, so capture is required
      ['scroll', { capture: true, passive: true }],
      ['input', { capture: true }],
    ];

    cheap.forEach(([event, options]) => {
      this.unlisteners.push(
        this.renderer.listen('document', event, () => this.markActivity(), options)
      );
    });
  }

  /** Extract inactivity timeout from token's screenLockTime or screenTime field */
  private resolveInactivityTimeout(): number {
    try {
      const payload = this.tokenPayload();
      if (!payload) {
        return this.DEFAULT_INACTIVITY_TIMEOUT_MS;
      }

      // Check for screenLockTime first, then fall back to screenTime
      const rawValue = payload.screenLockTime !== undefined ? payload.screenLockTime : payload.screenTime;

      console.log('⏱️ Raw timeout setting from token (screenLockTime/screenTime):', rawValue);

      if (rawValue === undefined || rawValue === null) {
        return this.DEFAULT_INACTIVITY_TIMEOUT_MS;
      }

      // If it's a number, assume it's in minutes (matching the default behavior)
      // or if it's a string that's just a number.
      if (typeof rawValue === 'number') {
        return this.clampTimeout(rawValue * 60 * 1000);
      }

      const screenLockTimeStr = String(rawValue).trim();

      // Parse "5min", "10m", "1h", etc.
      const match = screenLockTimeStr.match(/^(\d+)\s*(\w+)?$/);
      if (!match) {
        // If it's just a string number like "30", treat as minutes
        const numOnly = parseInt(screenLockTimeStr, 10);
        if (!isNaN(numOnly)) {
          return this.clampTimeout(numOnly * 60 * 1000);
        }
        return this.DEFAULT_INACTIVITY_TIMEOUT_MS;
      }

      const value = parseInt(match[1], 10);
      const unit = (match[2] || 'min').toLowerCase();

      let timeoutMs: number;
      switch (unit) {
        case 's':
        case 'sec':
        case 'seconds':
          timeoutMs = value * 1000;
          break;
        case 'm':
        case 'min':
        case 'minutes':
          timeoutMs = value * 60 * 1000;
          break;
        case 'h':
        case 'hour':
        case 'hours':
          timeoutMs = value * 60 * 60 * 1000;
          break;
        default:
          return this.DEFAULT_INACTIVITY_TIMEOUT_MS;
      }

      return this.clampTimeout(timeoutMs);
    } catch (error) {
      console.error('Error parsing timeout from token:', error);
      return this.DEFAULT_INACTIVITY_TIMEOUT_MS;
    }
  }

  /**
   * A non-positive value (e.g. `screenLockTime: 0` meaning "unset") would lock
   * the screen on the next tick, so it falls back to the default instead of
   * locking the user out of the app.
   */
  private clampTimeout(timeoutMs: number): number {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      console.warn(`⏱️ Ignoring unusable timeout (${timeoutMs}ms); using default`);
      return this.DEFAULT_INACTIVITY_TIMEOUT_MS;
    }
    return Math.min(Math.max(timeoutMs, this.MIN_INACTIVITY_TIMEOUT_MS), this.MAX_INACTIVITY_TIMEOUT_MS);
  }

  // ---------------------------------------------------------------------------
  // Analytics tracking
  // ---------------------------------------------------------------------------

  /** Retrieve currently active functionId from localStorage */
  private getCurrentFunctionId(): string | null {
    return localStorage.getItem('currentFunctionId');
  }

  /**
   * Decoding is cached per token: these getters run on every tracked event, and
   * a base64 + JSON.parse per click (as before) is pure waste.
   */
  private tokenPayload(): any | null {
    const accessToken = sessionStorage.getItem('access_token');
    if (!accessToken) return null;
    if (accessToken === this.cachedTokenRaw) return this.cachedTokenPayload;

    this.cachedTokenRaw = accessToken;
    try {
      this.cachedTokenPayload = AuthUtils._decodeToken(accessToken);
    } catch (error) {
      console.error('Unable to decode access token', error);
      this.cachedTokenPayload = null;
    }
    return this.cachedTokenPayload;
  }

  private get branchId(): string {
    return sessionStorage.getItem('officeId') || this.tokenPayload()?.officeId || '';
  }

  private get orgId(): string {
    return this.tokenPayload()?.orgId || '';
  }

  //  PAGE NAVIGATION TRACKING
  private initRouterTracking() {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.markActivity();

        if (!this.trackingEnabled) return;

        const newRoute = event.urlAfterRedirects;

        const payload = {
          eventType: 'PAGE_NAVIGATION',
          previousRoute: this.previousRoute,
          previousFunctionId: this.previousFunctionId,
          currentRoute: newRoute,
          functionId: this.getCurrentFunctionId(),
          branchId: this.branchId,
          orgId: this.orgId,
          timestamp: new Date(),
        };

        console.log('🧾 Activity:', payload);
        this.sendToBackend(payload);

        this.previousRoute = this.currentRoute;
        this.previousFunctionId = this.getCurrentFunctionId();
        this.currentRoute = newRoute;
      });
  }

  // 🖱️ BUTTON CLICK TRACKING
  private initClickTracking() {
    this.unlisteners.push(this.renderer.listen('document', 'click', (event: MouseEvent) => {
      if (!this.trackingEnabled) return;

      const target = event.target as HTMLElement;

      if (!target) return;

      // Ignore routerLink buttons
      if (target.closest('a[routerLink], button[routerLink]')) return;

      // Detect button click (direct or inside button)
      const buttonEl = target.closest('button');
      if (buttonEl) {
        const label = this.getButtonLabel(buttonEl);
        const payload = {
          eventType: 'BUTTON_CLICK',
          currentRoute: this.currentRoute,
          functionId: this.getCurrentFunctionId(),
          label: label,
          id: buttonEl.id,
          cls: buttonEl.className,
          branchId: this.branchId,
          orgId: this.orgId,
          timestamp: new Date(),
        };

        console.log('🧾 Activity:', payload);
        this.sendToBackend(payload);
      }
    }));
  }

  private getButtonLabel(buttonEl: HTMLElement): string {
    const text = buttonEl.textContent?.trim();
    if (text) return text;

    const ariaLabel = buttonEl.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const tooltip = buttonEl.getAttribute('mattooltip') ?? buttonEl.getAttribute('matTooltip');
    if (tooltip) return tooltip;

    if (buttonEl.querySelector('svg')) return 'ICON_SVG';
    const matIcon = buttonEl.querySelector('mat-icon');
    if (matIcon) return matIcon.textContent?.trim() ?? 'ICON_MAT';

    return 'UNKNOWN';
  }

  /**
   * Field values travel with the payload, so anything secret has to be dropped
   * here rather than at the backend — it is logged to the console either way.
   */
  private isSensitiveField(el: HTMLElement): boolean {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'password') return true;

    const name = `${el.id} ${el.getAttribute('name') || ''} ${el.getAttribute('formControlName') || ''}`.toLowerCase();
    return /pass|pwd|pin|otp|secret|token|cvv|cardno|card_no/.test(name);
  }

  // 🧾 FORM FIELD TRACKING
  private initFormFieldTracking() {
    // Blur event → input/textarea/select loses focus
    this.unlisteners.push(this.renderer.listen('document', 'blur', (event: FocusEvent) => {
      if (!this.trackingEnabled) return;

      const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      if (!target) return;

      const tag = target.tagName.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        const payload = {
          eventType: 'FIELD_INTERACTION',
          currentRoute: this.currentRoute,
          functionId: this.getCurrentFunctionId(),
          tag,
          id: target.id || target.getAttribute('formControlName') || '',
          cls: target.className,
          branchId: this.branchId,
          orgId: this.orgId,
          value: this.isSensitiveField(target) ? '***' : (target as any).value,
          timestamp: new Date(),
        };

        console.log('🧾 Activity:', payload);
        this.sendToBackend(payload);
      }
    }, { capture: true }));

    // Select change → capture option selection
    this.unlisteners.push(this.renderer.listen('document', 'change', (event: Event) => {
      this.markActivity();

      if (!this.trackingEnabled) return;

      const target = event.target as HTMLSelectElement | HTMLInputElement;

      if (!target) return;

      const tag = target.tagName.toUpperCase();
      if (tag === 'SELECT') {
        const payload = {
          eventType: 'SELECT_CHANGE',
          currentRoute: this.currentRoute,
          functionId: this.getCurrentFunctionId(),
          id: target.id || target.getAttribute('formControlName') || '',
          cls: target.className,
          value: target.value,
          branchId: this.branchId,
          orgId: this.orgId,
          timestamp: new Date(),
        };

        console.log('🧾 Activity:', payload);
        this.sendToBackend(payload);
      }
    }));
  }

  // 🌐 Send payload to backend (use HttpClient later if needed)
  private sendToBackend(payload: any) {
    // if (!this.trackingEnabled) return;

    // fetch('http://localhost:8085/api/activity/save', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // }).catch(err => console.error('Tracking error:', err));
  }
}
