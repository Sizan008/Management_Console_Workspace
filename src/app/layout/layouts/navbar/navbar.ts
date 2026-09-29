import { Component, signal, computed, HostListener, NgZone, OnDestroy, inject } from '@angular/core';

import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarService } from '../../service/sidebar.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Workspace, WorkspaceService } from '../../../shared/services/workspace.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { InAppNotification, NovuService } from '../../../shared/services/novu.service';
import { NotificationPopoverComponent } from '../../../shared/features/components/notification/notification-popover.component';
import { NotificationDetailModalComponent } from '../../../shared/features/components/notification/notification-detail-modal.component';
import { OfficeDayService, OfficeDayStatus } from '../../../core/office-day/office-day.service';
import { CalendarEventService, CalendarEvent } from '../../../core/calendar-event/calendar-event.service';
import { Observable } from 'rxjs';
import { CommonModule, AsyncPipe } from '@angular/common';
import { BusinessDatePicker } from './business-date-picker/business-date-picker';
import { ChatBox } from '../sidebar/drawers/profile-drawer/drawers/chat-box/chat-box';
import { ChatPreview, ChatService } from '../../../shared/services/chat.service';
import { MessagePopoverComponent } from '../../../shared/features/components/message/message-popover.component';

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    AsyncPipe,
    BusinessDatePicker,
    ChatBox
  ],
  templateUrl: './navbar.html',
  standalone: true,
  styleUrl: './navbar.scss'
})
export class Navbar implements OnDestroy {

  sidebarExpanded: boolean = false;
  private readonly defaultLogo = '/asset/logos/default.png';
  moduleName = signal('');
  moduleLogo = signal(this.defaultLogo);
  currentPageName = signal('');
  workspaceMenuOpen = signal(false);

  readonly workspaceService: WorkspaceService;
  readonly workspaces;       // Signal<Workspace[]>
  readonly activeWorkspace;  // Signal<Workspace | null>
  readonly moduleLabel: string;

  public notifications$: Observable<number>;
  public messages$: Observable<number>;

  // Notification popover / detail modal (CDK overlays anchored to the navbar bell)
  private readonly overlay = inject(Overlay);
  private readonly ngZone = inject(NgZone);
  private readonly chatService = inject(ChatService);
  private notifOverlayRef: OverlayRef | null = null;
  private detailOverlayRef: OverlayRef | null = null;
  private msgOverlayRef: OverlayRef | null = null;

  /** Unread message total — drives the envelope badge and the popover header. */
  readonly messagesUnread$ = this.chatService.getUnreadTotal();

  // Chat window opened from the message popover
  activeChat = signal<ChatPreview | null>(null);
  chatOpen = signal(false);

  // User profile
  userInitials: string = '';

  // Transaction date (moved from the sidebar)
  txnDt: string = '';
  // Selectable business dates from the office-day-status API (newest first).
  officeDates = signal<string[]>([]);
  // Holidays / events used to annotate the transaction-date calendar.
  calendarEvents = signal<CalendarEvent[]>([]);
  // Calendar bounds derived from the returned dates.
  maxDate = computed(() => this.officeDates()[0] ?? '');
  minDate = computed(() => this.officeDates()[this.officeDates().length - 1] ?? '');

  constructor(
    private sidebarService: SidebarService,
    private router: Router,
    private http: HttpClient,
    public authService: AuthService,
    public notificationService: NotificationService,
    private novuService: NovuService,
    private officeDayService: OfficeDayService,
    private calendarEventService: CalendarEventService,
    workspaceService: WorkspaceService
  ) {
    this.workspaceService = workspaceService;
    this.workspaces      = workspaceService.workspaces;
    this.activeWorkspace = workspaceService.activeWorkspace;
    // this.moduleLabel     = workspaceService.moduleLabel;

    this.notifications$ = this.novuService.getUnreadCount();
    this.messages$ = this.notificationService.messages$;

    this.moduleName.set(environment.appName);
    this.sidebarService.currentPageName$.subscribe(pageName => {
      this.currentPageName.set(pageName);
      console.log('Navbar page name updated to:', pageName);
    });
  }

  ngOnInit() {
    // Load workspace list from API (URL set in environment.WorkspaceApiUrl)
    this.workspaceService.loadWorkspaces();

    // Compute module logo (may be default if appList isn't in localStorage yet)
    this.moduleLogo.set(this.computeModuleLogo());

    // Recompute logo when appList becomes available (first login, API loads after init)
    this.sidebarService.appListReady$.subscribe(() => {
      this.moduleLogo.set(this.computeModuleLogo());
    });

    // Update page name when resourceList becomes available
    this.sidebarService.resourceListReady$.subscribe(() => {
      this.updatePageNameFromRoute();
    });

    const rawId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || 'User';
    this.userInitials = rawId.split(/[\s._-]+/).map((w: string) => w[0] || '').join('').toUpperCase().slice(0, 2) || rawId.slice(0, 2).toUpperCase();

    const rawDate = sessionStorage.getItem('txnDt');
    this.txnDt = rawDate ? rawDate.split(' ')[0] : '';

    this.loadOfficeDates();
    this.loadCalendarEvents();

    // Proactively initialize page name from local storage to prevent flashing empty
    // when a page is manually reloaded
    this.sidebarService.initializePageName();

    // Attempt to resolve immediately in case resources are already available
    const currentUrl = this.router.url;
    this.workspaceService.syncFromUrl(currentUrl);
    this.resolvePageName(currentUrl);

    // Subscribe for subsequent in-app navigations
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || this.router.url;
        this.workspaceService.syncFromUrl(url);
        this.resolvePageName(url);
      });
  }

  @HostListener('document:click')
  closeWorkspaceMenu(): void {
    this.workspaceMenuOpen.set(false);
  }

  toggleWorkspaceMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.workspaceMenuOpen.update(open => !open);
  }

  onWorkspaceSelect(ws: Workspace, event: MouseEvent): void {
    event.stopPropagation();
    // Placeholder workspaces (page not wired up yet) can't be entered; keep the
    // menu open so the "Soon" badge stays visible instead of silently no-op-ing.
    if (ws.available === false) return;
    this.workspaceMenuOpen.set(false);
    // Switching workspace navigates to a new page, so dismiss any open sidebar
    // drawer (e.g. Modules) instead of leaving it hanging with stale content.
    this.sidebarService.closeDrawer();
    this.workspaceService.selectWorkspace(ws);
  }

  onSetDefault(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.workspaceService.setDefaultWorkspace(id);
  }

  /**
   * Opens (or closes) the notification popover, anchored under the navbar bell
   * and right-aligned with it so it stays inside the viewport.
   */
  toggleNotificationsPopover(event: MouseEvent): void {
    event.stopPropagation();

    if (this.notifOverlayRef?.hasAttached()) {
      this.disposeNotifOverlay();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        // Primary: drop down from the bell, right edges aligned.
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
        // Fallback: no room below — open upward.
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
      ])
      .withFlexibleDimensions(false)
      .withPush(true);

    this.notifOverlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy,
      // Reposition (not close) so the popover survives the scroll-block the
      // detail modal applies when it opens on top of it.
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const compRef = this.notifOverlayRef.attach(new ComponentPortal(NotificationPopoverComponent));

    // The list stays open behind the detail modal; only the detail is stacked
    // on top so closing it returns the user straight to the list.
    compRef.instance.openDetail.subscribe((notif: InAppNotification) => {
      this.ngZone.run(() => this.openDetailModal(notif));
    });

    compRef.instance.closePopover.subscribe(() => this.ngZone.run(() => this.disposeNotifOverlay()));
    this.notifOverlayRef.backdropClick().subscribe(() => this.disposeNotifOverlay());
  }

  /**
   * Opens (or closes) the message popover, anchored under the navbar envelope
   * the same way the notification popover is anchored under the bell.
   */
  toggleMessagesPopover(event: MouseEvent): void {
    event.stopPropagation();

    if (this.msgOverlayRef?.hasAttached()) {
      this.disposeMsgOverlay();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(trigger)
      .withPositions([
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
      ])
      .withFlexibleDimensions(false)
      .withPush(true);

    this.msgOverlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const compRef = this.msgOverlayRef.attach(new ComponentPortal(MessagePopoverComponent));

    // Picking a conversation closes the list and opens the chat window for it.
    compRef.instance.openChat.subscribe((chat: ChatPreview) => {
      this.ngZone.run(() => {
        this.disposeMsgOverlay();
        this.openChat(chat);
      });
    });

    // "View all messages" hands off to the profile drawer's Messaging section,
    // which also has the user search for starting a new conversation.
    compRef.instance.viewAll.subscribe(() => this.ngZone.run(() => this.sidebarService.requestMessaging()));

    compRef.instance.closePopover.subscribe(() => this.ngZone.run(() => this.disposeMsgOverlay()));
    this.msgOverlayRef.backdropClick().subscribe(() => this.disposeMsgOverlay());
  }

  /** Shows the floating chat window for a conversation from the popover. */
  openChat(chat: ChatPreview): void {
    this.activeChat.set(chat);
    this.chatOpen.set(true);
  }

  closeChat(): void {
    this.chatOpen.set(false);
    this.activeChat.set(null);
  }

  /** Centered detail modal for a single notification picked from the popover. */
  private openDetailModal(notif: InAppNotification): void {
    this.disposeDetailOverlay();

    this.detailOverlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
      panelClass: 'notification-detail-overlay-panel',
    });

    const compRef = this.detailOverlayRef.attach(new ComponentPortal(NotificationDetailModalComponent));
    compRef.instance.notification = notif;

    compRef.instance.close.subscribe(() => this.ngZone.run(() => this.disposeDetailOverlay()));
    this.detailOverlayRef.backdropClick().subscribe(() => this.disposeDetailOverlay());
  }

  private disposeNotifOverlay(): void {
    this.notifOverlayRef?.dispose();
    this.notifOverlayRef = null;
  }

  private disposeDetailOverlay(): void {
    this.detailOverlayRef?.dispose();
    this.detailOverlayRef = null;
  }

  private disposeMsgOverlay(): void {
    this.msgOverlayRef?.dispose();
    this.msgOverlayRef = null;
  }

  ngOnDestroy(): void {
    this.disposeNotifOverlay();
    this.disposeDetailOverlay();
    this.disposeMsgOverlay();
  }




  /**
   * Central page-title resolution, run on every navigation.
   * Priority: home clears the title → an explicit route `data.title` wins →
   * otherwise fall back to matching the URL against the resource/menu list.
   */
  private resolvePageName(url: string): void {
    if (url.includes('/landing/home')) {
      this.sidebarService.setCurrentPageName('');
      return;
    }

    const routeTitle = this.getRouteTitle();
    if (routeTitle) {
      this.sidebarService.setCurrentPageName(routeTitle);
      return;
    }

    this.updatePageNameFromRoute(url);
  }

  /** Deepest activated route's `data.title`, if any (child overrides parent). */
  private getRouteTitle(): string | null {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let title: string | null = null;
    while (route) {
      const t = route.data?.['title'];
      if (t) title = t;
      route = route.firstChild;
    }
    return title;
  }

  private updatePageNameFromRoute(urlOverride?: string) {
    try {
      const currentUrl = urlOverride || this.router.url;
      console.log('Current URL:', currentUrl);

      const resourceListString = localStorage.getItem('resourceList');
      if (!resourceListString) {
        console.log('No resourceList found');
        return;
      }

      const resourceList = JSON.parse(resourceListString);

      // Find matching function based on current route
      const matchingFunction = resourceList.find((item: any) => {
        if (!item?.attributes?.functionName) return false;

        const currentPath = currentUrl.split('?')[0].toLowerCase();

        // Match against routePath
        const routePathStr = Array.isArray(item.routePath) ? item.routePath[0] : item.routePath;
        if (routePathStr) {
           const normRoutePath = (routePathStr.startsWith('/') ? routePathStr : '/' + routePathStr).toLowerCase();
           if (currentPath === normRoutePath || currentPath.startsWith(normRoutePath + '/')) {
              return true;
           }
        }

        // Match against uris
        const urisStr = Array.isArray(item.uris) ? item.uris[0] : item.uris;
        if (urisStr) {
           const normUris = (urisStr.startsWith('/') ? urisStr : '/' + urisStr).toLowerCase();
           if (currentPath === normUris || currentPath.startsWith(normUris + '/')) {
              return true;
           }
        }

        // Fallback to functionId
        if (item?.attributes?.functionId) {
          const functionId = item.attributes.functionId.toLowerCase();
          return currentPath.includes(functionId) ||
            currentPath.includes(functionId.replace(/[^a-z0-9]/g, '')) ||
            this.isRouteMatch(currentPath, functionId);
        }

        return false;
      });

      if (matchingFunction) {
        this.sidebarService.setCurrentPageName(
          matchingFunction.attributes.functionName
        );
      } else {
        // Clear stale page name when no match is found for the new route
        // EXCEPT on initial load where resourceList or Angular routing might be out of sync
        // Instead of aggressively clearing, we leave whatever was restored from localStorage,
        // because we explicitly clear for the home page elsewhere.
      }


    } catch (error) {
      console.error('Error updating page name from route:', error);
      this.currentPageName.set(' ');
    }
  }

  private isRouteMatch(currentPath: string, functionId: string): boolean {
    // Custom matching logic - adjust based on your needs
    const routeSegments = currentPath.split('/').filter(segment => segment);
    const lastSegment = routeSegments[routeSegments.length - 1] || '';

    return lastSegment.includes(functionId.toLowerCase()) ||
      functionId.toLowerCase().includes(lastSegment);
  }

private computeModuleLogo(): string {
    const appId = environment.appId?.toString().trim();

    if (!appId) {
      return this.defaultLogo;
    }

    return `/asset/logos/${appId}.png`;
}

  onLogoError(): void {
    this.moduleLogo.set(this.defaultLogo);
  }

  navigateToHome() {
    console.log('Navigating to home page');
    this.authService.clearFunctionContext();
    this.router.navigate(['landing/home']);
    this.sidebarService.setCurrentPageName('');
  }
  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
    console.log('Navbar toggle clicked');
  }

  /** Ends the session (moved here from the profile drawer). */
  logout(): void {
    this.authService.logout();
  }

  toggleProfileDrawer(): void {
    this.sidebarService.openDrawer(); // Ideally toggle drawer with 'Profile'
    // since sidebarService doesn't have a direct toggle with type, we might need a workaround or just rely on the sidebar
  }

  /**
   * Load the office's business dates. The list is the only set of selectable
   * transaction dates; the latest one is shown by default.
   */
  private loadOfficeDates(): void {
    const officeId = sessionStorage.getItem('officeId') || localStorage.getItem('officeId');
    if (!officeId) {
      console.warn('No officeId found; cannot load office day-status list');
      return;
    }

    this.officeDayService.getOfficeDayStatusList(officeId, environment.appId).subscribe({
      next: (list: OfficeDayStatus[]) => {
        const dates = list.map(d => d.businessDt);
        this.officeDates.set(dates);

        // Default to the latest date, or keep the stored one if it is still valid.
        const latest = dates[0];
        if (latest && (!this.txnDt || !dates.includes(this.txnDt))) {
          this.changeTxnDate(latest);
        }
      },
      error: err => console.error('Failed to load office day-status list', err)
    });
  }

  /** Load holidays / events shown as markers on the transaction-date calendar. */
  private loadCalendarEvents(): void {
    this.calendarEventService.getCalendarEvents().subscribe({
      next: events => this.calendarEvents.set(events),
      error: err => console.error('Failed to load calendar events', err)
    });
  }

  changeTxnDate(newDate: string): void {
    // Only business dates returned by the API are allowed. If the user picks a
    // date outside the list (calendar bounds only limit the range, not gaps),
    // revert to the current valid selection.
    const dates = this.officeDates();
    if (dates.length && newDate && !dates.includes(newDate)) {
      this.txnDt = '';                 // force the input to re-render...
      setTimeout(() => (this.txnDt = sessionStorage.getItem('txnDt')?.split(' ')[0] ?? ''));
      return;
    }

    this.txnDt = newDate;
    sessionStorage.setItem('txnDt', newDate ? `${newDate} 00:00:00` : '');
  }
}
