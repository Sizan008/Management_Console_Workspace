export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface TransactionBillService {
  key: number;

  index: number;

  serviceId: number;

  serviceName: string;

  status: boolean;

  pvCode: number;

  serviceShName: string;

  serviceTypeName: string;

  allowedForIndividual: boolean;

  allowedForCorporate: boolean;

  allowedForGroup: boolean;

  groupId: number;

  isEnableBeneficiary: boolean;

  isEnableAutopay: boolean;

  isEnableSSL: boolean;

  allowedForIndividualShow: string;
}

export interface TransactionBillStatusRequest {
  key: number;

  index: number;

  serviceId: number;

  serviceName: string;

  status: boolean;

  pvCode: number;

  serviceShName: string;

  serviceTypeName: string;

  allowedForIndividual: boolean;

  allowedForCorporate: boolean;

  allowedForGroup: boolean;

  groupId: number;

  isEnableBeneficiary: boolean;

  isEnableAutopay: boolean;

  isEnableSSL: boolean;

  allowedForIndividualShow: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';
