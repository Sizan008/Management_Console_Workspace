import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SummaryDetailItem {
  label: string;
  value: string | number;
}

@Component({
  selector: 'case-summary-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-details.component.html',
  styleUrls: ['./summary-details.component.scss']
})
export class SummaryDetailsComponent {
  @Input() title = 'Summary';
  @Input() details: SummaryDetailItem[] = [];
  @Input() actionText?: string;
  @Output() action = new EventEmitter<void>();
}
