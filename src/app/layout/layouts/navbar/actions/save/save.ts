import {Component, Input, WritableSignal, effect, inject, signal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {FormGroup} from '@angular/forms';
import { ONCLICK_SAVE, FormGroupSignal } from '../../../../../shared/constant/button-signals.constant';
import { ActivityLogService } from '../../../../../shared/services/activity-log.service';
import { LoaderService } from '../../../../../shared/services/loader.service';


@Component({
    selector: 'app-save',
    imports: [],
    templateUrl: './save.html',
    standalone: true,
    styleUrl: './save.scss'
})
export class Save {
  /** Text shown on the button (e.g., "Save", "Save & Next"). */
  @Input() label = 'Save';
  /** Signal to toggle when clicked (lets you reuse the button for multiple save flows). */
  @Input() clickSignal: WritableSignal<boolean> = ONCLICK_SAVE;
  /** Whether the button should be disabled */
  @Input() disabled = false;

  frmGroup = signal<FormGroup>(FormGroupSignal());
  private activityLog = inject(ActivityLogService);
  private loaderService = inject(LoaderService);

  constructor() {
    effect(() => {
      const formGroup = FormGroupSignal();
      this.frmGroup.set(formGroup);
    });
  }

async save() {
  // if (this.frmGroup().invalid) {
  //   return;
  // }

  this.loaderService.show();
  this.clickSignal.set(true);

  try {
    const functionId = localStorage.getItem('currentFunctionId') || 'UNKNOWN';

    await this.activityLog.logEvent('SAVE_CLICK', functionId);

  } catch (error) {
    console.error('Save failed:', error);
  } finally {
    this.loaderService.hide();
  }
}
}
