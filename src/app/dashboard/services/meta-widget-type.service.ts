import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MetaWidgetType {
  id: number;
  widgetTypeCode: string;
  widgetTypeName: string;
  description: string;
  iconName: string;
  isActive: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetaWidgetTypeService {

  private apiUrl = `${environment.myBaseUrl}/WidgetType/`;

  constructor(private http: HttpClient) { }

  /**
   * Get all active widget types
   */
  getAllActiveWidgetTypes(): Observable<MetaWidgetType[]> {
    return this.http.get<MetaWidgetType[]>(this.apiUrl);
  }

  /**
   * Get widget type by code
   */
  getWidgetType(widgetTypeCode: string): Observable<MetaWidgetType> {
    return this.http.get<MetaWidgetType>(`${this.apiUrl}${widgetTypeCode}`);
  }
}
