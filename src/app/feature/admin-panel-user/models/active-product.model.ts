export interface ActiveProductApiResponse<T> {
  Status: string;
  Message?: string | null;
  Result: T | null;
}

// Keep the request contract identical to the reference Management Console API.
export interface ProductPayload {
  Productid: number;
  Title: string;
  Shortdesc: string;
  Longdesc: string;
  Productcode: number;
  Typeid: number;
  Weburl: string | null;
  Remark: string;
  changeType: 'ADD' | 'EDT' | 'DEL';
}

export interface ActiveProductType {
  TypeID: number | string;
  TypeName: string;
}

export interface ActiveProductReview {
  userName?: string | null;
  rating?: number | string | null;
  comment?: string | null;
}

export interface ActiveProductApiItem {
  productid: number | string;
  title: string;
  shortdesc: string;
  longdesc: string;
  productcode: number | string;
  typeid: number | string;
  weburl?: string | null;
  rating?: number | string | null;
  reviewDetails?: ActiveProductReview[] | null;
}

export interface ActiveProductRow {
  productId: number;
  productName: string;
  productCode: string;
  typeId: number;
  productType: string;
  webUrl: string;
  description: string;
  details: string;
  rating: number | string;
  originalData: ActiveProductApiItem;
}

export interface ActiveProductReviewRow {
  reviewKey: string;
  userName: string;
  rating: number | string;
  comment: string;
}

export interface ActiveProductSelectOption {
  key: string;
  value: string;
}
