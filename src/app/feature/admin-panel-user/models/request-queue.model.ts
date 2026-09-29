export interface RequestQueueApiResponse<T> {
  Status?: string | null;
  Message?: string | null;
  Result?: T | null;
}

export interface RequestQueueBranch {
  brancH_ID: string;
  brancH_NM: string;
}

export interface RequestQueueType {
  id: string;
  name: string;
}

export interface RequestQueueStatus {
  authStatusNm: string;
  authStatus: string;
  isActive: boolean;
}

export interface RequestQueueSearchRequest {
  userId: string;
  /**
   * Branch identifiers are deliberately strings. Converting them to numbers
   * loses significant leading zeroes (for example 0031 -> 31).
   * An empty string means "All".
   */
  branchId: string;
  requestType: string;
  statusType: string;
  startDate: string;
  endTime: string;
}

export interface RequestQueueRow {
  requesT_ID?: string | number | null;
  requesT_DATE?: string | null;
  useR_ID?: string | null;
  useR_NM?: string | null;
  customeR_ID?: string | number | null;
  contacT_EMAIL?: string | null;
  contacT_MOBILE?: string | null;
  reqS_TYPE?: string | null;
  paraM_1?: string | number | null;
  paraM_2?: string | number | null;
  paraM_3?: string | null;
  paraM_4?: string | number | null;
  paraM_5?: string | null;
  paraM_6?: string | null;
  paraM_7?: string | number | null;
  status?: string | null;
  reason?: string | null;
  [key: string]: unknown;
}
