export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface RoleAccessMethod {
  methodId: string;
  description: string;
}

export interface RoleListItem {
  roleId: string;
  description: string;
}

export interface RoleDetail {
  roleId: string;
  roleName: string;
  roleDescription: string;
  methodId: string;
}

export interface RoleAddOrUpdateRequest {
  RoleID: string;
  RoleName: string;
  RoleDescription: string;
  MethodID: string[];
}

export interface DefineRoleMethodGridRow {
  methodId: string;
  methodDescription: string;
}

export interface DefineRoleGridRow {
  roleId: string;
  roleName: string;
  roleDescription: string;
}

export interface GridCheckedEvent {
  data: string;
  checked: boolean;
}

export interface GridSelectAllEvent {
  isSelectAll: boolean;
  selectedRows: DefineRoleMethodGridRow[];
  count: number;
}

export interface RoleDetailsSummary {
  roleId: string;
  roleName: string;
  roleDescription: string;
}

export interface InitialDefineRolesData {
  methods: RoleAccessMethod[];
  roles: RoleListItem[];
}

export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';