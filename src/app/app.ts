import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { ThemeService } from './shared/services/theme.service';
import { GlobalActivityTrackerService } from './shared/services/global-activity-tracker.service';
import { NovuService } from './shared/services/novu.service';
import { LoaderService } from './shared/services/loader.service';
import { Title } from '@angular/platform-browser';
import pkg from '../../package.json';

import { environment } from '../environments/environment';
import { LoaderComponent } from './shared/common-components/loader/loader.component';
import { AuthService } from './core/auth/auth.service';
import { UserService } from './core/user/user.service';
import { User } from './core/user/user.types';
import { SidebarService } from './layout/service/sidebar.service';
import { ButtonUtils } from './shared/constant/button-signals.constant';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { WorkspaceService } from './shared/services/workspace.service';
import { ConfirmationDialogue, DeleteConfirmationModalConfig } from './shared/common-components/confirmation-dialogue/confirmation-dialogue';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoaderComponent, CommonModule, ConfirmationDialogue],
  templateUrl: './app.html',
  standalone: true,
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected title = 'LdsComponentProject';
  // Gates the router-outlet: stays false until Keycloak auth is resolved,
  // so an unauthenticated (e.g. post-logout) load never paints a protected
  // route before the login redirect fires.
  protected authReady = false;
  authService = inject(AuthService);
  userId: string;
  private userService = inject(UserService);

  /** Seconds left before the idle lock, or null when no warning is due. */
  protected readonly idleSeconds = signal<number | null>(null);

  // computed(), not a getter: a getter returning a fresh object on every change
  // detection pass trips ExpressionChangedAfterItHasBeenChecked in dev mode.
  protected readonly idleDialogConfig = computed<DeleteConfirmationModalConfig>(() => {
    const seconds = this.idleSeconds() ?? 0;
    return {
      title: 'Are you still there?',
      message: `You will be signed out in <strong>${seconds}</strong> second${seconds === 1 ? '' : 's'} due to inactivity.`,
      variant: 'warning',
      icon: 'exclamation',
      showBackdrop: true,
      showCloseButton: true,
      buttons: [
        { text: 'Stay signed in', action: 'stay' },
        { text: 'Sign out now', action: 'logout' },
      ],
    };
  });

  private onStorageEvent = (event: StorageEvent): void => {
    if (event.key === 'logout-event') {
      console.log('Detected logout from another tab. Reloading app.');
      localStorage.removeItem('logout-event');
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };
  private workspaceService = inject(WorkspaceService);
  constructor(private themeService: ThemeService,
    public loaderService: LoaderService,
    private router: Router,
    private activityTracker: GlobalActivityTrackerService,
    private rootTitle: Title,
    private sidebarService: SidebarService,
    private novuService: NovuService) {
    // Leaving a page abandons its in-flight requests, so drop the loader's
    // count with it — otherwise a request that never settles (e.g. a hung token
    // refresh) leaves the overlay counted as busy on every later page.
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart),
      takeUntilDestroyed()
    ).subscribe(() => this.loaderService.reset());

    this.router.events.pipe(filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects;
      const resetRoutes = ['/', '/landing/home', '/dashboard'];

      if (resetRoutes.includes(url)) {
        ButtonUtils.resetAll();
      }
    });

    // Countdown before the inactivity lock. Any activity clears it in the
    // tracker, which pushes null and closes the dialog.
    this.activityTracker.inactivityWarning$.pipe(
      takeUntilDestroyed()
    ).subscribe(seconds => this.idleSeconds.set(seconds));
  }

  /** "Stay signed in" / "Sign out now" on the inactivity warning. */
  protected onIdleWarningAction(event: { action: string }): void {
    if (event.action === 'logout') {
      this.authService.logout();
      return;
    }
    this.activityTracker.extendSession();
  }

  /** Dismissing the warning (close button or backdrop) counts as being present. */
  protected onIdleWarningDismissed(): void {
    this.activityTracker.extendSession();
  }



  async ngOnInit() {
    const isAuthenticated = await this.authService.init();
    const currentPath = window.location.pathname;

    const offline = !navigator.onLine;

    // Only reveal the router-outlet once we know the user is authenticated.
    // If not authenticated and online we must redirect to Keycloak; when
    // offline we skip the redirect so the local UI can render for dev.
    if (isAuthenticated) {
      this.authReady = true;
    } else if (offline) {
      console.warn('[App] Browser offline — skipping Keycloak redirect and revealing UI');
      this.authReady = true;
    } else {
      // Online but not authenticated → redirect to Keycloak login.
      this.authReady = false;
      this.authService.login();
      return;
    }

    if (isAuthenticated) {
      // Initial navigation was disabled (see app.config.ts). Now that auth is
      // confirmed, let the router resolve the requested URL. For an
      // unauthenticated load we never call this, so the browser stays at the
      // post-logout URL and goes straight to login — never via /landing/home.
      this.router.initialNavigation();

      // A starred default workspace replaces home as the startup page.
      this.openDefaultWorkspace();

      // Token and user info already decoded inside authService.init()

      // Load resources with debugging
      this.authService.getResources().subscribe({
        next: (res) => {
          localStorage.setItem('resourceList', JSON.stringify(res));

          // Verify storage
          const storedResources = localStorage.getItem('resourceList');

          // Notify that resourceList is ready
          this.sidebarService.notifyResourceListReady();
        },
        error: (error) => {
          console.error('Error loading resources:', error);
          localStorage.setItem('resourceList', '[]');
          this.sidebarService.notifyResourceListReady();
        }
      });

      // Load applications with debugging
      this.authService.getUserWiseApplications().subscribe({
        next: (res) => {


          localStorage.setItem('appList', JSON.stringify(res));


          // Verify storage
          const storedAppList = localStorage.getItem('appList');

          // Detect module after appList is loaded
          this.detectAndSetModuleByPort();

          // Notify navbar to recompute logo now that appList is available
          this.sidebarService.notifyAppListReady();
        },
        error: (error) => {
          console.error('Error loading applications:', error);
          localStorage.setItem('appList', '[]');
          this.sidebarService.notifyAppListReady();
        }
      });

    }

    this.userService.user$.subscribe((user: User) => {
      this.userId = user.username;
    });

    this.rootTitle.setTitle(pkg.name || 'Default Title');

    window.addEventListener('storage', this.onStorageEvent);

    const userIdinit = this.userId;
    if (userIdinit) {
      console.log('Novu initializing for user:', userIdinit);
      await this.novuService.init(userIdinit, environment.novu_identifier);
    } else {
      if (!offline) {
        this.authService.login();
      } else {
        console.warn('[App] Offline and no userId — running in limited offline mode');
      }
    }
  }


  /**
   * Sends a load of the app root (or /landing/home) straight into the user's
   * default workspace. A deep link, a bookmarked page, or a refresh inside
   * another page is left alone.
   *
   * Only ngOnInit calls this, so it runs once per page load — clicking the logo
   * to go home is an in-app navigation and is never bounced back here.
   *
   * This navigation cancels the initial one, so a stale default whose route is
   * no longer wired up would otherwise leave the outlet empty — on failure we
   * send the user to home explicitly.
   */
  private openDefaultWorkspace(): void {
    const path = (window.location.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    if (path !== '/' && path !== '/landing/home') return;

    const route = this.workspaceService.defaultWorkspaceRoute();
    if (!route) return;

    this.router.navigateByUrl(route).then(
      ok => { if (!ok) this.fallBackToHome(route); },
      () => this.fallBackToHome(route)
    );
  }

  private fallBackToHome(route: string): void {
    console.warn(`[App] Default workspace route "${route}" is unavailable; falling back to home.`);
    this.router.navigate(['/landing/home']);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.onStorageEvent);
  }

  private detectAndSetModuleByPort() {
    setTimeout(() => {
      try {
        const currentPort = window.location.port;
        const appList = localStorage.getItem('appList');

        if (appList) {
          const parsedAppList = JSON.parse(appList);
          const matchingModule = parsedAppList.find((app: any) => {
            if (app.appUrl && (environment.appId === app.appId)) {
              console.log(app.appId);
              const urlMatch = app.appUrl.match(/:(\d+)/);
              return urlMatch && urlMatch[1] === currentPort;
            }
            return false;
          });

          if (matchingModule) {
            localStorage.setItem('selectedModuleName', matchingModule.appName);
          }
        }
      } catch (error) {
        console.error('Error in app module detection:', error);
      }
    }, 500); // Longer delay to ensure everything is loaded

  }
}


