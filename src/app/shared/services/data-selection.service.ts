import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { DataSelectionItem } from '../models/data-selection.interface';

export interface ApiResponse<T> {
  data: T[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: number;
  accountNumber: string;
  accountName: string;
  balance: number;
  type: string;
  status: string;
  createdAt: string;
}

export interface Product {
  id: number;
  productCode: string;
  productName: string;
  price: number;
  category: string;
  stock: number;
  description: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataSelectionService {
  private baseUrl = '/api'; // Replace with your actual API base URL

  constructor(private http: HttpClient) {}

  // Customer methods
  getCustomers(params: any): Observable<ApiResponse<Customer>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<ApiResponse<Customer>>(`${this.baseUrl}/customers`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/customers/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Account methods
  getAccounts(params: any): Observable<ApiResponse<Account>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<ApiResponse<Account>>(`${this.baseUrl}/accounts`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  getAccountById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/accounts/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Product methods
  getProducts(params: any): Observable<ApiResponse<Product>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/products`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Generic method for any entity
  getData<T>(endpoint: string, params: any): Observable<ApiResponse<T>> {
    const httpParams = this.buildHttpParams(params);
    
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${endpoint}`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Mock methods for development/testing
  getMockCustomers(params: any): Observable<ApiResponse<Customer>> {
    const customers: Customer[] = [
      { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890', status: 'Active', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', status: 'Active', createdAt: '2024-01-02', updatedAt: '2024-01-02' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', status: 'Inactive', createdAt: '2024-01-03', updatedAt: '2024-01-03' },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', phone: '+1234567893', status: 'Active', createdAt: '2024-01-04', updatedAt: '2024-01-04' },
      { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', phone: '+1234567894', status: 'Active', createdAt: '2024-01-05', updatedAt: '2024-01-05' }
    ];

    return of({
      data: customers,
      totalRecords: customers.length,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalPages: Math.ceil(customers.length / (params.pageSize || 10))
    }).pipe(delay(1000)); // Simulate network delay
  }

  getMockAccounts(params: any): Observable<ApiResponse<Account>> {
    const accounts: Account[] = [
      { id: 1, accountNumber: 'ACC001', accountName: 'Savings Account', balance: 5000.00, type: 'Savings', status: 'Active', createdAt: '2024-01-01' },
      { id: 2, accountNumber: 'ACC002', accountName: 'Checking Account', balance: 2500.00, type: 'Checking', status: 'Active', createdAt: '2024-01-02' },
      { id: 3, accountNumber: 'ACC003', accountName: 'Investment Account', balance: 15000.00, type: 'Investment', status: 'Active', createdAt: '2024-01-03' },
      { id: 4, accountNumber: 'ACC004', accountName: 'Business Account', balance: 7500.00, type: 'Business', status: 'Active', createdAt: '2024-01-04' },
      { id: 5, accountNumber: 'ACC005', accountName: 'Student Account', balance: 500.00, type: 'Student', status: 'Active', createdAt: '2024-01-05' }
    ];

    return of({
      data: accounts,
      totalRecords: accounts.length,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalPages: Math.ceil(accounts.length / (params.pageSize || 10))
    }).pipe(delay(1000));
  }

  getMockProducts(params: any): Observable<ApiResponse<Product>> {
    const products: Product[] = [
      { id: 1, productCode: 'PROD001', productName: 'Laptop', price: 999.99, category: 'Electronics', stock: 50, description: 'High-performance laptop', createdAt: '2024-01-01' },
      { id: 2, productCode: 'PROD002', productName: 'Smartphone', price: 699.99, category: 'Electronics', stock: 100, description: 'Latest smartphone model', createdAt: '2024-01-02' },
      { id: 3, productCode: 'PROD003', productName: 'Tablet', price: 399.99, category: 'Electronics', stock: 25, description: 'Portable tablet device', createdAt: '2024-01-03' },
      { id: 4, productCode: 'PROD004', productName: 'Headphones', price: 199.99, category: 'Accessories', stock: 75, description: 'Wireless headphones', createdAt: '2024-01-04' },
      { id: 5, productCode: 'PROD005', productName: 'Mouse', price: 29.99, category: 'Accessories', stock: 200, description: 'Wireless mouse', createdAt: '2024-01-05' }
    ];

    return of({
      data: products,
      totalRecords: products.length,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalPages: Math.ceil(products.length / (params.pageSize || 10))
    }).pipe(delay(1000));
  }

  // Helper methods
  private buildHttpParams(params: any): HttpParams {
    let httpParams = new HttpParams();

    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize.toString());
    }

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.sort) {
      httpParams = httpParams.set('sortBy', params.sort.field);
      httpParams = httpParams.set('sortOrder', params.sort.direction);
    }

    if (params.filters && params.filters.length > 0) {
      params.filters.forEach((filter: any, index: number) => {
        httpParams = httpParams.set(`filters[${index}][field]`, filter.field);
        httpParams = httpParams.set(`filters[${index}][operator]`, filter.operator);
        httpParams = httpParams.set(`filters[${index}][value]`, filter.value);
      });
    }

    return httpParams;
  }

  private handleError(error: any) {
    console.error('DataSelectionService error:', error);
    
    let errorMessage = 'An error occurred while fetching data';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  // Utility methods for data transformation
  transformToDataSelectionItems<T>(data: T[]): DataSelectionItem[] {
    return data.map((item: any) => ({
      ...item,
      id: item.id || item.Id || item.ID,
      selected: false
    }));
  }

  // Method to get column configuration for different entities
  getCustomerColumns() {
    return [
      { field: 'name', header: 'Name', width: '200px', sortable: true, filterable: true },
      { field: 'email', header: 'Email', width: '250px', sortable: true, filterable: true },
      { field: 'phone', header: 'Phone', width: '150px', sortable: true, filterable: true },
      { field: 'status', header: 'Status', width: '100px', sortable: true, filterable: true },
      { field: 'createdAt', header: 'Created Date', width: '150px', sortable: true, filterable: true, type: 'date' }
    ];
  }

  getAccountColumns() {
    return [
      { field: 'accountNumber', header: 'Account Number', width: '150px', sortable: true, filterable: true },
      { field: 'accountName', header: 'Account Name', width: '200px', sortable: true, filterable: true },
      { field: 'balance', header: 'Balance', width: '150px', sortable: true, filterable: true, type: 'currency' },
      { field: 'type', header: 'Type', width: '120px', sortable: true, filterable: true },
      { field: 'status', header: 'Status', width: '100px', sortable: true, filterable: true }
    ];
  }

  getProductColumns() {
    return [
      { field: 'productCode', header: 'Product Code', width: '120px', sortable: true, filterable: true },
      { field: 'productName', header: 'Product Name', width: '200px', sortable: true, filterable: true },
      { field: 'price', header: 'Price', width: '120px', sortable: true, filterable: true, type: 'currency' },
      { field: 'category', header: 'Category', width: '120px', sortable: true, filterable: true },
      { field: 'stock', header: 'Stock', width: '100px', sortable: true, filterable: true, type: 'number' },
      { field: 'description', header: 'Description', width: '200px', sortable: true, filterable: true }
    ];
  }
} 