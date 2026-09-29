import { Component, effect, inject, signal, Input } from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import { FormGroup } from '@angular/forms';
import { FormGroupSignal, ONCLICK_RESET } from '../../../../../shared/constant/button-signals.constant';
import { ActivityLogService } from '../../../../../shared/services/activity-log.service';

@Component({
    selector: 'app-reset',
    imports: [],
    templateUrl: './reset.html',
    standalone: true,
    styleUrl: './reset.scss'
})
export class Reset {
  /** Whether the button should be disabled */
  @Input() disabled = false;

  frmGroup = signal<FormGroup>(FormGroupSignal());
  private activityLog = inject(ActivityLogService);

   constructor() {
    effect(() => {
      const formGroup = FormGroupSignal();
      this.frmGroup.set(formGroup);
    });
  }
  reset() {
    const functionId = localStorage.getItem('currentFunctionId') || 'UNKNOWN';
    this.activityLog.logEvent('RESET_CLICK', functionId);
    ONCLICK_RESET.set(true);
  }
}
