import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CloudNetConsoleApiResponse } from '../../models/cloudnet-console-verification.model';
import { CloudNetConsoleSessionService } from '../../services/cloudnet-console-session.service';

export const cloudNetConsoleTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(CloudNetConsoleSessionService);
  const router = inject(Router);
  const baseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
  const loginUrl = `${baseUrl}/api/Login/Login`;

  if (!request.url.startsWith(baseUrl)) {
    return next(request);
  }

  // authInterceptor runs before this interceptor and may have attached the
  // Keycloak token. CloudNetConsole login must never receive that token.
  if (request.url.startsWith(loginUrl)) {
    return next(request.clone({
      headers: request.headers
        .delete('Authorization')
        .delete('X-User-Id'),
    }));
  }

  const accessToken = session.getValidAccessToken();
  const verifiedUserName = session.getVerifiedUserName();
  let consoleRequest = request.clone({
    headers: request.headers
      .delete('Authorization')
      .delete('X-User-Id'),
  });

  if (accessToken) {
    consoleRequest = consoleRequest.clone({
      setHeaders: { Authorization: `Bearer ${accessToken}` },
    });
  }

  if (verifiedUserName) {
    consoleRequest = consoleRequest.clone({
      setHeaders: { 'X-User-Id': verifiedUserName },
    });
  }

  const returnToVerification = (): void => {
    const returnUrl = router.url.startsWith('/feature/admin-panel-user')
      ? router.url
      : '/feature/admin-panel-user';
    session.clearSession();
    void router.navigate(['/landing/home'], {
      replaceUrl: true,
      queryParams: {
        consoleVerification: 'required',
        returnUrl,
      },
    });
  };

  return next(consoleRequest).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) {
        return;
      }

      const response = event.body as CloudNetConsoleApiResponse<unknown> | null;
      const status = response?.Status?.trim().toUpperCase();
      const message = response?.Message?.trim().toUpperCase();
      const isAccessDenied = status === 'UNAUTH' && message === 'ACCESS DENIED.';

      if (status === 'UNAUTH' && !isAccessDenied) {
        returnToVerification();
      }
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        returnToVerification();
      }
      return throwError(() => error);
    }),
  );
};
