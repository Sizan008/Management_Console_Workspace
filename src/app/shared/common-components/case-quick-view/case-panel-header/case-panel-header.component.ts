import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceStateService } from '../../../common-components/generic-workspace/workspace-state.service';

@Component({
  selector: 'case-panel-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-panel-header.component.html',
  styleUrls: ['./case-panel-header.component.scss']
})
export class CasePanelHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() actionAriaLabel = 'Close';
  @Input() actionVisible = true;
  @Output() action = new EventEmitter<void>();

  workspaceState = inject(WorkspaceStateService);
}
