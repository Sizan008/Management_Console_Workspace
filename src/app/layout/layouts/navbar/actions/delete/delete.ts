import {Component, effect, inject, signal, Input} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { ConfirmationDialogue } from '../../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';
import { FormGroupSignal, ONCLICK_DELETE } from '../../../../../shared/constant/button-signals.constant';
import { ActivityLogService } from '../../../../../shared/services/activity-log.service';
import { LoaderService } from '../../../../../shared/services/loader.service';

@Component({
  selector: 'app-delete',
  imports: [],
  templateUrl: './delete.html',
  standalone: true,
  styleUrl: './delete.scss'
})
export class Delete {
  /** Whether the button should be disabled */
  @Input() disabled = false;

  private dialog = inject(MatDialog);
  frmGroup = signal<FormGroup>(FormGroupSignal());
  private activityLog = inject(ActivityLogService);
  private loaderService = inject(LoaderService);
   constructor() {
    effect(() => {
      const formGroup = FormGroupSignal();
      this.frmGroup.set(formGroup);
    });
  }
  delete() {
    let dialogRef = this.dialog.open(ConfirmationDialogue, {
      width: '450px',
      data: {
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this item? <br>This action cannot be undone.',
        buttons: [
          { text: 'Delete', action: 'confirm' },
          { text: 'Cancel', action: 'cancel' }
        ]
      }
    });

   dialogRef.afterClosed().subscribe(async (result) => {
  if (result === true) {
    this.loaderService.show();

    try {
      const functionId = localStorage.getItem('currentFunctionId') || 'UNKNOWN';
      await this.activityLog.logEvent('DELETE_CLICK', functionId);

      // ── Trigger the delete signal ──
      ONCLICK_DELETE.set(true);
      console.log('=== ONCLICK_DELETE signal set to TRUE ===');

    } catch (error) {
      console.error('Delete operation failed:', error);
    } finally {
      this.loaderService.hide();
    }
  } else {

    console.log('Deletion cancelled');
    const functionId = localStorage.getItem('currentFunctionId') || 'UNKNOWN';
    this.activityLog.logEvent('DELETE_CLICK_CANCEL', functionId);
  }
});

  }
}
