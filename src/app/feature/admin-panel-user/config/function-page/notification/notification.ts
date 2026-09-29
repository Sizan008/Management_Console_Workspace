import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputTextBox } from '../../../../../shared/common-components/input-types/input-text-box/input-text-box';
import { InputTextArea } from '../../../../../shared/common-components/input-types/input-text-area/input-text-area';
import { ToastHelperService } from '../../../../../shared/services/toast-helper.service';
import {
  ButtonUtils,
  ONCLICK_SAVE,
  ONCLICK_RESET,
  ONCLICK_EXIT,
  BUTTON_VISIBILITY
} from '../../../../../shared/constant/button-signals.constant';

import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextBox,
    InputTextArea
  ],
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {

  private fb     = inject(FormBuilder);
  private svc    = inject(NotificationService);
  private toast  = inject(ToastHelperService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  msgForm!: FormGroup;

  isFormValid = signal(false);

  readonly broadcastType    = 'ALL';
  readonly notificationType = 'PUSH';

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

    effect(() => {
      const saveState = this.isFormValid()
        ? { visible: true, enabled: true }
        : { visible: true, enabled: false };
      BUTTON_VISIBILITY.update(curr => ({ ...curr, save: saveState }));
    });
  }

  ngOnInit(): void {
    this.buildForm();

    ButtonUtils.setPageButtons({
      save: { visible: true, enabled: false },
      reset: true,
      exit: false
    });
  }

  ngOnDestroy(): void {
    ButtonUtils.resetAllButtons();
    ONCLICK_SAVE.set(false);
    ONCLICK_RESET.set(false);
    ONCLICK_EXIT.set(false);
  }

  private buildForm(): void {
    this.msgForm = this.fb.group({
      subject: ['', Validators.required],
      details: ['', Validators.required]
    });

    this.msgForm.statusChanges.subscribe(() => this.isFormValid.set(this.msgForm.valid));
  }

  setBroadcastType(): void {}
  setNotificationType(): void {}

  onSubmit(): void {
    this.msgForm.markAllAsTouched();
    if (this.msgForm.invalid) {
      this.toast.error('Please fill all required fields', 'Notification');
      return;
    }
    const v = this.msgForm.getRawValue() as { subject: string; details: string };

    const payload = {
      NotifiTitle: v.subject,
      NotifiDesc:  v.details,
      CustomerId:  ''
    };

    this.svc.createNotification(payload).subscribe(res => {
      if (res?.Status === 'OK') {
        this.toast.success(res?.Message || 'Notification sent', 'Notification');
        this.onRefresh();
      } else {
        this.toast.error('Send failed: ' + (res?.Message || 'Unknown error'), 'Notification');
      }
    });
  }

  onRefresh(): void {
    this.msgForm.reset({ subject: '', details: '' });
  }

  onExit(): void {
    this.router.navigate(['../../'], { relativeTo: this.route });
  }
}
