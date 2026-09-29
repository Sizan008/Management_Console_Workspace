export interface ResetTPinApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

export interface ResetTPinUser {
  userId: string;
  userNm?: string | null;
  orgId?: string | number | null;
  customerId?: string | number | null;
  userAddress?: string | null;
  userDescrip?: string | null;
  emailAddress?: string | null;
  mobileNumber?: string | null;
}

export interface ResetTPinUserResult {
  regCustUser?: ResetTPinUser | null;
}
