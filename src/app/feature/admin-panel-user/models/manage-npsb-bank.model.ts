export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface NpsbBank {
  bankCode: string;

  bankName: string;

  bankShName: string;

  isEnabled: boolean;
}

export interface ChangeNpsbBankStatusRequest {
  npsbBankId: string;

  isEnabled: boolean;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';
