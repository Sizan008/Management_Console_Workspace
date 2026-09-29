export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface MerchantTypeModel {

  typeID: number;

  typeName: string;

  changeStatus:
    | 'ADD'
    | 'EDT'
    | 'DEL';

}


export interface MerchantTypeRow {

  id: number;

  name: string;

}


export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';