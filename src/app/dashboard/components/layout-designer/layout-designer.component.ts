import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal, computed } from '@angular/core';
import { WidgetLayoutPosition } from '../../models/dashboard.model';
import { resolveLayoutPositions } from '../../models/layout.util';
import { Widget } from '../../models/widget.model';

const COLS = 12;

@Component({
  selector: 'app-layout-designer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './layout-designer.component.html',
  styleUrls: ['./layout-designer.component.scss']
})
export class LayoutDesignerComponent implements OnInit {
  @Input() layoutConfigJson: string | null = null;
  @Input() widgets: Widget[] = [];
  @Output() layoutSaved = new EventEmitter<string>();

  layoutPositions = signal<Map<number, WidgetLayoutPosition>>(new Map());
  selectedWidgetId = signal<number | null>(null);

  // Resize drag state
  isResizing = signal(false);
  resizingWidget = signal<{
    id: number;
    startColSpan: number; startRowSpan: number;
    startColStart: number;
    startX: number; startY: number;
    direction: 'width' | 'height' | 'left';
  } | null>(null);

  // Widget drag-to-move state
  draggedId  = signal<number | null>(null);
  dragOverId = signal<number | null>(null);
  dragOverCell = signal<{ col: number; row: number } | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────

  /** Max occupied row end + 3 buffer rows for drop targets below. */
  gridRows = computed(() => {
    let max = 3;
    this.layoutPositions().forEach(pos => {
      max = Math.max(max, pos.rowStart + pos.rowSpan - 1);
    });
    return max + 3;
  });

  /** Widgets sorted by (rowStart, colStart) for stable DOM order. */
  sortedWidgets = computed(() => {
    const positions = this.layoutPositions();
    return [...this.widgets].sort((a, b) => {
      const pa = positions.get(a.id);
      const pb = positions.get(b.id);
      if (!pa || !pb) return 0;
      return pa.rowStart !== pb.rowStart
        ? pa.rowStart - pb.rowStart
        : pa.colStart - pb.colStart;
    });
  });

  /**
   * Valid top-left cell positions where the dragged widget can be placed
   * without overlapping any other widget and without exceeding the grid width.
   * Only computed while a drag is in progress.
   */
  validDropCells = computed(() => {
    const id = this.draggedId();
    if (id === null) return [];
    const pos = this.layoutPositions().get(id);
    if (!pos) return [];
    const { colSpan, rowSpan } = pos;
    const rows = this.gridRows();
    const cells: { col: number; row: number }[] = [];
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= COLS - colSpan + 1; col++) {
        if (this.canFitAt(col, row, colSpan, rowSpan, id)) {
          cells.push({ col, row });
        }
      }
    }
    return cells;
  });

  ngOnInit(): void {
    this.loadLayout();
  }

  // ── Layout loading ─────────────────────────────────────────────────────────

  private loadLayout(): void {
    let saved: Record<number, WidgetLayoutPosition> | null = null;
    if (this.layoutConfigJson) {
      try {
        const config = JSON.parse(this.layoutConfigJson);
        const firstEntry = Object.values(config)[0] as any;
        // Legacy config used `order` instead of colStart/rowStart — ignore it and
        // treat as no saved config so everything re-flows to the default layout.
        if (!firstEntry || typeof firstEntry.colStart === 'number') {
          saved = config;
        }
      } catch {
        saved = null;
      }
    }

    // resolveLayoutPositions handles all three cases in one pass:
    //  - present widgets keep their saved position
    //  - newly-permitted widgets drop into the first free slot (no overlap)
    //  - removed / permission-revoked widgets are omitted
    const resolved = resolveLayoutPositions(this.widgets.map(w => w.id), saved);
    this.layoutPositions.set(
      new Map(Object.entries(resolved).map(([id, pos]) => [Number(id), pos])),
    );
  }

  // ── Collision helpers ──────────────────────────────────────────────────────

  /**
   * Returns true if a rectangle (col, row, colSpan, rowSpan) fits in the grid
   * without overlapping any widget other than excludeId.
   */
  canFitAt(col: number, row: number, colSpan: number, rowSpan: number, excludeId: number): boolean {
    if (col + colSpan - 1 > COLS) return false;
    for (const [id, pos] of this.layoutPositions()) {
      if (id === excludeId) continue;
      const noOverlap =
        col + colSpan - 1 < pos.colStart ||
        col > pos.colStart + pos.colSpan - 1 ||
        row + rowSpan - 1 < pos.rowStart ||
        row > pos.rowStart + pos.rowSpan - 1;
      if (!noOverlap) return false;
    }
    return true;
  }

  // ── Widget drag (move to cell or swap) ─────────────────────────────────────

  onDragStart(widgetId: number, event: DragEvent): void {
    this.draggedId.set(widgetId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(widgetId));
    }
  }

  /** Drop on another widget — swap positions if both fit at each other's location. */
  onDragOverWidget(widgetId: number, event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverCell.set(null);
    if (this.dragOverId() !== widgetId) this.dragOverId.set(widgetId);
  }

  onDropOnWidget(targetId: number, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = this.draggedId();
    this.dragOverId.set(null);
    this.draggedId.set(null);
    if (sourceId == null || sourceId === targetId) return;

    this.layoutPositions.update(positions => {
      const src = positions.get(sourceId);
      const tgt = positions.get(targetId);
      if (!src || !tgt) return positions;

      // Both must fit at the other's position (excluding each other from collision).
      const srcFits = this.canFitAtExcluding(tgt.colStart, tgt.rowStart, src.colSpan, src.rowSpan, [sourceId, targetId]);
      const tgtFits = this.canFitAtExcluding(src.colStart, src.rowStart, tgt.colSpan, tgt.rowSpan, [sourceId, targetId]);
      if (!srcFits || !tgtFits) return positions;

      const tmpCol = src.colStart, tmpRow = src.rowStart;
      src.colStart = tgt.colStart; src.rowStart = tgt.rowStart;
      tgt.colStart = tmpCol;       tgt.rowStart = tmpRow;
      return new Map(positions);
    });
  }

  private canFitAtExcluding(col: number, row: number, colSpan: number, rowSpan: number, excludeIds: number[]): boolean {
    if (col + colSpan - 1 > COLS) return false;
    for (const [id, pos] of this.layoutPositions()) {
      if (excludeIds.includes(id)) continue;
      const noOverlap =
        col + colSpan - 1 < pos.colStart ||
        col > pos.colStart + pos.colSpan - 1 ||
        row + rowSpan - 1 < pos.rowStart ||
        row > pos.rowStart + pos.rowSpan - 1;
      if (!noOverlap) return false;
    }
    return true;
  }

  /** Drop on an empty cell — move the widget to that position. */
  onDragOverCell(cell: { col: number; row: number }, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverId.set(null);
    this.dragOverCell.set(cell);
  }

  onCellDragLeave(): void {
    this.dragOverCell.set(null);
  }

  onDropOnCell(cell: { col: number; row: number }, event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = this.draggedId();
    this.dragOverCell.set(null);
    this.draggedId.set(null);
    if (sourceId == null) return;

    const pos = this.layoutPositions().get(sourceId);
    if (!pos) return;
    if (!this.canFitAt(cell.col, cell.row, pos.colSpan, pos.rowSpan, sourceId)) return;

    this.layoutPositions.update(positions => {
      const p = positions.get(sourceId);
      if (p) { p.colStart = cell.col; p.rowStart = cell.row; }
      return new Map(positions);
    });
  }

  onDragEnd(): void {
    this.draggedId.set(null);
    this.dragOverId.set(null);
    this.dragOverCell.set(null);
  }

  // ── Resize handles ─────────────────────────────────────────────────────────

  onResizeStart(widgetId: number, direction: 'width' | 'height' | 'left', event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isResizing.set(true);
    const cur = this.layoutPositions().get(widgetId)!;
    this.resizingWidget.set({
      id: widgetId,
      startColSpan: cur.colSpan, startRowSpan: cur.rowSpan,
      startColStart: cur.colStart,
      startX: event.clientX, startY: event.clientY,
      direction
    });
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private onResizeMove = (event: MouseEvent): void => {
    const rw = this.resizingWidget();
    if (!rw) return;
    const { id, startColSpan, startRowSpan, startColStart, startX, startY, direction } = rw;

    this.layoutPositions.update(positions => {
      const pos = positions.get(id);
      if (!pos) return positions;

      if (direction === 'width') {
        const delta = event.clientX - startX;
        const newSpan = Math.max(1, Math.min(COLS - pos.colStart + 1, startColSpan + Math.round(delta / 80)));
        if (this.canFitAt(pos.colStart, pos.rowStart, newSpan, pos.rowSpan, id)) {
          pos.colSpan = newSpan;
        }
      } else if (direction === 'left') {
        // Right boundary stays fixed; left boundary moves.
        const rightEdge = startColStart + startColSpan;
        const delta = event.clientX - startX;
        const newColStart = Math.max(1, Math.min(rightEdge - 1, startColStart + Math.round(delta / 80)));
        const newColSpan = rightEdge - newColStart;
        if (this.canFitAt(newColStart, pos.rowStart, newColSpan, pos.rowSpan, id)) {
          pos.colStart = newColStart;
          pos.colSpan  = newColSpan;
        }
      } else {
        const delta = event.clientY - startY;
        const newSpan = Math.max(1, startRowSpan + Math.round(delta / 106));
        if (this.canFitAt(pos.colStart, pos.rowStart, pos.colSpan, newSpan, id)) {
          pos.rowSpan = newSpan;
        }
      }
      return new Map(positions);
    });
  };

  private onResizeEnd = (): void => {
    this.isResizing.set(false);
    this.resizingWidget.set(null);
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  };

  // ── Selection ──────────────────────────────────────────────────────────────

  onWidgetClick(widgetId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedWidgetId.set(this.selectedWidgetId() === widgetId ? null : widgetId);
  }

  onGridClick(): void {
    this.selectedWidgetId.set(null);
  }

  // ── Style helpers ──────────────────────────────────────────────────────────

  getWidgetStyle(widgetId: number): Record<string, string> {
    const pos = this.layoutPositions().get(widgetId);
    if (!pos) return {};
    return {
      'grid-column': `${pos.colStart} / span ${pos.colSpan}`,
      'grid-row':    `${pos.rowStart} / span ${pos.rowSpan}`,
    };
  }

  getCellStyle(cell: { col: number; row: number }): Record<string, string> {
    return {
      'grid-column': `${cell.col}`,
      'grid-row':    `${cell.row}`,
    };
  }

  isDragOverCell(cell: { col: number; row: number }): boolean {
    const over = this.dragOverCell();
    return over?.col === cell.col && over?.row === cell.row;
  }

  getPos(widgetId: number): WidgetLayoutPosition | undefined {
    return this.layoutPositions().get(widgetId);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  saveLayout(): void {
    const config: Record<number, WidgetLayoutPosition> = {};
    this.layoutPositions().forEach((pos, id) => { config[id] = pos; });
    this.layoutSaved.emit(JSON.stringify(config));
  }
}
