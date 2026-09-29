import { Component, EventEmitter, Input, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ExpansionPanelHeader } from '../../expansion-panel-header/expansion-panel-header';
import { GenericDataGrid } from '../../generic-component-type/generic-data-grid';
import { InputAmountInWord } from '../../input-types/input-amount-in-word/input-amount-in-word';
import { InputIdBox } from '../../input-types/input-id-box/input-id-box';
import { InputTextBox } from '../../input-types/input-text-box/input-text-box';

@Component({
  selector: 'app-other-components-page',
  standalone: true,
  imports: [
    CommonModule,
    InputTextBox,
        InputIdBox,
        ReactiveFormsModule,
        InputAmountInWord,
        ExpansionPanelHeader,
        GenericDataGrid

  ],
  templateUrl: './other-components-page.html',
  styleUrls: ['./other-components-page.scss']
})
export class OtherComponentsPage implements OnInit {
  frmGroup: FormGroup;
  public title = 'Other Components Page (Modal)';
   businessHeaderPanel: WritableSignal<boolean> = signal(true);

   @Output() modalResult = new EventEmitter<any>();
   @Output() multiSelectResult = new EventEmitter<any[]>();
   @Input() modalParent?: { close(result?: any): void; closeModal(): void };

   @Input() initialData?: any;

   selectedRows = signal<any[]>([]);
  // Add t constructor for debugging
  constructor( private formBuilder: FormBuilder) {
    console.log('OtherComponentsPage constructor called');
    console.log('Title:', this.title);
  }

  // Add ngOnInit for debugging
  ngOnInit() {
      this.frmGroup = this.formBuilder.group({
      textBox: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      id: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      textArea: ['', [Validators.required, Validators.maxLength(500)]],
      switch: [true],
      amount: ['', [Validators.required, Validators.max(1000000), Validators.min(1)]],
      amountToWord: ['', [Validators.required, Validators.max(1000000), Validators.min(1)]],
    });

      if (this.initialData) {
        console.log('Modal received initialData:', this.initialData);
        try {
          const patch: any = {};
          Object.keys(this.frmGroup.controls).forEach(key => {
            if (this.initialData[key] !== undefined) {
              patch[key] = this.initialData[key];
            }
          });
          if (Object.keys(patch).length) {
            this.frmGroup.patchValue(patch);
          }
        } catch (e) {
          console.warn('Failed to apply initialData to modal form', e);
        }
      }

  }

      sampleTransactions = signal([
    {
      id: 'TXN001',
      transactionType: 'PACS.008',
      amount: 50000.00,
      currency: 'USD',
      country: 'US',
      productCategory: 'financial',
      subCategory: 'banking',
      status: 'pending',
      fromAccount: '1234567890',
      toAccount: '0987654321',
      date: '2024-01-15',
      priority: 'high',
      department: 'sales',
      category: 'international',
      taxRate: 0.10,
      calculatedTax: 5000.00,
      totalAmount: 55000.00,
      riskLevel: 'medium',
      requiresApproval: true,
      availableRoles: [
        { value: 'admin', label: 'Administrator' },
        { value: 'approver', label: 'Transaction Approver' },
        { value: 'viewer', label: 'View Only' }
      ],
      assignedRole: 'approver'
    },
    {
      id: 'TXN002',
      transactionType: 'PACS.008',
      amount: 25000.00,
      currency: 'EUR',
      country: 'EU',
      productCategory: 'electronics',
      subCategory: 'computers',
      status: 'completed',
      fromAccount: '1111111111',
      toAccount: '2222222222',
      date: '2024-01-14',
      priority: 'normal',
      department: 'finance',
      category: 'domestic',
      taxRate: 0.096,
      calculatedTax: 2400.00,
      totalAmount: 27400.00,
      riskLevel: 'low',
      requiresApproval: false,
      availableRoles: [
        { value: 'admin', label: 'Administrator' },
        { value: 'viewer', label: 'View Only' }
      ],
      assignedRole: 'viewer'
    },
    {
      id: 'TXN003',
      transactionType: 'PACS.008',
      amount: 100000.00,
      currency: 'GBP',
      country: 'UK',
      productCategory: 'automotive',
      subCategory: 'vehicles',
      status: 'failed',
      fromAccount: '3333333333',
      toAccount: '4444444444',
      date: '2024-01-13',
      priority: 'high',
      department: 'operations',
      category: 'urgent',
      taxRate: 0.105,
      calculatedTax: 10500.00,
      totalAmount: 110500.00,
      riskLevel: 'low',
      requiresApproval: true,
      availableRoles: [
        { value: 'admin', label: 'Administrator' },
        { value: 'approver', label: 'Transaction Approver' },
        { value: 'specialist', label: 'Operations Specialist' }
      ],
      assignedRole: 'specialist'
    },
    {
      id: 'TXN004',
      transactionType: 'PACS.008',
      amount: 100000.00,
      currency: 'GBP',
      country: 'UK',
      productCategory: 'automotive',
      subCategory: 'vehicles',
      status: 'failed',
      fromAccount: '3333333333',
      toAccount: '4444444444',
      date: '2024-01-13',
      priority: 'high',
      department: 'operations',
      category: 'urgent',
      taxRate: 0.105,
      calculatedTax: 10500.00,
      totalAmount: 110500.00,
      riskLevel: 'low',
      requiresApproval: true,
      availableRoles: [
        { value: 'admin', label: 'Administrator' },
        { value: 'approver', label: 'Transaction Approver' },
        { value: 'specialist', label: 'Operations Specialist' }
      ],
      assignedRole: 'specialist'
    },
    {
      id: 'TXN004',
      transactionType: 'PACS.008',
      amount: 100000.00,
      currency: 'GBP',
      country: 'UK',
      productCategory: 'automotive',
      subCategory: 'vehicles',
      status: 'failed',
      fromAccount: '3333333333',
      toAccount: '4444444444',
      date: '2024-01-13',
      priority: 'high',
      department: 'operations',
      category: 'urgent',
      taxRate: 0.105,
      calculatedTax: 10500.00,
      totalAmount: 110500.00,
      riskLevel: 'low',
      requiresApproval: true,
      availableRoles: [
        { value: 'admin', label: 'Administrator' },
        { value: 'approver', label: 'Transaction Approver' },
        { value: 'specialist', label: 'Operations Specialist' }
      ],
      assignedRole: 'specialist'
    },
    {
      id: 'TXN004',
      transactionType: 'PACS.008',
      amount: 100000.00,
      currency: 'GBP',
      country: 'UK',
      productCategory: 'automotive',
      subCategory: 'vehicles',
      status: 'failed',
      fromAccount: '3333333333',
      toAccount: '4444444444',
      date: '2024-01-13',
      priority: 'high',
      department: 'operations',
      category: 'urgent',
      taxRate: 0.105,
      calculatedTax: 10500.00,
      totalAmount: 110500.00,
      riskLevel: 'low',
      requiresApproval: true,
      availableRoles: [
        { value: 'admin', label: 'Administrator' },
        { value: 'approver', label: 'Transaction Approver' },
        { value: 'specialist', label: 'Operations Specialist' }
      ],
      assignedRole: 'specialist'
    }
    ]);




onTransactionRowSelect(event: { data: string, checked: boolean }): void {
  try {
    const row: any = JSON.parse(event.data);
    console.log('Row selected:', row, 'Checked:', event.checked);

    if (event.checked) {
      // Add to selected rows
      this.selectedRows.update(rows => {
        if (!rows.some(r => r.id === row.id)) {
          return [...rows, row];
        }
        return rows;
      });
      console.log('Added to selection:', row.id);
    } else {
      // Remove from selected rows
      this.selectedRows.update(rows => rows.filter(r => r.id !== row.id));
      console.log('Removed from selection:', row.id);
    }

    // Log current selection
    console.log('Current selected rows:', this.selectedRows());
  } catch (error) {
    console.error('Error parsing selected row:', error);
  }
}

// Send selected rows to parent
sendSelectedRows(): void {
  const selected = this.selectedRows();
  console.log('Sending selected rows to parent:', selected);
  this.modalResult.emit(selected);
}


  onRowDblClick(serialized: string): void {
    try {
      const row: any = JSON.parse(serialized);
      console.log('row',row);

      const pickedId = row?.id ;
      if (pickedId) {
        this.modalResult.emit({ field: 'id', value: pickedId });
      } else {
        this.modalResult.emit(null);
      }
    } catch {
      this.modalResult.emit(null);
    }
  }
}
