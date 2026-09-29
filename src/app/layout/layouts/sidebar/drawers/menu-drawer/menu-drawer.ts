import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../../../shared/services/theme.service';
import { SidebarService } from '../../../../service/sidebar.service';
import { AuthService } from '../../../../../core/auth/auth.service';

interface UserAccessItem {
  FunctionId: string;
  FunctionName: string;
  HOFunctionFlag: string;
  AllowMaintAddFlag: string;
  AllowMaintEditFlag: string;
  AllowMaintDelFlag: string;
  AllowMaintViewFlag: string;
  AllowMaintAuthFlag: string;
  AllowProcessFlag: string;
  AllowReportViewFlag: string;
  AllowReportPrintFlag: string;
  AllowReportGenFlag: string;
  AllowAnyOfficeOpsFlag: string;
  MenuId: string;
  MenuName: string;
  ModuleId: string;
  ModuleName: string;
  AppRoute: string | string[];
  routePath: string | string[];
  ItemType: string;
  QuickRouteNo: string;
  IsFinancial: string;
}

@Component({
  selector: 'app-menu-drawer',
  imports: [RouterLink, RouterModule, MatIcon, CommonModule],
  templateUrl: './menu-drawer.html',
  standalone: true,
  styleUrl: './menu-drawer.scss',
  animations: [
    trigger('expandCollapse', [
      state('open', style({ height: '*', opacity: 1 })),
      state('closed', style({ height: '0px', opacity: 0 })),
      transition('open <=> closed', animate('300ms ease-in-out')),
    ]),
  ],
})
export class MenuDrawer implements OnInit {
  openSections: { [key: string]: boolean } = {};
  userAccessList: UserAccessItem[] = [];
  menuSections: any[] = [];
  groupedMenu: any = {};
  activeTheme: string = localStorage.getItem('selectedTheme') || '';
  isLoading = true;
  error: string | null = null;
  private themeSub?: Subscription;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private sidebarService: SidebarService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.sidebarService.resourceListReady$.subscribe(() => {
      this.loadUserAccessList();
    });
    // Load immediately if already available
    this.loadUserAccessList();
    this.themeSub = this.themeService.currentTheme$.subscribe((themeId) => {
      this.activeTheme = themeId;
    });
  }

  getRoute(item: UserAccessItem): string {
    const route = Array.isArray(item.routePath)
      ? item.routePath[0]
      : item.routePath;

    return route?.startsWith('/') ? route : '/' + route;
  }

  loadUserAccessList(): void {
    let resourceListString = localStorage.getItem('resourceList');

    // const apiUrl = 'http://192.168.20.93:8091/api/user-login/get-user-access-list';
    // const params = {
    //   userId: localStorage.getItem('userId'),
    //   appId: '133',
    //   itemType: 'F',
    //   isHoUser: '0'
    // };

    // this.http.get<UserAccessItem[]>(apiUrl, { params: params as any })
    //   .subscribe({
    //     next: (data) => {
    //       this.userAccessList = data;
    //       localStorage.setItem('userAccessList', JSON.stringify(data));
    //       this.isLoading = false;
    //     },
    //     error: (err) => {
    //       console.error('Error loading user access list:', err);
    //       this.error = 'Failed to load menu items';
    //       this.isLoading = false;
    //     }
    //   });

    //------------ testing with dummy data ------------
    if (!resourceListString) {
      this.userAccessList = [];
      return;
    }

    let resourceList = JSON.parse(resourceListString);
    const dummyData: UserAccessItem[] = resourceList
      .filter((item: any) => item?.attributes?.functionType != 'R')
      .sort((a: any, b: any) => {
        return a.attributes.functionId.localeCompare(b.attributes.functionId);
      })
      .map((m: any) => {
        return {
          FunctionId: m.attributes.functionId,
          FunctionName: m.attributes.functionName,
          HOFunctionFlag: '0',
          AllowMaintAddFlag: '1',
          AllowMaintEditFlag: '1',
          AllowMaintDelFlag: '0',
          AllowMaintViewFlag: '1',
          AllowMaintAuthFlag: '1',
          AllowProcessFlag: '1',
          AllowReportViewFlag: '1',
          AllowReportPrintFlag: '1',
          AllowReportGenFlag: '1',
          AllowAnyOfficeOpsFlag: '1',
          ModuleId: m.attributes.moduleId,
          ModuleName: m.attributes.moduleName,
          AppRoute: m.uris,
          routePath: m.routePath,
          ItemType: 'F',
          QuickRouteNo: m.attributes.quickRoute,
          IsFinancial: '0',
        } as UserAccessItem;
      });
    // const dummyData: UserAccessItem[] = [
    //   {
    //     FunctionId: 'F001',
    //     FunctionName: 'Dashboard',
    //     HOFunctionFlag: '0',
    //     AllowMaintAddFlag: '1',
    //     AllowMaintEditFlag: '1',
    //     AllowMaintDelFlag: '0',
    //     AllowMaintViewFlag: '1',
    //     AllowMaintAuthFlag: '1',
    //     AllowProcessFlag: '1',
    //     AllowReportViewFlag: '1',
    //     AllowReportPrintFlag: '1',
    //     AllowReportGenFlag: '1',
    //     AllowAnyOfficeOpsFlag: '1',
    //     MenuId: '01',
    //     MenuName: 'Operation',
    //     ModuleId: 'M001',
    //     ModuleName: 'Main Module',
    //     AppRoute: '/dashboard',
    //     ItemType: 'F',
    //     QuickRouteNo: '10001',
    //     IsFinancial: '0'
    //   },
    //   {
    //     FunctionId: 'F002',
    //     FunctionName: 'User Management',
    //     HOFunctionFlag: '1',
    //     AllowMaintAddFlag: '1',
    //     AllowMaintEditFlag: '1',
    //     AllowMaintDelFlag: '1',
    //     AllowMaintViewFlag: '1',
    //     AllowMaintAuthFlag: '1',
    //     AllowProcessFlag: '1',
    //     AllowReportViewFlag: '1',
    //     AllowReportPrintFlag: '1',
    //     AllowReportGenFlag: '1',
    //     AllowAnyOfficeOpsFlag: '1',
    //     MenuId: '02',
    //     MenuName: 'Operation',
    //     ModuleId: 'M002',
    //     ModuleName: 'Admin Module',
    //     AppRoute: '/mx/components',
    //     ItemType: 'F',
    //     QuickRouteNo: '10002',
    //     IsFinancial: '0'
    //   },
    //   {
    //     FunctionId: 'F003',
    //     FunctionName: 'Activity Tracker Toggle',
    //     HOFunctionFlag: '1',
    //     AllowMaintAddFlag: '1',
    //     AllowMaintEditFlag: '1',
    //     AllowMaintDelFlag: '1',
    //     AllowMaintViewFlag: '1',
    //     AllowMaintAuthFlag: '1',
    //     AllowProcessFlag: '1',
    //     AllowReportViewFlag: '1',
    //     AllowReportPrintFlag: '1',
    //     AllowReportGenFlag: '1',
    //     AllowAnyOfficeOpsFlag: '1',
    //     MenuId: '03',
    //     MenuName: 'Configuration',
    //     ModuleId: 'M003',
    //     ModuleName: 'User Module',
    //     AppRoute: '/mx/activity-tracker-toggle',
    //     ItemType: 'F',
    //     QuickRouteNo: '10003',
    //     IsFinancial: '0'
    //   },
    //   {
    //     FunctionId: 'F004',
    //     FunctionName: 'Form For Notification',
    //     HOFunctionFlag: '1',
    //     AllowMaintAddFlag: '1',
    //     AllowMaintEditFlag: '1',
    //     AllowMaintDelFlag: '1',
    //     AllowMaintViewFlag: '1',
    //     AllowMaintAuthFlag: '1',
    //     AllowProcessFlag: '1',
    //     AllowReportViewFlag: '1',
    //     AllowReportPrintFlag: '1',
    //     AllowReportGenFlag: '1',
    //     AllowAnyOfficeOpsFlag: '1',
    //     MenuId: '04',
    //     MenuName: 'Configuration',
    //     ModuleId: 'M004',
    //     ModuleName: 'Admin Module',
    //     AppRoute: '/mx/form',
    //     ItemType: 'F',
    //     QuickRouteNo: '10004',
    //     IsFinancial: '0'
    //   }
    // ];

    // Use dummy data instead of API call
    this.isLoading = false;
    this.userAccessList = dummyData;
    this.generateMenuFromAccess();
  }

  generateMenuFromAccess() {
    const uniqueMenuNames = [
      ...new Set(
        this.userAccessList
          //.filter(item => item.ModuleName?.toLowerCase() !== 'report')
          .map((item) => item.ModuleName),
      ),
    ];
    const sortedMenuNames = uniqueMenuNames.sort((a, b) => a.localeCompare(b));
    this.menuSections = sortedMenuNames.map((name) => ({
      key: name.toLowerCase().replace(/\s+/g, ''),
      label: name,
      icon: this.getIcon(name),
    }));

    this.groupedMenu = this.userAccessList.reduce(
      (acc: { [key: string]: UserAccessItem[] }, item) => {
        if (!acc[item.ModuleName]) {
          acc[item.ModuleName] = [];
        }
        acc[item.ModuleName].push(item);
        return acc;
      },
      {},
    );

    uniqueMenuNames.forEach((name) => {
      const key = name.toLowerCase().replace(/\s+/g, '');
      this.openSections[key] = false;
    });
  }

  getIcon(name: string) {
    const map: any = {
      Configuration: 'settings',
      Operation: 'work',
      Dashboard: 'dashboard',
    };
    return map[name] || 'folder';
  }

  toggleSection(section: string): void {
    this.openSections[section] = !this.openSections[section];
  }

  isSectionOpen(section: string): boolean {
    return this.openSections[section];
  }

  onMenuItemClick(item: UserAccessItem): void {
    console.log('Menu item clicked:', item);

        // Store function context for interceptor headers and activity logs
    this.authService.setFunctionContext(item.FunctionId, item.FunctionName);

    // Store function id
    localStorage.setItem('currentFunctionId', item.FunctionId);

    // Navigate using normalized route
    const route = this.getRoute(item);
    console.log('Navigating to:', route);

    this.router
      .navigate([route])
      .then((success) => {
        if (success) {
          this.sidebarService.setCurrentPageName(item.FunctionName);
          this.sidebarService.closeDrawer();
        }
      })
      .catch((err) => {
        console.error('Navigation failed:', err);
        this.router.navigate(['landing/home']);
        this.sidebarService.closeDrawer();
        // this.sidebarService.setCurrentPageName('Home');
      });
  }

  getItemsByMenu(menuName: string) {
    const items = this.groupedMenu[menuName] || [];
    return items.sort(
      (a: { FunctionId: any; }, b: { FunctionId: any; }) => Number(a.FunctionId) - Number(b.FunctionId)
    );
  }
}
