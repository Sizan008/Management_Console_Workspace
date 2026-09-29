import { Injectable } from '@angular/core';
import { SidebarService } from './sidebar.service';

export interface UserAccessItem {
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
  FunctionType: string;
  AppRoute: string | string[];
  routePath: string | string[];
  ItemType: string;
  QuickRouteNo: string;
  IsFinancial: string;
}

export interface MenuSection {
  key: string;
  label: string;
  icon: string;
}

const HIDDEN_MODULES = ['sentinel', 'Workspace'];

@Injectable({ providedIn: 'root' })
export class MenuService {
  /** Every resource the user has, unfiltered — fast path resolves against this. */
  allAccessItems: UserAccessItem[] = [];
  /** The subset rendered in the menu (no reports, no hidden modules). */
  userAccessList: UserAccessItem[] = [];
  menuSections: MenuSection[] = [];
  groupedMenu: { [moduleName: string]: UserAccessItem[] } = {};
  isLoading = true;

  constructor(private sidebarService: SidebarService) {
    this.sidebarService.resourceListReady$.subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.allAccessItems = this.readResourceList();
    this.userAccessList = this.allAccessItems
      .filter(item => item.FunctionType !== 'R')
      .filter(item => !HIDDEN_MODULES.includes(item.ModuleName.toLowerCase()));

    this.generateMenuFromAccess();
    this.isLoading = false;
  }

  private readResourceList(): UserAccessItem[] {
    const raw = localStorage.getItem('resourceList');
    if (!raw) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error('Error parsing resourceList from localStorage:', error);
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((m: any): UserAccessItem => ({
        FunctionId: m?.attributes?.functionId ?? '',
        FunctionName: m?.attributes?.functionName ?? '',
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
        MenuId: '',
        MenuName: '',
        ModuleId: m?.attributes?.moduleId ?? '',
        ModuleName: m?.attributes?.moduleName ?? '',
        FunctionType: m?.attributes?.functionType ?? '',
        AppRoute: m?.uris,
        routePath: m?.routePath,
        ItemType: 'F',
        QuickRouteNo: m?.attributes?.quickRoute ?? '',
        IsFinancial: '0',
      }))
      .sort((a, b) => a.FunctionId.localeCompare(b.FunctionId));
  }

  /**
   * Fast-path lookup: match a typed code against `quickRoute` (case-insensitive).
   * Searches the full resource list, so reports and hidden-module functions are
   * reachable by code even though they never appear in the menu.
   */
  findByQuickRoute(code: string): UserAccessItem | undefined {
    const needle = code.trim().toLowerCase();
    if (!needle) return undefined;
    return this.allAccessItems.find(
      item => String(item.QuickRouteNo ?? '').trim().toLowerCase() === needle
    );
  }

  private generateMenuFromAccess(): void {
    const uniqueNames = [...new Set(this.userAccessList.map(i => i.ModuleName))].sort();

    this.menuSections = uniqueNames.map(name => ({
      key: name.toLowerCase().replace(/\s+/g, ''),
      label: name,
      icon: this.getIcon(name),
    }));

    this.groupedMenu = this.userAccessList.reduce(
      (acc: { [k: string]: UserAccessItem[] }, item) => {
        (acc[item.ModuleName] ??= []).push(item);
        return acc;
      }, {}
    );
  }

  getItemsByModule(moduleName: string): UserAccessItem[] {
    return (this.groupedMenu[moduleName] ?? [])
      .sort((a, b) => Number(a.FunctionId) - Number(b.FunctionId));
  }

  /** Normalized navigation target, or null when the resource has no route configured. */
  resolveRoute(item: UserAccessItem): string | null {
    const raw = Array.isArray(item.routePath) ? item.routePath[0] : item.routePath;
    const path = (raw ?? '').trim();
    if (!path) return null;
    return path.startsWith('/') ? path : '/' + path;
  }

  getRoute(item: UserAccessItem): string {
    return this.resolveRoute(item) ?? '';
  }

  getIcon(name: string): string {
    const map: Record<string, string> = {
      Configuration: 'settings',
      Operation: 'work',
      Dashboard: 'dashboard',
    };
    return map[name] ?? 'folder';
  }
}
