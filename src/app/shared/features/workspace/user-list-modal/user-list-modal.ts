import {Component, effect, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';

import {CommonModule} from '@angular/common';
import {MatMenuModule} from '@angular/material/menu';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {WorkspaceService} from '../workspace-service';
import {GenericDataGrid} from '../../../common-components/generic-component-type/generic-data-grid/generic-data-grid';
import {GenericButton} from '../../../common-components/generic-component-type/generic-button/generic-button';
import {InputSelectOptionField} from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import {UserProfileModel} from '../../../../core/auth/login/login';

@Component({
  selector: 'app-user-list-modal',
  imports: [CommonModule,  InputSelectOptionField, GenericButton,
    GenericDataGrid, MatMenuModule, MatIconModule, ReactiveFormsModule, MatButtonModule],
  templateUrl: './user-list-modal.html',
  styleUrl: './user-list-modal.scss'
})
export class UserListModal implements OnInit {
  @Input() modalComponentData: any;
  @Output() modalResult = new EventEmitter<any>();

  userId: any = null;
  modalForm!: FormGroup;
  userList: UserProfileModel[] = [];
  officeOptions: { key: string; value: string }[] = [];
  showUserModalGrid = false;

  constructor(
    private formBuilder: FormBuilder,
    private workspaceService: WorkspaceService
  ) {}

  ngOnInit(): void {
    this.modalForm = this.formBuilder.group({
      officeId: [''],
    });

    // Take incoming userId
    if (this.modalComponentData) {
      this.userId = this.modalComponentData.userNm ?? this.modalComponentData.userId ?? null;
    }

    this.loadDataForOffice();
  }

  loadDataForOffice() {
    this.workspaceService.getAllOffice().subscribe({
      next: (res: any) => {
        const offices = res?.data ?? res; // supports both formats
        this.officeOptions = offices.map((item: any) => ({
          key: item.OFFICE_ID,
          value: item.OFFICE_NAME
        }));
      },
      error: (err) => {
        console.error(err);
        alert('Error Fetching Office Data');
      }
    });
  }

  getUserList(): void {
    const officeId = this.modalForm.value.officeId;
    console.log("OfficeId: ", officeId );
    this.workspaceService.getAllUser(officeId ?? 0).subscribe({
      next: (res: any) => {
        this.userList = (res || []).map((item: any) => ({
          ...item,
          userId: item?.userId ?? item?.userNm ?? '',
          userFullName:
            item?.userFullName ??
            item?.fullName ??
            [item?.firstName, item?.lastName].filter(Boolean).join(' ').trim()
        }));
        this.showUserModalGrid = this.userList.length > 0;
      },
      error: (err) => {
        console.error(err);
        alert('Error Fetching Users');
      }
    });
    console.log("userList....  ", this.userList )
  }

  loadUser(serializedData: string): void {
    const selectedUser = JSON.parse(serializedData);
    console.log("selectedUser::::",selectedUser);
    this.modalResult.emit(selectedUser);
  }
}

