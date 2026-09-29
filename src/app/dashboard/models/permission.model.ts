export type PermissionType = 'USER' | 'ROLE';

export interface WidgetPermission {
  id: number;
  widgetId: number;
  permissionType: PermissionType;
  permissionTarget: string;
}

export interface WidgetPermissionGranted {
  id: number;
  widgetId: number;
  permissionType: PermissionType;
  permissionTarget: string;
}

export interface WidgetPermissionRevoked {
  id: number;
  widgetId: number;
}

export interface GrantWidgetPermissionCommand {
  permissionType: PermissionType;
  permissionTarget: string;
}

export interface RevokeWidgetPermissionCommand {
  id: number;
}
