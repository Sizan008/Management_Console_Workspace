import { Component, OnInit, input, output, signal } from '@angular/core';

import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DataSelectionConfig, DataSelectionItem, DataSelectionResult } from '../../../models/data-selection.interface';
import { ConfirmationDialogue } from '../../confirmation-dialogue/confirmation-dialogue';
import { Label } from '../../generic-component-type/generic-label/generic-label';

@Component({
  selector: 'app-alert-example-page',
  imports: [
    ConfirmationDialogue,

  ],
  templateUrl: './alert-example-page.html',
  styleUrl: './alert-example-page.scss'
})
export class AlertExamplePage implements OnInit {

  frmGroup: FormGroup;
  showOptionalFields = signal<boolean>(false);

  constructor(private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.frmGroup = this.formBuilder.group({
      amount: ['', Validators.required],
      description: ['', Validators.required],
      notifications: [false]
    });
  }

  // Success Modal
  isSuccessModalOpen = signal<boolean>(false);
  successModalTitle = signal<string>('Success!');
  successModalMessage = signal<string>('Your action was completed successfully. This is a success modal with green styling and a checkmark icon.');

  // Error Modal
  isErrorModalOpen = signal<boolean>(false);
  errorModalTitle = signal<string>('Error!');
  errorModalMessage = signal<string>('Something went wrong while processing your request. Please try again or contact support if the problem persists.');

  // Warning Modal
  isWarningModalOpen = signal<boolean>(false);
  warningModalTitle = signal<string>('Warning!');
  warningModalMessage = signal<string>('Please review your input before proceeding. Some fields may need attention.');

  // Info Modal
  isInfoModalOpen = signal<boolean>(false);
  infoModalTitle = signal<string>('Information');
  infoModalMessage = signal<string>('This is an informational modal. It provides helpful context or guidance to the user.');

  // Delete Confirmation Modal
  isDeleteConfirmationModalOpen = signal<boolean>(false);

  // Success Confirmation Modal (example for confirmation-dialogue with success variant)
  isSuccessConfirmationModalOpen = signal<boolean>(false);

  // Data Selection Modal
  isDataSelectionModalOpen = signal<boolean>(false);
  dataSelectionConfig = signal<DataSelectionConfig | null>(null);
  selectedData = signal<DataSelectionItem | null>(null);
  selectedItems = signal<DataSelectionItem[]>([]);
  selectionTimestamp = signal<Date | null>(null);

  // Mock services for demonstration
  private mockCustomerService = {
    getCustomers: async (params: any) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const customers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890', status: 'Active' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', status: 'Active' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', status: 'Inactive' },
        { id: 4, name: 'Alice Brown', email: 'alice@example.com', phone: '+1234567893', status: 'Active' },
        { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', phone: '+1234567894', status: 'Active' }
      ];

      return {
        data: customers,
        totalRecords: customers.length
      };
    }
  };

  private mockAccountService = {
    getAccounts: async (params: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const accounts = [
        { id: 1, accountNumber: 'ACC001', accountName: 'Savings Account', balance: 5000.00, type: 'Savings' },
        { id: 2, accountNumber: 'ACC002', accountName: 'Checking Account', balance: 2500.00, type: 'Checking' },
        { id: 3, accountNumber: 'ACC003', accountName: 'Investment Account', balance: 15000.00, type: 'Investment' },
        { id: 4, accountNumber: 'ACC004', accountName: 'Business Account', balance: 7500.00, type: 'Business' },
        { id: 5, accountNumber: 'ACC005', accountName: 'Student Account', balance: 500.00, type: 'Student' },
        { id: 6, accountNumber: 'ACC006', accountName: 'Student Account', balance: 500.00, type: 'Student' }
      ];

      return {
        data: accounts,
        totalRecords: accounts.length
      };
    }
  };

  private mockProductService = {
    getProducts: async (params: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const products = [
        { id: 1, productCode: 'PROD001', productName: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
        { id: 2, productCode: 'PROD002', productName: 'Smartphone', price: 699.99, category: 'Electronics', stock: 100 },
        { id: 3, productCode: 'PROD003', productName: 'Tablet', price: 399.99, category: 'Electronics', stock: 25 },
        { id: 4, productCode: 'PROD004', productName: 'Headphones', price: 199.99, category: 'Accessories', stock: 75 },
        { id: 5, productCode: 'PROD005', productName: 'Mouse', price: 29.99, category: 'Accessories', stock: 200 }
      ];

      return {
        data: products,
        totalRecords: products.length
      };
    }
  };

  // Success Modal Methods
  showSuccessModal() {
    this.isSuccessModalOpen.set(true);
  }

  closeSuccessModal() {
    this.isSuccessModalOpen.set(false);
  }

  onSuccessModalButtonClick(event: { action: string; button: any }) {
    console.log('Success modal button clicked:', event.action);
    this.closeSuccessModal();
  }

  onSwitchChanged(event: any) {
    console.log('Switch changed:', event);
    this.showOptionalFields.set(!event);
  }

  getLabelText() {
    return this.showOptionalFields() ? 'Optional Field' : 'Required Field';
  }

  // Error Modal Methods
  showErrorModal() {
    this.isErrorModalOpen.set(true);
  }

  closeErrorModal() {
    this.isErrorModalOpen.set(false);
  }

  onErrorModalButtonClick(event: { action: string; button: any }) {
    console.log('Error modal button clicked:', event.action);
    this.closeErrorModal();
  }

  // Warning Modal Methods
  showWarningModal() {
    this.isWarningModalOpen.set(true);
  }

  closeWarningModal() {
    this.isWarningModalOpen.set(false);
  }

  onWarningModalButtonClick(event: { action: string; button: any }) {
    console.log('Warning modal button clicked:', event.action);
    this.closeWarningModal();
  }

  // Info Modal Methods
  showInfoModal() {
    this.isInfoModalOpen.set(true);
  }

  closeInfoModal() {
    this.isInfoModalOpen.set(false);
  }

  onInfoModalButtonClick(event: { action: string; button: any }) {
    console.log('Info modal button clicked:', event.action);
    this.closeInfoModal();
  }

  onDeleteConfirmationModalButtonClick(event: { action: string; button: any }) {
    console.log('Delete confirmation modal button clicked:', event.action);
    this.closeDeleteConfirmationModal();
  }

  // Delete Confirmation Modal Methods
  showDeleteConfirmationModal() {
    this.isDeleteConfirmationModalOpen.set(true);
  }

  closeDeleteConfirmationModal() {
    this.isDeleteConfirmationModalOpen.set(false);
  }

  // Success Confirmation Modal Methods
  showSuccessConfirmationModal() {
    this.isSuccessConfirmationModalOpen.set(true);
  }

  closeSuccessConfirmationModal() {
    this.isSuccessConfirmationModalOpen.set(false);
  }

  onSuccessConfirmationModalButtonClick(event: { action: string; button: any }) {
    console.log('Success confirmation modal button clicked:', event.action);
    this.closeSuccessConfirmationModal();
  }

  // Custom Examples
  showLargeSuccessModal() {
    this.successModalTitle.set('Large Success Modal');
    this.successModalMessage.set('This is a large success modal (lg size) that can accommodate more content. It\'s useful for detailed success messages or complex information.');
    this.showSuccessModal();
  }

  showCustomErrorModal() {
    this.errorModalTitle.set('Custom Error Modal');
    this.errorModalMessage.set('This is a custom error modal with specific styling and behavior. You can customize the title, message, and size as needed.');
    this.showErrorModal();
  }

  onInputTextAreaChanged(event: any) {
    console.log('Text area changed:', event);
  }

  onInputAmountInWordValueChange(event: any) {
    console.log('Amount to word input value changed:', event);
  }

  // Data Selection Modal Methods
  showCustomerSelectionModal() {
    this.dataSelectionConfig.set({
      title: 'Select Customer',
      service: this.mockCustomerService,
      serviceMethod: 'getCustomers',
      columns: [
        { field: 'name', header: 'Name', width: '200px', sortable: true, filterable: true },
        { field: 'email', header: 'Email', width: '250px', sortable: true, filterable: true },
        { field: 'phone', header: 'Phone', width: '150px', sortable: true, filterable: true },
        { field: 'status', header: 'Status', width: '100px', sortable: true, filterable: true }
      ],
      pageSize: 5,
      enablePagination: true,
      enableSorting: true,
      enableFiltering: true,
      enableSelection: true,
      enableSearch: true,
      searchPlaceholder: 'Search customers...',
      showInsertButton: true,
      insertButtonText: 'Select Customer',
      showCloseButton: true,
      closeButtonText: 'Cancel'
    });
    this.isDataSelectionModalOpen.set(true);
  }

  showAccountSelectionModal() {
    this.dataSelectionConfig.set({
      title: 'Select Account',
      service: this.mockAccountService,
      serviceMethod: 'getAccounts',
      columns: [
        { field: 'accountNumber', header: 'Account Number', width: '150px', sortable: true, filterable: true },
        { field: 'accountName', header: 'Account Name', width: '200px', sortable: true, filterable: true },
        { field: 'balance', header: 'Balance', width: '150px', sortable: true, filterable: true, type: 'currency' },
        { field: 'type', header: 'Type', width: '120px', sortable: true, filterable: true }
      ],
      pageSize: 10,
      enablePagination: true,
      enableSorting: true,
      enableFiltering: true,
      enableSelection: true,
      enableSearch: true,
      searchPlaceholder: 'Search accounts...',
      showInsertButton: true,
      insertButtonText: 'Select Account',
      showCloseButton: true,
      closeButtonText: 'Cancel'
    });
    this.isDataSelectionModalOpen.set(true);
  }

  showProductSelectionModal() {
    this.dataSelectionConfig.set({
      title: 'Select Product',
      service: this.mockProductService,
      serviceMethod: 'getProducts',
      columns: [
        { field: 'productCode', header: 'Product Code', width: '120px', sortable: true, filterable: true },
        { field: 'productName', header: 'Product Name', width: '200px', sortable: true, filterable: true },
        { field: 'price', header: 'Price', width: '120px', sortable: true, filterable: true, type: 'currency' },
        { field: 'category', header: 'Category', width: '120px', sortable: true, filterable: true },
        { field: 'stock', header: 'Stock', width: '100px', sortable: true, filterable: true, type: 'number' }
      ],
      pageSize: 10,
      enablePagination: true,
      enableSorting: true,
      enableFiltering: true,
      enableSelection: false,
      enableSearch: true,
      searchPlaceholder: 'Search products...',
      showInsertButton: true,
      insertButtonText: 'Select Product',
      showCloseButton: true,
      closeButtonText: 'Cancel'
    });
    this.isDataSelectionModalOpen.set(true);
  }

  closeDataSelectionModal() {
    this.isDataSelectionModalOpen.set(false);
  }

  onDataSelectionResult(result: DataSelectionResult) {
    console.log('Data selection result:', result);

    if (result.action === 'select' && result.selectedItem) {
      this.selectedData.set(result.selectedItem);
      this.selectionTimestamp.set(new Date());
      console.log('Selected item:', this.selectedData());

      // Update form with selected data
      if (this.selectedData()) {
        // Example: Update form fields based on selected data
        if (this.selectedData()?.['name']) {
          // Update customer-related fields
          this.frmGroup.patchValue({
            description: `Selected: ${this.selectedData()!['name']}`
          });
        } else if (this.selectedData()?.['accountName']) {
          // Update account-related fields
          this.frmGroup.patchValue({
            description: `Account: ${this.selectedData()!['accountName']}`
          });
        } else if (this.selectedData()?.['productName']) {
          // Update product-related fields
          this.frmGroup.patchValue({
            description: `Product: ${this.selectedData()!['productName']}`
          });
        }
      }
    } else if (result.action === 'insert' && result.selectedItems) {
      this.selectedItems.set(result.selectedItems);
      this.selectedData.set(result.selectedItems[0]); // Keep for backward compatibility
      this.selectionTimestamp.set(new Date());
      console.log('Inserted items:', result.selectedItems);

      // Handle multiple selected items
      if (result.selectedItems.length > 0) {
        const selectedNames = result.selectedItems.map(item =>
          item['name'] || item['accountName'] || item['productName']
        ).join(', ');

        this.frmGroup.patchValue({
          description: `Selected: ${selectedNames}`
        });
      }
    }

    this.closeDataSelectionModal();
  }

  // Helper methods for data display
  getSelectedDataDisplay(): string {
    const items = this.selectedItems();
    const data = this.selectedData();

    if (items.length > 0) {
      // Multiple items selected
      const displayData = {
        type: 'Multiple Selection',
        count: items.length,
        items: items,
        timestamp: this.selectionTimestamp()?.toISOString()
      };
      return JSON.stringify(displayData, null, 2);
    } else if (data) {
      // Single item selected
      const displayData = {
        type: this.getDataType(data),
        data: data,
        timestamp: this.selectionTimestamp()?.toISOString()
      };
      return JSON.stringify(displayData, null, 2);
    }

    return '';
  }

  getDataType(data: DataSelectionItem): string {
    if (data['name']) return 'Customer';
    if (data['accountName']) return 'Account';
    if (data['productName']) return 'Product';
    return 'Unknown';
  }

  clearSelectedData(): void {
    this.selectedData.set(null);
    this.selectedItems.set([]);
    this.selectionTimestamp.set(null);
    this.frmGroup.patchValue({ description: '' });
  }

  getSelectionTimestamp(): string {
    const timestamp = this.selectionTimestamp();
    if (!timestamp) return '';

    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
