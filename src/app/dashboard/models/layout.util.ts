import { WidgetLayoutPosition } from './dashboard.model';

const COLS = 12;
const DEFAULT_COL_SPAN = 6; // 2 widgets per row
const DEFAULT_ROW_SPAN = 3;

function overlaps(
  a: WidgetLayoutPosition,
  col: number, row: number, colSpan: number, rowSpan: number,
): boolean {
  const noOverlap =
    col + colSpan - 1 < a.colStart ||
    col > a.colStart + a.colSpan - 1 ||
    row + rowSpan - 1 < a.rowStart ||
    row > a.rowStart + a.rowSpan - 1;
  return !noOverlap;
}

/** First (colStart,rowStart) where a colSpan×rowSpan box fits without overlapping `placed`. */
function firstFreeSlot(
  placed: WidgetLayoutPosition[],
  colSpan: number, rowSpan: number,
): { colStart: number; rowStart: number } {
  for (let row = 1; row < 1000; row++) {
    for (let col = 1; col <= COLS - colSpan + 1; col++) {
      if (!placed.some(p => overlaps(p, col, row, colSpan, rowSpan))) {
        return { colStart: col, rowStart: row };
      }
    }
  }
  return { colStart: 1, rowStart: 1 };
}

/**
 * Resolve a complete, non-overlapping set of grid positions for exactly the
 * widgets currently present (and permitted).
 *
 *  - Widgets already in `savedConfig` keep their saved position.
 *  - Widgets missing from `savedConfig` (newly permitted) are dropped into the
 *    first free slot, so they never land on top of an existing widget.
 *  - Entries in `savedConfig` for widgets that are no longer present (removed,
 *    or permission revoked) are omitted — they can't leave a ghost or block a slot.
 *  - When `savedConfig` is empty/absent, every widget is "missing", so the
 *    free-slot fill naturally produces the default 2-per-row layout.
 *
 * `widgetIds` order is honoured, so the designer and the live view — given the
 * same widget list and saved config — always compute identical positions.
 */
export function resolveLayoutPositions(
  widgetIds: number[],
  savedConfig: Record<number, WidgetLayoutPosition> | null | undefined,
): Record<number, WidgetLayoutPosition> {
  const result: Record<number, WidgetLayoutPosition> = {};
  const placed: WidgetLayoutPosition[] = [];
  const missing: number[] = [];

  // 1) Preserve saved positions for widgets that still exist.
  for (const id of widgetIds) {
    const saved = savedConfig?.[id];
    if (saved && typeof saved.colStart === 'number' && typeof saved.rowStart === 'number') {
      const pos: WidgetLayoutPosition = {
        colStart: saved.colStart,
        colSpan:  saved.colSpan ?? DEFAULT_COL_SPAN,
        rowStart: saved.rowStart,
        rowSpan:  saved.rowSpan ?? DEFAULT_ROW_SPAN,
        displayMode: saved.displayMode,
      };
      result[id] = pos;
      placed.push(pos);
    } else {
      missing.push(id);
    }
  }

  // 2) Drop newly-permitted widgets into the first free slot.
  for (const id of missing) {
    const slot = firstFreeSlot(placed, DEFAULT_COL_SPAN, DEFAULT_ROW_SPAN);
    const pos: WidgetLayoutPosition = {
      colStart: slot.colStart,
      colSpan:  DEFAULT_COL_SPAN,
      rowStart: slot.rowStart,
      rowSpan:  DEFAULT_ROW_SPAN,
    };
    result[id] = pos;
    placed.push(pos);
  }

  return result;
}
