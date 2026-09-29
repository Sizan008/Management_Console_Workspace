import { RoleItem } from '../models/user.model';

export interface AdminPanelUserCase {
  userId: string;
  fullName: string;
  email: string;
  emailAddress?: string;
  mobileNumber?: string;
  department?: string;
  role: string;
  stage: string;
  authStatusId?: string | null;
  authStatus?: string | null;
  stageId?: number | null;
  joinDate?: string;
  lastLogin?: string;
  branch?: string;
  homeBranchId?: string;
  homeBranchName?: string | null;
  roles?: RoleItem[];
}
