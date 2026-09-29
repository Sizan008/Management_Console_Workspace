export interface AuthorizationApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

export interface AuthorizationFeature {
  adminFeaturesId: number;
  featureName: string;
  featureDesc: string;
}

export interface AuthorizationFunctionOption {
  key: string;
  value: string;
}

export interface AuthorizationRequest {
  queueId: string;
  actionStatus: string | null;
  authLevelMax: number | null;
  authLevelPending: number | null;
  authStatus: string | null;
  functionId: string | null;
  makeBranchId: string | null;
  makeBy: string | null;
  makeDt: string | null;
  serviceUrl: string | null;
  userId: string | null;
}

export interface AuthorizerHistoryRow {
  authOrDecBy: string | null;
  authOrDecDt: string | null;
  authRemarks: string | null;
  authLevel: number | null;
}

/**
 * Detail-table fields can vary by feature, so keep the row dynamic and map
 * the common old/new-value aliases in the page before showing the grid.
 */
export interface AuthorizationChangeDetail {
  [columnName: string]: string | number | boolean | null | undefined;
}

export interface AuthorizationRequestDetails {
  queueId: string | null;
  actionStatus: string | null;
  authLevelMax: number | null;
  authLevelPending: number | null;
  authStatus: string | null;
  functionId: string | null;
  makeBranchId: string | null;
  makeBy: string | null;
  makeDt: string | null;
  userId: string | null;
  authLogDetails: AuthorizerHistoryRow[];
  authLogTables: AuthorizationChangeDetail[];
}

/** Backend contract intentionally uses the misspelled `remakrs` property. */
export interface AuthorizationDecisionRequest {
  queueID: string;
  remakrs: string;
}
