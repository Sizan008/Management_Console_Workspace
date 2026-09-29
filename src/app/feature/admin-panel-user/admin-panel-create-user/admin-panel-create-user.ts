import { Component, OnInit, OnDestroy, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';

import { InputTextBox } from '../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../shared/common-components/input-types/input-text-area/input-text-area';
import { InputSelectOptionField } from '../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { ExpansionPanelHeader } from '../../../shared/common-components/expansion-panel-header/expansion-panel-header';
import { ToastHelperService } from '../../../shared/services/toast-helper.service';
import {
  ButtonUtils,
  FormGroupSignal,
  ONCLICK_SAVE,
  ONCLICK_RESET,
  ONCLICK_EXIT,
  BUTTON_VISIBILITY
} from '../../../shared/constant/button-signals.constant';
import { ButtonActionsModel } from '../../../shared/models/button.actions.model';

import { AdminPanelCreateUserService } from '../services/admin-panel-create-user.service';
import {
  CustomerInfo, CustomerAccount, FundTransferType,
  CreateUserPayload
} from '../models/admin-panel-create-user.model';

interface SelectOption { key: string; value: string; }

@Component({
  selector: 'app-admin-panel-create-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextBox,
    InputTextArea,
    InputSelectOptionField,
    ExpansionPanelHeader
  ],
  templateUrl: './admin-panel-create-user.html',
  styleUrls: ['./admin-panel-create-user.scss']
})
export class AdminPanelCreateUserComponent implements OnInit, OnDestroy {

  private fb     = inject(FormBuilder);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(AdminPanelCreateUserService);
  private toast  = inject(ToastHelperService);

  constructor() {
    effect(() => {
      if (ONCLICK_SAVE()) {
        ONCLICK_SAVE.set(false);
        this.onSubmit();
      }
    });

    effect(() => {
      if (ONCLICK_RESET()) {
        ONCLICK_RESET.set(false);
        this.onRefresh();
      }
    });

    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.onExit();
      }
    });
  }

  readonly authTypeList: SelectOption[] = [
    { key: '1', value: 'OTP' },
    { key: '2', value: '2FA' },
    { key: '3', value: 'RBA' }
  ];
  readonly otpSendTypeList: SelectOption[] = [
    { key: '1', value: 'SMS'   },
    { key: '2', value: 'Email' },
    { key: '3', value: 'Both'  }
  ];

  userForm!: FormGroup;

  branchList:        SelectOption[] = [];
  addressTypeList:   SelectOption[] = [];
  mobileNoList:      SelectOption[] = [];
  emailList:         SelectOption[] = [];
  userAuthLevelList: SelectOption[] = [];

  userInformation       = signal<CustomerInfo | null>(null);
  customerAccountList:  CustomerAccount[]  = [];
  fundTransferTypeList: FundTransferType[] = [];

  userAccountPermissionHeader: { text: string; value: string; align?: string }[] = [
    { text: 'Branch',                  value: 'BRANCH_ID',                align: 'center' },
    { text: 'A/C Number',              value: 'ACCOUNT_NUMBER',           align: 'center' },
    { text: 'Transfer Type',           value: 'TRANSFER_TYPE_NAME',       align: 'left'   },
    { text: 'Min. Amount/Transaction', value: 'MIN_AMOUNT_PER_TRANS',     align: 'center' },
    { text: 'Max. Amount/Transaction', value: 'MAX_AMOUNT_PER_TRANS',     align: 'center' },
    { text: 'Max. Amount/Day',         value: 'MAX_AMOUNT_TRANS_PER_DAY', align: 'center' },
    { text: 'Allowed Transaction/Day', value: 'MAX_NO_OF_TRANS_PER_DAY',  align: 'center' }
  ];
  userAccountPermission: any[] = [];
  selectedAccount: any[]       = [];

  accountSectionOpen: WritableSignal<boolean> = signal(true);
  userSectionOpen:    WritableSignal<boolean> = signal(true);
  authSectionOpen:    WritableSignal<boolean> = signal(true);

  isOrgUser       = computed(() => this.userInformation()?.basic?.customeR_TYPE_ID === '2');
  showOrg         = computed(() => this.isOrgUser());
  showInfo        = computed(() => !!this.userInformation() && !!this.userInformation()?.address);
  showOTPSendType = computed(() => this.userForm?.get('authType')?.value === '1');
  userIdTitle     = signal<string>('User Id');

  private customerIdCtrl = { value: '' };

  private routeSub: Subscription | null = null;
  private statusChanges: Subscription | null = null;

  ngOnInit(): void {
    this.buildForm();
    this.bindBranch();

    ButtonUtils.setPageButtons({
      save: { visible: true, enabled: false },
      reset: true,
      exit: true
    });

    FormGroupSignal.set(this.userForm);

    this.statusChanges = this.userForm.statusChanges.subscribe(() => {
      const saveState = this.userForm.valid
        ? { visible: true, enabled: true }
        : { visible: true, enabled: false };
      BUTTON_VISIBILITY.update(curr => ({ ...curr, save: saveState }));
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.statusChanges?.unsubscribe();
    ButtonUtils.resetAllButtons();
    FormGroupSignal.set(undefined as any);
  }

  private buildForm(): void {
    this.userForm = this.fb.group({
      branchId:    ['', Validators.required],
      accountNo:   ['', Validators.required],
      authType:    ['1', Validators.required],
      otpSendType: ['3', Validators.required],
      addressType: ['', Validators.required],

      userId:      ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9.]+$/)]],
      userName:    ['', Validators.required],
      email:       [''],
      orgEmail:    [''],
      mobile:      ['', Validators.required],
      orgMobile:   ['', Validators.required],
      userAddress: ['', [Validators.required, Validators.maxLength(250)]],

      userAuthLevel: ['', Validators.required]
    });

    this.userForm.addControl('customerId', this.fb.control({ value: '', disabled: true }));
  }

  private bindBranch(): void {
    this.svc.getBranchList().subscribe(res => {
      if (res?.Status === 'OK' && Array.isArray(res.Result)) {
        this.branchList = res.Result.map(b => ({ key: b.brancH_ID, value: b.brancH_NM }));
      } else {
        this.toast.error('Failed to load branches', 'Create User');
      }
    });
  }

  accountNmAddPadding(): void {
    const raw = (this.userForm.get('accountNo')?.value || '').toString().trim();
    if (!raw) return;
    const desiredLength = 11;
    const prefixLength  = 3;
    if (raw.length !== desiredLength && raw.length > 0) {
      const zeroesToAdd = desiredLength - raw.length;
      const padded = raw.slice(0, prefixLength) + '0'.repeat(zeroesToAdd) + raw.slice(prefixLength);
      this.userForm.get('accountNo')?.setValue(padded);
    }
  }

  onAccountChange(): void {
    this.accountNmAddPadding();

    const branchId  = (this.userForm.get('branchId')?.value || '').toString().trim();
    const accNo     = (this.userForm.get('accountNo')?.value || '').toString().trim();
    if (!branchId || !accNo) return;

    this.mobileNoList = [];
    this.emailList    = [];

    this.getCustomerDetails(branchId, accNo).then(userInfo => {
      if (!userInfo) {
        this.toast.error('Customer Not Found', 'Create User');
        return;
      }

      this.userInformation.set(userInfo);
      this.populateAddressLists(userInfo);

      if (userInfo.basic.customeR_TYPE_ID === '2') {
        this.userIdTitle.set('User Id (Format : user_id@customer_id)');
        this.selectedAccount = [];

        forkJoin({
          accounts: this.svc.getCustomerAccountList(this.customerIdCtrl.value, '0'),
          ftTypes:  this.svc.getFundTransferTypes(this.customerIdCtrl.value),
          authLvl:  this.svc.getOrgAuthLevels()
        }).subscribe(({ accounts, ftTypes, authLvl }) => {
          this.customerAccountList  = accounts?.Status === 'OK' && Array.isArray(accounts.Result) ? accounts.Result : [];
          this.fundTransferTypeList = ftTypes?.Status  === 'OK' && Array.isArray(ftTypes.Result)  ? ftTypes.Result  : [];
          this.userAuthLevelList    = authLvl?.Status  === 'OK' && Array.isArray(authLvl.Result)
            ? authLvl.Result.map((a: any) => ({ key: a.lvlId, value: a.lvlNM }))
            : [];
          this.generateUserAccountPermissionGrid();
        });
      } else {
        this.userIdTitle.set('User Id');
        this.selectedAccount = [];
        this.customerAccountList  = [];
        this.fundTransferTypeList = [];
        this.userAuthLevelList    = [];
        this.userAccountPermission = [];
      }
    });
  }

  private async getCustomerDetails(branchId: string, accNo: string): Promise<CustomerInfo | null> {
    const cusIdRes = await this.svc.getCustomerId(branchId, accNo).toPromise();
    const cusId: string = cusIdRes?.Result ?? '';
    this.customerIdCtrl.value = cusId;
    this.userForm.get('customerId')?.setValue(cusId);

    if (!cusId || cusId === 'null') {
      this.toast.error('Customer Not Found', 'Create User');
      return null;
    }

    const cusInfoRes = await this.svc.getCustomerInfo(cusId).toPromise();
    if (cusInfoRes?.Status !== 'OK' || !cusInfoRes?.Result) {
      this.toast.error('Customer Info Not Found', 'Create User');
      return null;
    }
    return cusInfoRes.Result;
  }

  private populateAddressLists(userInfo: CustomerInfo): void {
    const addresses = userInfo?.address || [];
    if (!addresses.length || !addresses[0].addressTypeId) {
      this.toast.warning('Address Not Found', 'Create User');
      return;
    }

    addresses.forEach(data => {
      ([data.mobile, data.mobile2, data.mobile3, data.mobile4, data.mobile5] as (string | undefined)[])
        .filter((m): m is string => !!m)
        .forEach(m => this.mobileNoList.push({ key: m, value: m }));
      if (data.email)         this.emailList.push({ key: data.email, value: data.email });
      if (data.addressTypeId) {
        this.addressTypeList.push({
          key: data.addressTypeId,
          value: data.addressType || data.addressTypeId
        });
      }
    });

    this.userForm.get('addressType')?.setValue('2');
  }

  private generateUserAccountPermissionGrid(): void {
    this.userAccountPermission = [];
    if (this.customerAccountList.length === 0 || this.fundTransferTypeList.length === 0) return;

    let serial = 1;
    for (const acc of this.customerAccountList) {
      for (const ft of this.fundTransferTypeList) {
        if (ft?.id == null) continue;
        this.userAccountPermission.push({
          sl: serial++,
          BRANCH_ID:                acc.brancH_ID,
          ACCOUNT_NUMBER:           acc.accounT_NUMBER,
          TRANSFER_TYPE:            ft.id,
          TRANSFER_TYPE_NAME:       ft.title,
          MIN_AMOUNT_PER_TRANS:     0,
          MAX_AMOUNT_PER_TRANS:     0,
          MAX_AMOUNT_TRANS_PER_DAY: 0,
          MAX_NO_OF_TRANS_PER_DAY:  0
        });
      }
    }
  }

  dataChange(item: any, key: string): void {
    this.selectedAccount = [];
    const row = this.userAccountPermission.find(r => r.sl === item.sl);
    if (row) row[key] = item[key];
  }

  toggleAccountRow(row: any, checked: boolean): void {
    if (checked) {
      if (!this.selectedAccount.find(r => r.sl === row.sl)) this.selectedAccount.push(row);
    } else {
      this.selectedAccount = this.selectedAccount.filter(r => r.sl !== row.sl);
    }
  }

  isAccountRowSelected(row: any): boolean {
    return !!this.selectedAccount.find(r => r.sl === row.sl);
  }

  sanitizeInput(): void {
    const v = (this.userForm.get('userId')?.value || '').toString();
    const cleaned = v.replace(/[^a-zA-Z0-9.]/g, '');
    if (cleaned !== v) this.userForm.get('userId')?.setValue(cleaned);
  }

  onUserIdBlur(): void {
    this.sanitizeInput();
    const cleaned = (this.userForm.get('userId')?.value || '').toString();
    if (!cleaned) return;
    this.svc.isValidUserId(cleaned).subscribe(res => {
      if (res?.Status !== 'OK') return;
      const available = String(res.Result).toLowerCase() === 'true';
      if (available) this.toast.success('User is available', 'Create User');
      else            this.toast.error('User already exist', 'Create User');
    });
  }

  onSubmit(): void {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) {
      this.toast.error('Please fill required fields', 'Create User');
      return;
    }
    const info = this.userInformation();
    if (!info) {
      this.toast.error('No customer loaded', 'Create User');
      return;
    }

    this.selectedAccount = this.selectedAccount.filter((it, idx, arr) =>
      idx === arr.findIndex(o => o.sl === it.sl)
    );

    const isOrg = info.basic.customeR_TYPE_ID === '2';
    const v = this.userForm.getRawValue();

    const userEmail  = isOrg ? v.orgEmail  : v.email;
    const userMobile = isOrg ? v.orgMobile : v.mobile;
    const userNM     = v.userName || v.userId;

    const dob = info.basic.birtH_DATE
      ? this.convertToCalendarFormat(info.basic.birtH_DATE)
      : this.convertToCalendarFormat(new Date().toISOString().slice(0, 10));

    const userInformation = {
      UserID:               v.userId,
      UserNM:               userNM,
      BranchName:           info.basic.brancH_NM,
      AccountNo:            v.accountNo,
      CustomerId:           info.basic.customeR_ID,
      BranchId:             v.branchId,
      AuthenticationType:   v.authType,
      VerificationFlag:     v.otpSendType,
      AccountAddressTypeId: v.addressType,
      UserAddress:          v.userAddress || '',
      PhoneNumber:          userMobile || '',
      Email:                userEmail  || '',
      Imei1:                '',
      Imei2:                '',
      DOB:                  dob,
      UserOrgLvl:           v.userAuthLevel || ''
    };

    let accountWiseMultiFT: any[] = [];
    if (isOrg && this.selectedAccount.length > 0) {
      this.selectedAccount.forEach(data => {
        accountWiseMultiFT.push({
          BRANCH_ID:                data.BRANCH_ID,
          ACCOUNT_NUMBER:           data.ACCOUNT_NUMBER,
          TRANSFER_TYPE:            data.TRANSFER_TYPE,
          MIN_AMOUNT_PER_TRANS:    data.MIN_AMOUNT_PER_TRANS,
          MAX_AMOUNT_PER_TRANS:    data.MAX_AMOUNT_PER_TRANS,
          MAX_AMOUNT_TRANS_PER_DAY: data.MAX_AMOUNT_TRANS_PER_DAY,
          MAX_NO_OF_TRANS_PER_DAY: data.MAX_NO_OF_TRANS_PER_DAY
        });
      });
    }

    const payload: CreateUserPayload = {
      UserInformation: userInformation,
      accountWiseMultiFT: accountWiseMultiFT
    };

    this.svc.createUser(payload).subscribe(res => {
      if (res?.Status === 'OK') {
        this.toast.success(res?.Message || 'User created successfully', 'Create User');
        this.onRefresh();
      } else {
        this.toast.error('Create failed: ' + (res?.Message || 'Unknown error'), 'Create User');
      }
    });
  }

  onRefresh(): void {
    this.userForm.reset({
      branchId: '', accountNo: '', authType: '1', otpSendType: '3', addressType: '',
      userId: '', userName: '', email: '', orgEmail: '', mobile: '', orgMobile: '',
      userAddress: '', userAuthLevel: '',
      customerId: ''
    });
    this.userIdTitle.set('User Id');
    this.userInformation.set(null);
    this.selectedAccount = [];
    this.userAccountPermission = [];
    this.addressTypeList = [];
    this.mobileNoList = [];
    this.emailList = [];
    this.userAuthLevelList = [];
    this.customerAccountList = [];
    this.fundTransferTypeList = [];
    this.customerIdCtrl.value = '';
  }

  onExit(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }

  customerAddress(info: CustomerInfo | null): string {
    if (!info) return '—';
    const addr = info.address?.[0];
    if (!addr) return '—';
    const parts = [addr.addressLine1, addr.addressLine2].filter(p => !!p);
    return parts.length ? parts.join(', ') : '—';
  }

  private convertToCalendarFormat(input: string): string {
    if (!input) return '';
    return input;
  }
}
