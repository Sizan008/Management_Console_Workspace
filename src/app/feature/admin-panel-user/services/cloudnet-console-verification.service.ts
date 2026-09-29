import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, map, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CloudNetConsoleLoginRequest,
  CloudNetConsoleLoginResponse,
  CloudNetConsoleLoginResult,
  CloudNetConsoleSessionData,
} from '../models/cloudnet-console-verification.model';
import { CloudNetConsoleSessionService } from './cloudnet-console-session.service';

@Injectable({ providedIn: 'root' })
export class CloudNetConsoleVerificationService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(CloudNetConsoleSessionService);
  private readonly baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
  private readonly loginUrl = `${this.baseUrl}/api/Login/Login`;
  private loginRequestInFlight$: Observable<void> | null = null;

  login(userName: string, password: string): Observable<void> {
    if (this.loginRequestInFlight$) {
      return this.loginRequestInFlight$;
    }

    const normalizedUserName = userName.trim();
    this.session.clearSession();

    const request: CloudNetConsoleLoginRequest = {
      UserName: normalizedUserName,
      Password: password,
      ImeiOrIP: 'IBU',
      OTP: '',
      TPIN: '',
    };

    const request$ = this.http.post<CloudNetConsoleLoginResponse>(
      this.loginUrl,
      request,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      },
    ).pipe(
      map((response) => {
        const session = this.createSessionFromLoginResponse(
          response,
          normalizedUserName,
        );
        this.session.saveSession(session);
      }),
      finalize(() => {
        this.loginRequestInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.loginRequestInFlight$ = request$;
    return request$;
  }

  clearLocalSession(): void {
    this.session.clearSession();
  }

  private createSessionFromLoginResponse(
    response: CloudNetConsoleLoginResponse,
    verifiedUserName: string,
  ): CloudNetConsoleSessionData {
    if (response?.Status?.trim().toUpperCase() !== 'OK') {
      throw new Error(
        response?.Message?.trim() || 'CloudNetConsole verification failed.',
      );
    }

    const loginResult = response.Result ?? null;
    const accessToken = this.extractAccessToken(loginResult);
    if (!accessToken) {
      throw new Error(
        response?.Message?.trim() ||
          'CloudNetConsole login response did not contain an access token.',
      );
    }

    return {
      accessToken,
      refreshToken: this.extractRefreshToken(loginResult),
      tokenExpiry: this.extractTokenExpiry(loginResult),
      verifiedUserName,
    };
  }

  private extractAccessToken(
    loginResult: CloudNetConsoleLoginResult | string | null,
  ): string | null {
    if (typeof loginResult === 'string') {
      return loginResult.trim() || null;
    }

    if (!loginResult) {
      return null;
    }

    const candidates = [
      loginResult.access_token,
      loginResult.AccessToken,
      loginResult.accessToken,
      loginResult.Token,
      loginResult.token,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  private extractRefreshToken(
    loginResult: CloudNetConsoleLoginResult | string | null,
  ): string | null {
    if (!loginResult || typeof loginResult === 'string') {
      return null;
    }

    const candidates = [
      loginResult.refresh_token,
      loginResult.RefreshToken,
      loginResult.refreshToken,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  private extractTokenExpiry(
    loginResult: CloudNetConsoleLoginResult | string | null,
  ): number | null {
    if (!loginResult || typeof loginResult === 'string') {
      return null;
    }

    const backendExpiresIn = loginResult.expires_in;
    if (
      typeof backendExpiresIn === 'number' &&
      Number.isFinite(backendExpiresIn) &&
      backendExpiresIn > 0
    ) {
      // Preserve the reference implementation: backend expires_in is milliseconds.
      return Date.now() + backendExpiresIn;
    }

    const fallbackExpiresIn = loginResult.ExpiresIn ?? loginResult.expiresIn;
    if (
      typeof fallbackExpiresIn === 'number' &&
      Number.isFinite(fallbackExpiresIn) &&
      fallbackExpiresIn > 0
    ) {
      return Date.now() + fallbackExpiresIn * 1000;
    }

    const tokenExpiry = loginResult.TokenExpiry ?? loginResult.tokenExpiry;
    if (typeof tokenExpiry === 'number') {
      return this.normalizeTimestamp(tokenExpiry);
    }

    if (typeof tokenExpiry === 'string' && tokenExpiry.trim()) {
      const numericTimestamp = Number(tokenExpiry);
      if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
        return this.normalizeTimestamp(numericTimestamp);
      }

      const parsedDateTimestamp = Date.parse(tokenExpiry);
      if (!Number.isNaN(parsedDateTimestamp)) {
        return parsedDateTimestamp;
      }
    }

    return null;
  }

  private normalizeTimestamp(timestamp: number): number | null {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return null;
    }

    return timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  }
}
