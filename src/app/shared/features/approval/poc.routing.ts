import {Routes} from '@angular/router';
import {ApprovalItems} from './approval-items/approval-items';
import {ApprovalMovement} from './approval-movement/approval-movement';
import {ViewApprovalActivitiesComponent} from './view-approval-activities/view-approval-activities.component';
import {EmployeeOnboard} from './employee-onboard/employee-onboard';
import {EmployeeList} from './employee-list/employee-list';
import { AllComponentsPage } from '../../common-components/test-component-page/all-components-page/all-components-page';




export const PocRouting: Routes = [

  {path: 'employee-onboard', component: EmployeeOnboard},
  {path: 'employee-list', component: EmployeeList},
  {path: 'components', component: AllComponentsPage},
  {path: 'approval-items', component: ApprovalItems},
  {path: 'approval-movement', component: ApprovalMovement},
  {path: 'approval-activities', component: ViewApprovalActivitiesComponent},
];
