import { Injectable } from '@angular/core';
import { ToastrService, ActiveToast } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class CustomToastrService extends ToastrService {
  private activeToasts: { ref: ActiveToast<any>; className: string; element: HTMLElement }[] = [];

  // Toast layout settings - new toasts appear at the TOP
  private readonly baseTop = 80;
  private readonly spacing = 80;
  private readonly x = 900; // distance from right? adjust as needed

  /**
   * Insert new toast at the beginning (top) and update all positions
   */
  private updateToastPositions(): void {
    // Sort by current top position (just in case DOM order got messed up)
    this.activeToasts.sort((a, b) => {
      const aTop = parseInt(a.element.style.top || '0');
      const bTop = parseInt(b.element.style.top || '0');
      return aTop - bTop;
    });

    // Apply new positions with smooth transition
    requestAnimationFrame(() => {
      this.activeToasts.forEach((t, index) => {
        const y = this.baseTop + index * this.spacing;

        // Update inline style on the toast element itself (more reliable than <style> tag)
        t.element.style.position = 'fixed';
        t.element.style.top = `${y}px`;
        t.element.style.left = `${this.x}px`;
        t.element.style.zIndex = '9999';
        t.element.style.transition = 'top 0.35s ease-in-out, opacity 0.35s ease-in-out';

        // Optional: style message
        const messageEl = t.element.querySelector('.toast-message') as HTMLElement;
        if (messageEl) {
          messageEl.style.marginLeft = '8px';
        }
      });
    });
  }

  /**
   * Main custom toast logic
   */
  private showCustomToastMessage(
    message: string,
    title: string,
    type: 'error' | 'warning' | 'success' | 'info'
  ): ActiveToast<any> {
    const className = `custom-toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const opts = {
      toastClass: `ngx-toastr ${className}`,
      closeButton: true,
      progressBar: true,
      timeOut: 0,
      tapToDismiss: false, // optional: prevent accidental dismiss on click
    };

    let toastRef: ActiveToast<any>;
    switch (type) {
      case 'error':
        toastRef = super.error(message, title, opts);
        break;
      case 'warning':
        toastRef = super.warning(message, title, opts);
        break;
      case 'info':
        toastRef = super.info(message, title, opts);
        break;
      default:
        toastRef = super.success(message, title, opts);
        break;
    }

    // Wait for toast to be rendered in DOM
    setTimeout(() => {
      const toastEl = document.querySelector(`.${className}`) as HTMLElement;
      if (!toastEl) return;

      // Prepend to visual stack (insert at index 0 → top)
      this.activeToasts.unshift({
        ref: toastRef,
        className,
        element: toastEl,
      });

      this.updateToastPositions();

      // Cleanup on hide
      toastRef.onHidden.subscribe(() => {
        this.activeToasts = this.activeToasts.filter(t => t.ref !== toastRef);
        this.updateToastPositions(); // This will smoothly move remaining toasts UP
      });

      // Also handle manual clear
      toastRef.onTap.subscribe(() => {
        // if tap-to-dismiss is enabled elsewhere, make sure we remove it
      });
    }, 50);

    return toastRef;
  }

  // -------------------------------
  // Override public APIs
  // -------------------------------

  override success(message?: string, title?: string, override?: any) {
    return this.showCustomToastMessage(message ?? '', title ?? 'Success', 'success');
  }

  override error(message?: string, title?: string, override?: any) {
    return this.showCustomToastMessage(message ?? '', title ?? 'Error', 'error');
  }

  override warning(message?: string, title?: string, override?: any) {
    return this.showCustomToastMessage(message ?? '', title ?? 'Warning', 'warning');
  }

  override info(message?: string, title?: string, override?: any) {
    return this.showCustomToastMessage(message ?? '', title ?? 'Info', 'info');
  }

  /**
   * Clear all toasts
   */
  clearAllToasts(): void {
    this.clear();
    this.activeToasts = [];
  }
}