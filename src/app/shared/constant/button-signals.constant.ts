// src/app/shared/constants/button-signals.constant.ts

import { signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ButtonActionsModel, ButtonState } from '../models/button.actions.model';

/* ----------------------------------
 * Initial States (Single Source)
 * ---------------------------------- */

// Helper function to create button state
const createButtonState = (visible: boolean = false, enabled: boolean = true): ButtonState => ({
  visible,
  enabled
});

const INITIAL_BUTTON_STATE: ButtonActionsModel = {
  save: createButtonState(false, true),
  saveNext: createButtonState(false, true),
  update: createButtonState(false, true),
  updateNext: createButtonState(false, true),
  view: createButtonState(false, true),
  delete: createButtonState(false, true),
  exit: createButtonState(false, true),
  reset: createButtonState(false, true),
  customAction: createButtonState(false, true)
};

const INITIAL_FORM_GROUP = new FormGroup({});

/* ----------------------------------
 * Signals
 * ---------------------------------- */

export const BUTTON_VISIBILITY = signal<ButtonActionsModel>({
  ...INITIAL_BUTTON_STATE,
});

export const FormGroupSignal = signal<FormGroup>(INITIAL_FORM_GROUP);

export const ONCLICK_SAVE = signal(false);
export const ONCLICK_SAVE_NEXT = signal(false);
export const ONCLICK_VIEW = signal(false);
export const ONCLICK_RESET = signal(false);
export const ONCLICK_EXIT = signal(false);
export const ONCLICK_DELETE = signal(false);
export const ONCLICK_UPDATE = signal(false);
export const ONCLICK_CUSTOM_ACTION = signal(false);
export const ONCLICK_UPDATE_NEXT = signal(false);

export const MENU_NAME = signal<string>('');

/* ----------------------------------
 * Utilities
 * ---------------------------------- */

// Helper functions for button state management
const normalizeButtonState = (state: boolean | ButtonState | undefined): ButtonState => {
  if (state === undefined) return createButtonState(false, true);
  if (typeof state === 'boolean') return createButtonState(state, state); // visible and enabled
  return state;
};

const isButtonVisible = (state: boolean | ButtonState | undefined): boolean => {
  const normalized = normalizeButtonState(state);
  return normalized.visible;
};

const isButtonEnabled = (state: boolean | ButtonState | undefined): boolean => {
  const normalized = normalizeButtonState(state);
  return normalized.visible && normalized.enabled;
};

export const ButtonUtils = {
  /* Reset all buttons */
  resetAllButtons(): void {
    BUTTON_VISIBILITY.set({ ...INITIAL_BUTTON_STATE });
  },

  /* Reset all click flags */
  resetAllClickSignals(): void {
    ONCLICK_SAVE.set(false);
    ONCLICK_SAVE_NEXT.set(false);
    ONCLICK_VIEW.set(false);
    ONCLICK_RESET.set(false);
    ONCLICK_EXIT.set(false);
    ONCLICK_DELETE.set(false);
    ONCLICK_UPDATE.set(false);
    ONCLICK_UPDATE_NEXT.set(false);
  },

  /* Reset FormGroup */
  resetFormGroup(): void {
    FormGroupSignal.set(new FormGroup({}));
  },

  /* Full reset (use on route change) */
  resetAll(): void {
    this.resetAllButtons();
    this.resetAllClickSignals();
    this.resetFormGroup();
    MENU_NAME.set('');
  },

  /* Set page-specific buttons */
  setPageButtons(buttons: Partial<ButtonActionsModel>): void {
    const currentState = BUTTON_VISIBILITY();
    const newState = { ...currentState };

    // Merge current state with new buttons
    Object.keys(buttons).forEach(key => {
      const buttonKey = key as keyof ButtonActionsModel;
      const buttonValue = buttons[buttonKey];

      if (buttonValue !== undefined) {
        // Handle different button types
        if (buttonKey === 'customButton') {
          // Skip customButton for now - it's handled differently
          return;
        } else {
          // For regular buttons, convert boolean to ButtonState or use ButtonState directly
          if (typeof buttonValue === 'boolean') {
            newState[buttonKey] = createButtonState(buttonValue, buttonValue);
          } else if (typeof buttonValue === 'object' && 'visible' in buttonValue && 'enabled' in buttonValue) {
            newState[buttonKey] = buttonValue;
          }
        }
      }
    });

    BUTTON_VISIBILITY.set(newState);
  },

  /* Disable specific buttons (keep visible but not clickable) */
  disableButtons(buttonKeys: (keyof ButtonActionsModel)[]): void {
    const currentState = BUTTON_VISIBILITY();
    const newState = { ...currentState };

    buttonKeys.forEach(key => {
      if (key !== 'customButton') {
        const currentButtonState = normalizeButtonState(currentState[key]);
        newState[key] = createButtonState(true, false); // visible but disabled
      }
    });

    BUTTON_VISIBILITY.set(newState);
  },

  /* Enable specific buttons */
  enableButtons(buttonKeys: (keyof ButtonActionsModel)[]): void {
    const currentState = BUTTON_VISIBILITY();
    const newState = { ...currentState };

    buttonKeys.forEach(key => {
      if (key !== 'customButton') {
        const currentButtonState = normalizeButtonState(currentState[key]);
        newState[key] = createButtonState(true, true); // visible and enabled
      }
    });

    BUTTON_VISIBILITY.set(newState);
  },

  /* Hide specific buttons */
  hideButtons(buttonKeys: (keyof ButtonActionsModel)[]): void {
    const currentState = BUTTON_VISIBILITY();
    const newState = { ...currentState };

    buttonKeys.forEach(key => {
      if (key !== 'customButton') {
        newState[key] = createButtonState(false, false); // not visible and disabled
      }
    });

    BUTTON_VISIBILITY.set(newState);
  },

  /* Show specific buttons */
  showButtons(buttonKeys: (keyof ButtonActionsModel)[]): void {
    const currentState = BUTTON_VISIBILITY();
    const newState = { ...currentState };

    buttonKeys.forEach(key => {
      if (key !== 'customButton') {
        newState[key] = createButtonState(true, true); // visible and enabled
      }
    });

    BUTTON_VISIBILITY.set(newState);
  },

  /* Check if button is visible */
  isButtonVisible(buttonKey: keyof ButtonActionsModel): boolean {
    const buttonValue = BUTTON_VISIBILITY()[buttonKey];
    if (buttonKey === 'customButton') {
      return typeof buttonValue === 'object' && buttonValue !== null && 'customAction' in buttonValue
        ? buttonValue.customAction === true
        : false;
    }
    // For regular buttons, ensure it's boolean or ButtonState
    const normalizedValue = normalizeButtonState(buttonValue as boolean | ButtonState | undefined);
    return normalizedValue.visible;
  },

  /* Check if button is enabled */
  isButtonEnabled(buttonKey: keyof ButtonActionsModel): boolean {
    const buttonValue = BUTTON_VISIBILITY()[buttonKey];
    if (buttonKey === 'customButton') {
      return typeof buttonValue === 'object' && buttonValue !== null && 'customAction' in buttonValue
        ? buttonValue.customAction === true
        : false;
    }
    // For regular buttons, ensure it's boolean or ButtonState
    const normalizedValue = normalizeButtonState(buttonValue as boolean | ButtonState | undefined);
    return normalizedValue.visible && normalizedValue.enabled;
  },

  /* ----------------------------------
   * Page Presets
   * ---------------------------------- */

  setDashboardButtons(): void {
    this.setPageButtons({});
  },

  setFormPageButtons(): void {
    this.setPageButtons({
      save: true,
      reset: true,
      exit: true,
    });
  },

  setEditPageButtons(): void {
    this.setPageButtons({
      update: true,
      view: true,
      reset: true,
      exit: true,
    });
  },

  setViewPageButtons(): void {
    this.setPageButtons({
      exit: true,
    });
  },
};
