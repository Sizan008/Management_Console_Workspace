import { Component, input, output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'generic-button',
  imports: [
    NgClass,
    MatIconModule
  ],
  templateUrl: './generic-button.html',
  standalone: true,
  styleUrl: './generic-button.scss'
})
export class GenericButton {
  // Inputs
  readonly id = input<string>('');
  readonly value = input<string>('');
  readonly cssClass = input<string>('');
  readonly styles = input<string>('');
  readonly enable = input<boolean>(true);
  readonly visible = input<boolean>(true);
  readonly label = input<string>('');
  readonly icon = input<string>('');

  // Outputs
  readonly valueChanged = output<string>();
  readonly onClick = output<MouseEvent>();

  get isDisabled(): boolean {
    return !this.enable();
  }

  get isHidden(): boolean {
    return !this.visible();
  }

  get buttonClasses(): string {
    const baseClasses =
      'py-2 px-2 font-medium cursor-pointer outline-none rounded-md transition-colors duration-200 focus:ring-2 focus:ring-offset-2 min-h-[20px] ';

    const stateClasses = this.isDisabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
      : 'text-white hover:opacity-90'; // keep hover effect without changing color

    const customClasses = this.cssClass() || '';

    // Apply default background color inline
    const defaultBg = 'theme-primary-bg';
    const styleProvided = Boolean(this.styles && this.styles());

    if (customClasses) {
      return `${baseClasses} ${customClasses}`;
    } else if (styleProvided) {
      // If inline styles provided, avoid forcing the default background class
      return `${baseClasses} ${stateClasses}`;
    } else {
      return `${baseClasses} ${defaultBg} ${stateClasses}`;
    }
  }


  onButtonClick(event: MouseEvent) {
    if (!this.isDisabled) {
      this.onClick.emit(event);
      this.valueChanged.emit(this.value());
    }
  }
}
