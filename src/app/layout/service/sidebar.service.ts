import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private _sidebarExpanded = new BehaviorSubject<boolean>(true);
  private _drawerOpen = new BehaviorSubject<boolean>(false);
  private _selectedModuleName = new BehaviorSubject<string>('');
  selectedModuleName$ = this._selectedModuleName.asObservable();
  sidebarExpanded$ = this._sidebarExpanded.asObservable();
  drawerOpen$ = this._drawerOpen.asObservable();
  private _appListReady = new Subject<void>();
  appListReady$ = this._appListReady.asObservable();
  private _resourceListReady = new Subject<void>();
  resourceListReady$ = this._resourceListReady.asObservable();

  /**
   * "View all messages" in the navbar message popover asks the sidebar to open
   * the Personalization drawer with its Messaging section expanded — that panel
   * holds the full list plus user search for starting a new conversation.
   */
  private _openMessaging = new Subject<void>();
  openMessaging$ = this._openMessaging.asObservable();
  /** Set alongside the event above, because the profile drawer is created lazily
   *  when the drawer opens and would otherwise miss the emission. */
  private messagingPending = false;

  requestMessaging(): void {
    this.messagingPending = true;
    this._openMessaging.next();
  }

  /** Read-and-clear: true when the drawer should open on its Messaging section. */
  consumeMessagingRequest(): boolean {
    const pending = this.messagingPending;
    this.messagingPending = false;
    return pending;
  }
  private router = inject(Router);

  private _currentPageName = new BehaviorSubject<string>('');
  currentPageName$ = this._currentPageName.asObservable();

  setSelectedModuleName(moduleName: string): void {
    this._selectedModuleName.next(moduleName);
    // localStorage.setItem('appList', moduleName);
  }

  getSelectedModuleName(): string {
    return this._selectedModuleName.value;
  }
  toggleSidebar(): void {
    this._sidebarExpanded.next(!this._sidebarExpanded.value);
  }

  setSidebarState(isExpanded: boolean): void {
    this._sidebarExpanded.next(isExpanded);
  }

  /** Live expanded state, for consumers that mount mid-session. */
  get isSidebarExpanded(): boolean {
    return this._sidebarExpanded.value;
  }

  /**
   * Applies the user's "sidebar default" preference — at most once per app load.
   *
   * The guard is the point. Sidebar lives inside Layout, and app.routes.ts gives
   * each top-level branch ('landing', 'feature', 'rpt', 'poc', 'workspace',
   * 'Workspace', '') its own `component: Layout`, so navigating between branches
   * destroys and rebuilds Layout — and with it Sidebar. Applying the preference
   * from Sidebar.ngOnInit therefore re-imposed the stored *startup default* on
   * every such navigation, discarding a manual hamburger toggle and animating
   * the rail's width on each page change (.sidebar-panel transitions width).
   *
   * A default is a starting value, not a per-navigation instruction, so it is
   * honoured on the first mount and ignored afterwards. Use setSidebarState for
   * a deliberate change (the hamburger, or saving the preference).
   */
  applyDefaultSidebarState(isExpanded: boolean): void {
    if (this.defaultSidebarStateApplied) return;
    this.defaultSidebarStateApplied = true;
    this._sidebarExpanded.next(isExpanded);
  }

  private defaultSidebarStateApplied = false;

  setDrawerOpen(isOpen: boolean): void {
    this._drawerOpen.next(isOpen);
  }

  closeDrawer(): void {
    this.setDrawerOpen(false);
  }

  openDrawer(): void {
    this.setDrawerOpen(true);
  }

  toggleDrawer(): void {
    this._drawerOpen.next(!this._drawerOpen.value);
  }

  setCurrentPageName(pageName: string): void {
    this._currentPageName.next(pageName);
    localStorage.setItem('currentPageName', pageName);
  }

  getCurrentPageName(): string {
    return this._currentPageName.value;
  }

  initializePageName(): void {
    // Check if we're on the home page
    const currentUrl = this.router.url;
    if (currentUrl.includes('/landing/home')) {
      this._currentPageName.next('');
      localStorage.removeItem('currentPageName'); // Clean up localStorage
      return;
    }

    // Otherwise, restore from localStorage
    const storedPageName = localStorage.getItem('currentPageName');
    if (storedPageName) {
      this._currentPageName.next(storedPageName);
    }
  }

  notifyAppListReady(): void {
    this._appListReady.next();
  }

  notifyResourceListReady(): void {
    this._resourceListReady.next();
  }

}
