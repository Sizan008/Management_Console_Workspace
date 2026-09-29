import {Component, OnInit, signal, WritableSignal, inject, Type} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import {ViewApprovalActivitiesComponent} from '../view-approval-activities/view-approval-activities.component';
import { ApprovalService } from '../../../services/approval-service';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../common-components/generic-component-type/generic-data-grid';
import { GenericModal } from '../../../common-components/generic-component-type/generic-modal/generic-modal';
import { InputSelectOptionField } from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { UserService } from '../../../../core/user/user.service';
import { User } from '../../../../core/user/user.types';



@Component({
  selector: 'app-checker-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericDataGrid,
    ExpansionPanelHeader,
    GenericButton,
    GenericModal,
    InputSelectOptionField
  ],
  templateUrl: './checker-list.html',
  styleUrl: './checker-list.scss'
})
export class CheckerList implements OnInit {
  router = inject(Router);
  dialog = inject(MatDialog);
  approvalService = inject(ApprovalService);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  userId : string;
  // Modal controls
  isModalVisible: boolean = false;
  modalTitle: string = '';
  modalComponent: any = null;
  modalComponentData: any = null;

  businessHeaderPanel: WritableSignal<boolean> = signal(true);

  selectedColumns = ['setId', 'functionName', 'actionType', 'remarks', 'recordUserId', 'currentUxContent'];
  dataSource: any[] = [];

  filterForm!: FormGroup;
  functionOptions: { key: any; value: string }[] = [];
  actionOptions: { key: any; value: string }[] = [];
  requestedUserOptions: { key: any; value: string }[] = [];

  /**
   * Untouched API result. The grid is fed a filtered view of this, so Clear can
   * restore the full list without going back to the server.
   */
  private allPending: any[] = [];


  ngOnInit(): void {
    this.buildFilterForm();
    this.userService.user$.subscribe((user: User) => {
      this.userId = user?.username;
      if (this.userId) {
        this.loadPending();
      }
    });
  }

   loadPending(): void {
    if (!this.userId) {
      return;
    }
    this.approvalService.getUnApprovedList(this.userId).subscribe({
      next: (response: any) => {

        this.allPending = response
          .sort((a: any, b: any) => b.setId - a.setId)   // sort by setId DESC
          .map((item: any) => ({
            ...item,
            currentContext: this.parseJson(item.currentUxContent),
            previousContext: this.parseJson(item.previousUxContent),
          }));

        this.buildFilterOptions();
        this.applyFilters();
      }
    });
  }

  private buildFilterForm(): void {
    this.filterForm = this.fb.group({
      functionName: [''],
      actionType: [''],
      recordUserId: [''],
    });

    // The whole list is already in memory, so filtering is live — no Search button.
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  /**
   * Options come from the rows actually loaded, so a filter can never offer a
   * value that matches nothing.
   */
  private buildFilterOptions(): void {
    this.functionOptions = this.distinctOptions('functionName');
    this.actionOptions = this.distinctOptions('actionType');
    this.requestedUserOptions = this.distinctOptions('recordUserId');
  }

  private distinctOptions(property: string): { key: any; value: string }[] {
    const values = this.allPending
      .map(row => row?.[property])
      .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
      .map(value => String(value));

    return Array.from(new Set(values))
      .sort((a, b) => a.localeCompare(b))
      .map(value => ({ key: value, value }));
  }

  private applyFilters(): void {
    const { functionName, actionType, recordUserId } = this.filterForm.value || {};

    this.dataSource = this.allPending.filter(row =>
      this.matches(row?.functionName, functionName) &&
      this.matches(row?.actionType, actionType) &&
      this.matches(row?.recordUserId, recordUserId)
    );
  }

  /** An unset filter matches every row; values are compared as strings. */
  private matches(rowValue: any, filterValue: any): boolean {
    if (filterValue === null || filterValue === undefined || String(filterValue) === '') {
      return true;
    }
    return String(rowValue ?? '') === String(filterValue);
  }

  clearFilters(): void {
    this.filterForm.reset({ functionName: '', actionType: '', recordUserId: '' });
  }

  view(row: any): void {
    const parsedRow = typeof row === 'string' ? this.parseJson(row) : row;
    if (!parsedRow || typeof parsedRow !== 'object') {
      console.error('Invalid row data for approval movement', row);
      return;
    }
    console.log(' parsed row ', parsedRow);
    this.router.navigateByUrl('poc/approval-movement', {state: {data: parsedRow}});
  }
  // showApprovalSteps(row: any): void {
  //   this.modalTitle = 'Approval Activities';
  //   this.modalComponent = ViewApprovalActivitiesComponent;
  //   this.modalComponentData = row;
  //   this.modalSize = 'lg';
  //   this.modalMaxHeight = '85%';
  //   this.modalMaxWidth = '85%';
  //   this.isModalVisible = true;
  // }

  handleProgressClick(rowDataString: string): void {
    try {

      const rowData = JSON.parse(rowDataString);
      console.log("RAWDATA", rowData);
      // Pass the component and data to openModal
      this.openModal(
        ViewApprovalActivitiesComponent,
        rowData,
        'Approval Activities'
      );
    } catch (e) {
      console.error('Failed to parse row data for modal:', e);
    }
  }

  openModal(componentToLoad: Type<any>, data: any, title: string = 'Modal') {
    this.isModalVisible = false;
    this.modalComponent = undefined;

    setTimeout(() => {
      this.modalTitle = title;
      this.modalComponent = componentToLoad;
      this.modalComponentData = data;
      this.isModalVisible = true;
    }, 50);
  }

  onModalVisibilityChange(visible: boolean): void {
    this.isModalVisible = visible;
  }

  onModalResult(result: any): void {
    //console.log('Modal Result:', result);
  }


  private parseJson(jsonStr: string): any {
    try {
      return JSON.parse(jsonStr || '{}');
    } catch {
      return {};
    }
  }

}
