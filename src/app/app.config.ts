import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners, Provider,
  provideZoneChangeDetection
} from '@angular/core';
import {provideRouter, withDisabledInitialNavigation} from '@angular/router';

import {routes} from './app.routes';
import {provideNativeDateAdapter} from '@angular/material/core';
import {provideToastr} from 'ngx-toastr';
import {DEFAULT_TOAST_POSITION, toastPositionClass} from './shared/services/toast-position';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {tokenInterceptor} from './TokenInterceptor';
import { provideAuth } from './core/auth/auth.provider';
import { authInterceptor } from './core/auth/auth.interceptor';
import { keycloakRefreshInterceptor } from './core/auth/keycloak-refresh.interceptor';
import { AppConfigService } from './core/service/app-config.service';
import { cloudNetConsoleTokenInterceptor } from './feature/admin-panel-user/shared/interceptors/cloudnet-console-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    // Initial navigation is disabled so the router does NOT auto-redirect
    // '' -> 'landing/home' on load. App.ngOnInit triggers navigation only
    // after Keycloak confirms the user is authenticated; otherwise it
    // redirects to login without ever routing through /landing/home.
    provideRouter(routes, withDisabledInitialNavigation()),
    provideNativeDateAdapter(),
    provideAnimations(),
    // App-wide toast defaults. Components that inject ToastrService directly
    // inherit these, so every toast lands in the same stack with the same
    // timing — see the "Toasts (ngx-toastr)" block in styles.scss.
    // Position is a parameter: change DEFAULT_TOAST_POSITION in
    // shared/services/toast-position.ts to move every toast at once, or pass
    // { position: '...' } per call through ToastHelperService.
    provideToastr({
      positionClass: toastPositionClass(DEFAULT_TOAST_POSITION),
      timeOut: 4000,
      extendedTimeOut: 1500,
      progressBar: true,
      closeButton: true,
      newestOnTop: true,
      preventDuplicates: true,
      resetTimeoutOnDuplicate: true,
      maxOpened: 4,
      autoDismiss: true,
    }),
    provideHttpClient(
      withInterceptors([
  tokenInterceptor,
  authInterceptor,
  cloudNetConsoleTokenInterceptor,
  keycloakRefreshInterceptor
])
    ),
    provideAuth(),
    provideAppInitializer(() => inject(AppConfigService).load()),
  ]
};
