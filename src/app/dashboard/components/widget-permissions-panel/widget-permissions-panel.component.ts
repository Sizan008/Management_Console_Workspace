import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Widget } from '../../models/widget.model';

@Component({
  selector: 'app-widget-permissions-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-permissions-panel.component.html',
  styleUrl: './widget-permissions-panel.component.scss'
})
export class WidgetPermissionsPanelComponent {
  readonly widget = input<Widget | null>(null);
  readonly onClose = output<void>();

  close(): void {
    this.onClose.emit();
  }
}
