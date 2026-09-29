import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiBaseService } from './api-base.service';

export interface MetaDashboardEntity {
  id: number;
  entityName: string;
  entityAlias: string;
  description: string;
  isActive: boolean;
}

export interface MetaDashboardEntityField {
  id: number;
  entityId: number;
  fieldName: string;
  displayName: string;
  dataType: string;
  isFilterable: number;
  isAggregatable: number;
}

@Injectable({
  providedIn: 'root'
})
export class MetaDashboardEntityService {

  private http = inject(HttpClient);
  private apiBase = inject(ApiBaseService);

  private getApiUrl(): string {
    return this.apiBase.getApiUrl('/Entity/');
  }

  /**
   * Get all active entities with their aliases
   */
  getAllActiveEntities(): Observable<MetaDashboardEntity[]> {
    return this.http.get<MetaDashboardEntity[]>(this.getApiUrl());
  }

  /**
   * Get entity properties by entity name
   */
  getEntityProperties(entityName: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.getApiUrl()}${entityName}/properties`);
  }

  /**
   * Get entity by name
   */
  getEntity(entityName: string): Observable<MetaDashboardEntity> {
    return this.http.get<MetaDashboardEntity>(`${this.getApiUrl()}${entityName}`);
  }

  /**
   * Get fields for an entity by its numeric ID
   */
  getEntityFields(entityId: number): Observable<MetaDashboardEntityField[]> {
    return this.http.get<MetaDashboardEntityField[]>(`${this.getApiUrl()}${entityId}/fields`);
  }
}
