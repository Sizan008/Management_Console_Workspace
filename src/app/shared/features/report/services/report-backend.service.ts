import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/**
 * Report Backend Service
 * Handles all API calls to the Report Backend (BIRT)
 */
@Injectable({
  providedIn: 'root'
})
export class ReportBackendService {
  private http = inject(HttpClient);
  private baseUrl = environment.reportManagementApiUrl;

  /**
   * Upload a BIRT report design file (.rptdesign)
   */
  uploadReportDesign(name: string, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    return this.http.post<string>(`${this.baseUrl}/reports/rptdesign`, formData, {
      responseType: 'text' as 'json'
    });
  }

  /**
   * Get all registered reports
   */
  getAllReports(): Observable<ReportRegister[]> {
    return this.http.get<ReportRegister[]>(`${this.baseUrl}/reports`);
  }

  /**
   * Get report by title
   */
  getReportByTitle(title: string): Observable<ReportRegister> {
    return this.http.get<ReportRegister>(`${this.baseUrl}/reports/${title}`);
  }

  /**
   * Delete report by title
   */
  deleteReport(title: string): Observable<string> {
    return this.http.delete<string>(`${this.baseUrl}/reports/${title}`, {
      responseType: 'text' as 'json'
    });
  }

  /**
   * Download report template
   */
  downloadTemplate(title: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reports/${title}/template`, {
      responseType: 'blob'
    });
  }

  /**
   * Generate report with parameters (POST method)
   */
  generateReport(
    title: string,
    format: string,
    params: ReportParamDTO
  ): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/render/${title}/${format}`,
      params,
      {
        responseType: 'blob'
      }
    );
  }

  /**
   * Generate report with query parameters (GET method)
   */
  generateReportWithQuery(
    title: string,
    format: 'pdf' | 'xls' | 'xlsx',
    rptParam: string,
    datasourceType?: string
  ): Observable<Blob> {
    let params = new HttpParams().set('rpt_param', rptParam);
    
    if (datasourceType) {
      params = params.set('datasource_type', datasourceType);
    }

    return this.http.get(`${this.baseUrl}/render/${title}/${format}`, {
      params: params,
      responseType: 'blob'
    });
  }

  /**
   * Get transaction statement data (GET)
   */
  getTransactionStatement(
    fromDate: string,
    toDate: string,
    accountNumber: string
  ): Observable<TransactionStatement> {
    return this.http.get<TransactionStatement>(
      `${this.baseUrl}/transactions/statement/${fromDate}/${toDate}/${accountNumber}`
    );
  }

  /**
   * Get transaction statement data (POST)
   */
  getTransactionStatementPost(
    request: StatementRequestDTO
  ): Observable<TransactionStatement> {
    return this.http.post<TransactionStatement>(
      `${this.baseUrl}/transactions/statement`,
      request
    );
  }

  /**
   * Get report metadata by report ID
   */
  getReportMetadataById(reportId: number): Observable<ReportMetadata> {
    return this.http.get<ReportMetadata>(`${this.baseUrl}/reportsExc/metadata/id/${reportId}`);
  }

  /**
   * Get report metadata by function ID
   */
  getReportMetadataByFunctionId(functionId: string): Observable<ReportMetadata> {
    return this.http.get<ReportMetadata>(`${this.baseUrl}/reportsExc/metadata/function/${functionId}`);
  }

  /**
   * Generate report with parameters (new API)
   */
  generateReportNew(request: ReportGenerationRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/reportsExc/generate`, request, {
      responseType: 'blob'
    });
  }

  /**
   * Generate report using GET method
   */
  generateReportSimple(
    reportId: number,
    format: string,
    params: any,
    appCode?: string
  ): Observable<Blob> {
    const paramsJson = JSON.stringify(params);
    let httpParams = new HttpParams().set('params', paramsJson);
    
    if (appCode) {
      httpParams = httpParams.set('appCode', appCode);
    }

    return this.http.get(`${this.baseUrl}/reportsExc/generate/${reportId}/${format}`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Execute parameter query for dynamic options
   */
  executeParameterQuery(request: { query: string, parameterName: string }): Observable<any[]> {
    return this.http.post<any[]>(`${this.baseUrl}/reportsExc/parameter-query`, request);
  }

  /**
   * Helper method to download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Data Transfer Objects (DTOs)
 */

export interface ReportRegister {
  reportTitle: string;
  template: string; // Base64 encoded
}

export interface ReportParamDTO {
  rpt_param?: string; // JSON string of parameters
  api_endpoint?: string;
  datasource_type?: string;
  datasource_name?: string;
  app_code?: string;
}

export interface StatementRequestDTO {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  accountNumber: string;
}

export interface TransactionStatement {
  accountNo: string;
  accountName: string;
  transactions: Transaction[];
}

export interface Transaction {
  date: string;
  tracerNumber: number;
  description: string;
  amount: number;
  balance: number;
}

export interface ReportMetadata {
  id: number;
  reportName: string;
  functionId: string;
  dataSourceType: string;
  databaseConnectionId?: string;
  apiEndpointId?: string;
  reportFileName?: string;
  outputFormats?: string[];
  supportedFormats?: string[];  // Backend uses this field
  isVisible: boolean;
  autoGenPeriod?: string;
  genBeforeEod: boolean;
  dataSourceInfo?: any;
  parameters: ReportParameterMetadata[];
  createdDate?: string;
  modifiedDate?: string;
  createdBy?: string;
  modifyBy?: string;
}

export interface ReportParameterMetadata {
  parameterName: string;
  parameterLabel: string;
  dataType: string;
  inputType: string;
  selectOptions?: string;
  dataSource?: string;
  formatPattern?: string;
  isRequired: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  defaultValue?: string;
  parameterOrder: number;
  dependsOnParameter?: string;
  helpText?: string;
  required?:boolean;
  readOnly?:boolean;
  visible?:boolean;
}

export interface ReportGenerationRequest {
  reportId: number;
  outputFormat: string;
  parameters: { [key: string]: any };
  appCode?: string;
}
