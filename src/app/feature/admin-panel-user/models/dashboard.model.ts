/**
 * dashboard / shared — model types.
 *
 * Mirrors the demo Vue `Dashboard.vue` payload shapes. Field names are
 * mixed-case on purpose (the CloudNetManagementAPI returns them that way)
 * so we can consume the response without remapping.
 */

/** Standard API envelope used by every CloudNetManagementAPI endpoint. */
export interface ApiResponse<T> {
  Status: 'OK' | 'UNAUTH' | string;
  Message: string;
  Result: T;
}

/** KPI constant — passed to /Dashboard/GetDashboardDetails as `pKPI`. */
export type DashboardKpi =
  | 2.1   // GetRegisteredUserByBranch
  | 5     // GetTopUserTransactionSummary
  | 5.1   // GetTopUserTransactionDetails
  | 6     // Today's Transaction — Successful
  | 7.1   // GetLockedUserList
  | 8     // GetTopupSummary
  | 9     // GetMFSSummary
  | 10    // GetBillsPaySummary
  | 11    // GetLastMonthTransactionSummary
  | 12    // GetUserDeviceSummary
  | 13    // Today's Transaction — Failed
  | 14.1  // GetAccOpenedList
  | 15.1  // GetReqReceivedList
  | 16;   // GetTopUserPasswordChangeHistory

/**
 * /Dashboard/GetDashboardSummary response — the 7 stat-card counts.
 * All seven match the demo's mixed-case property names verbatim.
 */
export interface DashboardCount {
  totaL_USER_REG_TILLTODATE: string;
  totaL_USER_REG_TODAY:       string;
  totaL_USER_SIGNED_TODAY:    string;
  totaL_USER_ACTIVE_TODAY:    string;
  totaL_USER_LOCKED_TODAY:    string;
  totaL_FDPS_OPENED_TODAY:    string;
  totaL_REQS_RECEIVED_TODAY:  string;
}

/** Body for /Dashboard/GetDashboardSummary. */
export interface DashboardSummaryPayload {
  pDATE: string; // MM/DD/YYYY
}

/** Body for /Dashboard/GetDashboardDetails. */
export interface DashboardDetailsPayload {
  pKPI:      number;
  pDATE:     string;
  pUSER_ID:  string;
}

// ─── List-row shapes for each KPI ────────────────────────────────────────

export interface TopUserTransSummary {
  useR_ID:      string;
  tranS_COUNT:  string | number;
  tranS_AMOUNT: string | number;
}

export interface TopUserTransDetails {
  useR_ID:      string;
  transfeR_FOR: string;
  tranS_COUNT:  string | number;
  tranS_AMOUNT: string | number;
}

export interface LockedUserRow {
  useR_ID:                string;
  useR_NM:                string;
  customeR_ID:            string;
  useR_STATUS_CHANGED_ON: string;
  reason:                 string;
}

export interface TodayTransactionRow {
  loG_ID:            string;
  transfeR_TYPE:     string;
  useR_ID:           string;
  transactioN_DATE:  string;
  transactioN_ID:    string;
  customeR_ID:       string;
  froM_BRANCH_ID:    string;
  froM_ACCOUNT_NO:   string;
  tO_BRANCH_ID:      string;
  tO_ACCOUNT_NO:     string;
  receiver:          string;
  tranS_AMOUNT:       string | number;
}

export interface TopupSummaryRow {
  mobilE_OPERATOR: string;
  tranS_AMOUNT:    string | number;
}

export interface MfsSummaryRow {
  mfs:           string;
  tranS_AMOUNT:  string | number;
}

export interface BillsPayRow {
  biller:        string;
  tranS_AMOUNT:  string | number;
}

export interface LastMonthTransRow {
  tranS_DATE:    string;
  tranS_COUNT:   string | number;
  tranS_AMOUNT:  string | number;
}

export interface UserDeviceSummaryRow {
  useR_ID:       string;
  devicE_COUNT:  string | number;
}

export interface AccOpenedRow {
  brancH_NM:      string;
  accounT_NO:     string;
  accounT_TITLE:  string;
  producT_NM:     string;
  payeE_BRANCH_ID: string;
  payeE_ACCOUNT_NO: string;
  procesS_DT:     string;
}

export interface ReqReceivedRow {
  requesT_TYPE:    string;
  brancH_ID:       string;
  accounT_NO:      string;
  requesT_DETAILS: string;
  status:          string;
}

export interface TopUserPasswordChangeRow {
  useR_ID:           string;
  pasS_CHANGE_COUNT: string | number;
}

export interface RegisteredByBranchRow {
  homE_BRANCH_ID: string;
  useR_COUNT:     string | number;
}
