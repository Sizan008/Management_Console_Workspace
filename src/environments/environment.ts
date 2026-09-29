
/* export const environment = {
  production: false,
  appName: 'CloudNetConsole',
  // change your appId, clientId only.
  appId: '201',
  keycloak: {
    url: 'http://192.168.10.56:9080',
    realm: 'MicroCube_dev',
    clientId: 'CloudNetConsole_FE'
  },

   
  // Login/Redirect URLs - (add your appId - 4***).
  loginUrl:'http://localhost:4201',
  redirectUri:'http://localhost:4201/landing/home',

  // Base/Keycloak/Session data URLs real = 192.168.10.56:9999
  apiBaseUrl:'http://192.168.10.56:9999',
  // myBaseUrl:'http://192.168.10.56:9999/Sentinel/v1',  //*change with your api servlet* // main 
  // myBaseUrl:'http://localhost:8084/CloudNetConsole',
  myBaseUrl:'http://localhost:8083',

  centrinoUrl:'http://192.168.10.56:9999/Centrino/v1',
  sentinelUrl:'http://192.168.10.56:9999/Sentinel/v1', // main 
  workSpaceSessionAppId: true,
  // Report Management Backend API (DO NOT CHANGE).
  reportManagementApiUrl: 'http://192.168.10.56:9999/Centrino/v1',

  // Notification Management Backend API.
  novu_identifier: '1uXpKIJUa3Rg',
  novu_socket: 'http://192.168.10.56:3002',
  novu_api: 'http://192.168.10.56:3000/novu/api',


}; */

//temporary
// export const environment = {
//   production: false,
//   appName: 'Microfont POC',
//   // change your appId, clientId only.
//   appId: '1',
//   keycloak: {
//     url: 'http://192.168.10.56:9080',
//     realm: 'MicroCube_dev',
//     clientId: 'Sentinel_FE'
//   },


//   // Login/Redirect URLs - (add your appId - 4***).
//   loginUrl:'http://localhost:4001',
//   redirectUri:'http://localhost:4001/landing/home',

//   // Base/Keycloak/Session data URLs
//   apiBaseUrl:'http://192.168.10.56:9999',
//   myBaseUrl:'http://localhost:8083',  //*change with your api servlet*
//   myBaseUrl2:'http://localhost:3000',  

//   centrinoUrl:'http://192.168.10.56:9999/Centrino/v1',
//   sentinelUrl:'http://192.168.10.56:9999/Sentinel/v1',
//   workSpaceSessionAppId: true,
//   // Report Management Backend API (DO NOT CHANGE).
//   reportManagementApiUrl: 'http://192.168.10.56:9999/Centrino/v1',

//   // Notification Management Backend API.
//   novu_identifier: '1uXpKIJUa3Rg',
//   novu_socket: 'http://192.168.10.56:3002',
//   novu_api: 'http://192.168.10.56:3000/novu/api',


// };

/* 
keep everything as it is, just cretae a physical path like this pattern:
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
  }
  Create this above pattern for Management Console workspace like :
  {
    path: 'admin-panel-user',  
    component: UserCases,
    children: [
      { path: 'case/:userId', component: AdminPanelUserCases, data: { title: 'Admin Panel User' } },
       ......etc other action compoennt path

    ]
  }
  and keep action component design only Commning Soon! No need to keep any icon type which you already did!

Again analysis this part: {
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
  }

  within a workspace have some stages and within stages have some actions like those above child component part 
  are the action component this part : children: [
      { path: 'case/:userId',            component: UserQuickView,             data: { title: 'User Quick View' } },
      { path: 'edit/:userId',            component: UserEditPageComponent,      data: { title: 'Edit User' } },
      { path: 'role/:userId',            component: UserRolePageComponent,      data: { title: 'User Role & Permissions' } },
      { path: 'APPUSR/:userId',         component: UserApprovePageComponent,   data: { title: 'Approve User' } },
      { path: 'ASGNFN/:userId', component: UserFunctionPageComponent,  data: { title: 'Assign Function' } },
      { path: 'ASGNRL/:userId',     component: UserAssignRolePageComponent, data: { title: 'Assign Role' } },
      { path: 'assign-group/:userId',    component: UserGroupPageComponent,     data: { title: 'Assign Group' } },

    ]
  
  while user click a specific actions for an user redirect into this path: edit/:userId, you know that those; (edit, role, 
  APPUSR, ASGNFN...etc) are commning form API, they are dynamic but also hardcorded in codebase so that can redirect into 
  the exact component for those specific action! when user click an action a short side panel will open, By analysing 
  you can understand! So like that you have to creat specific action component for Management console workspace. 
  i will provide you the real backend data then you can define action title, what will be the path. 
  So this is the workspace:
  {
  "workspaceId": 3,
  "appId": 1,
  "workspaceName": "Management Console",
  "workspaceDesc": "Manage users credentials",
  "searchIdentifier": "Search user",
  "searchSelector": "search-user",
  "homeIdentifier": "admin-panel-user",
  "homeSelector": null,
  "displayOrder": 1,
  "isActive": 1,
  "newPageIdentifiers": []
}
those are the satages :
[
  {
    "stageId": 3,
    "workspaceId": 3,
    "stageName": "Created",
    "displayOrder": 1,
    "isActive": 1,
    "quickRoute": "CREATED",
    "stageColour": "bg-blue-50 text-blue-600 border border-blue-100"
  },
  {
    "stageId": 4,
    "workspaceId": 3,
    "stageName": "Authorized",
    "displayOrder": 2,
    "isActive": 1,
    "quickRoute": "AUTHORIZED",
    "stageColour": "bg-emerald-50 text-emerald-700 border border-emerald-100"
  },
  {
    "stageId": 5,
    "workspaceId": 3,
    "stageName": "Pending",
    "displayOrder": 3,
    "isActive": 1,
    "quickRoute": "PENDING",
    "stageColour": "bg-red-50 text-red-600 border border-red-100"
  }
]

those are the action name and others:

[
  {
    "actionId": 3,
    "stageId": 3,
    "actionName": "Authorize",
    "quickRoute": "AUTHORIZE",
    "actionType": "authorize",
    "displayOrder": 1,
    "isActive": 1
  }
  {
    "actionId": 4,
    "stageId": 4,
    "actionName": "Role Assign",
    "quickRoute": "ROLEASSIGN",
    "actionType": "role-assign",
    "displayOrder": 1,
    "isActive": 1
  },
  {
    "actionId": 5,
    "stageId": 4,
    "actionName": "User Status Change",
    "quickRoute": "USChange",
    "actionType": "user-status-change",
    "displayOrder": 2,
    "isActive": 1
  },
  {
    "actionId": 7,
    "stageId": 4,
    "actionName": "Reset User Password",
    "quickRoute": "RUSRPASS",
    "actionType": "reset-user-password",
    "displayOrder": 3,
    "isActive": 1
  },
  {
    "actionId": 8,
    "stageId": 4,
    "actionName": "Tag New Card",
    "quickRoute": "TAGNEWCARD",
    "actionType": "tag-new-card",
    "displayOrder": 5,
    "isActive": 1
  },
  {
    "actionId": 9,
    "stageId": 4,
    "actionName": "Tag New Card",
    "quickRoute": "TAGNEWCARD",
    "actionType": "tag-new-card",
    "displayOrder": 4,
    "isActive": 1
  },
  {
    "actionId": 10,
    "stageId": 4,
    "actionName": "Active Session",
    "quickRoute": "ACTIVESESSION",
    "actionType": "active-session",
    "displayOrder": 6,
    "isActive": 1
  }
    {
  "actionId": 6,
  "stageId": 5,
  "actionName": "Authorize",
  "quickRoute": "AUTHORIZE",
  "actionType": "authorize",
  "displayOrder": 1,
  "isActive": 1
}
  

] 
from above action data, you give action title name : ("actionName": "Authorize",) from this, then define component path 
for specific actions for here : ("quickRoute": "AUTHORIZE",), like that :
children: [
     
      { path: 'AUTHORIZE/:userId',            component: AdminPanelauthorize,      data: { title: 'Authorize' } },
       ..............etc

    ]

when user click a action redirect into this specific component, a short side panel, use also can expend this panel like fullscreen!
At first you complete component path, for all actions and keep those component side panel design like : Comming Soon!
Later i will procedd for those action component design! if you have any question cna ask me! 







ok, you know that this application is using keyclock system to login.                                                                  ││   (http://192.168.10.56:9080/realms/MicroCube_dev/protocol/openid-connect/auth?client_id=Sentinel_FE&redirect_uri=http%3A%2F%2Flocalhost%││   3A4001%2Flanding%2Fhome&state=ed57b712-4567-456f-b6a6-6e5c1d7fc1d5&response_mode=fragment&response_type=code&scope=openid&nonce=8f196e6│
│   6-8b87-41ce-b96d-4b807fdffb9f&code_challenge=JCLusi4J7ws16Oiy4N4S1wvNxrL5nR7zrFnSztuAfpU&code_challenge_method=S256) this is the       │
│   keyclock login page. At first applicaiton redirect in to this login page.
    actually i need to implement a system in this application like, after keyclock login. with 
    this userId and password i will call another applciation login API, and i need this access_token, user information!
    SO after keyclock login currently i get keyclock provided access tocken, user information but at the same
    time i need another application access token using this same keyclock login credential! does this possible.
    when i try to do this i can get keyclock access tocken, userId form sessionStorage but how to get 
    the use password ? so that using this credential can auto make API call for another applciation ? 



 File 1: src/app/feature/admin-panel-user/admin-panel-user-cases/admin-panel-user-cases.ts

  What changed: Rewrote buildConfig() to source everything from the live API instead of the mock workspace.

  Imports trimmed: Removed catchError (no more fallback), removed ADMIN_PANEL_STAGE_ACTIONS (no more mock action list), removed ActionDto
  import (no longer used directly).

  Imports kept: MOCK_ADMIN_PANEL_USERS (still the row source), ADMIN_PANEL_STAGE_ID_MAP was removed too in the final cleanup since UserCases   doesn't use it either.

  The new buildConfig() body (3 things happen):

  // 1. Get stageId map from live API
  const stageIdMap = this.resolver.getStageIdMap(ADMIN_PANEL_META.routeSegment);

  return buildAdminPanelConfig({
    router: this.router,
    route:  this.route,
    dynamicActions,
    stageColourMap: this.resolver.getStageColourMap(ADMIN_PANEL_META.routeSegment),  // 2. Live colours
    stageOptions:   this.resolver.getStageNamesForWorkspace(ADMIN_PANEL_META.routeSegment), // 3. Live stage names
    resolveActionsForItem: (item) => { ... }  // 4. Live actions per row
  });

  ---
  File 2: src/app/feature/admin-panel-user/admin-panel-user-cases/admin-panel-user.config.ts

  What changed: Removed every mock reference and the dead fallback code.

  Removed:
  - MOCK_ADMIN_PANEL_WORKSPACE import (no longer used)
  - mapAdminPanelActionDtosFromMock function (the offline mapper)
  - The for (const stage of MOCK_ADMIN_PANEL_WORKSPACE.stages) loop that pre-filled mock colours
  - liveResolver + fallbackResolve chain (component always supplies a resolver now)
  - Stale "placeholder detail route" comment

  Kept:
  - mapAdminPanelActionDtos — still maps ActionDto[] → row actions (now fed by API only)
  - buildAdminPanelConfig — cleaner body: stageColour = options.stageColourMap ?? {} (no spread)

  ---
  File 3: src/app/feature/admin-panel-user/admin-panel-user-cases/admin-panel-user.data.ts

  What changed: File shrank from 279 lines → 73 lines.

  Removed:
  - MOCK_ADMIN_PANEL_WORKSPACE (the 120-line workspace/stages/actions block)
  - ADMIN_PANEL_STAGE_NAMES (was unused)
  - ADMIN_PANEL_STAGE_COLOURS (was dead fallback)
  - ADMIN_PANEL_STAGE_ID_MAP (was offline stageId map)
  - ADMIN_PANEL_STAGE_ACTIONS (was offline per-stage action list)

  Kept: Only MOCK_ADMIN_PANEL_USERS — the 5 demo user rows (Sara Khan, Rahim Uddin, Imran Chowdhury, Nadia Hossain, Tahmina Begum).

  ---
  File 4: src/app/feature/admin-panel-user/admin-panel-user-cases/admin-panel-user.model.ts

  What changed: Only the JSDoc comment at the top — updated to say stages/actions come from the live API; only the rows come from
  MOCK_ADMIN_PANEL_USERS.

  No type or field changes.

  ---
  How the dropdown gets actions from stageId (Easy Explanation)

  This is the most important part. Here is the exact flow, end-to-end, without any mock involvement:

  Step 1: User opens the page

  When the user navigates to /feature/admin-panel-user, the AdminPanelUserCases component is created. It extends BaseWorkspaceComponent,
  which has an Angular effect() that calls buildConfig() once the resolver's signal settles.

  Step 2: Resolver has already pre-loaded everything (at app startup)

  WorkspaceResolverService.load() runs once at app startup (called from somewhere in the bootstrap, NOT from this component). It fires three   API calls in parallel via forkJoin:

  ┌─────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┬────────────────────────┐
  │                    API Call                     │                           URL                            │        Purpose         │
  ├─────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┼────────────────────────┤
  │ getWorkspacesByApp(1)                           │ …/Workspace/RetrieveByAppId?appId=1                      │ Returns 3 workspaces   │
  ├─────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┼────────────────────────┤
  │ getUserActionAssignments(userId) (or            │                                                          │ Returns user's         │
  │ getAppActionAssignments(1) in dev)              │ …/Workspace/Stage/Actions/Assign/RetrieveByUser/{userId} │ stage→action           │
  │                                                 │                                                          │ assignments            │
  ├─────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┼────────────────────────┤
  │ For each unique stageId in the assignments:     │ …/Workspace/Stage/Actions/RetrieveByStage/{stageId}      │ Returns the actions    │
  │ getActionsByStage(stageId)                      │                                                          │ for that stage         │
  ├─────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┼────────────────────────┤
  │ For each workspace:                             │ …/Workspace/Stage/RetrieveByWorkspace/{workspaceId}      │ Returns stages per     │
  │ getStagesByWorkspace(workspaceId)               │                                                          │ workspace              │
  └─────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┴────────────────────────┘

  So by the time the user clicks the three-dot menu on any row, the stageId → actions mapping is already cached in the resolver
  (stageActionsMap: Map<number, ActionDto[]>).

  Step 3: getActionsByStage has its own per-stage cache

  Look at workspace-api.service.ts line 40-51:

  private actionsByStageCache = new Map<number, Observable<ActionDto[]>>();

  getActionsByStage(stageId: number): Observable<ActionDto[]> {
    let cached = this.actionsByStageCache.get(stageId);
    if (!cached) {
      cached = this.http
        .get<ActionDto[]>(`${this.base}/Workspace/Stage/Actions/RetrieveByStage/${stageId}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.actionsByStageCache.set(stageId, cached);
    }
    return cached;
  }

  This is a second layer of caching. Even if WorkspaceResolverService didn't pre-fetch, this service-layer cache ensures each unique stageId   triggers exactly one HTTP call for the entire session.

  Step 4: Row click → stageId lookup → action fetch

  In the new buildConfig():

  resolveActionsForItem: (item: AdminPanelUserCase) => {
    const stageId = stageIdMap[item.stage?.trim().toLowerCase() ?? ''];  // ← stage name "Created" → 3
    return stageId !== undefined
      ? this.workspaceApi.getActionsByStage(stageId).pipe(                  // ← fetch (or cache-hit) actions for stage 3
          map(dtos => mapAdminPanelActionDtos(dtos, this.router, this.route)) // ← turn DTOs into menu items
        )
      : of([]);                                                            // ← empty if stage not recognised
  }

  The GenericWorkspace component invokes this closure when the user clicks the three-dot menu on a row. So:

  1. Row has stage: 'Created'.
  2. stageIdMap['created'] (lowercased) returns 3 (from the live API).
  3. getActionsByStage(3) returns the cached Observable → emits ActionDto[] for stage 3.
  4. mapAdminPanelActionDtos converts each DTO into a { label, onClick } menu item, filtering by isActive === 1 and sorting by displayOrder.  5. The menu renders.

  Step 5: What if the resolver hasn't loaded yet (cold start)?

  If WorkspaceResolverService.load() is still in flight when the user clicks a row:

  - stageIdMap is empty.
  - stageIdMap['created'] returns undefined.
  - The closure returns of([]) — the menu shows no actions.
  - Once the resolver's signal settles, BaseWorkspaceComponent's effect re-runs buildConfig(), stageIdMap is now populated, and every
  subsequent click works.

  This is exactly what UserCases does — same trade-off, same pattern.

  Visual summary of the action lookup chain

  Row "Sara Khan" → stage="Created"
                     ↓
     stageIdMap['created'] = 3          ← from live API via WorkspaceResolverService
                     ↓
     workspaceApi.getActionsByStage(3)  ← from live API via WorkspaceApiService
                     ↓
     Cache hit (pre-warmed by resolver)
                     ↓
     ActionDto[]: [ { Authorize, ... } ]
                     ↓
     mapAdminPanelActionDtos → ActionDefinition[]
                     ↓
     Three-dot menu renders "Authorize"
                     ↓
     Click → router.navigate(['AUTHORIZE', 'APU-2026-001'], { relativeTo: route })

  Net effect: For the user's current session, the moment they open the three-dot menu on any row, the action list comes from a single live
  HTTP call per unique stageId, with two layers of in-memory caching (resolver + service) ensuring zero duplicate calls. No mock data is
  involved at any point in this chain. 
*/



/* 
 A backend endpoint that returns AdminPanelUserCase[] (e.g. filtered by workspaceId or stageId). This must be provided by the backend team — nothing exists yet.
  2. A new service method (e.g. in WorkspaceApiService or a new admin-panel-user.service.ts) that calls it via HttpClient.
  3. A small change in admin-panel-user-cases.ts to:
    - Change allCases from a static array to a signal<AdminPanelUserCase[]> (or Observable).
    - Fetch from the API in the constructor/ngOnInit.
    - Keep MOCK_ADMIN_PANEL_USERS as a fallback (matching the existing pattern for stages/actions).
    - The template binding [items]="allCases" does not need to change.

    above those type of pattern already exit in this codebase. form this API: (http://localhost:8083/Workspace/RetrieveByAppId?appId=1)
    now this application getting workspace data([
    {
        "workspaceId": 1,
        "appId": 1,
        "workspaceName": "User Dashboard",
        "workspaceDesc": "Workspace for Demo",
        "searchIdentifier": null,
        "searchSelector": null,
        "homeIdentifier": "user-management",
        "homeSelector": "app-user-management",
        "displayOrder": 2,
        "isActive": 1,
        "newPageIdentifiers": []
    },
    {
        "workspaceId": 2,
        "appId": 1,
        "workspaceName": "User Status",
        "workspaceDesc": "User Status Modification",
        "searchIdentifier": null,
        "searchSelector": null,
        "homeIdentifier": null,
        "homeSelector": null,
        "displayOrder": null,
        "isActive": 1,
        "newPageIdentifiers": []
    },
    {
        "workspaceId": 3,
        "appId": 1,
        "workspaceName": "Management Console",
        "workspaceDesc": "Manage users credentials",
        "searchIdentifier": "Search user",
        "searchSelector": "search-user",
        "homeIdentifier": null,
        "homeSelector": null,
        "displayOrder": 1,
        "isActive": 1,
        "newPageIdentifiers": []
    }
]), 
then from this API: (
http://localhost:8083/Workspace/Stage/Actions/Assign/RetrieveByUser/saikat1)
getting stage, action data like :
([
    {
        "userId": "saikat1",
        "appId": 1,
        "workspaceId": 1,
        "stageId": 1,
        "actionId": 1
    },
    {
        "userId": "saikat1",
        "appId": 1,
        "workspaceId": 2,
        "stageId": 2,
        "actionId": 2
    },
    {
        "userId": "saikat1",
        "appId": 1,
        "workspaceId": 3,
        "stageId": 3,
        "actionId": 3
    },
    {
        "userId": "saikat1",
        "appId": 1,
        "workspaceId": 3,
        "stageId": 4,
        "actionId": 4
    },
    {
        "userId": "saikat1",
        "appId": 1,
        "workspaceId": 3,
        "stageId": 4,
        "actionId": 5
    },
    {
        "userId": "saikat1",
        "appId": 1,
        "workspaceId": 3,
        "stageId": 5,
        "actionId": 6
    }
])
    
so those are real data getting from backend. so you can make a new service method and make
 small change in admin-panel-user-cases.ts as you explain before! If you follow this this path (feature/user-management)
 UserCases Component you can relate how to show real API data. i will explain you how UserCases component working 
 with real data lik e: User list is mock and stages are also hard coded with indivisual user! But what is 
 happening for each user have stageId and for each user with stageId an API call happening like this part:
 (getActionsByStage(stageId: number): Observable<ActionDto[]> {
     let cached = this.actionsByStageCache.get(stageId);
     if (!cached) {
         console.log('Cached stage IDs:', [...this.actionsByStageCache.keys()]);
 
       cached = this.http
         .get<ActionDto[]>(`${this.base}/Workspace/Stage/Actions/RetrieveByStage/${stageId}`)
         .pipe(shareReplay({ bufferSize: 1, refCount: false }));
       this.actionsByStageCache.set(stageId, cached);
     }
     return cached;
   }) from workspace-api.service.ts. And from UserCases component ---> GenericWorkspace this
    component this connected. through this component, with user stageId, fro every user 
    actions are commning from API and finally load in GenericWorkspace this component. 
    you analysis those component which i provide! then keep those mock users like UserCases 
    component and update stages like real data stages then with real data stageId, make 
    API call for actions like the  demo component! then all user stage, action data will
    be show in this path: (feature/admin-panel-user), i mean from AdminPanelUserCases
    component which is ocnnected with this GenericWorkspace component. So follow 
    UserCases and GenericWorkspace component how user actions are comming with stageId 
    and showing in user list, like that update for Management Console workspace 
    drop down data! after complete you task test this, user actions must need to come 
    from real API ! do not use mock data!







=========================================

but in admin-panel-user.data.ts (MOCK_ADMIN_PANEL_WORKSPACE) is created and i think in this path : (feature/admin-panel-user),
user list stage, action data is commning from this  (MOCK_ADMIN_PANEL_WORKSPACE) ! But i instruct you to do take this data 
from API, not to use mock, why you do this ? does it possible to take data from API ? explain those easily! do not change any code without my permission!


Now I have a complete picture. Here's the explanation you asked for — no code was changed.
                                                                                            
  Why Mock Data Is Being Used
                                                                                                                                                                            Look at this line in admin-panel-user-cases.ts:                                                                                                                                                                                                                                                                                                     allCases: AdminPanelUserCase[] = MOCK_ADMIN_PANEL_USERS;  // line 34                                                                                                  

  The grid's row data (allCases) is assigned directly and synchronously from the mock array. There is no HttpClient call, no Observable, no subscribe for the rows. The
  component just imports MOCK_ADMIN_PANEL_USERS from admin-panel-user.data.ts and passes it straight to the template:

  <app-generic-workspace [items]="allCases" ...>

  So the mock is being used because that's literally how the component was written — the rows were hardcoded.

  What IS Already Coming From the API

  The stage meta and actions already come from the real WorkspaceApiService (via WorkspaceResolverService):
  - Workspaces, stages, actions per stage, etc.
  - These are fetched live, with the mock as a fallback when the API hasn't responded yet.

  Why the Rows Were Left as Mock

  There are 3 reasons:

  1. No backend endpoint exists yet in environment.myBaseUrl (http://localhost:8083) that returns rows of the AdminPanelUserCase shape. The existing WorkspaceApiService
  only has endpoints for workspace/stage/action meta — not for "list users in this stage/workspace."
  2. No service file exists in admin-panel-user/ to call such an endpoint. There is no admin-panel-user.service.ts.
  3. The same pattern exists in the sibling feature user-management — it also uses MOCK_USERS for its rows. So this gap is consistent across both features.

  Is It Possible to Switch to API?

  Yes, but 3 things are needed:

  1. A backend endpoint that returns AdminPanelUserCase[] (e.g. filtered by workspaceId or stageId). This must be provided by the backend team — nothing exists yet.
  2. A new service method (e.g. in WorkspaceApiService or a new admin-panel-user.service.ts) that calls it via HttpClient.
  3. A small change in admin-panel-user-cases.ts to:
    - Change allCases from a static array to a signal<AdminPanelUserCase[]> (or Observable).
    - Fetch from the API in the constructor/ngOnInit.
    - Keep MOCK_ADMIN_PANEL_USERS as a fallback (matching the existing pattern for stages/actions).
    - The template binding [items]="allCases" does not need to change.

  The Pattern Already Used (Reference)

  The user-management feature's UserCases component already does this for departmentOptions:
  this.serviceRequest.getDepartmentOptions().subscribe(opts => this.departmentOptions.set(opts));

  The same pattern can be applied to allCases once the endpoint is available.

  Summary

  ┌───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
  │                Concern                │                                       Status                                       │
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ Why is mock used for rows?            │ Hardcoded assignment, no API call exists                                           │
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ Was this intentional or an oversight? │ Oversight — meta layer was migrated to API, rows were not                          │
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ Can it be switched?                   │ Yes — needs (1) backend endpoint, (2) a service method, (3) small component change │
  ├───────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ Was any code changed?                 │ No — investigation only, as you instructed                                         │
  └───────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘
*/


//For check

export const environment = {
  production: false,
  appName: 'CloudNetConsole',
  // change your appId, clientId only.
  appId: '201',
  keycloak: {
    url: 'http://192.168.10.56:9080',
    realm: 'MicroCube_dev',
    clientId: 'CloudNetConsole_FE'
  },


  // Login/Redirect URLs - (add your appId - 4***).
  loginUrl:'http://localhost:4201',
  redirectUri:'http://localhost:4201/landing/home',

  // Base/Keycloak/Session data URLs
  apiBaseUrl:'http://192.168.10.56:9999',
  //myBaseUrl:'http://192.168.10.56:9999/Sentinel/v1',  //*change with your api servlet*
  myBaseUrl:'http://localhost:8083',
  myBaseUrl2:'http://localhost:8084',
  mcUrl:'http://localhost:8084',
  
  centrinoUrl:'http://192.168.10.56:9999/Centrino/v1',
  sentinelUrl:'http://192.168.10.56:9999/Sentinel/v1',
  workSpaceSessionAppId: true,
  // Report Management Backend API (DO NOT CHANGE).
  reportManagementApiUrl: 'http://192.168.10.56:9999/Centrino/v1',

  // Notification Management Backend API .
  novu_identifier: '1uXpKIJUa3Rg',
  novu_socket: 'http://192.168.10.56:3002',
  novu_api: 'http://192.168.10.56:3000/novu/api',


};
