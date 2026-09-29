import {ChangeDetectorRef, Component, inject, input, output} from '@angular/core';
import {MatIconButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
    selector: 'app-sub-panel-header',
    imports: [
        MatIconButton,
        MatTooltip
    ],
    templateUrl: './sub-panel-header.html',
    standalone: true,
    styleUrl: './sub-panel-header.scss'
})
export class SubPanelHeader {
  readonly subPanelTitle = input<string>();
  readonly isButton = input<boolean>();
  readonly addAction = output();
  readonly isOptional = input<boolean>();
  readonly divElement = input<any>();
  cd = inject(ChangeDetectorRef);


  add() {
    this.addAction.emit();
  }

  toggleVisibility() {
    if (!this.divElement) return;
    const element = this.divElement();

    const currentMaxHeight = window.getComputedStyle(element).maxHeight;

    if (currentMaxHeight !== '0px') {
      // Hide
      element.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out';
      element.style.maxHeight = '0';
      element.style.opacity = '0';
      element.style.overflow = 'hidden';
    } else {
      // Show
      element.style.transition = 'max-height 0.3s ease-in, opacity 0.3s ease-in';
      element.style.maxHeight = element.scrollHeight + 'px';
      element.style.opacity = '1';
      element.style.overflow = 'visible';
    }
    this.cd.detectChanges();
  }


}
