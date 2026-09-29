import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Widget, AddWidgetCommand, UpdateWidgetCommand,
  UpdateWidgetLayoutCommand, QueryResult, DataSourceConfig, FilterDefinition
} from '../models/widget.model';
import { ApiBaseService } from './api-base.service';
import { environment } from '../../../environments/environment';

export interface KeycloakRoleOption {
  keycloakRoleId: string;
  roleName: string;
}

@Injectable({ providedIn: 'root' })
export class WidgetApi {
  private http    = inject(HttpClient);
  private apiBase = inject(ApiBaseService);

  private getBaseUrl(): string {
    return this.apiBase.getApiUrl('/Widget');
  }

  getWidgetsByDashboard(dashboardId: number): Observable<Widget[]> {
    return this.http.get<Widget[]>(`${this.getBaseUrl()}/dashboard/${dashboardId}`);
  }

  getWidget(id: number): Observable<Widget> {
    return this.http.get<Widget>(`${this.getBaseUrl()}/${id}`);
  }

  /**
   * Resolve session parameters from session storage, merge with user-provided filters,
   * and return the combined set for query execution.
   */
  private resolveSessionParams(filterParams: Record<string, any>, filters: FilterDefinition[]): Record<string, any> {
    const resolved = new Map<string, any>();

    filters.forEach(f => {
      if (f.paramSource === 'SESSION' && f.sessionFieldName) {
        const sessionValue = sessionStorage.getItem(f.sessionFieldName);
        if (sessionValue !== null) {
          try {
            // Try parsing as JSON (for objects/arrays)
            resolved.set(f.paramName, JSON.parse(sessionValue));
          } catch {
            // Treat as plain string
            resolved.set(f.paramName, sessionValue);
          }
        }
      }
    });

    // Layer user-provided filters on top
    Object.entries(filterParams).forEach(([k, v]) => {
      resolved.set(k, v);
    });

    return Object.fromEntries(resolved);
  }

  getWidgetData(id: number, filterParams: Record<string, any> = {}, filters?: FilterDefinition[]): Observable<QueryResult> {
    // If filters provided (with session param definitions), resolve them
    const allParams = filters ? this.resolveSessionParams(filterParams, filters) : filterParams;

    let params = new HttpParams();
    for (const [k, v] of Object.entries(allParams)) {
      if (v !== null && v !== undefined && v !== '') {
        params = params.set(k, String(v));
      }
    }
    return this.http.get<QueryResult>(`${this.getBaseUrl()}/${id}/data`, { params });
  }

  /**
   * Direct call for API-type widgets.
   * - PATH params: substitutes {name} tokens in the URL (including session params via template injection).
   * - QUERY params: appends as ?name=value.
   * - POST body: replaces {name} tokens in the apiBody template, then sends as JSON.
   * Runtime filterParams and session params override apiParam defaultValues.
   */
  callApiWidget(config: DataSourceConfig,
                filterParams: Record<string, any> = {}): Observable<QueryResult> {
    const method   = config.apiMethod ?? 'GET';
    const apiParams = config.apiParams ?? [];
    const filters  = config.filters ?? [];

    // Resolve session params first, then layer user filters on top
    const allParams = this.resolveSessionParams(filterParams, filters);

    // Also resolve SESSION-sourced API params
    for (const p of apiParams) {
      if (p.paramSource === 'SESSION' && p.sessionFieldName) {
        const sessionValue = sessionStorage.getItem(p.sessionFieldName);
        if (sessionValue !== null) {
          try {
            allParams[p.name] = JSON.parse(sessionValue);
          } catch {
            allParams[p.name] = sessionValue;
          }
        }
      }
    }

    // Merge defaultValues with runtime filter overrides (including session-resolved)
    const resolved: Record<string, string> = {};
    for (const p of apiParams) {
      // Priority: allParams (resolved) > defaultValue (fallback)
      resolved[p.name] = String(allParams[p.name] ?? p.defaultValue ?? '');
    }
    // Any filter params not declared in apiParams are passed through as query params
    for (const [k, v] of Object.entries(allParams)) {
      if (!(k in resolved)) resolved[k] = String(v ?? '');
    }

    // Resolve path variables in URL (supports both apiParams.type=PATH and session params as template {var})
    let url = config.apiUrl ?? '';
    for (const [paramName, paramValue] of Object.entries(resolved)) {
      url = url.replaceAll(`{${paramName}}`, encodeURIComponent(String(paramValue)));
    }
    // Also handle apiParams with type=PATH explicitly
    for (const p of apiParams.filter(p => p.type === 'PATH')) {
      url = url.replace(`{${p.name}}`, encodeURIComponent(resolved[p.name]));
    }

    // Build query string from QUERY-type params + passthrough params
    const queryKeys = new Set(apiParams.filter(p => p.type === 'QUERY').map(p => p.name));
    const passthroughKeys = Object.keys(resolved).filter(k => !apiParams.some(p => p.name === k && p.type === 'PATH'));
    let httpParams = new HttpParams();
    for (const k of [...queryKeys, ...passthroughKeys.filter(k => !queryKeys.has(k))]) {
      const v = resolved[k];
      if (v !== null && v !== undefined && v !== '') {
        httpParams = httpParams.set(k, v);
      }
    }

    if (method === 'POST') {
      let body: any = resolved;
      if (config.apiBody) {
        // Replace {placeholder} tokens in the body template
        let rendered = config.apiBody;
        for (const [k, v] of Object.entries(resolved)) {
          rendered = rendered.replaceAll(`{${k}}`, v);
        }
        try { body = JSON.parse(rendered); } catch { body = rendered; }
      }
      return this.http.post<QueryResult>(url, body);
    }

    return this.http.get<QueryResult>(url, { params: httpParams });
  }

  addWidget(command: AddWidgetCommand): Observable<number> {
    return this.http.post<number>(this.getBaseUrl(), command);
  }

  updateWidget(id: number, command: UpdateWidgetCommand): Observable<void> {
    return this.http.put<void>(`${this.getBaseUrl()}/${id}`, command);
  }

  updateLayout(id: number, command: UpdateWidgetLayoutCommand): Observable<void> {
    return this.http.put<void>(`${this.getBaseUrl()}/${id}/layout`, command);
  }

  removeWidget(id: number): Observable<void> {
    return this.http.delete<void>(`${this.getBaseUrl()}/${id}`);
  }

  refreshWidgetCache(id: number): Observable<void> {
    return this.http.post<void>(`${this.getBaseUrl()}/${id}/refresh`, null);
  }

  previewQuery(payload: { viewName?: string; queryConfigJson?: string }): Observable<QueryResult> {
    return this.http.post<QueryResult>(`${this.getBaseUrl()}/preview`, payload);
  }

  getKcRoles(): Observable<KeycloakRoleOption[]> {
    return this.http.get<any[]>(`${environment.sentinelUrl}/kc-roles`);
  }
}
