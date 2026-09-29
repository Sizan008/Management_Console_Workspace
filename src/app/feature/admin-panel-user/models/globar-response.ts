export interface GlobalResponse {
  Status: string;
  Message: string;
  Result: any[];
}

export interface TagNewCardCustomer {
  userId: string;
  customerId: string;
  customerName: string;
}
export interface NewCardUntagRequest {
  userId: string;
  customerId: string;
  taggedCardId: string;
}
export interface TagNewCardGridRow {
  id: string;
  cardNumber: string;
  mobileNumber: string;
  emailAddress: string;
  expiryMmyy: string;
}

export interface BanglaQrCardRegistrationRequest {
  userId: string;
  fullPan: string;
  expireMmyy: string;
  mobileNumber: string;
  emailAddress: string;
}


export interface NewCardTagRequest {
  cardNo: string;
  ownerName: string;
  customerId: string;
  reason: string;
  mobileNumber: string;
  userId: string;
  clientId: string;
  tpin: string;
  otp: string;
}

export interface RequestCardTagPayload {
  CardNo: string;
  OwnerName: string;
  CustomerID: string;
  CardTagUntag: 'TAG';
  Reason: string;
  MobileNumber: string;
  UserID: string;
  ClientId: string;
  TPIN: string;
  OTP: string;
}

export interface RequestCardUntagPayload {
  UserID: string;
  CardNo: string;
  CardTagUntag: 'UNTAG';
  CustomerID: string;
}