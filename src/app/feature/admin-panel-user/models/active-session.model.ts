/**
 * active-session / shared — model types.
 *
 * Mirrors the demo Vue model `IActiveSession.ts`. Field names are lower-
 * case camelCase because the CloudNetManagementAPI GetUserActiveSession
 * endpoint returns them that way — we consume the response without
 * remapping.
 */

/** Standard API envelope used by every CloudNetManagementAPI endpoint. */
export interface ApiResponse<T> {
  Status: 'OK' | 'UNAUTH' | string;
  Message: string;
  Result: T;
}

/**
 * Single row returned by /CombinedFeatures/GetUserActiveSession.
 * One row = one live session for the given user (IP, login time, etc).
 */
export interface IActiveSession {
  /** Login / session start timestamp from the backend (raw string). */
  startTime?: string;
  /** Last access timestamp from the backend (raw string). */
  lastAccessTime?: string;
  /** Client IP address that opened the session. */
  ipAddress?: string;
  /** The owning user id. */
  userId?: string;
  /** 'Y' / 'N' (or '1' / '0') flag from the backend. */
  activeFlag?: string;
}

/**
 * Body sent to /CombinedFeatures/GetUserActiveSession.
 * Demo uses a POST with a BusinessData-shaped body (`{ UserID }`).
 */
export interface GetUserActiveSessionPayload {
  UserID: string;
}

/**
 * Body sent to /CombinedFeatures/ClearUserActiveSession.
 * Demo uses `{ UserID: '' }` for "clear all" and `{ userId: <id> }`
 * (lowercase `userId`) for a single-row clear.
 */
export interface ClearUserActiveSessionAllPayload {
  UserID: '';
}

export interface ClearUserActiveSessionOnePayload {
  userId: string;
}
