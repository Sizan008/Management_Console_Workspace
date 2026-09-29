import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Loads /asset/config.json at startup (production only) and patches the
 * `environment` object in-place. All property values come directly from
 * config.json — no derivation. Only `production: true` is required in the
 * bundled environment file; everything else is overwritten at runtime.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config!: any;
  private static readonly CONFIG_URL = '/asset/config.json';

  async load(): Promise<void> {
    if (!environment.production) return;

    try {
      const response = await fetch(AppConfigService.CONFIG_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const cfg: Record<string, any> = await response.json();
      Object.assign(environment, cfg);
    } catch (err) {
      console.error('[AppConfigService] Failed to load config.json — falling back to bundled environment values.', err);
    }
  }

  get<T extends keyof any>(key: T): any[T] {
    return this.config?.[key];
  }
}
