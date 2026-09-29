export interface AssignRolesRequest {
  UserID: string;
  RoleIDs: string[];
}

export interface ManagementConsoleApiResponse<T> {
  Status: string;
  Message: string | null;
  Result: T | null;
}

export interface RoleAssignmentRoleDetail {
  roleId: string;
  roleName: string;
  roleDescription: string;
  methodId: string;
  methodDescription: string;
}

export interface RoleAssignmentRole {
  roleId: string;
  roleName: string;
  roleDescription: string;
}

export interface RoleAssignmentSearchResult {
  user: RoleAssignmentUser;
  unassignedRoles: RoleAssignmentRole[];
  assignedRoles: RoleAssignmentRole[];
}

export interface RoleAssignmentUser {
  userId: string;
  userName: string;
  customerId: string;
}
