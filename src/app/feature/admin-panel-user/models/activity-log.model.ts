export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface ActivityLogPayload {
  activityType: string;
  userType: number;
  UserID: string;
  startDate: string;
  endTime: string;
}

export interface ActivityLogRow {
  id?: string | number;
  activityAt: string;
  userName: string;
  activityType: string;
  comment: string;
}

export interface ActivityLogForm {
  userType: string;
  userId: string;
  startDate: string;
  endDate: string;
}

export interface SelectOption {
  key: string;
  value: string;
}

export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';