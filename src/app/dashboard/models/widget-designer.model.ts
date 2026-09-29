import { QueryDefinition } from './query-definition.model';

export interface Widget {
  id: number;
  dashboardId: number;
  widgetType: string;              // e.g., "PIE_CHART", "BAR_CHART", "LINE_CHART", "KPI_CARD", "TABLE"
  title: string;
  queryDefinition: QueryDefinition; // JSON query built from UI
  layoutConfig: LayoutConfig;       // Grid positioning
  displayOrder: number;
  isActive: boolean;
  widgetConfig?: Record<string, any>; // Free JSON for widget-specific settings
  permissions?: WidgetPermission[];
}

export interface LayoutConfig {
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface AddWidgetCommand {
  dashboardId: number;
  widgetType: string;
  title: string;
  queryDefinition: QueryDefinition;
  layoutConfig: LayoutConfig;
  displayOrder: number;
  widgetConfig?: Record<string, any>;
}

export interface UpdateWidgetCommand {
  widgetType: string;
  title: string;
  queryDefinition: QueryDefinition;
  layoutConfig: LayoutConfig;
  displayOrder: number;
  isActive: boolean;
  widgetConfig?: Record<string, any>;
}

export interface WidgetPermission {
  id: number;
  widgetId: number;
  permissionType: 'USER' | 'ROLE';
  permissionTarget: string;       // userId or roleId
}

export interface GrantPermissionCommand {
  permissionType: 'USER' | 'ROLE';
  permissionTarget: string;
}

export interface RevokePermissionCommand {
  permissionId: number;
}
