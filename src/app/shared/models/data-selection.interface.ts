export interface DataSelectionColumn {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency';
  format?: string;
  align?: 'left' | 'center' | 'right';
  visible?: boolean;
  order?: number;
}

export interface DataSelectionItem {
  [key: string]: any;
  id?: string | number;
  selected?: boolean;
}

export interface DataSelectionConfig {
  title: string;
  service: any;
  serviceMethod: string;
  serviceParams?: any;
  columns: DataSelectionColumn[];
  pageSize?: number;
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableSelection?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  noDataMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
  showInsertButton?: boolean;
  insertButtonText?: string;
  showCloseButton?: boolean;
  closeButtonText?: string;
  showSelectIcon?: boolean;
  selectIconText?: string;
  width?: string;
  height?: string;
  maxHeight?: string;
  fallbackData?: DataSelectionItem[];
  onError?: (error: any) => void;
  onSuccess?: (data: DataSelectionItem[]) => void;
}

export interface DataSelectionResult {
  selectedItem?: DataSelectionItem;
  selectedItems?: DataSelectionItem[];
  action: 'select' | 'insert' | 'close' | 'error';
  error?: any;
}

export interface DataSelectionFilter {
  field: string;
  value: any;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
}

export interface DataSelectionSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataSelectionPagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
} 