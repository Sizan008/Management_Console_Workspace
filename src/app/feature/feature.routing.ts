import { Routes } from '@angular/router';
import { Usernote } from '../shared/features/usernote/usernote';
import { ConfigPageComponent } from './config/config-page/config-page.component';
import { FunctionsPageComponent } from './config/functions-page/functions-page.component';
import { UserCases } from './user-management/user-cases/user-cases';
import { UserRegistrationComponent } from './user-management/user-registration/user-registration.component';
import { SearchUserComponent } from './user-management/search-user/search-user.component';
import { UserRolesCreatePageComponent } from './user-management/user-roles-create-page/user-roles-create-page';
import { UserEditPageComponent } from './user-management/user-edit-page/user-edit-page';
import { UserRolePageComponent } from './user-management/user-role-page/user-role-page';
import { UserApprovePageComponent } from './user-management/user-approve-page/user-approve-page';
import { UserFunctionPageComponent } from './user-management/user-function-page/user-function-page';
import { UserAssignRolePageComponent } from './user-management/user-assign-role-page/user-assign-role-page';
import { UserGroupPageComponent } from './user-management/user-group-page/user-group-page';
import { UserQuickView } from './user-management/user-quick-view/user-quick-view';
import { Workspace } from '../shared/features/workspace/workspace';
import { UserPreferencesComponent } from '../shared/features/user-preferences/user-preferences.component';
import { AdminPanelUserCases } from './admin-panel-user/admin-panel-user-cases/admin-panel-user-cases';
import { AdminPanelUserQuickView } from './admin-panel-user/admin-panel-quick-view/admin-panel-quick-view';
import { AdminPanelAuthorizeComponent } from './admin-panel-user/actions-page/admin-panel-authorize/admin-panel-authorize';
import { AdminPanelRoleAssignComponent } from './admin-panel-user/actions-page/admin-panel-role-assign/admin-panel-role-assign';

import { AdminPanelResetPasswordComponent } from './admin-panel-user/actions-page/admin-panel-reset-password/admin-panel-reset-password';

import { ActiveSessionComponent as AdminPanelActiveSessionComponent } from './admin-panel-user/actions-page/active-session/active-session';
import { AdminPanelResetTPinComponent } from './admin-panel-user/actions-page/admin-panel-reset-tpin/admin-panel-reset-tpin';
import { AdminPanelUserDeviceComponent } from './admin-panel-user/actions-page/admin-panel-user-device/admin-panel-user-device';
import { AdminPanelRequestQueueComponent } from './admin-panel-user/actions-page/admin-panel-request-queue/admin-panel-request-queue';

import { AdminPanelCreateUserComponent } from './admin-panel-user/admin-panel-create-user/admin-panel-create-user';
import { cloudNetConsoleVerificationGuard } from './admin-panel-user/shared/guards/cloudnet-console-verification.guard';
import { AdminPanelActiveProductComponent } from './admin-panel-user/config/config-page/admin-panel-active-product/admin-panel-active-product';
import { AdminPanelQrCashGeneratorComponent } from './admin-panel-user/config/function-page/admin-panel-qr-cash-generator/admin-panel-qr-cash-generator';
import { AdminPanelContactComponent } from './admin-panel-user/config/config-page/admin-panel-contact/admin-panel-contact';
import { AdminPanelAboutComponent } from './admin-panel-user/config/config-page/admin-panel-about/admin-panel-about';
import { NotificationComponent } from './admin-panel-user/config/function-page/notification/notification';
import { FundTransferLimitComponent } from './admin-panel-user/config/config-page/fund-transfer-limit/fund-transfer-limit';
import { AdminPanelUserStatusChangeComponent } from './admin-panel-user/actions-page/admin-panel-user-status-change/admin-panel-user-status-change';
import { AdminPanelTagNewCardComponent } from './admin-panel-user/actions-page/admin-panel-tag-new-card/admin-panel-tag-new-card';
import { AdminPanelUserUpdate } from './admin-panel-user/actions-page/admin-panel-user-update/admin-panel-user-update';
import { AdminPanelNotification } from './admin-panel-user/actions-page/admin-panel-notification/admin-panel-notification';
import { AdminPanelFundTransfer } from './admin-panel-user/actions-page/admin-panel-fund-transfer-limit/admin-panel-fund-transfer-limit';
import { TransactionBillServiceComponent } from './admin-panel-user/config/config-page/transaction-bill-service/transaction-bill-service';
import { ManageNpsbBank } from './admin-panel-user/config/config-page/manage-npsb-bank/manage-npsb-bank';
import { MerchantDetails } from './admin-panel-user/config/config-page/merchant-details/merchant-details';
import { MerchantType } from './admin-panel-user/config/config-page/merchant-type/merchant-type';
import { AdminPanelNewsEvent } from './admin-panel-user/config/config-page/news-event/news-event';
import { DefineRole } from './admin-panel-user/config/config-page/define-role/define-role';
import { UserDashboard } from './admin-panel-user/actions-page/user-dashboard/user-dashboard';
import { UserActivityLog } from './admin-panel-user/actions-page/user-activity-log/user-activity-log';
import { ExecuteQueryComponent } from './admin-panel-user/config/function-page/execute-query/execute-query';
import { GenerateQueryComponent } from './admin-panel-user/config/function-page/generate-query/generate-query';


export const featureRoutes: Routes = [
  { path: 'usernote', component: Usernote },

  // ─── Settings ──────────────────────────────────────────────────────────────
  { path: 'settings/preferences',      component: UserPreferencesComponent},
  {
    path: 'settings/config',
    component: ConfigPageComponent,
    canActivate: [cloudNetConsoleVerificationGuard],
    canActivateChild: [cloudNetConsoleVerificationGuard],
    children: [
       { path: 'workspace', component: Workspace },
       
     {
      path: 'about',
      component: AdminPanelAboutComponent,
      canActivate: [cloudNetConsoleVerificationGuard],
      data: { title: 'About' }
    },
    {
      path: 'contact',
      component: AdminPanelContactComponent,
      canActivate: [cloudNetConsoleVerificationGuard],
      data: { title: 'Contact' }
    },
    { path: 'fund-transfer-limit', component: FundTransferLimitComponent, data: { title: 'Fund Transfer Limit' } },
      
       { path: 'define-role', component: DefineRole },
      { path: 'news-event', component: AdminPanelNewsEvent },
      { path: 'merchant-type', component: MerchantType },
      { path: 'merchant-details', component: MerchantDetails },
      { path: 'manage-npsb-bank', component: ManageNpsbBank },
      { path: 'transaction-bill-service', component: TransactionBillServiceComponent },
      { path: 'generate-data-report',       component: GenerateQueryComponent,        data: { title: 'Generate Query' } },
      { path: 'notification',         component: NotificationComponent,        data: { title: 'Notification' } },
    ]
  },


  {
    path: 'settings/functions',
    component: FunctionsPageComponent,
    canActivate: [cloudNetConsoleVerificationGuard],
    canActivateChild: [cloudNetConsoleVerificationGuard],
    children: [
      
    {
      path: 'QR-cash-generator',
      component: AdminPanelQrCashGeneratorComponent,
      canActivate: [cloudNetConsoleVerificationGuard],
      data: { title: 'QR Cash Generator' }
    },
    {
      path: 'active-product',
      component: AdminPanelActiveProductComponent,
      canActivate: [cloudNetConsoleVerificationGuard],
      data: { title: 'Active Product' }
    },
    
   
    
      { path: 'execute-data-report',        component: ExecuteQueryComponent,         data: { title: 'Execute Query' } },
    ]
  },
  
  /*Admin Panel User Routes */
  {path: 'admin-panel-user/create-user', canActivate: [cloudNetConsoleVerificationGuard], component: AdminPanelCreateUserComponent, data: { title: 'Create User' }},
  
  {
    path: 'admin-panel-user',
    component: AdminPanelUserCases,
    canActivate: [cloudNetConsoleVerificationGuard],
    canActivateChild: [cloudNetConsoleVerificationGuard],
    children: [
      // Side-panel detail page rendered inside GenericWorkspace's <router-outlet>.
      // Using a dedicated component (instead of AdminPanelUserCases) prevents a
      // second full workspace grid from being mounted inside the drawer when
      // a row is clicked.
      { path: 'case/:userId',          component: AdminPanelUserQuickView,            data: { title: 'Admin Panel User' } },

      // ── Action side panels ───────────────────────────────────────────────
      { path: 'AUTHORIZE/:userId',     component: AdminPanelAuthorizeComponent,     data: { title: 'Authorize' } },
      { path: 'ROLEASSIGN/:userId',    component: AdminPanelRoleAssignComponent,    data: { title: 'Role Assign' } },
      { path: 'USChange/:userId',      component: AdminPanelUserStatusChangeComponent, data: { title: 'User Status Change' } },
      { path: 'RUSRPASS/:userId',      component: AdminPanelResetPasswordComponent, data: { title: 'Reset User Password' } },
      { path: 'TAGNEWCARD/:userId',    component: AdminPanelTagNewCardComponent,    data: { title: 'Tag New Card' } },
      { path: 'ACTIVESESSION/:userId', component: AdminPanelActiveSessionComponent, data: { title: 'Active Session' } },
      { path: 'RESETTPIN/:userId',     component: AdminPanelResetTPinComponent,     data: { title: 'Reset T-Pin' } },
      { path: 'USRDEVICE/:userId',     component: AdminPanelUserDeviceComponent,    data: { title: 'User Device Remove' } },
      { path: 'REQUESTQ/:userId',      component: AdminPanelRequestQueueComponent,  data: { title: 'Request Queue' } },
      { path: 'USRUpdate/:userId',     component:AdminPanelUserUpdate, data: { title: 'User Update' }},
      { path: 'NOTIFY/:userId',        component:AdminPanelNotification,data: { title: 'Notification' }},
      { path: 'FTPolicy/:userId',      component:AdminPanelFundTransfer,data: { title: 'Fund Trancsfer policy' }},
      { path: 'USRLog/:userId', component:UserActivityLog,data: { title: 'User Activity Log' }},
      { path: 'USRDashboard/:userId', component:UserDashboard,data: { title: 'User Dashboard' }},
    ],
  },

  /*  */

  // ─── User Management Workspace ────────────────────────────────────────────
  // Standalone full-screen master pages — must come BEFORE the list route.
  // Launched from the list-header buttons (Register / Search); they render as
  // their own full pages (not inside the workspace panel).
  { path: 'user-management/register-user',     component: UserRegistrationComponent, data: { title: 'Register New User' } },
  { path: 'user-management/create-user-roles', component: UserRolesCreatePageComponent, data: { title: 'Create User Roles' } },
  { path: 'user-management/search-user',       component: SearchUserComponent,       data: { title: 'Search User' } },

  // List + right-panel child routes
  {
    path: 'user-management',
    component: UserCases,
    children: [
      { path: 'case/:userId',            component: UserQuickView,             data: { title: 'User Quick View' } },
      { path: 'edit/:userId',            component: UserEditPageComponent,      data: { title: 'Edit User' } },
      { path: 'role/:userId',            component: UserRolePageComponent,      data: { title: 'User Role & Permissions' } },
      { path: 'APPUSR/:userId',         component: UserApprovePageComponent,   data: { title: 'Approve User' } },
      { path: 'ASGNFN/:userId', component: UserFunctionPageComponent,  data: { title: 'Assign Function' } },
      { path: 'ASGNRL/:userId',     component: UserAssignRolePageComponent, data: { title: 'Assign Role' } },
      { path: 'assign-group/:userId',    component: UserGroupPageComponent,     data: { title: 'Assign Group' } },


    ]
  },

];
