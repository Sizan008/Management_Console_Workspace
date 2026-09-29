/**
 * A single "New / create" master page for a workspace. The API can return
 * several of these per workspace (a workspace may open more than one create
 * page), which the header renders as a split dropdown button.
 */
export interface NewPageDto {
  workspaceId?: number;
  newPageIdentifier: string;   // display label, e.g. "Register New User"
  newPageSelector: string;     // route segment appended to the workspace home route
  displayOrder?: number;
  isActive?: number;
}

export interface WorkspaceDto {
  workspaceId: number;
  appId: number;
  workspaceName: string;
  workspaceDesc: string;
  homeIdentifier?: string;   // route segment for the workspace home/list page (e.g. "user-management")
  homeSelector?: string;     // component selector that renders it (e.g. "app-user-management")
  newPageIdentifiers?: NewPageDto[];  // preferred: one or more create pages
  newPageIdentifier?: string;         // legacy single-page fields (fallback when the array is absent)
  newPageSelector?: string;
  searchIdentifier?: string;
  searchSelector?: string;
  displayOrder: number;
  isActive: number;
}

export interface StageDto {
  stageId: number;
  workspaceId: number;
  stageName: string;
  displayOrder: number;
  isActive: number;
  quickRoute: string;
  stageColour?: string;   // CSS class string from META_STAGE.stage_colour (drives the badge colour)
}

export interface ActionDto {
  actionId: number;
  stageId: number;
  actionName: string;
  quickRoute: string;
  actionType: number;
  displayOrder: number;
  isActive: number;
}

export interface UserActionAssignment {
  userId: string;
  appId: number;
  workspaceId: number;
  stageId: number;
  actionId: number;
}

export interface ResolvedStage {
  stageId: number;
  stageName: string;
  actions: ActionDto[];
}

export interface ResolvedWorkspace {
  workspace: WorkspaceDto;
  stages: ResolvedStage[];
  allStages: StageDto[];
}
