export interface ResetPasswordApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

export interface ResetPasswordUser {
  userId: string;
  userNm?: string | null;
  orgId?: string | number | null;
  customerId?: string | number | null;
  userAddress?: string | null;
  userDescrip?: string | null;
  emailAddress?: string | null;
  mobileNumber?: string | null;
}

export interface ResetPasswordUserResult {
  regCustUser?: ResetPasswordUser | null;
}
