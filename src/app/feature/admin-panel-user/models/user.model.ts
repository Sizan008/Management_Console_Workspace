export interface RoleItem {
  roleId: string;
  roleName: string;
}

export interface User {
  userId: string;
  fullName: string;
  emailAddress: string;
  mobileNumber: string;
  authStatusId: string | null;
  authStatus: string | null;
  homeBranchId: string;
  homeBranchName: string | null;
  roles: RoleItem[];
}

export type AuthStageId = 'A' | 'U' | 'D' | string;

export interface UserApiResponse {
  Status: string;
  Message: string;
  Result: User[];
}

export const AUTH_STAGE_LABELS: Record<string, string> = {
  A: 'Authorized',
  U: 'Pending'
};

export const AUTH_STAGE_IDS: Record<string, number> = {
  A: 4,
  U: 5,
};

export function authStatusToStage(authStatus: string | null | undefined): string {
  const normalizedStatus = String(authStatus ?? '').trim().toUpperCase();
  return normalizedStatus === 'P' ? AUTH_STAGE_LABELS['U'] : AUTH_STAGE_LABELS['A'];
}

export function authStatusToStageId(authStatus: string | null | undefined): number {
  const normalizedStatus = String(authStatus ?? '').trim().toUpperCase();
  return normalizedStatus === 'P' ? AUTH_STAGE_IDS['U'] : AUTH_STAGE_IDS['A'];
}

export function rolesToString(roles: RoleItem[] | null | undefined): string {
  if (!roles || roles.length === 0) return '—';
  return roles.map(r => r.roleName).join(', ');
}

export function branchDisplayName(user: User): string {
  if (user.homeBranchName && user.homeBranchName.trim().length > 0) {
    return user.homeBranchName;
  }
  return user.homeBranchId;
}
