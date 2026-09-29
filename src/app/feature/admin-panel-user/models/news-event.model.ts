export interface GlobalResponse<T = any> {
  Status: string;
  Message?: string;
  Result: T;
}

export interface NewsEvent {

  id: number;

  title: string;

  url: string;

  date: string;

}


export interface NewsPayload {

  id?: number;

  title: string;

  url: string;

  date: string;

  action: 'ADD' | 'UPDATE' | 'DELETE';

}


export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';