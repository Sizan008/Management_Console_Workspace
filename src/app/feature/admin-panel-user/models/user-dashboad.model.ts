export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}
export interface UserDashboardRegisteredUser {
  userId?: string;
  customerId?: string;
  userNm?: string;
  emailAddress?: string;
  mobileNumber?: string;
  authenticationTypeId?: string;
  authStatusId?: string;
  userStatusActiveFlag?: boolean;
  lockedFlag?: boolean;
}
export interface UserDashboardCustomerInformation {
  homE_BRANCH_ID?: string;
  customeR_TYPE_NM?: string;
  birtH_DATE?: string;
  fatheR_NM?: string;
  motheR_NM?: string;
}
export interface UserDashboardAccount {
  branchId?: string;
  accountNumber?: string;
}
export interface UserDashboardAddress {
  addressType?: string;
  address1?: string;
  address2?: string;
  city?: string;
  district?: string;
  division?: string;
  phone?: string;
  mobile?: string;
  email?: string;
}
export interface UserDashboardUserInformation {
  regCustUser?: UserDashboardRegisteredUser;
  customerInfo?: UserDashboardCustomerInformation;
  accounts?: UserDashboardAccount[];
  customerFullAddresses?: UserDashboardAddress[];
  [key: string]: unknown;
}
export interface UserDashboardRow {
  [key: string]: any;
}
export interface UserDashboardKpiResponse {
  pKPI: number;
  rows: UserDashboardRow[];
  error?: string;
}
export interface UserDashboardInitialData {
  userInformation: UserDashboardUserInformation;
  kpiResponses: UserDashboardKpiResponse[];
  warnings?: string[];
}
export interface DashboardGridRow {
  rowId: string;
  [key: string]: string | number;
}
export interface DashboardColumn {
  key: string;
  aliases: string[];
}
export interface CustomerInfoItem {
  label: string;
  value: string;
}
export interface CustomerInfoCard {
  title: string;
  items: CustomerInfoItem[];
}
export type DashboardCustomerTab = 'customer' | 'accounts' | 'address';
