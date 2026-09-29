import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CloudNetConsoleSessionService } from '../../services/cloudnet-console-session.service';

export const cloudNetConsoleVerificationGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const session = inject(CloudNetConsoleSessionService);

  if (session.hasValidSession()) {
    return true;
  }

  session.clearSession();
  return router.createUrlTree(['/landing/home'], {
    queryParams: {
      consoleVerification: 'required',
      returnUrl: state.url,
    },
  });
};
