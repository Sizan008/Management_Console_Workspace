import { Component, signal, inject, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { FundTransferLimitAllInternalComponent } from './fund-transfer-limit-all-internal/fund-transfer-limit-all-internal';
import { FundTransferLimitAllGlobalComponent }   from './fund-transfer-limit-all-global/fund-transfer-limit-all-global';

import {
  ButtonUtils,
  ONCLICK_EXIT,
  BUTTON_VISIBILITY
} from '../../../../../shared/constant/button-signals.constant';

@Component({
  selector: 'app-fund-transfer-limit',
  standalone: true,
  imports: [
    CommonModule,
    FundTransferLimitAllInternalComponent,
    FundTransferLimitAllGlobalComponent
  ],
  templateUrl: './fund-transfer-limit.html',
  styleUrls: ['./fund-transfer-limit.scss']
})
export class FundTransferLimitComponent implements OnInit, OnDestroy {

  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  tab = signal<'allInternal' | 'allGlobal'>('allInternal');

  isFormValid = signal(false);

  constructor() {
    effect(() => {
      if (ONCLICK_EXIT()) {
        ONCLICK_EXIT.set(false);
        this.onExit();
      }
    });

    effect(() => {
      const valid = this.isFormValid();
      const saveState = valid
        ? { visible: true, enabled: true }
        : { visible: true, enabled: false };
      BUTTON_VISIBILITY.update(curr => ({ ...curr, save: saveState }));
    });
  }

  ngOnInit(): void {
    ButtonUtils.setPageButtons({
      save: { visible: true, enabled: false },
      reset: true,
      exit: false
    });
  }

  ngOnDestroy(): void {
    ButtonUtils.resetAllButtons();
  }

  onChildValidity(valid: boolean): void {
    this.isFormValid.set(valid);
  }

  onExit(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }
}
