import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router
} from '@angular/router';
import { filter } from 'rxjs';
import { Save } from '../navbar/actions/save/save';
import { View } from '../navbar/actions/view/view';
import { Delete } from '../navbar/actions/delete/delete';
import { Reset } from '../navbar/actions/reset/reset';
import { Exit } from '../navbar/actions/exit/exit';
import { Update } from '../navbar/actions/update/update';
import {
  BUTTON_VISIBILITY,
  ONCLICK_SAVE_NEXT,
  ONCLICK_UPDATE_NEXT,
  ButtonUtils
} from '../../../shared/constant/button-signals.constant';
import { ButtonActionsModel } from '../../../shared/models/button.actions.model';
import { SidebarService } from '../../service/sidebar.service';

/**
 * Action bar rendered directly below the navbar, at the top of the content area.
 * Hosts the page action buttons (Save, View, Delete, …) that previously lived in
 * the navbar, alongside the current page title. It only renders when the active
 * page has at least one visible action button.
 */
@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [Save, View, Delete, Reset, Exit, Update],
  templateUrl: './action-bar.html'
})
export class ActionBar {
  private readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  onClickSaveNext = ONCLICK_SAVE_NEXT;
  onClickUpdateNext = ONCLICK_UPDATE_NEXT;

  readonly pageName = signal('');

  private readonly actionKeys: (keyof ButtonActionsModel)[] =
    ['save', 'saveNext', 'update', 'updateNext', 'view', 'delete', 'reset', 'exit'];

  /** True when the current page exposes at least one action button. */
  readonly hasVisibleActions = computed(() => {
    BUTTON_VISIBILITY(); // track visibility changes
    return this.actionKeys.some(key => ButtonUtils.isButtonVisible(key));
  });

  /**
   * Buttons wiped by a route change, plus the path they belonged to. A
   * navigation that never lands (unmapped route, guard redirect, a click
   * superseded by another) would otherwise leave the page we are still on with
   * an empty action bar, since nothing re-runs its ngOnInit to set the buttons
   * again. Keeping the snapshot lets us put them back.
   */
  private wipedButtons: { path: string; buttons: ButtonActionsModel } | null = null;

  constructor() {
    this.sidebarService.currentPageName$
      .pipe(takeUntilDestroyed())
      .subscribe(name => this.pageName.set(name));

    // Layout is declared per top-level route section, so this component is torn
    // down and rebuilt on cross-section navigation. Without takeUntilDestroyed
    // every dead instance kept resetting the shared button state.
    this.router.events
      .pipe(
        filter(
          (
            e
          ): e is NavigationStart | NavigationEnd | NavigationCancel | NavigationError | NavigationSkipped =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError ||
            e instanceof NavigationSkipped
        ),
        takeUntilDestroyed()
      )
      .subscribe(e => {
        const currentPath = this.router.url.split('?')[0];

        if (e instanceof NavigationStart) {
          // Clear action buttons left over from the previous page whenever we move to
          // a different route. Some pages set BUTTON_VISIBILITY but never reset it on
          // destroy, so their buttons would otherwise leak onto pages that manage no
          // buttons of their own (e.g. the workspace list pages), making the action
          // bar appear where it shouldn't. We only reset when the route *path*
          // changes, so query-param-only navigations (e.g. workspace tab switches)
          // keep the current page's buttons intact.
          const targetPath = e.url.split('?')[0];
          if (currentPath !== targetPath) {
            this.wipedButtons = { path: currentPath, buttons: BUTTON_VISIBILITY() };
            ButtonUtils.resetAllButtons();
          }
          return;
        }

        // The new page owns the action bar from here on; drop the snapshot so a
        // later cancelled navigation can never restore another page's buttons.
        if (e instanceof NavigationEnd) {
          this.wipedButtons = null;
          return;
        }

        // Navigation failed, was cancelled or was skipped: we are still on the
        // page whose buttons we just wiped, so hand them back.
        if (this.wipedButtons && this.wipedButtons.path === currentPath) {
          BUTTON_VISIBILITY.set(this.wipedButtons.buttons);
        }
        this.wipedButtons = null;
      });
  }

  isButtonVisible(buttonKey: keyof ButtonActionsModel): boolean {
    return ButtonUtils.isButtonVisible(buttonKey);
  }

  isButtonEnabled(buttonKey: keyof ButtonActionsModel): boolean {
    return ButtonUtils.isButtonEnabled(buttonKey);
  }
}
