export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface MerchantBenefitType {
  id: string;
  name: string;
}

export interface MerchantDetail {
  typeId: string;
  benefitId: string;
  merchantType: string;
  merchantName: string;
  discountInfo: string;
  discountAmount: string;
  address: string | null;
  webUrl: string | null;
  contact: string | null;
  branchId: string | null;
  accountNo: string | null;
  logo: string | null;
}

export interface MerchantGridRow {
  benefitId: string;
  merchantType: string;
  merchantName: string;
  description: string;
}

export interface MerchantPageInitialData {
  merchantTypes: MerchantBenefitType[];
  merchants: MerchantDetail[];
}

export interface SaveMerchantBenefitRequest {
  Typeid: number;
  Benefitid: number;
  Companyname: string;
  Discountinfo: string;
  Discountamount: string;
  Address: string | null;
  Weburl: string | null;
  Contact: string | null;
  Branchid: string | null;
  Accountno: string | null;
  Logo: File | null;
  changeType: 'EDT' | 'DEL';
}

export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';