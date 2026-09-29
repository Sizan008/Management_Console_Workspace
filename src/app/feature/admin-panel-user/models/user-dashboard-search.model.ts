export type DashboardSearchBy = 'USER_ID' | 'CUSTOMER_ID' | 'MOBILE_NO';
export interface UserDashboardSearchCriteria {
  searchFlag: number;
  userId: string;
  customerId: string;
  mobileNumber: string;
  email: string;
  fromDate: string;
  toDate: string;
}
export interface SearchOption {
  key: string;
  value: string;
}
