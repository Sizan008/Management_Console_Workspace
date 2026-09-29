import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GlobalActivityTrackerService } from '../../services/global-activity-tracker.service';
import { GenericSwitch } from '../../common-components/generic-component-type/generic-switch/generic-switch';

@Component({
  selector: 'app-activity-tracker-toggle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GenericSwitch],
  templateUrl: './activity-tracker-toggle.page.html',
  styleUrls: ['./activity-tracker-toggle.page.scss'],
})
export class ActivityTrackerTogglePage implements OnInit {
  frm!: FormGroup;
  switchControlName = 'trackerSwitch';
  
  constructor(
    private fb: FormBuilder,
    private activityTracker: GlobalActivityTrackerService
  ) {}

  ngOnInit() {
    // Initialize form group
    this.frm = this.fb.group({
      [this.switchControlName]: [this.getStoredTrackerState()],
    });

    // Subscribe to switch changes. enable()/disable() persist the choice, so the
    // switch and the service can't drift apart.
    const control = this.frm.get(this.switchControlName);
    control?.valueChanges.subscribe((value: boolean) => {
      if (value) {
        this.activityTracker.enable();
      } else {
        this.activityTracker.disable();
      }
    });
  }

  /**
   * Read from the service rather than localStorage: tracking defaults to on, so
   * an absent key used to render the switch as off while tracking was running.
   */
  private getStoredTrackerState(): boolean {
    return this.activityTracker.isTrackingEnabled();
  }
}
