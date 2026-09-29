export interface UserDeviceApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

export interface UserDeviceUser {
  userId: string;
  userNm?: string | null;
  loginId?: string | null;
  orgId?: string | number | null;
  customerId?: string | number | null;
  userAddress?: string | null;
  userDescrip?: string | null;
  emailAddress?: string | null;
  mobileNumber?: string | null;
  userStatusActiveFlag?: boolean | number | string | null;
  lockedFlag?: boolean | number | string | null;
  authStatusId?: string | null;
  authenticationTypeId?: string | number | null;
  tpinEnabledFlag?: boolean | number | string | null;
}

export interface UserDeviceUserResult {
  regCustUser?: UserDeviceUser | null;
}

export interface RegisteredDevice {
  deviceId: number;
  deviceType: string;
  deviceToken: string;
  imeiNo: string;
  userId: string;
  customerId: string;
  status: number;
  createBy: string;
  createDt: string;
  updateDt: string | null;
  updateBy: string | null;
}

export interface RemovedDevice extends RegisteredDevice {
  removeBy: string;
  removeDt: string;
}
