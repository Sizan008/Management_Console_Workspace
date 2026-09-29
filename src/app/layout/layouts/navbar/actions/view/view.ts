import { Component, effect, inject, signal, Input } from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import { FormGroup } from '@angular/forms';
import { FormGroupSignal, ONCLICK_VIEW } from '../../../../../shared/constant/button-signals.constant';
import { ActivityLogService } from '../../../../../shared/services/activity-log.service';
import { LoaderService } from '../../../../../shared/services/loader.service';


@Component({
    selector: 'app-view',
    imports: [],
    templateUrl: './view.html',
    standalone: true,
    styleUrl: './view.scss'
})
export class View {
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

    async view() {
      this.loaderService.show();
      ONCLICK_VIEW.set(true);

      try {
        const functionId = localStorage.getItem('currentFunctionId') || 'UNKNOWN';

        await this.activityLog.logEvent('VIEW_CLICK', functionId);

      } catch (error) {
        console.error('View operation failed:', error);
      } finally {
        this.loaderService.hide();
      }
    }
}
