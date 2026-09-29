// select-option-field.component.ts
import { Component, input, signal, effect, ElementRef, ViewChild, output, AfterViewInit, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { startWith } from 'rxjs';
import { FormControlHighlightDirective } from '../../../directives/form-control-highlight.directive';
import { getAnchoredMenuPosition } from '../../../helpers/anchored-menu-position.helper';

type Option = { key: any; value: string };

@Component({
  selector: 'input-select-option-field',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FormControlHighlightDirective,
    MatTooltipModule,
    NgClass,
    NgStyle
  ],
  templateUrl: './input-select-option-field.html',
  standalone: true,
  styleUrls: ['./input-select-option-field.scss']
})
export class InputSelectOptionField implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('selectWrapper') selectWrapper!: ElementRef<HTMLDivElement>;

  readonly frmGroup = input.required<FormGroup>();
  readonly controlName = input.required<string>();
  readonly label = input.required<string>();
  readonly isReadonly = input<boolean>();
  readonly options = input<Option[] | null>(null);
  readonly searchable = input<boolean>(true);
  readonly tooltip = input<string>();
  readonly tooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');
  readonly tooltipDelay = input<number>(500);
  readonly tooltipClass = input<string>('custom-tooltip');
  readonly placeholder = input<any>();
  readonly displayMode = input<'horizontal' | 'vertical' | 'outline'>('vertical');
  /**
   * Optional colour-swatch resolver. When provided, a small colour square is
   * rendered next to every option (and next to the selected value) in the
   * searchable dropdown. Return a raw CSS colour (e.g. `#10b981` or `red`);
   * it is applied as the swatch's background so it renders regardless of any
   * utility-class build step.
   */
  readonly swatchColor = input<((option: Option) => string) | null>(null);
  readonly allowUnselect = input<boolean>(true);
  readonly customErrorMessages = input<{ [key: string]: string }>({});
  readonly onSelect = output<{
    selectedOption: Option;
    selectedKey: any;
    selectedValue: string;
    formControl: any;
  }>();

  // Component state
  searchTerm = signal('');
  filterTerm = signal('');
  isOpen = signal(false);
  highlightedIndex = signal(-1);
  selectedValue = signal<any>('');
  filteredOptions = signal<Option[]>([]);
  displayText = signal<string>('');
  dropdownPosition = signal<'down' | 'up'>('down'); // NEW: Track dropdown position
  // Inline styles for the menu. The menu is rendered `position: fixed` and anchored
  // to the field via getBoundingClientRect, so ancestor `overflow: hidden` / stacking
  // contexts (e.g. the accent-rail cards) can never clip it. See updateMenuPosition().
  menuStyle = signal<{ [key: string]: string }>({});

  private _lastControlValue: any = '';
  private _lastOptionsRef: Option[] | null = null;
  private _isMouseDownOnOption = false;
  private _isMouseDownOnToggle = false;
  private _clickListener: ((event: MouseEvent) => void) | null = null;
  private _repositionBound = false;
  private readonly _reposition = () => this.updateMenuPosition();
  constructor() {
    effect(() => {
      const opts = this.options() || [];
      const optionsChanged = this._lastOptionsRef !== opts;
      this._lastOptionsRef = opts;
      //Select ${this.label()}
      const baseOpts = this.allowUnselect()
        ? [{ key: '', value: this.placeholder() ?? ` ` }, ...opts]
        : opts;

      if (!this.searchable()) {
        this.filteredOptions.set(baseOpts);
      } else {
        const term = this.filterTerm().toLowerCase();
        if (!term) {
          this.filteredOptions.set(baseOpts);
        } else {
          this.filteredOptions.set(
            baseOpts.filter(option =>
              option.value.toLowerCase().includes(term)
            )
          );
        }
      }
      this.highlightedIndex.set(-1);

      if (optionsChanged) {
        this._syncDisplayFromValue(this._lastControlValue);
      }
    });
  }

  ngOnInit(): void {
    const control = this.frmGroup().get(this.controlName());
    if (!control) return;

    control.valueChanges
      .pipe(startWith(control.value))
      .subscribe(val => {
        this._lastControlValue = val ?? '';
        this.selectedValue.set(this._lastControlValue);
        this._syncDisplayFromValue(this._lastControlValue);
      });

    // Add click-outside listener
    this._clickListener = (event: MouseEvent) => this._onDocumentClick(event);
    document.addEventListener('click', this._clickListener);
  }

  ngOnDestroy(): void {
    if (this._clickListener) {
      document.removeEventListener('click', this._clickListener);
    }
    this._unbindRepositionListeners();
  }

  private _onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;

    const target = event.target as HTMLElement;
    const wrapperElement = this.selectWrapper?.nativeElement;

    if (wrapperElement && !wrapperElement.contains(target)) {
      this.closeDropdown();
    }
  }

  private _syncDisplayFromValue(val: any) {
    const opts = this.options() || [];
    const selected = opts.find(o => o.key === val);
    if (selected) {
      this.displayText.set(selected.value);
      if (this.searchable()) this.searchTerm.set(selected.value);
    } else {
      this.displayText.set('');
      if (this.searchable()) this.searchTerm.set('');
    }
  }

  compareFN(item1: any, item2: any): boolean {
    return item1 && item2 ? item1.key === item2.key : item1 === item2;
  }

  /** Swatch colour for a given option (empty when no resolver is set). */
  resolveSwatch(option: Option): string {
    const fn = this.swatchColor();
    return fn ? fn(option) : '';
  }

  /** Swatch colour for the currently-selected option, for the input display. */
  selectedSwatchColor(): string {
    const fn = this.swatchColor();
    if (!fn) return '';
    const selected = (this.options() || []).find(o => o.key === this.selectedValue());
    return selected ? fn(selected) : '';
  }

  isRequired(): boolean {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.validator) return false;
    const validation = control.validator({} as any);
    return !!validation?.['required'];
  }

  /**
   * Error state for the visible field. Needed because on searchable selects the
   * form control lives on a hidden <select>, so Angular's automatic .ng-invalid
   * class never lands on the visible input — we mirror it here.
   */
  isInvalid(): boolean {
    const control = this.frmGroup().get(this.controlName());
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getCustomErrorMessage(errorKey: string): string {
    const control = this.frmGroup().get(this.controlName());
    let message = `${this.label()} has validation error: ${errorKey}`;

    if (typeof this.customErrorMessages()[errorKey] === 'string') {
      message = this.customErrorMessages()[errorKey];
    } else if (control?.errors?.[errorKey]) {
      const errorValue = control.errors[errorKey];
      if (typeof errorValue === 'string') {
        message = errorValue;
      }
    }
    return message;
  }

  getCustomErrorKeys(): string[] {
    const control = this.frmGroup().get(this.controlName());
    if (!control?.errors) return [];

    const defaultErrorKeys = ['required'];
    return Object.keys(control.errors).filter(key => !defaultErrorKeys.includes(key));
  }

  hasCustomErrors(): boolean {
    return this.getCustomErrorKeys().length > 0;
  }

  onSearchInput(event: Event): void {
    if (!this.searchable()) return;

    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.filterTerm.set(input.value);
    if (!this.isOpen()) {
      this.openDropdown();
    }

    const currentControl = this.frmGroup().get(this.controlName());
    if (currentControl && currentControl.value) {
      const selectedOption = this.options()?.find(opt => opt.key === currentControl.value);
      if (selectedOption && selectedOption.value !== input.value) {
        currentControl.setValue('');
      }
    }
  }

  onInputClick(): void {
    if (!this.searchable()) {
      this.toggleDropdown();
    }
  }

  onOptionMouseDown(event: MouseEvent): void {
    this._isMouseDownOnOption = true;
    event.preventDefault(); // Prevent input blur
  }

  onToggleMouseDown(event: MouseEvent): void {
    this._isMouseDownOnToggle = true;
    event.preventDefault(); // Prevent input blur
  }

  onInputBlur(): void {
    if (this._isMouseDownOnOption || this._isMouseDownOnToggle) {
      this._isMouseDownOnOption = false;
      this._isMouseDownOnToggle = false;
      return;
    }
    // The visible input holds no form control (control lives on the hidden <select>),
    // so mark it touched here — otherwise the error state never triggers on blur.
    this.frmGroup().get(this.controlName())?.markAsTouched();
    requestAnimationFrame(() => {       // ← swap setTimeout(fn, 200) for this
      this.closeDropdown();
      if (this.searchable()) {
        const control = this.frmGroup().get(this.controlName());
        if (control?.value) {
          const selectedOption = this.options()?.find(opt => opt.key === control.value);
          if (selectedOption) {
            this.searchTerm.set(selectedOption.value);
          }
        } else {
          this.searchTerm.set('');
        }
      }
    });
  }

  clearSelection(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isReadonly() || !this.allowUnselect()) return;

    const control = this.frmGroup().get(this.controlName());
    if (control && control.value !== '') {
      control.setValue('');
      control.markAsTouched();
      control.markAsDirty();
    }

    this.selectedValue.set('');
    this.displayText.set('');
    if (this.searchable()) {
      this.searchTerm.set('');
      this.filterTerm.set('');
    }

    this.onSelect.emit({
      selectedOption: null as any,
      selectedKey: '',
      selectedValue: '',
      formControl: control
    });
  }

  onStaticSelectChange(event: Event): void {
    if (this.isReadonly()) {
      const control = this.frmGroup().get(this.controlName());
      const selectElement = event.target as HTMLSelectElement;
      const current = control?.value ?? '';
      selectElement.value = current ?? '';
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const selectElement = event.target as HTMLSelectElement;
    const selectedKey = selectElement.value;

    if (selectedKey) {
      const selectedOption = this.options()?.find(opt => opt.key === selectedKey);
      if (selectedOption) {
        this.selectedValue.set(selectedKey);
        this.displayText.set(selectedOption.value);

        this.onSelect.emit({
          selectedOption: selectedOption,
          selectedKey: selectedKey,
          selectedValue: selectedOption.value,
          formControl: this.frmGroup().get(this.controlName())
        });
      }
    } else {
      this.selectedValue.set('');
      this.displayText.set('');
    }
  }

  onGuardedMouseDown(event: MouseEvent): void {
    if (this.isReadonly()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  onGuardedKeyDown(event: KeyboardEvent): void {
    if (this.isReadonly()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const filteredOpts = this.filteredOptions();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.openDropdown();
        } else {
          const nextIndex = this.highlightedIndex() < filteredOpts.length - 1
            ? this.highlightedIndex() + 1
            : 0;
          this.highlightedIndex.set(nextIndex);
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.isOpen()) {
          const prevIndex = this.highlightedIndex() > 0
            ? this.highlightedIndex() - 1
            : filteredOpts.length - 1;
          this.highlightedIndex.set(prevIndex);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (this.isOpen()) {
          const indexToSelect = this.highlightedIndex() >= 0 ? this.highlightedIndex() : 0;
          const option = filteredOpts[indexToSelect];
          if (option) {
            this.selectOption(option);
          }
        }
        break;

      case 'Escape':
        this.closeDropdown();
        this.searchInput.nativeElement.blur();
        break;
    }
  }

  openDropdown(): void {
    if (!this.isReadonly()) {
      if (this.searchable()) this.filterTerm.set('');
      this.updateMenuPosition();
      this.isOpen.set(true);
      this._bindRepositionListeners();
    }
  }

  /**
   * Position the (fixed) menu against the field wrapper. Because the menu is
   * `position: fixed`, it is anchored to the viewport and therefore escapes any
   * ancestor `overflow: hidden` / stacking context that would otherwise clip it.
   */
  private updateMenuPosition(): void {
    const anchor = this.selectWrapper?.nativeElement || this.searchInput?.nativeElement;
    if (!anchor) {
      this.dropdownPosition.set('down');
      return;
    }

    const { style, openUp } = getAnchoredMenuPosition(anchor, {
      menuHeight: 200, // Max height from CSS
      zIndex: '9999',
    });

    this.dropdownPosition.set(openUp ? 'up' : 'down');
    this.menuStyle.set(style);
  }

  private _bindRepositionListeners(): void {
    if (this._repositionBound) return;
    // Capture phase so scrolling in ANY ancestor scroll container repositions the menu.
    window.addEventListener('scroll', this._reposition, true);
    window.addEventListener('resize', this._reposition);
    this._repositionBound = true;
  }

  private _unbindRepositionListeners(): void {
    if (!this._repositionBound) return;
    window.removeEventListener('scroll', this._reposition, true);
    window.removeEventListener('resize', this._reposition);
    this._repositionBound = false;
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
    this._unbindRepositionListeners();
  }

  toggleDropdown(): void {
    if (this.isOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
      if (this.searchable()) {
        this.searchInput.nativeElement.focus();
      }
    }
  }

  selectOption(option: Option): void {
    const control = this.frmGroup().get(this.controlName());
    if (control) {
      control.setValue(option.key);
      control.markAsTouched();
      control.markAsDirty();
    }

    if (option.key === '') {
      this.displayText.set('');
      if (this.searchable()) {
        this.searchTerm.set('');
        this.filterTerm.set('');
      }
    } else {
      this.displayText.set(option.value);
      if (this.searchable()) {
        this.searchTerm.set(option.value);
        this.filterTerm.set('');  // ← Reset to '' not option.value
      }
    }
    this.closeDropdown();

    this.onSelect.emit({
      selectedOption: option.key === '' ? (null as any) : option,
      selectedKey: option.key,
      selectedValue: option.key === '' ? '' : option.value,
      formControl: control
    });
  }
}
