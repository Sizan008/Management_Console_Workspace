import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MetaDashboardEntity, EntityField } from '../models/entity.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EntityApi {
  private http = inject(HttpClient);
  private baseUrl = `${environment.myBaseUrl}/Entity`;

  getEntities(): Observable<MetaDashboardEntity[]> {
    return this.http.get<MetaDashboardEntity[]>(this.baseUrl);
  }

  getFields(entityId: number): Observable<EntityField[]> {
    return this.http.get<EntityField[]>(`${this.baseUrl}/${entityId}/fields`);
  }
}
