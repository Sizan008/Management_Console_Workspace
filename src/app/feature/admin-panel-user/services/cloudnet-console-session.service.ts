import { Injectable } from '@angular/core';
import { CloudNetConsoleSessionData } from '../models/cloudnet-console-verification.model';

const STORAGE_KEYS = {
  accessToken: 'management_console_access_token',
  refreshToken: 'management_console_refresh_token',
  tokenExpiry: 'management_console_token_expiry',
  verifiedUserName: 'management_console_verified_user',
} as const;

@Injectable({ providedIn: 'root' })
export class CloudNetConsoleSessionService {
  private readonly expirySafetyWindowMs = 30 * 1000;
  private expiryCleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.scheduleExpiryCleanup();
  }

  saveSession(session: CloudNetConsoleSessionData): void {
    const accessToken = session.accessToken.trim();
    const verifiedUserName = session.verifiedUserName.trim();

    if (!accessToken || !verifiedUserName) {
      this.clearSession();
      return;
    }

    const resolvedExpiry = this.resolveTokenExpiry(
      accessToken,
      session.tokenExpiry,
    );

    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.verifiedUserName, verifiedUserName);
    this.setOrRemoveStorageValue(STORAGE_KEYS.refreshToken, session.refreshToken);
    this.setOrRemoveStorageValue(
      STORAGE_KEYS.tokenExpiry,
      resolvedExpiry?.toString() ?? null,
    );

    this.scheduleExpiryCleanup();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken)?.trim() || null;
  }

  getValidAccessToken(): string | null {
    return this.hasValidAccessToken() ? this.getAccessToken() : null;
  }

  getVerifiedUserName(): string {
    return localStorage.getItem(STORAGE_KEYS.verifiedUserName)?.trim() || '';
  }

  hasValidSession(): boolean {
    return !!this.getVerifiedUserName() && this.hasValidAccessToken();
  }

  hasValidSessionFor(userName: string): boolean {
    const normalizedUserName = userName.trim().toLowerCase();
    if (!normalizedUserName || !this.hasValidSession()) {
      return false;
    }

    return this.getVerifiedUserName().toLowerCase() === normalizedUserName;
  }

  hasValidAccessToken(): boolean {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return false;
    }

    if (this.isTokenExpired()) {
      this.clearSession();
      return false;
    }

    return true;
  }

  clearSession(): void {
    this.clearExpiryCleanupTimer();
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
    localStorage.removeItem(STORAGE_KEYS.verifiedUserName);
  }

  private isTokenExpired(): boolean {
    const tokenExpiry = this.getTokenExpiry();
    if (!tokenExpiry) {
      return false;
    }

    return Date.now() >= tokenExpiry - this.expirySafetyWindowMs;
  }

  private getTokenExpiry(): number | null {
    const storedExpiry = localStorage.getItem(STORAGE_KEYS.tokenExpiry);
    if (!storedExpiry) {
      return null;
    }

    const parsedExpiry = Number(storedExpiry);
    if (!Number.isFinite(parsedExpiry) || parsedExpiry <= 0) {
      localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
      return null;
    }

    return parsedExpiry;
  }

  private resolveTokenExpiry(
    accessToken: string,
    providedTokenExpiry: number | null,
  ): number | null {
    if (
      providedTokenExpiry !== null &&
      Number.isFinite(providedTokenExpiry) &&
      providedTokenExpiry > 0
    ) {
      return providedTokenExpiry;
    }

    return this.extractJwtExpiry(accessToken);
  }

  private extractJwtExpiry(accessToken: string): number | null {
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }

      const payloadBase64Url = tokenParts[1];
      const normalizedPayload = payloadBase64Url
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        Math.ceil(normalizedPayload.length / 4) * 4,
        '=',
      );
      const payload = JSON.parse(atob(paddedPayload)) as { exp?: unknown };

      return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
        ? payload.exp * 1000
        : null;
    } catch {
      return null;
    }
  }

  private scheduleExpiryCleanup(): void {
    this.clearExpiryCleanupTimer();

    const tokenExpiry = this.getTokenExpiry();
    if (!tokenExpiry) {
      return;
    }

    const remainingMs = tokenExpiry - Date.now() - this.expirySafetyWindowMs;
    if (remainingMs <= 0) {
      this.clearSession();
      return;
    }

    this.expiryCleanupTimer = setTimeout(() => {
      this.clearSession();
    }, remainingMs);
  }

  private clearExpiryCleanupTimer(): void {
    if (this.expiryCleanupTimer !== null) {
      clearTimeout(this.expiryCleanupTimer);
      this.expiryCleanupTimer = null;
    }
  }

  private setOrRemoveStorageValue(key: string, value: string | null): void {
    if (value?.trim()) {
      localStorage.setItem(key, value.trim());
      return;
    }

    localStorage.removeItem(key);
  }
}
