import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueryResult } from '../../models/widget.model';

@Component({
  selector: 'app-widget-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-preview.component.html',
  styleUrl: './widget-preview.component.scss'
})
export class WidgetPreviewComponent {
  readonly type        = input<string>('TABLE');
  readonly compact     = input<boolean>(false);
  readonly data        = input<QueryResult | null>(null);
  readonly chartStyle  = input<string>('donut');
  readonly renderConfig = input<Record<string, any>>({});

  /** Emitted when user clicks a bar or pie segment to drill into that value. */
  readonly drillDown = output<{ column: string; value: any }>();

  private readonly el = inject(ElementRef);

  readonly kind = computed(() => {
    const t = (this.type() || 'TABLE').toUpperCase();
    return t === 'TABLE' ? 'DATA_TABLE' : t;
  });

  readonly palette = ['#3b82f6', '#64748b', '#0ea5e9', '#94a3b8', '#1e40af', '#38bdf8'];

  // ── Tooltip state ────────────────────────────────────────────────────────────
  readonly tooltip = signal<{ visible: boolean; x: number; y: number; label: string; value: any }>({
    visible: false, x: 0, y: 0, label: '', value: ''
  });

  showTooltip(event: MouseEvent, label: string, value: any): void {
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - hostRect.left;
    const y = event.clientY - hostRect.top;
    this.tooltip.set({ visible: true, x, y, label, value });
  }

  hideTooltip(): void {
    this.tooltip.update(t => ({ ...t, visible: false }));
  }

  // ── KPI live data ────────────────────────────────────────────────────────────
  readonly kpiLive = computed(() => {
    const qr = this.data();
    if (!qr || qr.rows.length === 0) return null;
    const cfg = this.renderConfig();

    const rawField  = (cfg['metricField'] as string) || '';
    const metricCol = rawField
      ? this.col(rawField, qr.columns)
      : (qr.columns.find(c => typeof qr.rows[0][c] === 'number') ?? qr.columns[0]);
    const trendCol  = cfg['trendField'] ? this.col(cfg['trendField'] as string, qr.columns) : undefined;
    const labelText = (cfg['labelText'] as string) || metricCol;

    // For time-series views (multiple rows), show the most recent (last) row value
    const displayRow = qr.rows[qr.rows.length - 1];
    const raw = displayRow[metricCol];
    const num = Number(raw);
    const displayVal = !isNaN(num) ? this.fmtKpi(num) : String(raw ?? '—');

    // Trend delta from trendField column
    let delta: string | null = null;
    let deltaUp = true;
    if (trendCol && displayRow[trendCol] != null) {
      const pct = Number(displayRow[trendCol]);
      if (!isNaN(pct)) {
        deltaUp = pct >= 0;
        delta   = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      }
    }

    // Threshold class
    let threshClass = '';
    if (!isNaN(num)) {
      const good = Number(cfg['thresholdGood']);
      const warn = Number(cfg['thresholdWarn']);
      const crit = Number(cfg['thresholdCritical']);
      if (!isNaN(crit) && num >= crit) threshClass = 'kpi-danger';
      else if (!isNaN(warn) && num >= warn) threshClass = 'kpi-warn';
      else if (!isNaN(good)) threshClass = 'kpi-good';
    }

    // Sparkline from multiple rows (e.g., time-series view behind the KPI)
    const sparkVals = qr.rows.length > 1
      ? qr.rows.map(r => Number(r[metricCol]) || 0)
      : null;

    return { displayVal, label: labelText, threshClass, delta, deltaUp, sparkVals };
  });

  // Sparkline geometry from real multi-row data
  readonly kpiSparkSvg = computed(() => {
    const qr  = this.data();
    const cfg = this.renderConfig();
    if (!qr || qr.rows.length < 2) return null;

    const rawField  = (cfg['metricField'] as string) || '';
    const metricCol = rawField
      ? this.col(rawField, qr.columns)
      : (qr.columns.find(c => typeof qr.rows[0][c] === 'number') ?? qr.columns[0]);
    const xField    = (cfg['xAxisField'] as string) || '';
    const labelCol  = xField
      ? this.col(xField, qr.columns)
      : qr.columns.find(c => c !== metricCol);

    const W = 360, H = 70, n = qr.rows.length;
    const vals = qr.rows.map(r => Number(r[metricCol]) || 0);
    const minV = Math.min(...vals), maxV = Math.max(...vals, minV + 1);
    const span = maxV - minV;

    const pts = qr.rows.map((r, i) => ({
      x:     +(W * (i / (n - 1))).toFixed(1),
      y:     +(H * 0.88 - H * 0.76 * ((vals[i] - minV) / span)).toFixed(1),
      label: labelCol ? String(r[labelCol] ?? '') : `#${i + 1}`,
      val:   vals[i],
    }));

    const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${lineD} L ${pts[n-1].x} ${H} L 0 ${H} Z`;
    return { lineD, areaD, pts, W, H };
  });

  // Oracle returns column names in UPPERCASE regardless of alias casing.
  // This resolver matches user-typed names case-insensitively against actual columns.
  private col(name: string, columns: string[]): string {
    return columns.find(c => c.toLowerCase() === name.toLowerCase()) ?? name;
  }

  private fmtKpi(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  // ── STAT_CARD ─────────────────────────────────────────────────────────────────
  readonly statCard = computed(() => {
    const qr  = this.data();
    const cfg = this.renderConfig();
    const rawField  = (cfg['metricField'] as string) || '';
    const metricCol = rawField && qr
      ? this.col(rawField, qr.columns)
      : (qr?.columns.find(c => typeof qr.rows[0]?.[c] === 'number') ?? qr?.columns[0]);

    const row = qr && qr.rows.length > 0 ? qr.rows[qr.rows.length - 1] : null;
    const raw = row && metricCol ? row[metricCol] : null;
    const num = Number(raw);
    const prefix     = (cfg['prefix'] as string) || '';
    const displayVal = raw != null && !isNaN(num) ? prefix + this.fmtKpi(num) : '—';
    const label      = (cfg['labelText'] as string) || metricCol || 'Metric';

    return { displayVal, label };
  });

  // ── KPI sparkline (decorative background, not the line chart) ───────────────
  private readonly kpiSparkPoints = [
    { x: 10, y: 92 }, { x: 78, y: 60 }, { x: 146, y: 70 },
    { x: 214, y: 40 }, { x: 282, y: 22 }, { x: 350, y: 34 }
  ];
  readonly linePath = computed(() =>
    this.kpiSparkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  );
  readonly lineArea = computed(() => `${this.linePath()} L 350 110 L 10 110 Z`);

  // ── Line chart ──────────────────────────────────────────────────────────────
  private readonly lineFallback = [
    { label: 'Jan', val: 42 }, { label: 'Feb', val: 58 }, { label: 'Mar', val: 51 },
    { label: 'Apr', val: 74 }, { label: 'May', val: 66 }, { label: 'Jun', val: 89 },
    { label: 'Jul', val: 78 },
  ];

  readonly lineChartSvg = computed(() => {
    const W = 390, H = 200;
    const PL = 44, PR = 12, PT = 12, PB = 30;
    const cW = W - PL - PR, cH = H - PT - PB;

    const build = (rows: Array<{ label: string; val: number }>, cfg: Record<string, any>, xCol: string, yCol: string) => {
      const n = rows.length;
      if (n < 2) return null;
      const vals   = rows.map(r => r.val);
      const labels = rows.map(r => r.label);
      const maxV = Math.max(...vals), minV = Math.min(...vals);
      const spread = maxV - minV || maxV || 1;
      const chartMax = maxV + spread * 0.12;
      const chartMin = Math.max(0, minV - spread * 0.05);
      const span = chartMax - chartMin || 1;

      const grids = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        y:     +(PT + cH * (1 - pct)).toFixed(1),
        label: this.fmtNum(chartMin + span * pct),
      }));

      const pts = vals.map((v, i) => ({
        x:     +(PL + cW * (i / (n - 1))).toFixed(1),
        y:     +(PT + cH * (1 - (v - chartMin) / span)).toFixed(1),
        label: labels[i],
        val:   v,
      }));

      let lineD: string;
      if (cfg['smooth'] && n >= 3) {
        lineD = pts.reduce((acc, p, i) => {
          if (i === 0) return `M ${p.x} ${p.y}`;
          const p0 = pts[Math.max(0, i - 2)];
          const p1 = pts[i - 1];
          const p3 = pts[Math.min(n - 1, i + 1)];
          const cp1x = +(p1.x + (p.x - p0.x) / 6).toFixed(1);
          const cp1y = +(p1.y + (p.y - p0.y) / 6).toFixed(1);
          const cp2x = +(p.x  - (p3.x - p1.x) / 6).toFixed(1);
          const cp2y = +(p.y  - (p3.y - p1.y) / 6).toFixed(1);
          return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
        }, '');
      } else {
        lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      }

      const baseY = +(PT + cH).toFixed(1);
      const areaD = `${lineD} L ${pts[n-1].x} ${baseY} L ${PL} ${baseY} Z`;
      const step  = Math.max(1, Math.floor(n / 6));
      const xLabels = pts
        .filter((_, i) => i % step === 0 || i === n - 1)
        .map(p => ({ x: p.x, label: p.label.length > 8 ? p.label.slice(0, 7) + '…' : p.label }));

      return { pts, lineD, areaD, grids, xLabels, baseY, W, H, PL, xCol, yCol };
    };

    const qr  = this.data();
    const cfg = this.renderConfig();
    if (qr && qr.rows.length >= 2) {
      const s    = qr.rows[0];
      const xCol = (cfg['xField'] as string) || qr.columns.find(c => typeof s[c] === 'string') || qr.columns[0];
      const yCol = (cfg['yField'] as string) || qr.columns.find(c => typeof s[c] === 'number') || qr.columns[1];
      return build(qr.rows.map(r => ({ label: String(r[xCol] ?? ''), val: Number(r[yCol]) || 0 })), cfg, xCol, yCol);
    }
    return build(this.lineFallback.map(f => ({ ...f })), cfg, 'label', 'val');
  });

  // ── Bar chart SVG geometry ──────────────────────────────────────────────────
  private readonly barFallback = [
    { label: 'Q1', val: 62 }, { label: 'Q2', val: 34 },
    { label: 'Q3', val: 80 }, { label: 'Q4', val: 96 },
    { label: 'Q5', val: 70 }, { label: 'Q6', val: 48 },
    { label: 'Q7', val: 88 }
  ];

  readonly barChartSvg = computed(() => {
    const W = 390, H = 200;
    const PL = 44, PR = 10, PT = 12, PB = 30;
    const cW = W - PL - PR;
    const cH = H - PT - PB;

    const build = (rows: Array<{ label: string; val: number; labelCol: string; valueCol: string }>) => {
      const maxVal = Math.max(...rows.map(r => r.val), 1);
      const n      = rows.length;
      const slotW  = cW / n;
      const barW   = Math.min(Math.max(slotW * 0.55, 4), 40);
      const grids  = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        y:     +(PT + cH * (1 - pct)).toFixed(1),
        label: this.fmtNum(maxVal * pct),
      }));
      const bars = rows.map((r, i) => {
        const h = maxVal > 0 ? (r.val / maxVal) * cH : 2;
        return {
          x:        +(PL + i * slotW + (slotW - barW) / 2).toFixed(1),
          y:        +(PT + cH - h).toFixed(1),
          w:        +barW.toFixed(1),
          h:        +Math.max(h, 2).toFixed(1),
          cx:       +(PL + (i + 0.5) * slotW).toFixed(1),
          label:    r.label, val: r.val,
          labelCol: r.labelCol, valueCol: r.valueCol,
          color:    this.liveColors[i % this.liveColors.length],
        };
      });
      return { grids, bars, baseY: +(PT + cH).toFixed(1), W, H, PL };
    };

    const qr = this.data();
    if (qr && qr.rows.length > 0) {
      const s        = qr.rows[0];
      const labelCol = qr.columns.find(c => typeof s[c] === 'string') ?? qr.columns[0];
      const valueCol = qr.columns.find(c => typeof s[c] === 'number') ?? qr.columns[1];
      return build(qr.rows.map(r => ({
        label: String(r[labelCol] ?? ''), val: Number(r[valueCol]) || 0,
        labelCol, valueCol,
      })));
    }
    return build(this.barFallback.map(b => ({ ...b, labelCol: 'label', valueCol: 'val' })));
  });

  protected fmtNum(n: number): string {
    if (n === 0) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  }

  // ── Pie / donut — static fallback ───────────────────────────────────────────
  private readonly pieFallback = [
    { label: 'A', val: 38, color: '#bfdbfe' },
    { label: 'B', val: 27, color: '#bae6fd' },
    { label: 'C', val: 20, color: '#cbd5e1' },
    { label: 'D', val: 15, color: '#e2e8f0' }
  ];
  private readonly liveColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'
  ];

  // All items with original % — used for legend (shows hidden items as crossed out).
  readonly pieLegendItems = computed(() => {
    const qr     = this.data();
    const hidden = this.hiddenPieLabels();

    if (qr && qr.rows.length > 0) {
      const sample   = qr.rows[0];
      const labelCol = qr.columns.find(c => typeof sample[c] === 'string') ?? qr.columns[0];
      const valueCol = qr.columns.find(c => typeof sample[c] === 'number') ?? qr.columns[1];
      const total    = qr.rows.reduce((s, r) => s + (Number(r[valueCol]) || 0), 0);
      return qr.rows.map((row, i) => ({
        label:    String(row[labelCol] ?? ''),
        pct:      total > 0 ? Math.round((Number(row[valueCol]) || 0) / total * 100) : 0,
        color:    this.liveColors[i % this.liveColors.length],
        isHidden: hidden.has(String(row[labelCol] ?? '')),
      }));
    }

    return this.pieFallback.map(s => ({
      label: s.label, pct: s.val, color: s.color, isHidden: hidden.has(s.label),
    }));
  });

  // Only visible items, proportions recalculated — used for SVG rendering.
  readonly pieSegments = computed(() => {
    const C      = 2 * Math.PI * 42;
    const qr     = this.data();
    const hidden = this.hiddenPieLabels();

    if (qr && qr.rows.length > 0) {
      const sample   = qr.rows[0];
      const labelCol = qr.columns.find(c => typeof sample[c] === 'string') ?? qr.columns[0];
      const valueCol = qr.columns.find(c => typeof sample[c] === 'number') ?? qr.columns[1];
      const withIdx  = qr.rows
        .map((row, origIdx) => ({ row, origIdx }))
        .filter(({ row }) => !hidden.has(String(row[labelCol] ?? '')));
      const total = withIdx.reduce((s, { row }) => s + (Number(row[valueCol]) || 0), 0);
      let offset = 0;
      return withIdx.map(({ row, origIdx }) => {
        const val = Number(row[valueCol]) || 0;
        const len = total > 0 ? (val / total) * C : 0;
        const seg = {
          color:    this.liveColors[origIdx % this.liveColors.length],
          dash:     `${len} ${C - len}`,
          offset:   -offset,
          label:    String(row[labelCol] ?? ''),
          value:    val,
          pct:      total > 0 ? Math.round((val / total) * 100) : 0,
          labelCol,
          valueCol,
        };
        offset += len;
        return seg;
      });
    }

    const vis     = this.pieFallback.filter(s => !hidden.has(s.label));
    const totalFb = vis.reduce((s, f) => s + f.val, 0);
    let offset    = 0;
    return vis.map(s => {
      const len = totalFb > 0 ? (s.val / totalFb) * C : 0;
      const seg = {
        color: s.color, dash: `${len} ${C - len}`, offset: -offset,
        label: s.label, value: s.val,
        pct:   totalFb > 0 ? Math.round((s.val / totalFb) * 100) : 0,
        labelCol: 'label', valueCol: 'val',
      };
      offset += len;
      return seg;
    });
  });

  // ── Pie segment selection (highlight, no data change) ───────────────────────
  readonly selectedPieLabel  = signal<string | null>(null);
  readonly hiddenPieLabels   = signal<Set<string>>(new Set());

  togglePieSegment(label: string): void {
    this.selectedPieLabel.update(cur => cur === label ? null : label);
  }

  togglePieLegend(label: string): void {
    this.hiddenPieLabels.update(s => {
      const n = new Set(s);
      n.has(label) ? n.delete(label) : n.add(label);
      return n;
    });
    if (this.selectedPieLabel() === label) this.selectedPieLabel.set(null);
  }

  // ── Table sort / search / pagination state ────────────────────────────────
  readonly sortCol    = signal<string | null>(null);
  readonly sortDir    = signal<'asc' | 'desc'>('asc');
  readonly tablePage  = signal(0);
  readonly tableSearch = signal('');

  // Column type cache — computed once per data change
  readonly colTypes = computed((): Record<string, 'date' | 'number' | 'status' | 'text'> => {
    const qr = this.data();
    if (!qr || qr.rows.length === 0) return {};
    return Object.fromEntries(qr.columns.map(col => [col, this.detectColType(col, qr.rows)]));
  });

  private detectColType(col: string, rows: Record<string, any>[]): 'date' | 'number' | 'status' | 'text' {
    const n = col.toLowerCase();
    if (/status|state|approval|priority|type$/.test(n)) return 'status';
    if (/date|_dt|time|_at|_on$|created|updated|modified|received/.test(n)) return 'date';
    const sample = rows.find(r => r[col] != null)?.[col];
    if (typeof sample === 'number') return 'number';
    if (typeof sample === 'string' && !isNaN(Number(sample)) && sample.trim() !== '') return 'number';
    return 'text';
  }

  formatCell(val: any, colType: string): string {
    if (val == null || val === '') return '—';
    if (colType === 'number') {
      const n = Number(val);
      return isNaN(n) ? String(val) : n.toLocaleString();
    }
    if (colType === 'date') {
      const d = new Date(String(val));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return String(val);
  }

  statusChipVariant(val: any): string {
    const v = String(val ?? '').toLowerCase();
    if (/approved|active|success|complete|done|paid|yes|enabled/.test(v)) return 'chip-green';
    if (/pending|waiting|progress|review|open|draft/.test(v))             return 'chip-amber';
    if (/reject|fail|cancel|denied|closed|error|no|disabled/.test(v))     return 'chip-red';
    return 'chip-gray';
  }

  // Rows after search filter (pre-sort, pre-page)
  readonly tableFilteredRows = computed(() => {
    const qr = this.data();
    if (!qr || qr.rows.length === 0) return [];
    const q = this.tableSearch().toLowerCase().trim();
    if (!q) return qr.rows;
    return qr.rows.filter(row =>
      qr.columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
    );
  });

  readonly totalPages = computed(() => {
    const size = Number(this.renderConfig()['rowsPerPage']) || 10;
    return Math.max(1, Math.ceil(this.tableFilteredRows().length / size));
  });

  readonly tableDisplayRows = computed(() => {
    let rows = [...this.tableFilteredRows()];
    const col = this.sortCol();
    if (col) {
      const dir = this.sortDir();
      rows.sort((a, b) => {
        const av = a[col], bv = b[col];
        const cmp = (typeof av === 'number' && typeof bv === 'number')
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));
        return dir === 'asc' ? cmp : -cmp;
      });
    }
    const size  = Number(this.renderConfig()['rowsPerPage']) || 10;
    const page  = Math.min(this.tablePage(), Math.max(0, this.totalPages() - 1));
    const start = page * size;
    return rows.slice(start, start + size);
  });

  sortBy(col: string): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
    this.tablePage.set(0);
  }

  onTableSearch(e: Event): void {
    this.tableSearch.set((e.target as HTMLInputElement).value);
    this.tablePage.set(0);
  }

  prevPage(): void { if (this.tablePage() > 0) this.tablePage.update(p => p - 1); }
  nextPage(): void { if (this.tablePage() < this.totalPages() - 1) this.tablePage.update(p => p + 1); }

  // ── Table preview rows ──────────────────────────────────────────────────────
  readonly tableRows = [
    { name: 'Project Alpha', status: 'Approved', date: '09/10/2025', owner: 'Anne' },
    { name: 'Project Beta',  status: 'Pending',  date: '12/16/2025', owner: 'Donne' },
    { name: 'Project Gamma', status: 'Pending',  date: '10/18/2025', owner: 'John' },
    { name: 'Project Delta', status: 'Approved', date: '11/10/2025', owner: 'Strana' }
  ];

  readonly approvalRows = [
    { name: 'Pending item 1', status: 'Approved' },
    { name: 'Pending item 2', status: 'Pending' },
    { name: 'Approved item',  status: 'Pending' }
  ];

  statusClass(status: string): string {
    return status.toLowerCase() === 'approved' ? 'is-approved' : 'is-pending';
  }
}
