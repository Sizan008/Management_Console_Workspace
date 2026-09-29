import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CaseProgressStep {
  label: string;
  status: 'Completed' | 'In Progress' | 'Pending';
}

@Component({
  selector: 'case-progress-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-stepper.component.html',
  styleUrls: ['./progress-stepper.component.scss']
})
export class ProgressStepperComponent {
  @Input() status = 'Pending Approval';
  @Input() steps: CaseProgressStep[] = [];

  get completedStepsCount(): number {
    return this.steps.filter(step => step.status === 'Completed').length;
  }
}
