import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiBaseService {
  private selectedAppUrl = signal<string>('');
  private selectedApiHost = signal<string>('');

  setAppUrl(appUrl: string): void {
    this.selectedAppUrl.set(appUrl);
  }

  getAppUrl(): string {
    return this.selectedAppUrl();
  }

  /**
   * Extract the path component from a URL.
   * Handles both full URLs (http://host:port/path) and relative paths (path).
   */
  private extractPathFromUrl(urlOrPath: string): string {
    if (!urlOrPath) return '';

    // If it's a full URL, extract the path component
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      try {
        const url = new URL(urlOrPath);
        let pathname = url.pathname;
        // Remove leading slash if present
        if (pathname.startsWith('/')) {
          pathname = pathname.substring(1);
        }
        return pathname;
      } catch {
        // If URL parsing fails, return as-is
        return urlOrPath;
      }
    }

    // It's already a relative path
    return urlOrPath;
  }

  getApiUrl(endpoint: string): string {
    const appUrl = this.selectedAppUrl();
    if (!appUrl) {
      return `${environment.myBaseUrl}${endpoint}`;
    }

    // Extract just the path from appUrl (handles both full URLs and paths)
    const pathComponent = this.extractPathFromUrl(appUrl);
    if (!pathComponent) {
      return `${environment.apiBaseUrl}${endpoint}`;
    }
    return `${environment.apiBaseUrl}/${pathComponent}${endpoint}`;
  }
}
