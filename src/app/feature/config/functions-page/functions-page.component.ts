import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { SidebarService } from '../../../layout/service/sidebar.service';

interface ResourceItem {
  functionId: string;
  functionNm: string;
  moduleId: string;
  moduleNm: string;
  appRoute: string;
  functionType: string;
  quickRouteNo: string;
  routePath: string;
}

interface ResourceResponse {
  errorCode: number;
  errorMessage: string | null;
  resourceUserList: ResourceItem[];
}

@Component({
  selector: 'app-functions-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './functions-page.component.html'
})
export class FunctionsPageComponent implements OnInit {
  /** The right-hand scroll container. It outlives route changes, so its scroll must be reset. */
  @ViewChild('contentPane') contentPane?: ElementRef<HTMLElement>;

  items: ResourceItem[] = [];
  selectedItem: ResourceItem | null = null;
  isLoading = true;
  error: string | null = null;

  /**
   * True when the selected tab has no page to render on the right — either it
   * declares no child route here, or the list came back empty. The outlet is
   * emptied first, so the notice never sits on top of the previous tab’s page.
   */
  pageMissing = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    // Drop the previous page’s title while the tab list loads, so the header
    // never shows the section we just navigated away from.
    this.setPageName(null);

    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || '';
    const url = `${environment.sentinelUrl}/ResourceAccess/RetrieveList?userId=${userId}&appId=${environment.appId}`;

    this.http.get<ResourceResponse>(url).subscribe({
      next: res => {
        this.items = (res.resourceUserList ?? []).filter(item => item.functionType === 'F');
        this.restoreFromUrl();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load menu items';
        this.isLoading = false;
      }
    });
  }

  select(item: ResourceItem): void {
    this.selectedItem = item;

    // Store function context so the token interceptor can attach X-Function-Id.
    this.authService.setFunctionContext(item.functionId, item.functionNm);

    // This page owns the action-bar title while a tab is selected: the navbar
    // resolves titles from the URL, and it keeps the previous page’s name when
    // the URL matches nothing (every tab whose page is missing, and both
    // section roots), which is what left a stale title on Functions/Config.
    this.setPageName(item);

    if (!this.hasChildRoute(item)) {
      this.showPageMissing();
      return;
    }

    this.pageMissing = false;
    this.router.navigate([this.pathFor(item)], { relativeTo: this.route })
      .then(activated => {
        // Re-assert the title: the navbar resolves its own on NavigationEnd,
        // which lands before this promise settles.
        this.setPageName(item);
        if (!activated) this.showPageMissing();
      })
      .catch(() => this.showPageMissing());
  }

  private setPageName(item: ResourceItem | null): void {
    this.sidebarService.setCurrentPageName(item?.functionNm ?? '');
  }

  /** Blank the right pane and show the notice instead of the previous page. */
  private showPageMissing(): void {
    this.pageMissing = true;
    this.router.navigate(['.'], { relativeTo: this.route })
      .then(() => this.setPageName(this.selectedItem))
      .catch(() => this.setPageName(this.selectedItem));
  }

  /**
   * Whether this page declares a child route for the tab (see feature.routing.ts).
   * Checked up front so an unmapped tab shows the notice instead of firing a
   * navigation that can only fail with 'Cannot match any routes'.
   */
  private hasChildRoute(item: ResourceItem): boolean {
    const target = this.pathFor(item).toLowerCase();
    if (!target) return false;

    const targetSegments = target.split('/');
    return (this.route.routeConfig?.children ?? []).some(child => {
      const childSegments = (child.path ?? '').toLowerCase().split('/');
      if (!child.path || childSegments.length !== targetSegments.length) return false;
      return childSegments.every((seg, i) => seg.startsWith(':') || seg === targetSegments[i]);
    });
  }

  /** Child route this tab opens. */
  private pathFor(item: ResourceItem): string {
    // (child route) so the tab list stays visible alongside it.
    if (item.functionNm?.trim().toLowerCase() === 'workspace') return 'Workspace';

    const path = item.routePath ?? '';
    return path.startsWith('/') ? path.slice(1) : path;
  }

  /**
   * Keep the tab that is already in the URL (page reload, deep link, back/forward)
   * instead of resetting to the first one. Falls back to the first tab.
   */
  private restoreFromUrl(): void {
    if (!this.items.length) {
      this.pageMissing = true;
      return;
    }

    const current = (this.route.snapshot.firstChild?.url ?? [])
      .map(segment => segment.path)
      .join('/')
      .toLowerCase();

    const active = current
      ? this.items.find(item => this.pathFor(item).toLowerCase() === current)
      : undefined;

    if (active) {
      this.selectedItem = active;
      this.authService.setFunctionContext(active.functionId, active.functionNm);
      this.setPageName(active);
      return;
    }

    this.select(this.items[0]);
  }

  /** Send the content pane back to the top whenever a new tab's page is activated. */
  resetScroll(): void {
    this.pageMissing = false;
    this.contentPane?.nativeElement.scrollTo({ top: 0, left: 0 });
  }
}
