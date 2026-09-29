import { Component, OnInit, OnDestroy, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextBox } from '../../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { ToastHelperService } from '../../../../../../shared/services/toast-helper.service';
import { ONCLICK_SAVE, ONCLICK_RESET } from '../../../../../../shared/constant/button-signals.constant';

import { FundTransferLimitService } from '../../../../services/fund-transfer-limit.service';
import {
  InternalFundTrfPolicy,
  TRANSFER_TYPE_LIST,
  UpdateFundTrfPolicyPayload
} from '../../../../models/fund-transfer-limit.model';

interface SelectOption { key: string; value: string; }

@Component({
  selector: 'app-fund-transfer-limit-all-internal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField
  ],
  templateUrl: './fund-transfer-limit-all-internal.html',
  styleUrls: ['./fund-transfer-limit-all-internal.scss']
})
export class FundTransferLimitAllInternalComponent implements OnInit, OnDestroy {

  private fb    = inject(FormBuilder);
  private svc   = inject(FundTransferLimitService);
  private toast = inject(ToastHelperService);

  @Output() isValid = new EventEmitter<boolean>();

  internalForm!: FormGroup;

  internalFundTrfPolicyList: InternalFundTrfPolicy[] = [];
  fTTypeList: SelectOption[] = [];

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
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadInternalFundTrfPolicy();

    this.internalForm.statusChanges.subscribe(() => this.isValid.emit(this.internalForm.valid));
  }

  ngOnDestroy(): void {
    ONCLICK_SAVE.set(false);
    ONCLICK_RESET.set(false);
  }

  private buildForm(): void {
    this.internalForm = this.fb.group({
      transferTypeId:       ['', Validators.required],
      minAmountPerTrans:    [0, [Validators.required, Validators.min(0)]],
      maxAmountPerTrans:    [0, [Validators.required, Validators.min(0)]],
      maxAmountTransPerDay: [0, [Validators.required, Validators.min(0)]],
      maxNumOfTransPerDay:  [0, [Validators.required, Validators.min(0)]]
    });
  }

  private loadInternalFundTrfPolicy(): void {
    this.svc.getInternalFundTrfPolicy().subscribe(res => {
      if (res?.Status !== 'OK' || !Array.isArray(res.Result)) {
        this.toast.error('Failed to load internal fund transfer policy', 'Fund Transfer Limit');
        return;
      }
      this.internalFundTrfPolicyList = res.Result;

      this.fTTypeList = this.internalFundTrfPolicyList.map(row => {
        const known = TRANSFER_TYPE_LIST.find(y => y.id === row.transferType);
        return {
          key:   row.transferType,
          value: known?.name ?? row.transferType
        };
      });
    });
  }

  onTransferTypeChange(): void {
    const transferType = this.internalForm.get('transferTypeId')?.value;
    if (!transferType) return;

    const policy = this.internalFundTrfPolicyList.find(p => p.transferType === transferType);
    if (!policy) return;

    this.internalForm.patchValue({
      minAmountPerTrans:    policy.minAmountPerTrans,
      maxAmountPerTrans:    policy.maxAmountPerTrans,
      maxAmountTransPerDay: policy.maxAmountTransPerDay,
      maxNumOfTransPerDay:  policy.maxNumOfTransPerDay
    });
  }

  onSubmit(): void {
    this.internalForm.markAllAsTouched();
    if (this.internalForm.invalid) {
      this.toast.error('Please fill required fields', 'Fund Transfer Limit');
      return;
    }
    const v = this.internalForm.getRawValue();
    const payload: UpdateFundTrfPolicyPayload = {
      UserId:              'EPSILON',
      TransferType:        v.transferTypeId,
      MinAmountPerTrans:   Number(v.minAmountPerTrans),
      MaxAmountPerTrans:   Number(v.maxAmountPerTrans),
      MaxAmountTransPerDay:Number(v.maxAmountTransPerDay),
      MaxNumOfTransPerDay: Number(v.maxNumOfTransPerDay)
    };

    this.svc.updateFundTrfPolicy(payload).subscribe(res => {
      if (res?.Status === 'OK') {
        this.toast.success(res?.Message || 'Internal fund transfer policy updated', 'Fund Transfer Limit');
        this.onRefresh();
      } else {
        this.toast.error('Update failed: ' + (res?.Message || 'Unknown error'), 'Fund Transfer Limit');
      }
    });
  }

  onRefresh(): void {
    this.internalForm.reset({
      transferTypeId: '',
      minAmountPerTrans: 0,
      maxAmountPerTrans: 0,
      maxAmountTransPerDay: 0,
      maxNumOfTransPerDay: 0
    });
  }
}
