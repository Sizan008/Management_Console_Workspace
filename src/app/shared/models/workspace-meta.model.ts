// Shared shape describing a workspace's presentation metadata.
// Consumed by the workspace config builders (e.g. user-management, work-schedule).
export interface WorkspaceMeta {
  title: string;
  subtitle: string;
  routeSegment: string;
  panelOptions: string[];
  panelSelected: string;
  includeAmountsAction: boolean;
  includeRecentActivityAction: boolean;
}
