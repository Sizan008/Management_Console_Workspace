import { Component, OnInit, OnDestroy, Output, EventEmitter, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextBox } from '../../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputSelectOptionField } from '../../../../../../shared/common-components/input-types/input-select-option-field/input-select-option-field';
import { ToastHelperService } from '../../../../../../shared/services/toast-helper.service';
import { ONCLICK_SAVE, ONCLICK_RESET } from '../../../../../../shared/constant/button-signals.constant';

import { FundTransferLimitService } from '../../../../services/fund-transfer-limit.service';
import {
  IFundTransferLimitInfoBody, Branch,
  DEFAULT_GLOBAL_POLICY
} from '../../../../models/fund-transfer-limit.model';

interface SelectOption { key: string; value: string; }

@Component({
  selector: 'app-fund-transfer-limit-all-global',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputSelectOptionField
  ],
  templateUrl: './fund-transfer-limit-all-global.html',
  styleUrls: ['./fund-transfer-limit-all-global.scss']
})
export class FundTransferLimitAllGlobalComponent implements OnInit, OnDestroy {

  private fb    = inject(FormBuilder);
  private svc   = inject(FundTransferLimitService);
  private toast = inject(ToastHelperService);

  @Output() isValid = new EventEmitter<boolean>();

  globalForm!: FormGroup;

  branchList: SelectOption[] = [];

  enableFundTransfer: '0' | '1' = '0';
  chargeApplicableToPB: '0' | '1' = '0';

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
    this.bindBranches();
    this.loadGlobalPolicy();

    this.globalForm.statusChanges.subscribe(() => this.isValid.emit(this.globalForm.valid));
  }

  ngOnDestroy(): void {
    ONCLICK_SAVE.set(false);
    ONCLICK_RESET.set(false);
  }

  private buildForm(): void {
    this.globalForm = this.fb.group({
      inD_TRANS_PER_DAY:        ['0', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      inD_TRANS_AMT_PER_DAY:    ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
      inD_AMT_PER_TRANS:        ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
      inD_AMOUNT_PER_TRANS_MIN: ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
      inD_GLOBAL_MAX_LIMIT:     ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],

      corP_TRANS_PER_DAY:        ['0', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      corP_TRANS_AMT_DAY:        ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
      corP_AMT_PER_TRANS:        ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
      corP_AMOUNT_PER_TRANS_MIN: ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
      corP_GLOBAL_MAX_LIMIT:     ['0', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],

      pB_BRANCH_ID:                  ['', Validators.required],
      otheR_BANK_BEFT_BRANCH_ID:     ['', Validators.required],
      otheR_BANK_NPSB_BR_ID:         ['', Validators.required],
      otheR_BANK_Q_CASH_NPSB_BR_ID:  ['', Validators.required],
      otheR_BANK_BB_EFT_HEAD:        ['0', Validators.required],
      chargE_RULE_ID:                ['0', Validators.required],

      otheR_BANK_BEFT_ACC_NO:        ['0', Validators.required],
      otheR_BANK_NPSB_ACC_NO:        ['0', Validators.required],
      otheR_BANK_Q_CASH_NPSB_ACC_NO: ['0', Validators.required],
      q_CASH_CHARGE_RULE_ID:         ['0', Validators.required]
    });
  }

  private bindBranches(): void {
    this.svc.getBranchList().subscribe(res => {
      if (res?.Status === 'OK' && Array.isArray(res.Result)) {
        this.branchList = res.Result.map(b => ({ key: b.brancH_ID, value: b.brancH_NM }));
      }
    });
  }

  private loadGlobalPolicy(): void {
    this.svc.getGlobalFundTrfPolicy().subscribe(res => {
      if (res?.Status === 'OK' && res.Result) {
        this.patchForm(res.Result);
      } else {
        this.toast.error('Failed to load global policy', 'Fund Transfer Limit');
      }
    });
  }

  private patchForm(p: IFundTransferLimitInfoBody): void {
    this.globalForm.patchValue({
      inD_TRANS_PER_DAY:        p.inD_TRANS_PER_DAY,
      inD_TRANS_AMT_PER_DAY:    p.inD_TRANS_AMT_PER_DAY,
      inD_AMT_PER_TRANS:        p.inD_AMT_PER_TRANS,
      inD_AMOUNT_PER_TRANS_MIN: p.inD_AMOUNT_PER_TRANS_MIN,
      inD_GLOBAL_MAX_LIMIT:     p.inD_GLOBAL_MAX_LIMIT,

      corP_TRANS_PER_DAY:        p.corP_TRANS_PER_DAY,
      corP_TRANS_AMT_DAY:        p.corP_TRANS_AMT_DAY,
      corP_AMT_PER_TRANS:        p.corP_AMT_PER_TRANS,
      corP_AMOUNT_PER_TRANS_MIN: p.corP_AMOUNT_PER_TRANS_MIN,
      corP_GLOBAL_MAX_LIMIT:     p.corP_GLOBAL_MAX_LIMIT,

      pB_BRANCH_ID:                  p.pB_BRANCH_ID,
      otheR_BANK_BEFT_BRANCH_ID:     p.otheR_BANK_BEFT_BRANCH_ID,
      otheR_BANK_NPSB_BR_ID:         p.otheR_BANK_NPSB_BR_ID,
      otheR_BANK_Q_CASH_NPSB_BR_ID:  p.otheR_BANK_Q_CASH_NPSB_BR_ID,
      otheR_BANK_BB_EFT_HEAD:        p.otheR_BANK_BB_EFT_HEAD,
      chargE_RULE_ID:                p.chargE_RULE_ID,

      otheR_BANK_BEFT_ACC_NO:        p.otheR_BANK_BEFT_ACC_NO,
      otheR_BANK_NPSB_ACC_NO:        p.otheR_BANK_NPSB_ACC_NO,
      otheR_BANK_Q_CASH_NPSB_ACC_NO: p.otheR_BANK_Q_CASH_NPSB_ACC_NO,
      q_CASH_CHARGE_RULE_ID:         p.q_CASH_CHARGE_RULE_ID
    });
    this.enableFundTransfer   = (p.fT_ENABLE_FLAG             === '1') ? '1' : '0';
    this.chargeApplicableToPB = (p.iS_CHARGE_APPLICABLE_TO_PB === '1') ? '1' : '0';
  }

  onSubmit(): void {
    this.globalForm.markAllAsTouched();
    if (this.globalForm.invalid) {
      this.toast.error('Please fill required fields', 'Fund Transfer Limit');
      return;
    }
    const v = this.globalForm.getRawValue();
    const payload: IFundTransferLimitInfoBody = {
      ...DEFAULT_GLOBAL_POLICY,
      ...v,
      fT_ENABLE_FLAG: this.enableFundTransfer,
      iS_CHARGE_APPLICABLE_TO_PB: this.chargeApplicableToPB
    };

    this.svc.updateGlobalFundTrfPolicy(payload).subscribe(res => {
      if (res?.Status === 'OK') {
        this.toast.success(res?.Message || 'Global fund transfer policy updated', 'Fund Transfer Limit');
      } else {
        this.toast.error('Update failed: ' + (res?.Message || 'Unknown error'), 'Fund Transfer Limit');
      }
    });
  }

  onRefresh(): void {
    this.globalForm.reset({
      inD_TRANS_PER_DAY: '0', inD_TRANS_AMT_PER_DAY: '0', inD_AMT_PER_TRANS: '0',
      inD_AMOUNT_PER_TRANS_MIN: '0', inD_GLOBAL_MAX_LIMIT: '0',
      corP_TRANS_PER_DAY: '0', corP_TRANS_AMT_DAY: '0', corP_AMT_PER_TRANS: '0',
      corP_AMOUNT_PER_TRANS_MIN: '0', corP_GLOBAL_MAX_LIMIT: '0',
      pB_BRANCH_ID: '', otheR_BANK_BEFT_BRANCH_ID: '', otheR_BANK_NPSB_BR_ID: '',
      otheR_BANK_Q_CASH_NPSB_BR_ID: '', otheR_BANK_BB_EFT_HEAD: '0',
      chargE_RULE_ID: '0',
      otheR_BANK_BEFT_ACC_NO: '0', otheR_BANK_NPSB_ACC_NO: '0',
      otheR_BANK_Q_CASH_NPSB_ACC_NO: '0', q_CASH_CHARGE_RULE_ID: '0'
    });
    this.enableFundTransfer = '0';
    this.chargeApplicableToPB = '0';
  }

  toggleEnableFundTransfer(): void {
    this.enableFundTransfer = this.enableFundTransfer === '1' ? '0' : '1';
  }

  toggleChargeApplicableToPB(): void {
    this.chargeApplicableToPB = this.chargeApplicableToPB === '1' ? '0' : '1';
  }
}
