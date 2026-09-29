export interface ContactApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

export interface ContactApiResult {
  callCenterHotLine: string;
  contactEmailAddress: string;
}

export interface ContactInformation {
  callCenterHotlineNumber: string;
  emailAddress: string;
}

export interface ContactUpdateRequest {
  callCenterHotLine: string;
  contactEmailAddress: string;
}
