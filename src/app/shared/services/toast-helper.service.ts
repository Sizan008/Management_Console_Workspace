// src/app/services/app-toastr.service.ts
import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig, ActiveToast } from 'ngx-toastr';
import {
  NOTIFICATION_TOAST_POSITION,
  ToastPosition,
  toastPositionClass,
} from './toast-position';

/**
 * ngx-toastr's own options plus a friendlier `position` parameter, so callers
 * pass 'top-center' instead of remembering a CSS class name.
 */
export interface ToastOptions extends Partial<IndividualConfig> {
  position?: ToastPosition;
}

@Injectable({
  providedIn: 'root'
})
export class ToastHelperService {
  constructor(private toastr: ToastrService) {}

  /**
   * Translates `position` into the container class ngx-toastr expects.
   * Timing/progress-bar/position defaults live in provideToastr() (app.config.ts)
   * so components injecting ToastrService directly inherit them too; anything
   * omitted here simply falls through to those.
   */
  private resolve(override?: ToastOptions): Partial<IndividualConfig> {
    const { position, ...rest } = override ?? {};
    // `rest` last, so an explicitly passed positionClass still wins.
    return position ? { positionClass: toastPositionClass(position), ...rest } : rest;
  }

  // Generic show wrapper
  show(message?: string, title?: string, override?: ToastOptions): ActiveToast<any> {
    return this.toastr.show(message || '', title || '', this.resolve(override));
  }

  success(message?: string, title?: string, override?: ToastOptions): ActiveToast<any> {
    return this.toastr.success(message || '', title || '', this.resolve(override));
  }

  notificationAlert(message?: string, title?: string, override?: ToastOptions): ActiveToast<any> {
    const opts = this.resolve({
      position: NOTIFICATION_TOAST_POSITION,
      timeOut: 5000,
      tapToDismiss: true,
      enableHtml: true,
      toastClass: 'ngx-toastr notification-alert-custom',
      titleClass: 'notification-title',
      messageClass: 'notification-message',
      ...override
    });
    return this.toastr.error(message || '', title || '', opts);
  }

  info(message?: string, title?: string, override?: ToastOptions): ActiveToast<any> {
    return this.toastr.info(message || '', title || '', this.resolve(override));
  }

  warning(message?: string, title?: string, override?: ToastOptions): ActiveToast<any> {
    return this.toastr.warning(message || '', title || '', this.resolve(override));
  }

  error(message?: string, title?: string, override?: ToastOptions): ActiveToast<any> {
    return this.toastr.error(message || '', title || '', this.resolve(override));
  }

  /** Dismiss a specific toast (by id) or all toasts when no id is given. */
  clear(toastId?: number): void {
    this.toastr.clear(toastId);
  }

}
