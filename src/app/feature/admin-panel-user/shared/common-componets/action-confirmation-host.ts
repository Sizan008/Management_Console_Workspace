import { Component, inject } from '@angular/core';
import { ActionConfirmationService } from '../service/action-confirmation.service';

import { ConfirmationDialogue } from '../../../../shared/common-components/confirmation-dialogue/confirmation-dialogue';

@Component({
  selector: 'app-action-confirmation-host',

  standalone: true,

  imports: [ConfirmationDialogue],

  template: `
    <confirmation-dialogue
      [isOpen]="confirmation.isOpen()"
      [config]="confirmation.config()"
      (close)="confirmation.cancel()"
      (buttonClick)="confirmation.handleButtonClick($event)"
    >
    </confirmation-dialogue>
  `,
})
export class ActionConfirmationHost {
  readonly confirmation = inject(ActionConfirmationService);
}
