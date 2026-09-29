import {inject, Injectable} from '@angular/core';
import { Observable, of } from 'rxjs';
import {catchError, tap, map, switchMap} from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {UserService} from '../user/user.service';
import {User} from '../user/user.types';
import { environment } from '../../../environments/environment';


export interface ServiceRequest {
  // Client-side fields (for form)
  id?: number;
  employeeId?: string;
  fullName: string;
  email: string;
  department: number;
  requestType: string;
  priority: string;
  remarks: string;
  fileName?: string | null;
  document?: string | null; // Base64 encoded document
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  resolverRemarks?: string | null; // HR/IT comment to employee

  // API response fields
  serviceId?: number;
  issuerName?: string;
  issuerEmail?: string;
  deptId?: number;
  requestTypeId?: number;
  priorityLevel?: number;
  details?: string;
  officeId?: number;

  // Computed/display fields
  requestTypeText?: string;
  priorityText?: string;
  statusText?: string;
  deptName?: string;
  // New optional detail id for update endpoint
  serviceDtlId?: number;
}

// API request format for creating service request
export interface ServiceRequestCreateDto {
  issuerName: string;
  fullName: string;
  issuerEmail: string;
  officeId: number;
  deptId: number;
  requestTypeId: number;
  priorityLevel: number;
  details: string;
  document?: string | null;
  status: number;
}

// API request format for updating service request
export interface ServiceRequestUpdateDto {
  issuerName?: string;
  issuerEmail?: string;
  fullName?: string; // Include fullName for display/tracking
  deptId?: number;
  requestTypeId?: number;
  details?: string;
  status?: number;
  officeId?: number;
  priorityLevel?: number;
  resolverRemarks?: string;
  document?: string;
}

// Department interface
export interface Department {
  deptSl: number;
  deptNm: string;
  deptShNm: string;
  deptLevel: number;
  companyId: number;
  approveFlag: number;
}

@Injectable({
  providedIn: 'root',
})
export class ServiceRequestService {

  private userService = inject(UserService);

  officeId!: string;
  userId!: string;
  employeeId!: string;

  private get createApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/RegisterServiceRequest`;
  }

  private get listApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/RetrieveAllServiceRequests`;
  }

  private get getByIdApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/RetrieveServiceRequestById`;
  }

  private get getByEmployeeApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/RetrieveServiceRequestsByEmployee`;
  }

  private get getByIssuerApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/RetrieveServiceRequestsByIssuer`;
  }

  private get updateApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/UpdateServiceRequest`;
  }

  private get deleteApiUrl(): string {
    return `${environment.centrinoUrl}/ServiceRequest/DeleteServiceRequest`;
  }

  private get departmentApiUrl(): string {
    return `${environment.centrinoUrl}/Department/RetrieveAllDepartments`;
  }

  private get officeInfoApiUrl(): string {
    return `${environment.centrinoUrl}/XchangeOut/RetrieveAllOfficeInfoExc`;
  }

  private sendUpdateNotification(body: any): Observable<any> {
    const url = `${environment.apiBaseUrl}/Notify/Send`;

    return this.http.post(url, body, {
      headers: new HttpHeaders({
        "Content-Type": "application/json"
      })
    });
  }


  constructor(private http: HttpClient) {
    this.userService.user$.subscribe((user: User) => {
      this.officeId = user.officeId;
      this.userId = user.username;
      this.employeeId = user.employeeId;

      console.log('Office ID:', this.officeId);
      console.log('User ID:', this.userId);
    });
  }

  /**
   * Get HTTP headers with Bearer token
   */
  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
console.log("Token in service-request",token);
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  /** GET all service requests from the server (filtered by logged-in user) */
  getServiceRequests(): Observable<ServiceRequest[]> {
    // Get the logged-in user's ID from localStorage
    const userId =this.userId;

    if (!userId) {
      console.error('No userId found in storage');
      return of([]);
    }

    console.log('Calling API:', `${this.getByEmployeeApiUrl}/${userId}`);
    return this.http
      .get<any>(`${this.getByEmployeeApiUrl}/${userId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((response) => {
          console.log('Raw API response:', response);
          console.log('Response type:', typeof response);
          console.log('Is array?', Array.isArray(response));
        }),
        map((response) => {
          // Handle if response is wrapped in a data property
          if (response && response.data && Array.isArray(response.data)) {
            console.log('Response has data property, extracting...');
            return response.data;
          }
          // Handle if response is already an array
          if (Array.isArray(response)) {
            console.log('Response is already an array');
            return response;
          }
          // Handle if response is a single object
          console.log('Response is not an array, wrapping in array');
          return [response];
        }),
        map((requests) => {
          // Map API response fields to match our interface
          return requests.map((req: any) => ({
            ...req,
            // Do not hardcode fullName; keep backend value if provided
            serviceDtlId: req.serviceDtlId || req.serviceDtlId, // Preserve detail id if provided
            createdAt: req.createDate ? new Date(req.createDate) : undefined,
            updatedAt: req.modifyDate ? new Date(req.modifyDate) : undefined,
          }));
        }),
        tap((requests) =>
          console.log(
            'Processed requests with dates for user:',
            userId,
            requests
          )
        ),
        catchError(this.handleError<ServiceRequest[]>('getServiceRequests', []))
      );
  }

  /** GET service request by id */
  getServiceRequest(id: number): Observable<ServiceRequest> {
    return this.http
      .get<ServiceRequest>(`${this.getByIdApiUrl}/${id}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((_) => console.log(`Fetched service request id=${id}`)),
        catchError(
          this.handleError<ServiceRequest>(`getServiceRequest id=${id}`)
        )
      );
  }

  getServiceRequestsByEmployee(
    employeeId: string
  ): Observable<ServiceRequest[]> {
    return this.http
      .get<ServiceRequest[]>(`${this.getByEmployeeApiUrl}/${employeeId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((_) =>
          console.log(`Fetched service requests for employee: ${employeeId}`)
        ),
        catchError(
          this.handleError<ServiceRequest[]>('getServiceRequestsByEmployee', [])
        )
      );
  }

  /** POST: Get service requests by issuer name */
  getServiceRequestsByIssuer(issuerName: string): Observable<ServiceRequest[]> {
    const payload = { issuerName };
    console.log('Fetching service requests by issuer:', payload);
    return this.http
      .post<any>(this.getByIssuerApiUrl, payload, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((response) => {
          console.log('Service requests by issuer response:', response);
        }),
        map((response) => {
          // Handle if response is wrapped in a data property
          if (response && response.data && Array.isArray(response.data)) {
            return response.data;
          }
          // If response is already an array
          if (Array.isArray(response)) {
            return response;
          }
          // If single object, wrap in array
          if (response && typeof response === 'object') {
            return [response];
          }
          return [];
        }),
        map((requests: any[]) => {
          // Map API response fields to ServiceRequest format
          return requests.map((request) => ({
            ...request,
            // Do not hardcode fullName; keep backend value if provided
            serviceDtlId: request.serviceDtlId || request.serviceDtlId,
            createdAt: request.createDate
              ? new Date(request.createDate)
              : undefined,
            updatedAt: request.modifyDate
              ? new Date(request.modifyDate)
              : undefined,
          }));
        }),
        catchError(
          this.handleError<ServiceRequest[]>('getServiceRequestsByIssuer', [])
        )
      );
  }

  /** GET all service requests (admin only - fetches all requests regardless of user) */
  getAllServiceRequestsAdmin(): Observable<ServiceRequest[]> {
    console.log('Calling Admin API:', this.listApiUrl);
    return this.http
      .get<any>(this.listApiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((response) => {
          console.log('Raw Admin API response:', response);
        }),
        map((response) => {
          // Handle if response is wrapped in a data property
          if (response && response.data && Array.isArray(response.data)) {
            return response.data;
          }
          // Handle if response is already an array
          if (Array.isArray(response)) {
            return response;
          }
          // Handle if response is a single object
          return [response];
        }),
        tap((requests) =>
          console.log('All service requests (admin):', requests)
        ),
        catchError(
          this.handleError<ServiceRequest[]>('getAllServiceRequestsAdmin', [])
        )
      );
  }

  /** POST: add a new service request to the server */
  addServiceRequest(
    serviceRequest: ServiceRequest
  ): Observable<ServiceRequest> {
    console.log('=== Creating Service Request ===');
    console.log('Input serviceRequest:', serviceRequest);

    // Get officeId from sessionStorage
    const officeId =
      sessionStorage.getItem('officeId') || localStorage.getItem('officeId');

    if (!officeId) {
      console.error('No officeId found in storage');
      throw new Error('Office ID is required. Please select an office.');
    }

    // Validate required fields
    if (!serviceRequest.fullName || !serviceRequest.email) {
      console.error('Missing required fields:', {
        fullName: serviceRequest.fullName,
        email: serviceRequest.email,
      });
      throw new Error('Issuer name and email are required.');
    }

    if (
      !serviceRequest.department ||
      isNaN(Number(serviceRequest.department))
    ) {
      console.error('Invalid department:', serviceRequest.department);
      throw new Error('Valid department is required.');
    }

    if (!serviceRequest.requestType) {
      console.error('Missing request type:', serviceRequest.requestType);
      throw new Error('Request type is required.');
    }

    if (!serviceRequest.priority) {
      console.error('Missing priority:', serviceRequest.priority);
      throw new Error('Priority is required.');
    }

    // Preserve display fullName but send actual userId (issuer) to backend.
    // const userId =
    //   localStorage.getItem('userId') || sessionStorage.getItem('userId') || '';
    const userId =this.userId;
    if (!userId) {
      console.warn('No userId found for issuerName – falling back to fullName');
    }

    // Transform to API format – backend expects issuerName = userId
    const requestDto: ServiceRequestCreateDto = {
      issuerName: userId,
      fullName: serviceRequest.fullName,
      issuerEmail: serviceRequest.email,
      officeId: parseInt(officeId),
      deptId: Number(serviceRequest.department), // Ensure it's a number
      requestTypeId:
        typeof serviceRequest.requestType === 'number'
          ? serviceRequest.requestType
          : parseInt(String(serviceRequest.requestType).replace('option', '')), // Handle both number and 'option1' formats
      priorityLevel:
        typeof serviceRequest.priority === 'number'
          ? serviceRequest.priority
          : parseInt(String(serviceRequest.priority).replace('option', '')), // Handle both number and 'option1' formats
      details: serviceRequest.remarks || '',
      document: serviceRequest.document || null, // Use Base64 document
      status: 0, // Default status: Pending
    };

    console.log('Transformed requestDto:', requestDto);
    console.log('Sending service request to API:', this.createApiUrl);

    return this.http
      .post<any>(this.createApiUrl, requestDto, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((response) => {
          console.log('Service request created successfully:', response);
        }),
        map((response) => {
          // Transform response back to ServiceRequest format if needed
          return {
            ...serviceRequest,
            id: response.id || response.serviceId || Date.now(), // Use response ID or generate one
            serviceId: response.serviceId || response.id,
            serviceDtlId: response.serviceDtlId || response.serviceDtlId, // Preserve detail id if backend supplies it
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as ServiceRequest;
        }),
        catchError((error) => {
          console.error('Error creating service request:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
            message: error.message,
          });
          return this.handleError<ServiceRequest>('addServiceRequest')(error);
        })
      );
  }

  /** PUT: update the service request on the server */
  updateServiceRequest(
    serviceRequest: ServiceRequest
  ): Observable<ServiceRequest> {
    // Get officeId from sessionStorage or use the one from serviceRequest
    const officeId =
      serviceRequest.officeId ||
      sessionStorage.getItem('officeId') ||
      localStorage.getItem('officeId');

    if (!officeId) {
      console.error('No officeId found in storage or request');
      throw new Error(
        'Office ID is required for update. Please select an office.'
      );
    }

    // Extract required fields with fallbacks
    // Always persist issuerName as userId from storage (do not expose in UI)

    const issuerName = serviceRequest.issuerName;
    const issuerEmail = serviceRequest.issuerEmail || serviceRequest.email;
    const fullName = serviceRequest.fullName || ''; // Include fullName for backend tracking/display
    const deptId =
      serviceRequest.deptId ||
      (typeof serviceRequest.department === 'number'
        ? serviceRequest.department
        : undefined);
    const requestTypeId = serviceRequest.requestTypeId;
    const details =
      serviceRequest.details || serviceRequest.remarks || 'Update';
    const resolverRemarks = serviceRequest.resolverRemarks ?? ''; // Use nullish coalescing to preserve empty strings
    const status =
      typeof serviceRequest.status === 'string'
        ? this.parseStatusToNumber(serviceRequest.status)
        : serviceRequest.status;
    const priorityLevel = serviceRequest.priorityLevel || 1;
    const document = serviceRequest.document || '';

    // Validate required fields
    if (!issuerName || !issuerEmail || !deptId || !requestTypeId) {
      console.error('Missing required fields for update:', {
        issuerName,
        issuerEmail,
        deptId,
        requestTypeId,
        serviceRequest,
      });
      throw new Error('Missing required fields for service request update');
    }

    // Transform to API format - match backend expectations exactly
    const updateDto: ServiceRequestUpdateDto = {
      issuerName,
      issuerEmail,
      fullName, // Send fullName to backend
      deptId,
      requestTypeId,
      details,
      status,
      officeId: typeof officeId === 'string' ? parseInt(officeId) : officeId,
      priorityLevel,
      resolverRemarks,
      document,
    };

    console.log('=== SERVICE UPDATE DEBUG ===');
    console.log('Input serviceRequest:', serviceRequest);
    console.log('Extracted resolverRemarks:', resolverRemarks);
    console.log('Final updateDto:', updateDto);
    // console.log('JSON stringified:', JSON.stringify(updateDto));
    console.log('=== END SERVICE DEBUG ===');

    // New endpoint requires both serviceId and serviceDtlId
    const serviceId = serviceRequest.serviceId || serviceRequest.id;
    const serviceDtlId = serviceRequest.serviceDtlId;

    if (!serviceId) {
      throw new Error('Missing serviceId for update URL');
    }
    if (!serviceDtlId) {
      throw new Error(
        'Missing serviceDtlId for update. Ensure the request was loaded with detail information.'
      );
    }

    const updateUrl = `${this.updateApiUrl}/${serviceId}/${serviceDtlId}`;
    console.log('Calling update endpoint:', updateUrl);

    return this.http
      .put<any>(updateUrl, updateDto, {
        headers: this.getHeaders(),
      })
      .pipe(
        switchMap((response) => {

          console.log(
            `Updated service request id=${serviceRequest.id}`,
            response
          );

          // Build notification body
          const notificationPayload = {
            workFlowKey: "notify-only",
            receiverInformations: [
              {
                subscriberId: serviceRequest.issuerName,
                firstName: serviceRequest.fullName || serviceRequest.issuerName
              }
            ],
            payLoad: {
              notificationSubject: "Service Request Updated",
              notificationBody: `Your service request #${serviceId} has been updated.`,
              senderUserName: this.userId
            }
          };

          return this.sendUpdateNotification(notificationPayload).pipe(
            map((notifyRes) => {

              console.log("Notification API Response:", notifyRes);
              return {
                ...serviceRequest,
                ...response,
                notificationResponse: notifyRes,
                createdAt: response.createDate
                  ? new Date(response.createDate)
                  : serviceRequest.createdAt,
                updatedAt: response.modifyDate
                  ? new Date(response.modifyDate)
                  : new Date()
              } as ServiceRequest;
            })
          );
        }),
        catchError(this.handleError<ServiceRequest>('updateServiceRequest'))
      );
  }

  /**
   * Convert status string to number for API
   */
  private parseStatusToNumber(status: string | number | undefined): number {
    if (typeof status === 'number') return status;
    if (!status) return 0;

    const statusMap: { [key: string]: number } = {
      pending: 0,
      'in-progress': 1,
      'in progress': 1,
      resolved: 2,
      rejected: 3,
    };

    return statusMap[status.toLowerCase()] ?? 0;
  }

  /** DELETE: delete the service request from the server */
  deleteServiceRequest(id: number): Observable<ServiceRequest> {
    return this.http
      .delete<ServiceRequest>(`${this.deleteApiUrl}/${id}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((_) => console.log(`Deleted service request id=${id}`)),
        catchError(this.handleError<ServiceRequest>('deleteServiceRequest'))
      );
  }

  /** GET service requests by status */
  getServiceRequestsByStatus(status: string): Observable<ServiceRequest[]> {
    return this.http
      .get<ServiceRequest[]>(this.listApiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((requests) => requests.filter((r) => r.status === status)),
        tap((filtered) =>
          console.log(
            `Fetched ${filtered.length} requests with status: ${status}`
          )
        ),
        catchError(
          this.handleError<ServiceRequest[]>('getServiceRequestsByStatus', [])
        )
      );
  }

  /** GET all departments from the server */
  getAllDepartments(): Observable<Department[]> {
    return this.http
      .get<Department[]>(this.departmentApiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError(this.handleError<Department[]>('getAllDepartments', []))
      );
  }

  /** Convert departments to dropdown options format */
  getDepartmentOptions(): Observable<{ key: string; value: string }[]> {
    return this.getAllDepartments().pipe(
      map((departments) => {
        const options = departments.map((dept) => ({
          key: dept.deptSl.toString(),
          value: dept.deptNm,
        }));
        return options;
      })
    );
  }

  /** GET all office info from the server */
  getAllOfficeInfo(): Observable<any[]> {
    return this.http
      .post<any>(
        this.officeInfoApiUrl,
        {},
        {
          headers: this.getHeaders(),
        }
      )
      .pipe(
        tap((response) => console.log('Fetched office info:', response)),
        map((response) => {
          // Handle if response is wrapped in a data property
          if (response && response.data && Array.isArray(response.data)) {
            return response.data;
          }
          // Handle if response is already an array
          if (Array.isArray(response)) {
            return response;
          }
          // Handle if response is a single object
          return [response];
        }),
        catchError(this.handleError<any[]>('getAllOfficeInfo', []))
      );
  }

  /** Convert office info to dropdown options format */
  getOfficeOptions(): Observable<{ key: string; value: string }[]> {
    return this.getAllOfficeInfo().pipe(
      map((offices) => {
        console.log('Raw office info from API:', offices);
        // Adjust the mapping based on actual API response structure
        // Assuming office has properties like: officeId, officeName, officeCode, etc.
        const options = offices.map((office, index) => ({
          // Use real IDs when available; otherwise fall back to 1-based index to avoid 0/1 mismatch
          key:
            office.officeId?.toString() ||
            office.officeCode?.toString() ||
            (index + 1).toString(),
          value: office.OFFICE_NAME || office.officeCd || `Office ${index + 1}`,
        }));
        console.log('Converted office options:', options);
        return options;
      })
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error);
      console.log(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }
}
