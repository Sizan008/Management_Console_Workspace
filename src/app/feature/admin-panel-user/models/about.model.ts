export interface AboutApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

export interface AboutApiResult {
  aboutId: number | string;
  international: string;
  localNumber: string;
  mailAddress: string;
  officeAddress: string;
}

export interface AboutInformation {
  aboutId: number;
  internationalNumber: string;
  localNumber: string;
  mailAddress: string;
  officeAddress: string;
}

export interface AboutUpdateRequest {
  aboutId: number;
  international: string;
  localNumber: string;
  mailAddress: string;
  officeAddress: string;
}
