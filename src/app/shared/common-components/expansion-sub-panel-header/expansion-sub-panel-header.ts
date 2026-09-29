import {Component, input, WritableSignal, output, EventEmitter} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-expansion-sub-panel-header',
  imports: [],
  templateUrl: './expansion-sub-panel-header.html',
  styleUrl: './expansion-sub-panel-header.scss'
})
export class ExpansionSubPanelHeader {

  // htmlElement = input.required<any>();
  readonly subPanelTitle = input<string>();
  isOpenSignal = input.required<WritableSignal<boolean>>();
  private static nextId = 0;
  panelId = `expansion-subheader-${ExpansionSubPanelHeader.nextId++}`;

  // Optional action button properties
  readonly isButton = input<boolean>(false);
  readonly buttonText = input<string>('Action');
  readonly buttonIcon = input<string>('add');
  readonly buttonClass = input<string>('inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200');

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


  // togglePanel() {
  //
  //   if (!this.htmlElement) return;
  //   const element = this.htmlElement();
  //
  //   const currentMaxHeight = window.getComputedStyle(element).maxHeight;
  //
  //   if (currentMaxHeight !== '0px') {
  //     // Hide
  //     element.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
  //     element.style.maxHeight = '0';
  //     element.style.opacity = '0';
  //     element.style.overflow = 'hidden';
  //   } else {
  //     // Show
  //     element.style.transition = 'max-height 0.3s ease-in, opacity 0.3s ease-in';
  //     element.style.maxHeight = element.scrollHeight + 'px';
  //     element.style.opacity = '1';
  //     element.style.overflow = 'visible';
  //   }
  // }

}
