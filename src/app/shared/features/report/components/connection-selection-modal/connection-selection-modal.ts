import { Component, OnInit, Input, Output, EventEmitter, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { DatabaseConnectionService } from '../../services/database-connection.service';
import { ToastrService } from 'ngx-toastr';
import { ExpansionPanelHeader } from '../../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../../common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../../common-components/generic-component-type/generic-data-grid';

// Data interfaces matching the grid format
export interface ConnectionItem {
  id: number;
  connectionName: string;
  dbType: string;
  host?: string;
  port?: string;
  service?: string;
  username?: string;
  vAppName?: string;
  isDefaultConnection?: boolean;
  // Legacy fields for backward compatibility
  databaseType?: string;
  dbServerAddress?: string;
  databaseName?: string;
}

export interface ConnectionSelectionConfig {
  title?: string;
  searchPlaceholder?: string;
  findButtonText?: string;
  loadingText?: string;
  noDataMessage?: string;
  allowMultiSelect?: boolean;
  showCreateNew?: boolean;
}

@Component({
  selector: 'app-connection-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GenericDataGrid,
    GenericButton,
    ExpansionPanelHeader
],
  templateUrl: './connection-selection-modal.html',
  styleUrls: ['./connection-selection-modal.scss']
})
export class ConnectionSelectionModalComponent implements OnInit {
  private toastr = inject(ToastrService);
  private formBuilder = inject(FormBuilder);
  private connectionService = inject(DatabaseConnectionService);

  // Inputs
  @Input() initialData?: any;
  @Input() config: ConnectionSelectionConfig = {};
  @Input() dataSource: ConnectionItem[] = [];

  // Outputs
  @Output() result = new EventEmitter<any>();
  @Output() onFind = new EventEmitter<string>();
  @Output() onCreateNewEvent = new EventEmitter<void>();
  @Output() onPreview = new EventEmitter<ConnectionItem>();

  // Component state
  searchForm: FormGroup;
  filteredConnections = signal<ConnectionItem[]>([]);
  selectedConnections = signal<ConnectionItem[]>([]);
  isLoading = signal<boolean>(false);
  availableConnectionsPanel: WritableSignal<boolean> = signal(true);
  // Grid configuration - using connection-specific columns
  gridColumns = [
    'id',
    'connectionName',
    'dbType',
    'host'
  ];

  constructor() {
    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });
  }

  ngOnInit() {
    console.log("Connection modal initialized");
    
    // Load connections from API when component initializes
    this.loadConnections();
    
    // Process initial data if provided
    if (this.initialData?.searchTerm) {
      this.searchForm.patchValue({ searchTerm: this.initialData.searchTerm });
    }

    // Setup search form subscription
    this.searchForm.get('searchTerm')?.valueChanges.subscribe(() => {
      this.performSearch();
    });
  }

  /**
   * Load connections from the API
   */
  loadConnections() {
    this.isLoading.set(true);
    
    this.connectionService.getAll().subscribe({
      next: (connections: any[]) => {
        console.log('Loaded connections from API:', connections);
        // Transform the data to match the grid format
        const transformedConnections = connections.map((conn: any) => ({
          id: conn.id,
          connectionName: conn.connectionName,
          dbType: conn.dbType || conn.databaseType,
          host: conn.host || this.extractHostFromAddress(conn.dbServerAddress),
          port: conn.port || this.extractPortFromAddress(conn.dbServerAddress),
          service: conn.service || conn.databaseName,
          username: conn.username,
          vAppName: conn.vAppName || conn.v_app_name || 'ultimus',
          isDefaultConnection: conn.isDefaultConnection,
          // Keep legacy fields for compatibility
          databaseType: conn.databaseType,
          dbServerAddress: conn.dbServerAddress,
          databaseName: conn.databaseName
        }));
        this.dataSource = transformedConnections;
        this.filteredConnections.set(transformedConnections);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading connections:', error);
        this.toastr.error('Failed to load connections', 'Error');
        this.isLoading.set(false);
      }
    });
  }

  onSearchTermChanged(value: string) {
    this.searchForm.patchValue({ searchTerm: value });
  }

  onFindClick(event: MouseEvent) {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.trim();
    if (searchTerm) {
      this.performApiSearch(searchTerm);
    } else {
      this.toastr.warning('Please enter a search term', 'Search Required');
    }
  }

  /**
   * Perform API search for connections
   */
  performApiSearch(searchTerm: string) {
    this.isLoading.set(true);
    
    // Emit search term and perform local search for now
    this.onFind.emit(searchTerm);
    this.performSearch();
    
    setTimeout(() => {
      this.isLoading.set(false);
    }, 500);
  }

  performSearch() {
    const searchTerm = this.searchForm.get('searchTerm')?.value?.toLowerCase() || '';
    
    if (!searchTerm.trim()) {
      this.filteredConnections.set(this.dataSource || []);
      return;
    }

    const filtered = (this.dataSource || []).filter((conn: any) =>
      conn.connectionName.toLowerCase().includes(searchTerm) ||
      conn.dbType.toLowerCase().includes(searchTerm) ||
      (conn.host && conn.host.toLowerCase().includes(searchTerm)) ||
      (conn.username && conn.username.toLowerCase().includes(searchTerm))
    );
    
    this.filteredConnections.set(filtered);
  }

  // Grid event handlers
  onConnectionRowSelect(eventData: any) {
    console.log('Grid selection event:', eventData);
    
    // Handle the grid selection event properly
    if (eventData && typeof eventData === 'object') {
      if (eventData.data && typeof eventData.data === 'string') {
        try {
          // Parse the JSON string
          const connectionData = JSON.parse(eventData.data);
          if (eventData.checked) {
            // Add to selection
            const current = this.selectedConnections();
            if (!current.find(c => c.id === connectionData.id)) {
              this.selectedConnections.set([...current, connectionData]);
            }
          } else {
            // Remove from selection
            const current = this.selectedConnections();
            this.selectedConnections.set(current.filter(c => c.id !== connectionData.id));
          }
        } catch (e) {
          console.error('Failed to parse connection data:', e);
        }
      } else if (Array.isArray(eventData)) {
        // Direct array of connections
        this.selectedConnections.set(eventData);
      }
    }
    
    console.log('Updated selection:', this.selectedConnections());
  }

  onConnectionEdit(eventData: any) {
    console.log('Connection edit clicked:', eventData);
    // Parse the event data like in parameter-list-ui
    let connection = eventData;
    if (typeof eventData === 'string') {
      try {
        connection = JSON.parse(eventData);
      } catch (e) {
        console.error('Failed to parse event data:', e);
        return;
      }
    } else if (eventData?.data) {
      connection = eventData.data;
    } else if (eventData?.rowData) {
      connection = eventData.rowData;
    }

    console.log('Final connection object for selection:', connection);
    if (connection) {
      this.result.emit(connection);
    }
  }

  onConnectionDataChanged(data: ConnectionItem[]) {
    console.log('Grid data changed:', data);
    // Handle any data grid changes if needed
  }

  // Action button handlers
  onSelectConfirm(event: MouseEvent) {
    const selected = this.selectedConnections();
    if (selected.length > 0) {
      const result = this.config.allowMultiSelect ? selected : selected[0];
      this.result.emit(result);
    } else {
      this.toastr.warning('Please select at least one connection', 'Selection Required');
    }
  }

  onCancel(event: MouseEvent) {
    this.result.emit(null);
  }

  onCreateNewClick(event: MouseEvent) {
    this.onCreateNewEvent.emit();
  }

  hasSelection(): boolean {
    return this.selectedConnections().length > 0;
  }

  getSelectButtonText(): string {
    const count = this.selectedConnections().length;
    if (this.config.allowMultiSelect) {
      return count > 0 ? `Select (${count})` : 'Select';
    }
    return 'Select';
  }

  // Panel header helpers
  getPanelTitle(): string {
    return this.config.title || 'Select Database Connection';
  }

  getResultsCount(): number {
    return this.filteredConnections().length;
  }

  /**
   * Extract host from dbServerAddress (e.g., "192.168.1.100:1521" -> "192.168.1.100")
   */
  private extractHostFromAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(':');
    return parts[0] || '';
  }

  /**
   * Extract port from dbServerAddress (e.g., "192.168.1.100:1521" -> "1521")
   */
  private extractPortFromAddress(address: string): string {
    if (!address) return '1521';
    const parts = address.split(':');
    return parts[1] || '1521';
  }
}