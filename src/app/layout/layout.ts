import {Component, HostListener} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { Navbar } from './layouts/navbar/navbar';
import { Sidebar } from './layouts/sidebar/sidebar';
import { ActionBar } from './layouts/action-bar/action-bar';

@Component({
  selector: 'app-layout',
  imports: [
    Navbar,
    Sidebar,
    ActionBar,
    RouterOutlet
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

  isBlurred = false;
  ctrlPressed = false;
  spacePressCount = 0;
  lastPressTime = 0;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const now = Date.now();

    if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
      this.ctrlPressed = true;
    }

    if (this.ctrlPressed && event.code === 'Space') {
      if (now - this.lastPressTime < 600) {
        this.spacePressCount++;
      } else {
        this.spacePressCount = 1;
      }

      this.lastPressTime = now;
      if (this.spacePressCount === 2) {
        this.isBlurred = !this.isBlurred;
        this.spacePressCount = 0;
      }
    }
  }

  @HostListener('document:keyup', ['$event'])
  resetCtrlKey(event: KeyboardEvent) {
    if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
      this.ctrlPressed = false;
    }
  }

}
