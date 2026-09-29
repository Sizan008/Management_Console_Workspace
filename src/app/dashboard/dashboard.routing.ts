import { Routes } from '@angular/router';
import { DashboardListComponent } from './pages/dashboard-list/dashboard-list.component';
import { DashboardEditorComponent } from './pages/dashboard-editor/dashboard-editor.component';
import { DashboardViewComponent } from './pages/dashboard-view/dashboard-view.component';
import { DashboardComponent } from '../feature/admin-panel-user/dashboard/dashboard';

export const dashboardRouting: Routes = [
  { path: '',             component: DashboardListComponent  },
  { path: 'editor/:id',  component: DashboardEditorComponent },
  // { path: 'view/:id',    component: DashboardViewComponent   }
  { path: 'view/:id',    component: DashboardComponent   }
  

];
