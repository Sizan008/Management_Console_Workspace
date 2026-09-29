import {Component, computed, input, WritableSignal} from '@angular/core';

@Component({
  selector: 'app-expansion-panel-header',
  standalone: true,
  imports: [],
  templateUrl: './expansion-panel-header.html',
  styleUrl: './expansion-panel-header.scss'
})
export class ExpansionPanelHeader {

  /** Section title shown next to the accent rail. */
  panelTitle = input<string>();

  /** Writable signal that holds the open/collapsed state of this section. */
  isOpenSignal = input.required<WritableSignal<boolean>>();

  /** Optional per-section accent-rail colour. Defaults to the app theme primary. */
  accentColor = input<string>();

  /** Reactive read of the open state. */
  protected readonly open = computed(() => this.isOpenSignal()());

  private static nextId = 0;
  panelId = `expansion-header-${ExpansionPanelHeader.nextId++}`;

  togglePanel() {
    const sig = this.isOpenSignal();
    sig.set(!sig());
  }

}
