export interface CloudNetConsoleLoginRequest {
  UserName: string;
  Password: string;
  ImeiOrIP: string;
  OTP: string;
  TPIN: string;
}

export interface CloudNetConsoleLoginResult {
  access_token?: string | null;
  AccessToken?: string | null;
  accessToken?: string | null;
  Token?: string | null;
  token?: string | null;
  refresh_token?: string | null;
  RefreshToken?: string | null;
  refreshToken?: string | null;
  expires_in?: number | null;
  ExpiresIn?: number | null;
  expiresIn?: number | null;
  TokenExpiry?: number | string | null;
  tokenExpiry?: number | string | null;
}

export interface CloudNetConsoleApiResponse<T> {
  Status?: string | null;
  Message?: string | null;
  Result?: T | null;
}

export type CloudNetConsoleLoginResponse = CloudNetConsoleApiResponse<
  CloudNetConsoleLoginResult | string
>;

export interface CloudNetConsoleSessionData {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: number | null;
  verifiedUserName: string;
}
