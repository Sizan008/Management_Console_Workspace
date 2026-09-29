import {Component, OnInit, inject, signal, WritableSignal, Type} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import {ViewApprovalActivitiesComponent} from '../view-approval-activities/view-approval-activities.component';
import { ExpansionPanelHeader } from '../../../common-components/expansion-panel-header/expansion-panel-header';
import { GenericButton } from '../../../common-components/generic-component-type/generic-button/generic-button';
import { GenericDataGrid } from '../../../common-components/generic-component-type/generic-data-grid';
import { InputDate } from '../../../common-components/input-types/input-date/input-date';
import { InputSelectOptionField } from '../../../common-components/input-types/input-select-option-field/input-select-option-field';
import { GenericModal } from '../../../common-components/generic-component-type/generic-modal/generic-modal';


@Component({
  selector: 'app-maker-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericDataGrid,
    ExpansionPanelHeader,
    GenericButton,
    InputDate,
    InputSelectOptionField,
    GenericModal
  ],
  templateUrl: './maker-list.html',
  styleUrl: './maker-list.scss'
})
export class MakerList implements OnInit {
  fb = inject(FormBuilder);
  dialog = inject(MatDialog);

  // Modal controls
  isModalVisible: boolean = false;
  modalTitle: string = '';
  modalComponent: any = null;
  modalComponentData: any = null;

  businessHeaderPanel: WritableSignal<boolean> = signal(true);

  frmGroup!: FormGroup;
  functionOptions: { key: number; value: string }[] = [];
  userAccessList: any[] = [
    { "functionId": 901001, "functionName": "Customer Management", "moduleName": "CRM", "accessLevel": "FULL", "menuOrder": 1 },
    { "functionId": 901002, "functionName": "Loan Processing",    "moduleName": "Finance", "accessLevel": "EDIT", "menuOrder": 2 },
    { "functionId": 901003, "functionName": "GL Subsidiary",       "moduleName": "Accounts","accessLevel": "VIEW", "menuOrder": 3 },
    { "functionId": 901004, "functionName": "Employee Directory",  "moduleName": "HR", "accessLevel": "VIEW", "menuOrder": 4 },
    { "functionId": 901005, "functionName": "Inventory Management","moduleName": "Logistics", "accessLevel": "FULL", "menuOrder": 5 }
  ];

  apiResponseMaker: any[] = [
    // (same 10-record array you already use)
    { "createDate":"2025-10-22T10:20:11.001","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":false,"isCreated":false,"actionType":"UPDATE","selector":"app-gl-subsidiary","remarks":"Record updated for test","approveFlag":"APPROVED","appId":901,"functionId":901003,"cloneObject":null,"setId":300,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":1,"nextApprovalLevel":2,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"anik","recordDt":"2025-10-22T10:18:55.000","previousUxContent":"{\"glAccSubNm\":\"Branch A\",\"glSubRefNo\":\"BR001\"}","currentUxContent":"{\"glAccSubNm\":\"Branch A Updated\",\"glSubRefNo\":\"BR001U\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T10:25:21.101","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":false,"isCreated":true,"actionType":"CREATE","selector":"app-gl-subsidiary","remarks":"New subsidiary added","approveFlag":"PENDING","appId":901,"functionId":901003,"cloneObject":null,"setId":301,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":0,"nextApprovalLevel":1,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"rahim","recordDt":"2025-10-22T10:24:55.000","previousUxContent":null,"currentUxContent":"{\"glAccSubNm\":\"Branch B\",\"glSubRefNo\":\"BR002\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T11:30:35.501","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":true,"isDeleted":false,"isCreated":false,"actionType":"UPDATE","selector":"app-gl-subsidiary","remarks":"Correction in name","approveFlag":"PENDING","appId":901,"functionId":901003,"cloneObject":null,"setId":302,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":0,"nextApprovalLevel":1,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"karim","recordDt":"2025-10-22T11:29:55.000","previousUxContent":"{\"glAccSubNm\":\"Branch C\"}","currentUxContent":"{\"glAccSubNm\":\"Branch C Edited\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T12:40:25.401","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":false,"isCreated":false,"actionType":"DELETE","selector":"app-gl-subsidiary","remarks":"Obsolete branch removed","approveFlag":"REJECTED","appId":901,"functionId":901003,"cloneObject":null,"setId":303,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":0,"nextApprovalLevel":0,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"sara","recordDt":"2025-10-22T12:35:00.000","previousUxContent":"{\"glAccSubNm\":\"Branch D\"}","currentUxContent":"{\"glAccSubNm\":\"Branch D\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T13:00:12.901","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":false,"isCreated":true,"actionType":"CREATE","selector":"app-gl-subsidiary","remarks":"New registration","approveFlag":"APPROVED","appId":901,"functionId":901003,"cloneObject":null,"setId":304,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":2,"nextApprovalLevel":3,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"anik","recordDt":"2025-10-22T13:00:00.000","previousUxContent":null,"currentUxContent":"{\"glAccSubNm\":\"Branch E\",\"glSubRefNo\":\"BR005\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T13:45:15.123","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":true,"isDeleted":false,"isCreated":false,"actionType":"UPDATE","selector":"app-gl-subsidiary","remarks":"Balance correction","approveFlag":"PENDING","appId":901,"functionId":901003,"cloneObject":null,"setId":305,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":0,"nextApprovalLevel":1,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"rahim","recordDt":"2025-10-22T13:43:45.000","previousUxContent":"{\"glAccSubNm\":\"Branch F\"}","currentUxContent":"{\"glAccSubNm\":\"Branch F Updated\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T14:00:00.000","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":false,"isCreated":true,"actionType":"CREATE","selector":"app-gl-subsidiary","remarks":"New office created","approveFlag":"PENDING","appId":901,"functionId":901003,"cloneObject":null,"setId":306,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":0,"nextApprovalLevel":1,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"karim","recordDt":"2025-10-22T13:59:00.000","previousUxContent":null,"currentUxContent":"{\"glAccSubNm\":\"Branch G\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T14:10:00.000","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":false,"isCreated":false,"actionType":"UPDATE","selector":"app-gl-subsidiary","remarks":"Minor text fix","approveFlag":"APPROVED","appId":901,"functionId":901003,"cloneObject":null,"setId":307,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":2,"nextApprovalLevel":3,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"anik","recordDt":"2025-10-22T14:09:00.000","previousUxContent":"{\"glAccSubNm\":\"Branch H\"}","currentUxContent":"{\"glAccSubNm\":\"Branch H Corrected\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T14:20:00.000","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":false,"isDeleted":true,"isCreated":false,"actionType":"DELETE","selector":"app-gl-subsidiary","remarks":"Closed due to merge","approveFlag":"REJECTED","appId":901,"functionId":901003,"cloneObject":null,"setId":308,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":1,"nextApprovalLevel":2,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"rahim","recordDt":"2025-10-22T14:18:00.000","previousUxContent":"{\"glAccSubNm\":\"Branch I\"}","currentUxContent":"{\"glAccSubNm\":\"Branch I (Removed)\"}","functionName":"GL Subsidiary" },
    { "createDate":"2025-10-22T14:35:00.000","updateDate":null,"createdBy":null,"updatedBy":null,"isEdited":true,"isDeleted":false,"isCreated":false,"actionType":"UPDATE","selector":"app-gl-subsidiary","remarks":"Reactivated old branch","approveFlag":"PENDING","appId":901,"functionId":901003,"cloneObject":null,"setId":309,"noOfApprovalLevel":3,"minApprovalLevelReq":0,"lastApprovalLevel":0,"nextApprovalLevel":1,"primaryTableNm":"MREG_GL_AC_SUBSIDIARY","recordUserId":"karim","recordDt":"2025-10-22T14:34:00.000","previousUxContent":"{\"glAccSubNm\":\"Branch J Old\"}","currentUxContent":"{\"glAccSubNm\":\"Branch J Reactivated\"}","functionName":"GL Subsidiary" }
  ];

  makerList: any[] = [];
  showmakerList = false;

  ngOnInit(): void {
    this.buildForm();
    this.loadUserAccessList();
  }

  private buildForm(): void {
    this.frmGroup = this.fb.group({
      functionId: [''],
      fromDate: [''],
      toDate: [''],
    });
  }

  loadUserAccessList(): void {
    const ls = localStorage.getItem('userAccessList');
    const data = ls ? JSON.parse(ls) : this.userAccessList;
    if (!ls) localStorage.setItem('userAccessList', JSON.stringify(this.userAccessList));

    this.functionOptions = (data || []).map((x: { functionId: number; functionName: string }) => ({
      key: x.functionId, value: x.functionName
    }));

    if (!this.frmGroup.get('functionId')?.value && this.functionOptions.length) {
      this.frmGroup.patchValue({ functionId: this.functionOptions[0].key });
    }
  }

  loadMakerList(): void {
    const { fromDate, toDate, functionId } = this.frmGroup.value || {};
    const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
    const to = toDate ? new Date(toDate) : new Date('2999-12-31');
    to.setHours(23, 59, 59, 999);

    const fnId = functionId ? Number(functionId) : null;
    const filtered = this.apiResponseMaker.filter(item => {
      const itemFn = Number(item.functionId);
      const itemDate = new Date(item.createDate);
      const fnOk = (fnId !== null) ? itemFn === fnId : true;
      return fnOk && itemDate >= from && itemDate <= to;
    });

    this.makerList = filtered.map(item => ({
      ...item,
      currentContext: this.safeJson(item.currentUxContent),
      previousContext: this.safeJson(item.previousUxContent),
    }));

    this.showmakerList = this.makerList.length > 0;
  }

  resetMakerForm(): void {
    this.frmGroup.reset();
    this.frmGroup.markAsPristine();
    this.frmGroup.markAsUntouched();
    this.makerList = [];
    this.showmakerList = false;
  }

  handleProgressClick(rowDataString: string): void {
    try {
      const rowData = JSON.parse(rowDataString);
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


  private safeJson(s: string) { try { return JSON.parse(s || '{}'); } catch { return {}; } }


}
