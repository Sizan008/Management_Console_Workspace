import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'case-tab-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-tab-bar.component.html',
  styleUrls: ['./case-tab-bar.component.scss']
})
export class CaseTabBarComponent {
  @Input() tabs: string[] = [];
  @Input() activeTab = '';
  @Output() tabSelected = new EventEmitter<string>();

  selectTab(tab: string): void {
    this.tabSelected.emit(tab);
  }
}
