import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  WritableSignal,
  ChangeDetectorRef,
  ViewChild, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MatTabsModule } from '@angular/material/tabs';
import { jwtDecode } from 'jwt-decode';
import { InputTextBox } from '../../../common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../common-components/input-types/input-text-area/input-text-area';
import { InputSelectOptionField } from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { InputFile } from '../../../common-components/input-types/input-file/input-file';
import { GenericDataGrid } from '../../../common-components/generic-component-type/generic-data-grid';
import { ServiceRequestLogService, ServiceRequestLog } from '../../../../core/services/service-request-log.service';
import { ServiceRequest, ServiceRequestService } from '../../../../core/services/service-request.service';
import { UserService } from '../../../../core/user/user.service';
import { User } from '../../../../core/user/user.types';



@Component({
  selector: 'service-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    InputTextBox,
    ReactiveFormsModule,
    InputTextArea,
    InputSelectOptionField,
    ExpansionPanelHeader,
    InputFile,
    GenericDataGrid,
    MatTabsModule,
  ],
  templateUrl: './service-request-dialog.html',
  styleUrls: ['./service-request-dialog.scss'],
})
export class ServiceRequestDialog implements OnInit {
  toggleMenu: boolean = false;
  sidebarExpanded: boolean = false;
  showCreateForm: boolean = true;
  tabIndex = signal<number>(0);
  isUpdateMode = signal<boolean>(false); // Track if in update mode
  selectedRequestForUpdate: ServiceRequest | null = null; // Store request being updated
  frmGroup!: FormGroup;
  public title = 'Service Request';
  businessHeaderPanel: WritableSignal<boolean> = signal(true);
  subPanel1: WritableSignal<boolean> = signal(true);
  toastr = inject(ToastrService);
  serviceRequestService = inject(ServiceRequestService);
  serviceRequestLogService = inject(ServiceRequestLogService);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('supportingDocInput') supportingDocInput?: InputFile;
  @Output() modalResult = new EventEmitter<any>();
  @Output() okButtonTextChange = new EventEmitter<string>();
  @Input() modalParent?: { close(result?: any): void; closeModal(): void };
  @Input() initialData?: any;


  //private readonly applications = signal<MetaAppListItem[]>([]);
  //private readonly applications = signal<MetaAppModuleItem[]>([]);

  private userService = inject(UserService);

  officeId!: string;
  userId!: string;
  employeeId!: string;

  // Getter for OK button text based on current mode
  get okButtonText(): string {
    if (this.tabIndex() === 1) {
      return 'Close'; // View tab
    }
    return this.isUpdateMode() ? 'Update Request' : 'Submit Request';
  }

  onTabChange(index: number): void {
    // Prevent unnecessary processing if tab didn't actually change
    if (this.tabIndex() === index) {
      return;
    }

    this.tabIndex.set(index);

    // If switching away from update tab (index 0) and not in update mode, reset form
    if (index === 1 && this.isUpdateMode()) {
      this.isUpdateMode.set(false);
      this.selectedRequestForUpdate = null;
      this.frmGroup.reset();
      this.selectedFile = null;
      this.selectedFileBase64 = null;
      this.populateEmployeeId(); // Repopulate employee ID from JWT
      this.loadUserDataFromLocalStorage();
    }

    // If switching to create/update tab (index 0) and not in update mode, ensure employee ID is populated
    if (index === 0 && !this.isUpdateMode()) {
      this.populateEmployeeId(); // Ensure employee ID is always populated
    }

    if (index === 1) {
      this.loadServiceRequests();
    }

    // Emit button text change asynchronously to avoid ExpressionChangedAfterItHasBeenCheckedError
    // Use setTimeout with 0 delay to push to next event loop cycle
    setTimeout(() => {
      this.okButtonTextChange.emit(this.okButtonText);
    }, 0);
  }

  selectedFile: File | null = null;
  selectedFileBase64: string | null = null;

  serviceRequests = signal<ServiceRequest[]>([]);

  get selectedColumns(): string[] {
    return [
      'serviceId',
      'fullName',
      'issuerEmail',
      'deptName',
      'requestTypeText',
      'priorityText',
      'details',
      'statusText',
      'resolverRemarks',
    ];
  }

  get customColumnNames(): any {
    return {
      serviceId: 'Request ID',
      fullName: 'Issuer Name',
      issuerEmail: 'Issuer Email',
      deptName: 'Department',
      requestTypeText: 'Request Type',
      priorityText: 'Priority',
      details: 'Details/Remarks',
      statusText: 'Status',
      resolverRemarks: 'HR/IT Response',
    };
  }
  // Department options loaded from API
  departmentOptions: { key: string; value: string }[] = [
    { key: 'loading', value: 'Loading departments...' },
  ];

  dropdownOptions = [
    { key: 1, value: 'Access Request' },
    { key: 2, value: 'Software Installation' },
    { key: 3, value: 'Hardware Issue' },
    { key: 4, value: 'Network Problem' },
    { key: 5, value: 'Account Issue' },
  ];

  priorityOptions = [
    { key: 1, value: 'High' },
    { key: 2, value: 'Medium' },
    { key: 3, value: 'Low' },
  ];

  constructor(private formBuilder: FormBuilder) {
    // Initialize form in constructor to avoid template errors
    this.frmGroup = this.formBuilder.group({
      uuid: [''],
      serviceRequestId: [''],
      employeeId: [''],
      fullName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      department: ['', Validators.required], // Only required validator, no minLength/maxLength
      requestType: ['', Validators.required],
      priority: ['', Validators.required],
      remarks: ['', [Validators.required, Validators.maxLength(500)]],
      fileUpload: [''],
    });
  }

  ngOnInit() {
    // Load departments from API
    this.loadDepartments();

    // Populate employee ID from JWT token
    this.populateEmployeeId();

    // Load user data from localStorage
    this.loadUserDataFromLocalStorage();

    // Load service requests for the grid
    this.loadServiceRequests();
    this.userService.user$.subscribe((user: User) => {
      this.officeId = user.officeId;
      this.userId = user.username;
      this.employeeId = user.employeeId;

      console.log('Office ID:', this.officeId);
      console.log('User ID:', this.userId);
    });

  }
  private loadInitialData(): void {
  }



  loadDepartments(): void {
    this.serviceRequestService.getDepartmentOptions().subscribe({
      next: (options) => {
        this.departmentOptions = options;
      },
      error: (error) => {
        this.toastr.error(
          'Failed to load departments: ' + error.message,
          'Error'
        );
        // Fallback to empty array
        this.departmentOptions = [];
      },
    });
  }
  loadServiceRequests(): void {
    // Get the logged-in user's id (issuer) for filtering API
    // const userId =
    //   localStorage.getItem('userId') || sessionStorage.getItem('userId') || '';

    this.serviceRequestService.getServiceRequestsByIssuer(this.userId).subscribe({
      next: (requests) => {
        // Transform the requests to add readable text for IDs
        const nameFromForm =
          this.frmGroup.get('fullName')?.value ||
          localStorage.getItem('userName') ||
          '';
        const transformedRequests = (requests || []).map((request) => ({
          ...request,
          // Use user input for fullName display (do not hardcode)
          fullName: request.fullName || nameFromForm,
          requestTypeText: this.getRequestTypeText(request.requestTypeId || 0),
          priorityText: this.getPriorityText(request.priorityLevel || 0),
          statusText: this.getStatusText(request.status || '0'),
          deptName: this.getDepartmentName(request.deptId || 0),
          resolverRemarks:
            request.resolverRemarks || 'Resolver not yet reviewed',
        }));

        this.serviceRequests.set(transformedRequests);
      },
      error: (error) => {
        this.toastr.error('Failed to load service requests', 'Error');
        this.serviceRequests.set([]); // Initialize as empty array on error
      },
    });
  }
  getRequestTypeText(id: number): string {
    const requestType = this.dropdownOptions.find((opt) => opt.key === id);
    return requestType ? requestType.value : `Type ${id}`;
  }

  getPriorityText(level: number): string {
    // Create a direct mapping for priority levels
    const priorityMap: { [key: number]: string } = {
      1: 'High',
      2: 'Medium',
      3: 'Low',
    };

    return priorityMap[level] || `Priority ${level}`;
  }

  getStatusText(status: string | number | undefined): string {
    const statusNum =
      typeof status === 'string' ? parseInt(status) : status || 0;
    const statusMap: { [key: number]: string } = {
      0: 'Pending',
      1: 'In Progress',
      2: 'Resolved',
      3: 'Rejected',
    };
    return statusMap[statusNum] || 'Unknown';
  }

  getDepartmentName(deptId: number): string {
    const dept = this.departmentOptions.find(
      (opt) => opt.key === deptId.toString()
    );
    return dept ? dept.value : `Dept ${deptId}`;
  }

  /**
   * Extract employee ID from JWT token and populate the form field
   */
  populateEmployeeId(): void {
    try {
      // Get token from localStorage or sessionStorage
      const token =
        localStorage.getItem('authToken') ||
        sessionStorage.getItem('authToken');

      if (!token) {
        console.warn('No auth token found');
        return;
      }

      // Decode the JWT token
      const decodedToken: any = jwtDecode(token);

      // Extract employee ID from the decoded token
      const employeeId = this.userId;

      if (employeeId) {
        // Populate the employee ID field (it's disabled but can still be set)
        this.frmGroup.patchValue({
          employeeId: employeeId.toString(),
        });
        console.log('Employee ID populated from JWT:', employeeId);
      } else {
        console.warn('Employee ID not found in JWT token');
      }
    } catch (error) {
      console.error('Error decoding JWT token:', error);
    }
  }

  loadUserDataFromLocalStorage(): void {
    const userData = {
      fullName: localStorage.getItem('userName') || '',
      email: localStorage.getItem('userEmail') || '',
    };

    // Populate the user fields (employeeId is populated separately from JWT)
    this.frmGroup.patchValue({
      fullName: userData.fullName,
      email: userData.email,
    });
  }

  handleCategorySelection(event: {
    selectedOption: any;
    selectedKey: string;
    selectedValue: string;
  }): void {
    // Update priority based on selection
    if (event.selectedKey === '1' || event.selectedKey === '4') {
      // High priority or urgent
      this.toastr.info(
        'High priority request - Will be processed urgently',
        'Priority Update'
      );
    }
  }

  onPdfSelected(files: File[]): void {
    if (files && files.length > 0) {
      const file = files[0];
      const maxSizeMB = 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      // Validate file size
      if (file.size > maxSizeBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        this.toastr.error(
          `File size exceeds ${maxSizeMB}MB limit. "${file.name}" is ${fileSizeMB}MB`,
          'File Too Large',
          {
            timeOut: 5000,
            closeButton: true,
          }
        );

        // Clear the selected file from UI and state
        this.selectedFile = null;
        this.selectedFileBase64 = null;

        // Clear the file input field in the UI
        if (this.supportingDocInput) {
          this.supportingDocInput.clearFiles();
        }

        return;
      }

      this.selectedFile = file;
      this.toastr.info(
        `File "${this.selectedFile.name}" selected`,
        'File Upload'
      );

      // Convert file to Base64
      this.convertFileToBase64(this.selectedFile);
    }
  }

  onInvalidFiles(event: { invalidFiles: File[]; message: string }): void {
    this.toastr.error(event.message, 'File Validation Error', {
      timeOut: 5000,
      closeButton: true,
    });
  }

  convertFileToBase64(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
      // Get the result and remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Get only the Base64 part

      this.selectedFileBase64 = base64Data;
    };

    reader.onerror = (error) => {
      this.toastr.error('Failed to process file', 'Error');
      this.selectedFileBase64 = null;
    };

    reader.readAsDataURL(file);
  }

  onFileInputChanged(context: string): void {}

  onInputTextAreaChanged(value: string): void {}

  /**
   * Method called by generic-modal when OK button is clicked
   * Validates form and triggers async submission
   * Returns data to be emitted via modalResult
   */
  getModalResult(): any {
    // If in view tab, just close the modal
    if (this.tabIndex() === 1) {
      return null;
    }

    // Validate form
    if (!this.frmGroup.valid) {
      this.toastr.error(
        'Please correct the errors in the form before submitting.',
        'Form Error'
      );

      // Mark all fields as touched to show validation errors
      Object.keys(this.frmGroup.controls).forEach((key) => {
        this.frmGroup.get(key)?.markAsTouched();
      });

      // Return null - modal will close but submission won't happen
      return null;
    }

    // Form is valid - trigger submission asynchronously
    // The modal will close, and the API call will happen in the background
    setTimeout(() => {
      this.onSubmit();
    }, 0);

    // Return null to prevent modal from emitting success prematurely
    // The onSubmit() method will emit the result after API success
    return null;
  }

  onSubmit(): void {
    if (this.isUpdateMode()) {
      // Call update instead of create
      this.onUpdate();
      return;
    }

    if (this.frmGroup.valid) {
      const formData = this.frmGroup.value;

      // Prepare service request data
      const serviceRequest: ServiceRequest = {
        employeeId: formData.employeeId,
        fullName: formData.fullName,
        email: formData.email,
        department: formData.department,
        requestType: formData.requestType,
        priority: formData.priority,
        remarks: formData.remarks,
        fileName: this.selectedFile ? this.selectedFile.name : null,
        document: this.selectedFileBase64, // Include Base64 document
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log("serviceRequest--- ",serviceRequest);
      // Call backend service
      this.serviceRequestService.addServiceRequest(serviceRequest).subscribe({
        next: (response) => {
          this.toastr.success(
            'Service request submitted successfully!',
            'Success'
          );

          // Log the service request creation to the backend (silent, no UI feedback)
          this.logServiceRequestAction(response, 'CREATE');

          // Emit result to parent component
          this.modalResult.emit(response);

          // Reset form
          this.frmGroup.reset();
          this.selectedFile = null;
          this.selectedFileBase64 = null;

          // Reload service requests to show the new one
          this.loadServiceRequests();

          // Re-populate readonly fields
          this.loadUserDataFromLocalStorage();
        },
        error: (error) => {
          this.toastr.error(
            'Failed to submit service request. Please try again.',
            'Error'
          );
        },
      });
    } else {
      this.toastr.error(
        'Please correct the errors in the form before submitting.',
        'Form Error'
      );

      // Mark all fields as touched to show validation errors
      Object.keys(this.frmGroup.controls).forEach((key) => {
        this.frmGroup.get(key)?.markAsTouched();
      });
    }
  }
  onReraiseClick(requestJson: string): void {
    try {
      const request: ServiceRequest = JSON.parse(requestJson);
      this.onReraise(request);
    } catch (error) {
      this.toastr.error('Failed to load request data', 'Error');
    }
  }

  onReraise(request: ServiceRequest): void {
    // Store the request being updated
    this.selectedRequestForUpdate = request;

    // Set update mode
    this.isUpdateMode.set(true);
    // Populate form with existing data - ensure deptId is a number or string that matches dropdown keys
    const deptValue = request.deptId || request.department;

    this.frmGroup.patchValue({
      fullName: request.fullName || '',
      email: request.issuerEmail || request.email || '',
      department: deptValue ? String(deptValue) : '', // Convert to string to match dropdown keys
      requestType: request.requestTypeId || request.requestType || '',
      priority: 3, // Set to Low (key 3)
      remarks: request.details || request.remarks || '',
    });

    // Populate employee ID from JWT token
    this.populateEmployeeId();

    // Store existing document if any
    if (request.document) {
      this.selectedFileBase64 = request.document;
      // Note: we can't recreate the File object, but we have the base64
    }

    // Switch to create/update tab - use setTimeout to ensure Angular change detection runs
    setTimeout(() => {
      this.tabIndex.set(0);
      // Emit button text change after mode is set
      setTimeout(() => {
        this.okButtonTextChange.emit(this.okButtonText);
      }, 0);
    }, 0);

    this.toastr.info('You can now update the service request', 'Reraise Mode');
  }

  onUpdate(): void {
    if (!this.frmGroup.valid) {
      this.toastr.error(
        'Please correct the errors in the form before updating.',
        'Form Error'
      );
      Object.keys(this.frmGroup.controls).forEach((key) => {
        this.frmGroup.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.selectedRequestForUpdate) {
      this.toastr.error('No request selected for update', 'Error');
      return;
    }

    const formData = this.frmGroup.value;

    // Prepare updated service request data with status set to pending (0) and priority to low (3)
    const updatedRequest: ServiceRequest = {
      ...this.selectedRequestForUpdate,
      fullName: formData.fullName,
      email: formData.email,
      issuerEmail: formData.email,
      department: formData.department,
      deptId: formData.department,
      requestType: formData.requestType,
      requestTypeId: formData.requestType,
      priority: '3', // Set to Low
      priorityLevel: 3, // Set to Low
      status: 'pending', // Set to Pending
      remarks: formData.remarks,
      details: formData.remarks,
      document:
        this.selectedFileBase64 || this.selectedRequestForUpdate.document,
      fileName:
        this.selectedFile?.name || this.selectedRequestForUpdate.fileName,
      updatedAt: new Date(),
    };

    this.serviceRequestService.updateServiceRequest(updatedRequest).subscribe({
      next: (response) => {
        this.toastr.success('Service request updated successfully!', 'Success');

        // Log the update action
        this.logServiceRequestAction(response, 'UPDATE');

        // Reset update mode
        this.isUpdateMode.set(false);
        this.selectedRequestForUpdate = null;

        // Reset form
        this.frmGroup.reset();
        this.selectedFile = null;
        this.selectedFileBase64 = null;

        // Reload service requests
        this.loadServiceRequests();

        // Re-populate readonly fields
        this.loadUserDataFromLocalStorage();

        // Switch to view tab to see updated list
        this.tabIndex.set(1);

        // Emit result to parent
        this.modalResult.emit(response);
      },
      error: (error) => {
        this.toastr.error(
          'Failed to update service request. Please try again.',
          'Error'
        );
      },
    });
  }

  getRequestTypeValue(key: string | number): string {
    const option = this.dropdownOptions.find((opt) => opt.key === Number(key));
    return option ? option.value : String(key);
  }

  private logServiceRequestAction(
    serviceRequest: ServiceRequest,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
  ): void {
    // Guard: Ensure serviceRequest has an ID before logging
    if (!serviceRequest || !serviceRequest.id) {
      console.warn(
        'Cannot log service request action: missing ID',
        serviceRequest
      );
      return;
    }

    const log: ServiceRequestLog = {
      requestId: serviceRequest.id,
      action: action,
      employeeId: serviceRequest.employeeId,
      fullName: serviceRequest.fullName,
      email: serviceRequest.email,
      department: serviceRequest.department,
      requestType: serviceRequest.requestType,
      priority: serviceRequest.priority,
      remarks: serviceRequest.remarks,
      fileName: serviceRequest.fileName || null,
      status: serviceRequest.status,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      ipAddress: 'N/A', // IP address would be captured on the backend in a real scenario
    };

    this.serviceRequestLogService.logServiceRequest(log).subscribe({
      next: () => {},
      error: () => {
        // Fail silently - don't show error to user
      },
    });
  }
}
