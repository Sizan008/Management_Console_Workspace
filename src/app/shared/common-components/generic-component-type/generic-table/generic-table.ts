// dynamic-table.component.ts
import { Component, Input, OnChanges, OnInit, SimpleChanges, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Cell configuration for table
 */
export interface TableCell {
  label?: string;           // Label text (for label cells)
  value?: any;              // Value to display (for value cells)
  colspan?: number;         // Number of columns to span
  rowspan?: number;         // Number of rows to span
  type?: 'label' | 'value'; // Cell type
  highlighted?: boolean;    // Apply highlight style
  /**
   * Custom CSS class(es) for the cell. Tailwind utilities are supported for
   * colour, weight, background — and for padding: passing any padding utility
   * (p-, px-, py-, pt-, pr-, pb-, pl-, ps-, pe-) makes the component drop its
   * own default cell padding so yours is the only padding rule on the cell.
   */
  className?: string;
  width?: string;          // Custom width (e.g., '25%', '200px')
  style?: Record<string, string>; // Inline styles for direct CSS
}

/**
 * Row configuration - array of cells
 */
export interface TableRow {
  cells: TableCell[];
  className?: string;       // Custom row class
}

/**
 * Section configuration - contains multiple rows
 */
export interface TableSection {
  title: string;            // Section header title
  rows: TableRow[];         // Array of rows
  headerClass?: string;     // Custom header class
}

/**
 * Complete table configuration
 */
export interface DynamicTableConfig {
  sections: TableSection[];
  loading?: boolean;
  error?: string | null;
}

@Component({
  selector: 'generic-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-table.html',
  styleUrls: ['./generic-table.scss']
})
export class DynamicTableComponent implements OnInit, OnChanges {

  // Inputs
  @Input() config: DynamicTableConfig | null = null;
  @Input() showHeader: boolean = true;
  @Input() showFooter: boolean = true;
  @Input() customTitle?: string;
  @Input() customSubtitle?: string;

  // Signals
  tableConfig: WritableSignal<DynamicTableConfig | null> = signal(null);
  isLoading: WritableSignal<boolean> = signal(false);
  errorMessage: WritableSignal<string | null> = signal(null);
  currentTime: WritableSignal<Date> = signal(new Date());

  ngOnInit(): void {
    // Covers a config assigned imperatively (e.g. through a ViewChild) rather
    // than bound in a template, which produces no ngOnChanges.
    if (this.config) {
      this.applyConfig(this.config);
    }
  }

  /**
   * Re-read the config on every input change.
   *
   * Required, not optional: `config` is read into a signal rather than used
   * directly by the template, so without this the table renders the value that
   * was bound at init and then ignores the parent forever. Callers that swap the
   * whole config — a page offering several sample tables, a panel reloading a
   * record — saw nothing happen, because the host component is projected through
   * ng-content and never remounts to re-run ngOnInit.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.applyConfig(this.config);
    }
  }

  /**
   * Update configuration from parent
   */
  updateConfig(config: DynamicTableConfig): void {
    this.applyConfig(config);
    this.currentTime.set(new Date());
  }

  /** Single place where an incoming config becomes rendered state. */
  private applyConfig(config: DynamicTableConfig | null): void {
    this.tableConfig.set(config);
    this.isLoading.set(config?.loading || false);
    this.errorMessage.set(config?.error || null);
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByIndex(index: number): number {
    return index;
  }

  /**
   * Get cell width class. Cells with an explicit width or a colspan size
   * themselves; everything else falls back to a quarter of the table.
   */
  getCellWidth(cell: TableCell): string {
    if (cell.width) {
      return '';
    }
    if (cell.colspan && cell.colspan > 1) {
      return '';
    }
    return 'gt-cell--quarter';
  }

  /**
   * Tailwind padding utilities: p-, px-, py-, pt-, pr-, pb-, pl-, ps-, pe-,
   * including arbitrary values ('p-[14px]'), the v4 important suffix ('p-4!')
   * and variant prefixes ('md:p-4', 'group-hover:px-2').
   *
   * Variants count deliberately. A caller who writes only 'md:p-4' still has to
   * suppress the default, because the default cannot lose to it on the cascade —
   * so passing any padding utility means owning the padding at every breakpoint.
   *
   * Each alternative must start a class token, so names that merely begin with a
   * padding-like prefix are not caught: 'pointer-events-none' and
   * 'place-items-center' both fail. Arbitrary variants ('[&>span]:p-2') are not
   * recognised — use the `style` field for those.
   */
  private static readonly PADDING_UTILITY = /(?:^|\s)(?:[\w-]+:)*p[xytrbles]?-/;

  /**
   * Whether the caller has taken over this cell's padding.
   *
   * Class order in the template cannot decide this: component styles are
   * unlayered and carry Angular's encapsulation attribute, so they outrank every
   * Tailwind utility (which sits in @layer utilities) no matter where it appears
   * in the attribute. The only reliable way to let a caller's padding win is to
   * not emit ours at all — hence this check rather than a cascade trick.
   *
   * cell.style is not considered: it binds to the element's style attribute,
   * which already beats both.
   */
  private hasCustomPadding(cell: TableCell): boolean {
    return !!cell.className && DynamicTableComponent.PADDING_UTILITY.test(cell.className);
  }

  /**
   * Get cell type class.
   *
   * Borders and backgrounds live in the stylesheet. Text colour and weight are
   * emitted here as utility classes on purpose: that keeps them at the same
   * specificity as a caller-supplied `className`, so overrides like
   * 'text-green-600 font-bold' still take effect. Padding is emitted here too,
   * as the 'gt-cell--pad' modifier, but is dropped outright when the caller
   * passes padding of their own — see hasCustomPadding().
   */
  getCellClass(cell: TableCell): string {
    const classes: string[] = ['gt-cell'];

    // Default padding, unless the caller is supplying their own.
    if (!this.hasCustomPadding(cell)) {
      classes.push('gt-cell--pad');
    }

    // Type-specific classes. The label is the quieter half of the pair; the
    // value carries the weight.
    if (cell.type === 'label' || cell.label !== undefined) {
      classes.push('gt-cell--label', 'font-normal', 'text-slate-600');
    } else {
      classes.push('gt-cell--value', 'font-semibold', 'text-slate-900');
    }

    // Highlight is a cell-level flag, so it tints the flagged cell
    if (cell.highlighted) {
      classes.push('gt-cell--highlight');
    }

    // Width class
    const widthClass = this.getCellWidth(cell);
    if (widthClass) {
      classes.push(widthClass);
    }

    // Custom class — last, so it reads as the caller's final say
    if (cell.className) {
      classes.push(cell.className);
    }

    return classes.join(' ');
  }

  /**
   * Get row class. The highlight marker is still emitted for callers that hook
   * it in their own styles, but the tint itself is drawn on the flagged cell.
   */
  getRowClass(row: TableRow, hasHighlightedCell: boolean): string {
    const classes: string[] = ['gt-row'];

    if (hasHighlightedCell) {
      classes.push('gt-row--highlight');
    }

    if (row.className) {
      classes.push(row.className);
    }

    return classes.join(' ');
  }

  /**
   * Check if row has highlighted cell
   */
  hasHighlightedCell(row: TableRow): boolean {
    return row.cells.some(cell => cell.highlighted);
  }

  /**
   * Display cell value
   */
  displayValue(cell: TableCell): string {
    if (cell.label !== undefined) {
      return cell.label;
    }
    if (cell.value !== undefined && cell.value !== null && cell.value !== '') {
      return cell.value.toString();
    }
    return '-';
  }

}
