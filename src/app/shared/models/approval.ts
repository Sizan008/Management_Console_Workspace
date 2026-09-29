export interface ApprovalRequest {
  officeId: number ;
  appId: number ;
  setId: number ;
  approvalLevel: number ;
  nextApprovalLevel: number ;
  remarks: string ;
  userId: string;
  approvalFlag: number;
}
