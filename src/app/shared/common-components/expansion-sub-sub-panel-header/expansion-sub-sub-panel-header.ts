import {Component, input, WritableSignal, output} from '@angular/core';

@Component({
  selector: 'app-expansion-sub-sub-panel-header',
  standalone: true,
  imports: [],
  templateUrl: './expansion-sub-sub-panel-header.html',
  styleUrl: './expansion-sub-sub-panel-header.scss'
})
export class ExpansionSubSubPanelHeader {

  readonly subSubPanelTitle = input<string>();
  isOpenSignal = input.required<WritableSignal<boolean>>();
  private static nextId = 0;
  panelId = `expansion-sub-sub-header-${ExpansionSubSubPanelHeader.nextId++}`;

  // Optional action button properties
  readonly isButton = input<boolean>(false);
  readonly buttonText = input<string>('Action');
  readonly buttonIcon = input<string>('add');

  // Event emitter for action button click
  readonly addAction = output<void>();

  togglePanel() {
    const sig = this.isOpenSignal();
    sig.set(!sig());
  }

  onActionClick(event: Event) {
    event.stopPropagation(); // Prevent panel toggle when clicking the action button
    this.addAction.emit();
  }
}
