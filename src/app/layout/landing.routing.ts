import {Routes} from '@angular/router';
import { AlertExamplePage } from '../shared/common-components/test-component-page/alert-example-page/alert-example-page';
import { CloudNetConsoleVerificationComponent } from '../feature/admin-panel-user/cloudnet-console-verification/cloudnet-console-verification';
import { Dashboard } from '../dashboard/dashboard';
import { DashboardViewComponent } from '../dashboard';
import { DashboardDesignerComponent } from '../dashboard/pages/dashboard-designer/dashboard-designer.component';
import { DashboardComponent } from '../feature/admin-panel-user/dashboard/dashboard';

export const landingRouting: Routes = [
  {path: '', redirectTo: 'dashboard', pathMatch: "full"},
  //{path: 'dashboard', component: Dashboard},
  {path: 'home', component: CloudNetConsoleVerificationComponent},
  {path: 'alert-example-page', component: AlertExamplePage},


  {path: '', redirectTo: 'dashboard', pathMatch: "full"},
  {
      //path: 'dashboard', component: DashboardViewComponent // View page - Shows the final dashboard
      path: 'dashboard', component: DashboardComponent, 

  },
  {
    path: 'dashboard-designer',
    component: Dashboard,
    children: [
      { path: '', component: DashboardDesignerComponent } // Designer page - Configure widgets
    ]
  },

];

