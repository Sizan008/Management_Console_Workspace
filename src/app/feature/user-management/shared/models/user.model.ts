export interface UserCase {
  userId: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  stage: string;
  stageId?: number | null;   // optional: when absent, actions resolve via stageName → META_STAGE (getStageIdMap)
  joinDate: string;
  lastLogin: string;
  branch?: string;
}
