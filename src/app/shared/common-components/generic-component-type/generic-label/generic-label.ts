import { Component, input, signal, effect, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgClass, CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

type Option = { key: any; value: string };

@Component({
  selector: 'generic-label',
  imports: [ReactiveFormsModule, NgClass, CommonModule, MatTooltipModule],
  templateUrl: './generic-label.html',
  styleUrl: './generic-label.scss',
  standalone: true
})
export class Label implements OnInit {
  // Original inputs
  readonly labelKey = input<string>('');
  readonly visible = input<boolean>(true);

  // New inputs from InputDisplayField
  readonly frmGroup = input<FormGroup | null>(null);
  readonly controlName = input<string>('');
  readonly displayMode = input<'horizontal' | 'vertical'>('horizontal');
  readonly isRequired = input<boolean>(false);
  readonly isSelectable = input<boolean>(false);
  readonly options = input<Option[] | null>(null);
  readonly tooltip = input<string>('');
 readonly color = input<string>('');
readonly fontSize = input<string>('');
readonly fontWeight = input<string>('');
readonly customClass = input<string>('');
readonly customStyle = input<Record<string, string>>({});

  // Mapping state
  displayText = signal<string>('');
  private _lastControlValue: any = '';
  private _lastOptionsRef: Option[] | null = null;

  constructor() {
    effect(() => {
      // Only process options if selectable mode is enabled
      if (!this.isSelectable()) return;

      const opts = this.options() || [];
      const optionsChanged = this._lastOptionsRef !== opts;
      this._lastOptionsRef = opts;

      if (optionsChanged) {
        this._syncDisplayFromValue(this._lastControlValue);
      }
    });
  }

  ngOnInit(): void {
    if (!this.isSelectable() || !this.frmGroup()) return;

    const control = this.frmGroup()?.get(this.controlName());
    if (!control) return;

    control.valueChanges.subscribe((val) => {
      this._lastControlValue = val ?? '';
      this._syncDisplayFromValue(this._lastControlValue);
    });

    // Initial sync
    this._lastControlValue = control.value ?? '';
    this._syncDisplayFromValue(this._lastControlValue);
  }

  getStyles(): Record<string, string> {
  return {
    ...(this.color() && { color: this.color() }),
    ...(this.fontSize() && { fontSize: this.fontSize() }),
    ...(this.fontWeight() && { fontWeight: this.fontWeight() }),
    ...this.customStyle()
  };
}

  private _syncDisplayFromValue(val: any) {
    const opts = this.options() || [];
    const selected = opts.find((o) => o.key === val);

    if (selected) {
      this.displayText.set(selected.value);
    } else {
      this.displayText.set('');
    }
  }

  getValue(): string {
    // If selectable mode is enabled and we have a mapped display text, use it
    if (this.isSelectable() && this.displayText()) {
      return this.displayText();
    }

    // Otherwise, display the raw control value
    const control = this.frmGroup()?.get(this.controlName());
    return control?.value || '-';
  }

  get isHidden(): boolean {
    return !this.visible();
  }

  get label(): string {
    return this.labelKey();
  }
}
