import { Component, HostListener, inject } from '@angular/core';
import { MenuDrawer } from './drawers/menu-drawer/menu-drawer';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Search } from '../navbar/actions/search/search';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, pairwise } from 'rxjs/operators';

import { ModuleDrawer } from './drawers/module-drawer/module-drawer';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';

import { ProfileDrawer } from './drawers/profile-drawer/profile-drawer';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { NovuService } from '../../../shared/services/novu.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { ToastHelperService } from '../../../shared/services/toast-helper.service';
import { ActiveToast } from 'ngx-toastr';
import { SidebarService } from '../../service/sidebar.service';
import { WorkspaceService } from '../../../shared/services/workspace.service';
import { UserPreferencesService } from '../../../shared/services/user-preferences.service';
import { clearStorageKeepingPreferences } from '../../../shared/services/persistent-preferences';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    MenuDrawer,
    ModuleDrawer,
    TitleCasePipe,
    CommonModule,
    ProfileDrawer,
    RouterLink,
    Search
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  // Existing properties
  activeItem: string = '';
  drawerOpen: boolean = false;
  drawerType: string = '';
  http = inject(HttpClient);
  fb = inject(FormBuilder);
  router = inject(Router);
  errorMessage: string = '';
  logoutError: boolean = false;
  isLoading: boolean = false;
  coreBaseUrl = environment.apiBaseUrl;
  activeTheme: string = localStorage.getItem('selectedTheme') || '';
  public notifications$: Observable<number>;
  public messages$: Observable<number>;
  isMobile = false;
  toastr = inject(ToastHelperService);
  // New property for sidebar expansion
  sidebarExpanded: boolean = true;
  isMobileOpen: boolean = false;

  /**
   * Gates the rail's width transition (.sidebar-animate in sidebar.scss). False
   * for the first painted frame so a mount is instant, then true for the life of
   * the instance so the hamburger still animates. Without the gate, the rebuild
   * that happens on every cross-branch navigation animated 220px → 56px.
   */
  animateWidth = false;
  private subs = new Subscription();
  private themeSub?: Subscription;

  // Coalescing state for the "new notifications" toast: while a burst is on
  // screen we keep a single popup showing the running total instead of stacking
  // one popup per notification.
  private notificationToast?: ActiveToast<any>;
  private newNotificationCount = 0;

  // User display info for bottom profile card
  userName: string = '';
  userRole: string = '';
  userInitials: string = '';

  /** Sidebar LC Cases link follows the active workspace */
  get workspaceRoute(): string {
    return this.workspaceService.activeWorkspace()?.route ?? '';
  }

  /**
   * Which nav item each sidebar route highlights. The highlight is derived from
   * the URL rather than from clicks alone, so navigations that start elsewhere
   * (picking a workspace in the navbar, a breadcrumb, the browser back button)
   * also clear it — otherwise e.g. Config stayed lit after switching workspace.
   * Keep in sync with the routerLinks in sidebar.html.
   */
  private readonly navItemRoutes: ReadonlyArray<{ item: string; route: string }> = [
    { item: 'Functions', route: '/feature/settings/functions' },
    { item: 'Config',    route: '/feature/settings/config' },
    { item: 'Report',    route: '/rpt/report-generation' },
    { item: 'Dashboard', route: '/landing/dashboard' },
    { item: 'Approval',  route: '/poc/approval-items' },
  ];

  /** Highlights the nav item owning this URL, or nothing when it owns none. */
  private syncActiveItemFromUrl(url: string): void {
    const path = url.split(/[?#]/)[0].toLowerCase();
    const match = this.navItemRoutes.find(
      nav => path === nav.route || path.startsWith(nav.route + '/')
    );
    this.activeItem = match?.item ?? '';
  }

  // Icon map: logical name → filename per theme
  private readonly iconMap: Record<string, Record<string, string>> = {
    menu:        { blue: 'menu1',      rose: 'roseMenu',         MidnightBlue: 'menu_midnight',      emerald: 'greenMenu',      purple: 'purpleMenu',      Lavendar: 'lavendarMenu',      dark: 'blackMenu' },
    application: { blue: 'application',rose: 'roseApplication',  MidnightBlue: 'midnightApplication',emerald: 'greenApplication',purple: 'purpleApplication',Lavendar: 'lavendarApplication',dark: 'blackApplication' },
    dashboard:   { blue: 'dashboard1', rose: 'roseDashboard',    MidnightBlue: 'midnightDashboard',  emerald: 'greenDashboard', purple: 'purpleDashboard', Lavendar: 'lavendarDashboard', dark: 'blackDashboard' },
    report:      { blue: 'report',     rose: 'roseReport',       MidnightBlue: 'midnightReport',     emerald: 'greenReport',    purple: 'purpleReport',    Lavendar: 'lavendarReport',    dark: 'blackReport' },
    security:    { blue: 'security',   rose: 'roseSecurity',     MidnightBlue: 'midnightSecurity',   emerald: 'greenSecurity',  purple: 'purpleSecurity',  Lavendar: 'lavendarSecurity',  dark: 'blackSecurity' },
    profile:     { blue: 'profile3',   rose: 'roseProfile',      MidnightBlue: 'midnightProfile',    emerald: 'greenProfile',   purple: 'purpleProfile',   Lavendar: 'lavendarProfile',   dark: 'blackProfile' },
    logout:      { blue: 'logout1',    rose: 'roseLogout',       MidnightBlue: 'midnightLogout',     emerald: 'greenLogout',    purple: 'purpleLogout',    Lavendar: 'lavendarLogout',    dark: 'blackLogout' },
  };

  /** Returns the correct themed icon URL for a given logical name */
  getIcon(name: string): string {
    const themeIcons = this.iconMap[name];
    if (!themeIcons) return `/asset/icons/${name}.svg`;
    const file = themeIcons[this.activeTheme] ?? themeIcons['blue'];
    return `/asset/icons/${file}.svg`;
  }
  constructor(private themeService: ThemeService,
    public authService: AuthService,
    private sidebarService: SidebarService,
    private workspaceService: WorkspaceService,
    public notificationService: NotificationService,
    private novuService: NovuService,
    private userPreferencesService: UserPreferencesService
  ) {
    this.notifications$ = this.novuService.getUnreadCount();
    this.messages$ = this.notificationService.messages$;

    // Seed from the live state rather than the field default, so a sidebar
    // rebuilt mid-session (navigation across route branches destroys Layout)
    // paints at its current width on the first frame instead of starting
    // expanded and animating down.
    this.sidebarExpanded = this.sidebarService.isSidebarExpanded;
  }

  // Toggle sidebar expansion (Gmail-style)
  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    this.sidebarService.setSidebarState(this.sidebarExpanded);
  }

  toggleMobileSidebar(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  ngOnInit(): void {
    //  Subscribe to theme changes
    this.themeSub = this.themeService.currentTheme$.subscribe(themeId => {
      this.activeTheme = themeId;
    });

    // Keep the nav highlight tied to the URL, for this page and every later one.
    this.syncActiveItemFromUrl(this.router.url);
    this.subs.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(event => {
          this.syncActiveItemFromUrl(event.urlAfterRedirects || this.router.url);
        })
    );

    // Apply the user's preferred sidebar state on application open.
    // refresh() first: this service can be constructed before Keycloak decodes
    // the token, and until the user scope resolves prefs() still holds
    // PREFERENCE_DEFAULTS (sidebarDefaultExpanded: true) — so a saved "start
    // collapsed" was read as "start expanded".
    // applyDefaultSidebarState (not setSidebarState) because ngOnInit re-runs on
    // every navigation that crosses a route branch; see the service for why.
    this.userPreferencesService.refresh();
    this.sidebarService.applyDefaultSidebarState(
      this.userPreferencesService.prefs().sidebarDefaultExpanded
    );

    this.subs.add(
      this.sidebarService.sidebarExpanded$.subscribe(expanded => {
        this.sidebarExpanded = expanded;
      })
    );

    this.subs.add(
      this.sidebarService.drawerOpen$.subscribe(open => {
        this.drawerOpen = open;
      })
    );

    // "View all messages" (navbar message popover) opens the Personalization
    // drawer, where the profile drawer expands its Messaging section.
    this.subs.add(
      this.sidebarService.openMessaging$.subscribe(() => {
        this.drawerType = 'Personalization';
        this.setActiveItem('Personalization');
        this.sidebarService.openDrawer();
      })
    );

    // Show a single toast for a burst of notifications instead of one per
    // notification. debounceTime collapses near-simultaneous arrivals into one
    // settled count; pairwise compares it against the previous settled count so
    // we only alert on a real increase (and never toast the pre-existing count
    // on initial load). Notifications that trickle in over several seconds are
    // then merged into one running-total popup by showNewNotificationToast().
    this.subs.add(
      this.notifications$.pipe(
        distinctUntilChanged(),
        debounceTime(500),
        pairwise()
      ).subscribe(([prev, curr]) => {
        if (curr > prev) {
          this.showNewNotificationToast(curr - prev);
        }
      })
    );

    // Load user display info for bottom profile card
    const rawId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || 'User';
    this.userName = rawId;
    this.userRole = sessionStorage.getItem('officeNm') || sessionStorage.getItem('userRole') || 'Officer';
    this.userInitials = rawId.split(/[\s._-]+/).map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || rawId.slice(0, 2).toUpperCase();

    this.handleResize();

    // Arm the width transition only once the rail has been painted at its real
    // width. Double rAF is the "after first paint" idiom: the inner callback
    // runs on the frame after the one that rendered this mount, so the browser
    // has no previous width to animate from. zone.js patches rAF, so change
    // detection picks the flag up and .sidebar-animate lands in its own frame —
    // which matters, because adding `transition` in the same style recalc as a
    // width change would not animate at all.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.animateWidth = true;
    }));
  }


  /**
   * Shows (or updates) a single "new notifications" popup for a burst.
   *
   * While a burst is still on screen, each new arrival dismisses the previous
   * popup and shows a fresh one with the accumulated total — so the user sees
   * one popup counting up ("3 new notifications") rather than a stack of
   * "1 new notification" toasts. Replacing the toast also resets its auto-hide
   * timer, keeping it visible for the duration of the burst. When the popup
   * finally times out on its own, the running total resets.
   */
  private showNewNotificationToast(delta: number): void {
    this.newNotificationCount += delta;
    const count = this.newNotificationCount;
    const message = `🔔 You have ${count} new notification${count === 1 ? '' : 's'}!`;

    // Dismiss the stale popup only AFTER wiring up the new one, so its onHidden
    // handler (which fires from this clear) sees notificationToast already
    // pointing at the new toast and therefore skips the counter reset.
    const previous = this.notificationToast;

    const toast = this.toastr.notificationAlert(message);
    this.notificationToast = toast;
    toast.onHidden.subscribe(() => {
      if (this.notificationToast === toast) {
        this.notificationToast = undefined;
        this.newNotificationCount = 0;
      }
    });

    if (previous) {
      this.toastr.clear(previous.toastId);
    }
  }

  @HostListener('window:resize')
  handleResize(): void {
    const width = window.innerWidth;
    this.isMobileOpen = width < 768;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Close drawer when clicking outside of it
    const drawerElement = document.querySelector('.drawer-container');
    const menuButton = document.querySelector('[data-drawer-trigger="Menu"]');
    const moduleButton = document.querySelector('[data-drawer-trigger="Modules"]');
    const profileButton = document.querySelector('[data-drawer-trigger="Personalization"]');

    if (this.drawerOpen && drawerElement &&
      !drawerElement.contains(target) &&
      !menuButton?.contains(target) &&
      !moduleButton?.contains(target) &&
      !profileButton?.contains(target)) {
      this.closeDrawer();
    }

    // Close mobile sidebar when clicking outside of it
    const sidebarElement = document.querySelector('.sidebar-container');
    const sidebarToggleButton = document.querySelector('[data-sidebar-toggle]');

    if (this.sidebarExpanded && this.isMobileOpen && sidebarElement &&
      !sidebarElement.contains(target) &&
      !sidebarToggleButton?.contains(target)) {
      this.toggleSidebar();
    }
  }
  onResize() {
    this.checkIfMobile();
  }
  checkIfMobile() {
    this.isMobile = window.innerWidth < 768;
  }
  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
    this.subs.unsubscribe();
  }
  doLogout() {
    this.logoutError = false;
    this.errorMessage = '';
    this.isLoading = true;

    // Get the token from storage
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    if (!token) {
      console.warn('No token found, clearing storage and redirecting');
      this.clearStorageAndRedirect();
      return;
    }

    // Create the logout payload with session information
    const logoutPayload = this.generatePayload();

    // Create headers with Bearer token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('Logout request with token:', token);
    console.log('Logout payload:', logoutPayload);

    // Make POST request to logout endpoint with payload
    this.http.post(this.coreBaseUrl, logoutPayload, { headers }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('Logout response', response);

        // Clear storage and redirect after successful logout
        this.clearStorageAndRedirect();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Logout error:', error);

        // Even if the API call fails, clear local storage and redirect
        // This ensures user can't access protected routes with stale token
        this.clearStorageAndRedirect();

        // Optional: Show error message if needed
        this.logoutError = true;
        this.errorMessage = 'Logout completed (with possible server error)';
      }
    });
  }
  private clearStorageAndRedirect() {
    // Broadcast logout to other tabs before clearing storage.
    try {
      localStorage.setItem('logout-event', Date.now().toString());
    } catch (error) {
      console.error('Unable to write logout-event to localStorage', error);
    }

    // Clear all storage except cross-session preferences (e.g. default workspace)
    clearStorageKeepingPreferences();

    // Navigate to login page
    this.router.navigateByUrl('/login');

    // Optional: Reload the page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
  // Existing methods
  setActiveItem(item: string): void {
    if (item == 'logout') this.doLogout();
    // Drawer triggers (Menu/Modules/Personalization) open a panel — they are not
    // pages, so they must not overwrite the current page title. Compared
    // case-insensitively because the template passes capitalised names.
    const EXCLUDED_PAGES = ['menu', 'modules', 'profile', 'personalization'];
    if(!EXCLUDED_PAGES.includes(item.toLowerCase())){

      localStorage.setItem('currentPageName', item);
      // Navigating to a real page must dismiss any open drawer (e.g. Modules),
      // otherwise it lingers with stale/blank content over the new page.
      if (this.drawerOpen) {
        this.sidebarService.closeDrawer();
      }
    }
    this.activeItem = item;
  }


  closeDrawer() {
    this.sidebarService.closeDrawer();
  }
  toggleDrawer(type: string): void {
    if (this.drawerType === type && this.drawerOpen) {
      this.sidebarService.closeDrawer();
    } else {
      this.drawerType = type;
      this.sidebarService.openDrawer();
    }
  }
  generatePayload(): any {
    const currentDateTime = new Date().toISOString();
    console.log("session ID", sessionStorage.getItem('sessionId'));

    return {
      "userId": sessionStorage.getItem('userId'),
      "terminalIp": "192.168.20.69",
      "browser": this.getBrowserName(),
      "sessionId": sessionStorage.getItem('sessionId'),
      "sessionTerminalIp": "192.168.10.127",
      "loginAt": "2025-08-21T10:30:00",
      "logOutAt": currentDateTime
    };
  }
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
}
