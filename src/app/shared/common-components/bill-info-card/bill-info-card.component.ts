import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bill-info-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bill-info-card.component.html'
})
export class BillInfoCardComponent {
  @Input() title = 'Bill Information';
  @Input() editText?: string;
  @Input() items: { label: string; value: string }[] = [];
}
