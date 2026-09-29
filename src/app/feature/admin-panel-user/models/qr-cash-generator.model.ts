export interface QrCashApiResponse<T> {
  Status?: string | null;
  Message?: string | null;
  Result?: T | null;
}

export interface QrCashBranch {
  brancH_ID?: string | number | null;
  brancH_NM?: string | null;
  branchId?: string | number | null;
  branchNm?: string | null;
  BRANCH_ID?: string | number | null;
  BRANCH_NM?: string | null;
  id?: string | number | null;
  name?: string | null;
}

export interface QrCashSelectOption {
  key: string;
  value: string;
}
