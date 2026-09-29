import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../../../shared/services/theme.service';
import { SidebarService } from '../../../../service/sidebar.service';

interface ModuleItem {
  id: string;
  name: string;
  icon: string;
  route: string;
  color: string;
  isActive: boolean;
  description?: string;
}

@Component({
  selector: 'app-module-drawer',
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './module-drawer.html',
  styleUrl: './module-drawer.scss',
  animations: [
    trigger('expandCollapse', [
      state('open', style({ height: '*', opacity: 1 })),
      state('closed', style({ height: '0px', opacity: 0 })),
      transition('open <=> closed', animate('300ms ease-in-out'))
    ])
  ]
})
export class ModuleDrawer implements OnInit {

  modulesList: ModuleItem[] = [];
  selectedModuleId: string | null = '1';
  activeTheme: string = localStorage.getItem('selectedTheme') || '';
  isLoading = true;
  error: string | null = null;
  private themeSub?: Subscription;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private sidebarService: SidebarService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.sidebarService.appListReady$.subscribe(() => {
      this.loadModulesList();
      this.setSelectedModuleByPort();
    });
    // Load immediately if already available
    this.loadModulesList();
    this.themeSub = this.themeService.currentTheme$.subscribe(themeId => {
      this.activeTheme = themeId;
    });
   setTimeout(() => {
      this.setSelectedModuleByPort();
    }, 100);
  }

  setSelectedModuleByPort(): void {
    try {
      const currentPort = window.location.port;

      // Find module that matches current port
      const matchingModule = this.modulesList.find(module => {
        if (module.route) {
          const urlMatch = module.route.match(/:(\d+)/);
          return urlMatch && urlMatch[1] === currentPort;
        }
        return false;
      });

      if (matchingModule) {
        this.selectedModuleId = matchingModule.id;
        this.sidebarService.setSelectedModuleName(matchingModule.name);
        console.log(`Module drawer auto-selected: ${matchingModule.name} for port ${currentPort}`);
      } else {
        // Check if there's a stored selected module name to match
        const storedModuleName = localStorage.getItem('selectedModuleName');
        if (storedModuleName) {
          const storedModule = this.modulesList.find(m => m.name === storedModuleName);
          if (storedModule) {
            this.selectedModuleId = storedModule.id;
          }
        }
      }
    } catch (error) {
      console.error('Error setting selected module by port:', error);
    }
  }

  initializeSelectedModule(): void {
    // If no module is selected, select the first available module
    if (!this.selectedModuleId && this.modulesList.length > 0) {
      const firstActiveModule = this.modulesList.find(m => m.isActive);
      if (firstActiveModule) {
        this.selectedModuleId = firstActiveModule.id;
        this.sidebarService.setSelectedModuleName(firstActiveModule.name);
      }
    }

    // If a module name is stored but selectedModuleId is not set, find the matching module
    const storedModuleName = localStorage.getItem('selectedModuleName');
    if (storedModuleName && !this.selectedModuleId) {
      const matchingModule = this.modulesList.find(m => m.name === storedModuleName);
      if (matchingModule) {
        this.selectedModuleId = matchingModule.id;
      }
    }
  }

loadModulesList(): void {
  try {
    let appListString = localStorage.getItem('appList');
    if (!appListString) {
      this.modulesList = [];
      this.isLoading = false;
      return;
    }

    let appList = JSON.parse(appListString);
    const apps: ModuleItem[] = appList.map((m: any, index: number) => {
      const iconPath = `/asset/logos/${m.appId?m.appId:'nexoLogo1'}.png`;
      console.log('Icon path for', m.appName, ':', iconPath); // Debug log

      return {
        id: m.appId,
        name: m.appName,
        icon: iconPath ? iconPath : 'asset/logos/nexo.PNG',
        route: m.appUrl,
        color: '',
        isActive: true,
      };
    });

    this.modulesList = apps;
    this.isLoading = false;

    console.log('Modules list loaded:', this.modulesList); // Debug log
  } catch(error: any) {
    console.error('Error loading modules list:', error);
    this.modulesList = [];
    this.error = 'Failed to load modules list.';
    this.isLoading = false;
  }
}

  selectModule(moduleId: string): void {
    const selectedModule = this.modulesList.find(m => m.id === moduleId);

    if (!selectedModule) return;
    if (!selectedModule.isActive) return;

    if (this.selectedModuleId !== moduleId) {
      this.selectedModuleId = moduleId;
      this.sidebarService.setSelectedModuleName(selectedModule.name);

      // Open appUri in a new tab if available
      if (selectedModule.route) {
        window.open(selectedModule.route, '_blank');
      }
    }
  }

  // Check if module is selected
  isModuleSelected(moduleId: string): boolean {
    return this.selectedModuleId === moduleId;
  }

  // Check if module is clickable
  isModuleClickable(module: ModuleItem): boolean {
    return module.isActive && !this.isModuleSelected(module.id);
  }

  getModuleClasses(module: ModuleItem): string {
    const baseClasses = ' rounded-xl p-3 flex flex-col items-center text-center group relative transition-all';
    if (this.isModuleSelected(module.id)) {
      return `${baseClasses} border-3 border-green-600 cursor-default`;
    } else if (this.isModuleClickable(module)) {
      return `${baseClasses} cursor-pointer hover:shadow-lg hover:bg-gray-300`;
    } else {
      return `${baseClasses} opacity-60 cursor-not-allowed`;
    }
  }

  getIconClasses(module: ModuleItem): string {
    if (this.isModuleSelected(module.id)) {
      return `${module.color} scale-110`;
    } else if (this.isModuleClickable(module)) {
      return `${module.color} group-hover:scale-100`;
    } else {
      return `${module.color} opacity-70`;
    }
  }

  // Get currently selected module
  getSelectedModule(): ModuleItem | undefined {
    return this.modulesList.find(m => m.id === this.selectedModuleId);
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

}
