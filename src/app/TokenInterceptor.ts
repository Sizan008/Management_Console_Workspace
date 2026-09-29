import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token || sessionStorage.getItem('access_token') || '';

  // APIs where token must be added
  const shouldAttachToken =
    req.url.startsWith(environment.apiBaseUrl) ||
    req.url.startsWith(environment.myBaseUrl) ||
    req.url.startsWith(environment.sentinelUrl) 

  const cloudNetConsoleBaseUrl = environment.myBaseUrl2.replace(/\/+$/, '');
  const isCloudNetConsoleRequest = req.url.startsWith(cloudNetConsoleBaseUrl);

  // Get session data - always prepare headers
  const userId = auth.getStoredUserId();
  const appId = auth.getStoredAppId() || sessionStorage.getItem('appId') || '';
  const functionId = auth.getFunctionId();
  const functionName = auth.getFunctionName();

  // Build headers object
  let headers = {} as any;

  // Add token if should attach
  if (shouldAttachToken && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Always add custom headers if values exist (for all API calls)
  if (userId && !isCloudNetConsoleRequest) {
    headers['X-User-Id'] = userId;
  }
  if (appId) {
    headers['X-App-Id'] = appId;
  }
  if (functionId) {
    headers['X-Function-Id'] = functionId;
  }
  if (functionName) {
    headers['X-Function-Name'] = functionName;
  }

  // Only clone if we have headers to add
  if (Object.keys(headers).length > 0) {
    const authReq = req.clone({
      setHeaders: headers,
    });
    return next(authReq);
  }

  // Default: no modifications
  return next(req);
};
