import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/**
 * Base DTO with audit fields
 */
export interface BaseDTO {
  id?: number;
  createdDate?: string;
  modifiedDate?: string;
  createdBy?: string;
  modifyBy?: string;
}

/**
 * Report Registration Service
 * Manages report metadata and parameters
 */
@Injectable({
  providedIn: 'root'
})
export class ReportRegistrationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.reportManagementApiUrl}/Report`; // Using port 8083

  /**
   * Create a new report with file upload
   */
  create(report: ReportDTO, file?: File): Observable<ReportDTO> {
    const formData = new FormData();
    formData.append('report', new Blob([JSON.stringify(report)], { type: 'application/json' }));

    if (file) {
      formData.append('file', file);
    }

    return this.http.post<ReportDTO>(`${this.baseUrl}/RegisterReport`, formData);
  }

  /**
   * Update existing report
   */
  update(id: number, report: ReportDTO, file?: File): Observable<ReportDTO> {
    const formData = new FormData();
    formData.append('report', new Blob([JSON.stringify(report)], { type: 'application/json' }));

    if (file) {
      formData.append('file', file);
    }

    return this.http.put<ReportDTO>(`${this.baseUrl}/UpdateReport/${id}`, formData);
  }

  /**
   * Get report by ID
   */
  getById(id: number): Observable<ReportDTO> {
    return this.http.get<ReportDTO>(`${this.baseUrl}/RetrieveReportById/${id}`);
  }

  /**
   * Get all reports
   */
  getAll(): Observable<ReportDTO[]> {
    return this.http.get<ReportDTO[]>(`${this.baseUrl}/RetrieveAllReports`);
  }

  /**
   * Delete report
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/DeleteReport/${id}`);
  }

  /**
   * Get report configuration for generation page
   */
  getConfig(id: number): Observable<ReportDTO> {
    return this.http.get<ReportDTO>(`${this.baseUrl}/RetrieveReportConfigById/${id}`);
  }

  /**
   * Get reports by category
   * NOTE: Centrino's own feature/BrandNewDev refactor left this specific action segment
   * un-renamed (likely an oversight) while every sibling method got a PascalCase verb.
   * Only the resource base is updated here to stay in sync; confirm the actual
   * action name with the backend team before relying on this in production.
   */
  getByCategory(category: string): Observable<ReportDTO[]> {
    return this.http.get<ReportDTO[]>(`${this.baseUrl}/category/${category}`);
  }

  /**
   * Get reports by function
   */
  getByFunction(functionId: string): Observable<ReportDTO[]> {
    return this.http.get<ReportDTO[]>(`${this.baseUrl}/RetrieveReportsByFunctionId/${functionId}`);
  }

  /**
   * Get reports by user functions - POST request with function IDs array
   */
  getByUserFunctions(functionIds: string[]): Observable<ReportDTO[]> {
    return this.http.post<ReportDTO[]>(`${this.baseUrl}/RetrieveReportsByUserFunctions`, { functionIds });
  }

  /**
   * Get public reports
   */
  getPublicReports(): Observable<ReportDTO[]> {
    return this.http.get<ReportDTO[]>(`${this.baseUrl}/RetrievePublicReports`);
  }

  /**
   * Update report status
   */
  updateStatus(id: number, status: boolean): Observable<ReportDTO> {
    return this.http.patch<ReportDTO>(`${this.baseUrl}/UpdateReportStatus/${id}?status=${status}`, null);
  }
}

/**
 * Report DTO
 */
export interface ReportDTO extends BaseDTO {
  reportName: string;
  functionId: string;
  dataSourceType: string;
  databaseConnectionId?: string;
  apiEndpointId?: string;
  reportFileName?: string;
  outputFormats: string[];
  isVisible?: boolean; // Backend uses isVisible instead of status
  autoGenPeriod?: string;
  genBeforeEod?: boolean;
  parameters: ReportParameterDTO[];
}

/**
 * Report Parameter DTO
 */
export interface ReportParameterDTO {
  parameterName: string;
  parameterLabel: string;
  dataType: string;
  inputType?: string;
  selectOptions?: string; // JSON format
  dataSource?: string;
  formatPattern?: string;
  required: boolean;
  visible?: boolean;
  readonly?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  defaultValue?: string;
  parameterOrder: number;
  dependsOnParameter?: string;
  helpText?: string;
  dataSourceKeyField?: string;
  dataSourceValueField?: string;
}
