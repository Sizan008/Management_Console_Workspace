import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export const keycloakRefreshInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const cloudNetConsoleBaseUrl = environment.myBaseUrl2.replace(/\/+$/, '');

  // CloudNetConsole uses a separate login/token. A 401 from that backend must
  // not refresh or replace the Keycloak session.
  if (req.url.startsWith(cloudNetConsoleBaseUrl)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return from(authService.keycloak.updateToken(29)).pipe(
        switchMap((refreshed: boolean) => {
          const token = authService.keycloak.token || '';
          if (refreshed && token) {
            authService.decodeToken();
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`,
              },
            });
            return next(retryReq);
          }

          authService.login();
          return throwError(() => error);
        }),
        catchError((refreshError: unknown) => {
          authService.login();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
