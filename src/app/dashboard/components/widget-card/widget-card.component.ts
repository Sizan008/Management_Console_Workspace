import { Component, HostListener, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WidgetPreviewComponent } from '../widget-preview/widget-preview.component';
import { QueryResult, FilterDefinition } from '../../models/widget.model';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts;

@Component({
  selector: 'app-widget-card',
  standalone: true,
  imports: [CommonModule, WidgetPreviewComponent],
  templateUrl: './widget-card.component.html',
  styleUrl: './widget-card.component.scss'
})
export class WidgetCardComponent {
  private sanitizer = inject(DomSanitizer);

  // Inputs
  widgetId      = input.required<number>();
  widgetType    = input.required<string>();
  widgetName    = input.required<string>();
  isConfigured  = input<boolean>(true);
  data          = input<QueryResult | null>(null);
  isRefreshing  = input<boolean>(false);
  filterDefs    = input<FilterDefinition[]>([]);
  filterValues  = input<Record<string, any>>({});
  rangeOptions  = input<Array<{ key: string; label: string }>>([]);
  currentRange  = input<string>('ALL');
  customFrom    = input<string>('');
  customTo      = input<string>('');
  renderConfig  = input<Record<string, any>>({});
  chartStyle    = input<string>('donut');
  enableDateSort = input<boolean>(false);
  unsaved       = input<boolean>(false);

  // Outputs
  refresh          = output<void>();
  rangeChange      = output<string>();
  customFromChange = output<string>();
  customToChange   = output<string>();
  applyCustomRange = output<void>();
  filterChange     = output<{ paramName: string; value: any }>();

  // Internal state
  readonly zoomed = signal(false);
  exportMenuOpen = false;
  private readonly drillFilters = signal<Record<string, any>>({});

  openZoom()  { this.zoomed.set(true); }
  closeZoom() { this.zoomed.set(false); }
  toggleExportMenu(event?: Event): void {
    event?.stopPropagation();
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.zoomed()) this.closeZoom(); this.exportMenuOpen = false; }

  @HostListener('document:click')
  onDocumentClick() { this.exportMenuOpen = false; }

  // Drill
  readonly drillEntries = computed(() =>
    Object.entries(this.drillFilters()).map(([column, value]) => ({ column, value }))
  );

  applyDrill(column: string, value: any): void {
    this.drillFilters.update(m => ({ ...m, [column]: value }));
  }
  clearDrill(column: string): void {
    this.drillFilters.update(m => { const n = { ...m }; delete n[column]; return n; });
  }
  clearAllDrill(): void { this.drillFilters.set({}); }

  // Drilled data
  readonly drilledData = computed<QueryResult | null>(() => {
    const base = this.data();
    if (!base) return null;
    const entries = this.drillEntries();
    if (entries.length === 0) return base;
    const rows = base.rows.filter(row =>
      entries.every(({ column, value }) => String(row[column] ?? '') === String(value))
    );
    return { ...base, rows, totalRows: rows.length };
  });

  // Type icon
  readonly typeIcon = computed<SafeHtml>(() => this.buildTypeIcon(this.widgetType()));

  private buildTypeIcon(type: string): SafeHtml {
    const mk = (body: string, vb = '0 0 1024 1024') =>
      this.sanitizer.bypassSecurityTrustHtml(
        `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
      );
    const icons: Record<string, SafeHtml> = {
      BAR_CHART:     mk(`<path d="M405.333333 469.333333h213.333334v426.666667H405.333333zM128 256h213.333333v640H128zM682.666667 128h213.333333v768H682.666667z" fill="#00BCD4"/>`),
      LINE_CHART:    mk(`<path d="M170.666667 810.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#3F51B5"/><path d="M341.333333 853.333333m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#3F51B5"/><path d="M512 704m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#3F51B5"/><path d="M682.666667 746.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#3F51B5"/><path d="M853.333333 661.333333m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#3F51B5"/><path d="M834.133333 622.933333l-155.733333 78.933334-177.066667-44.8-170.666666 149.333333-149.333334-36.266667-21.333333 81.066667 192 49.066667 170.666667-149.333334 164.266666 40.533334 185.6-91.733334z" fill="#3F51B5"/><path d="M170.666667 426.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#00BCD4"/><path d="M341.333333 469.333333m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#00BCD4"/><path d="M512 320m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#00BCD4"/><path d="M682.666667 426.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#00BCD4"/><path d="M853.333333 170.666667m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#00BCD4"/><path d="M817.066667 147.2c-44.8 68.266667-113.066667 170.666667-147.2 221.866667-25.6-14.933333-66.133333-42.666667-136.533334-85.333334l-27.733333-17.066666-177.066667 155.733333-149.333333-36.266667-21.333333 83.2 192 49.066667 164.266666-142.933333c55.466667 34.133333 123.733333 76.8 138.666667 87.466666l10.666667 10.666667 19.2-2.133333c23.466667-2.133333 23.466667-2.133333 202.666666-275.2l-68.266666-49.066667z" fill="#00BCD4"/>`),
      PIE_CHART:     mk(`<path d="M877.387 523.945c-1.663 198.958-163.571 360.868-362.532 362.531-198.991 1.661-360.885-166.07-362.526-362.531-0.697-83.354-130.015-83.42-129.318 0 1.064 127.401 49.851 247.752 136.97 340.531 86.427 92.047 208.144 143.457 333.116 150.77 127.267 7.454 251.374-40.885 347.279-122.774 96.086-82.04 150.659-201.304 164.166-325.296 1.565-14.352 2.04-28.805 2.16-43.23 0.697-83.421-128.618-83.355-129.315-0.001z" fill="#4A5699"/><path d="M152.329 500.646c1.662-198.965 163.563-360.875 362.526-362.537 83.354-0.697 83.419-130.013 0-129.317-129.524 1.081-252.396 51.567-345.385 141.68C75.465 241.564 24.097 370.538 23.011 500.646c-0.697 83.421 128.62 83.349 129.318 0z" fill="#C45FA0"/><path d="M400.998 617.112c-54.167-72.265-46.168-154.096 21.221-212.268 63.03-54.412 156.255-33.802 209.578 32.46 22.13 27.497 68.54 22.901 91.441 0 26.914-26.917 22.073-64.009 0-91.44-89.215-110.859-259.653-132.629-373.618-47.204-118.817 89.062-151.202 262.422-60.284 383.718 21.095 28.142 55.432 42.548 88.465 23.196 27.799-16.282 44.387-60.192 23.197-88.462z" fill="#E5594F"/><path d="M628.723 433.281c30.673 40.924 38.604 71.548 34.179 119.265 0.715-5.845 0.408-4.79-0.924 3.173-1.3 6.769-3.259 13.386-5.207 19.983-4.113 13.896-2.982 9.9-9.75 22.736-11.978 22.716-23.474 34.203-45.271 51.746-27.499 22.131-22.904 68.538 0 91.441 26.914 26.913 64.011 22.075 91.439 0 110.85-89.224 132.613-259.649 47.193-373.614-21.092-28.142-55.431-42.546-88.466-23.196-27.799 16.287-44.384 60.193-23.193 88.466z" fill="#F39A2B"/>`),
      KPI_CARD:      mk(`<path d="M7.6667,27.5027,2,22.4484l1.3311-1.4927,5.6411,5.0316,7.6906-7.4449a1.9282,1.9282,0,0,1,2.6736-.0084L22.96,21.9983l5.5791-5.9735L30,17.3905l-5.5812,5.9758a1.996,1.996,0,0,1-2.8379.08l-3.5765-3.4191-7.666,7.4206A1.9629,1.9629,0,0,1,7.6667,27.5027Z"/><polygon points="30 11 26 11 28 8 30 11"/><path d="M22,4H18V6h4V8H19v2h3v2H18v2h4a2.0027,2.0027,0,0,0,2-2V6A2.0023,2.0023,0,0,0,22,4Z"/><path d="M16,14H10V10a2.002,2.002,0,0,1,2-2h2V6H10V4h4a2.0023,2.0023,0,0,1,2,2V8a2.0023,2.0023,0,0,1-2,2H12v2h4Z"/><polygon points="6 12 6 4 4 4 4 5 2 5 2 7 4 7 4 12 2 12 2 14 8 14 8 12 6 12"/>`, '0 0 32 32'),
      DATA_TABLE:    mk(`<path d="M91.89 238.457c-29.899 0-54.133 24.239-54.133 54.134 0 29.899 24.234 54.137 54.133 54.137s54.138-24.238 54.138-54.137c0-29.896-24.239-54.134-54.138-54.134z" fill="#E5594F"/><path d="M91.89 462.463c-29.899 0-54.133 24.239-54.133 54.139 0 29.895 24.234 54.133 54.133 54.133s54.138-24.238 54.138-54.133c0-29.9-24.239-54.139-54.138-54.139z" fill="#C45FA0"/><path d="M91.89 686.475c-29.899 0-54.133 24.237-54.133 54.133 0 29.899 24.234 54.138 54.133 54.138s54.138-24.238 54.138-54.138c0-29.896-24.239-54.133-54.138-54.133z" fill="#F39A2B"/><path d="M941.26 234.723H328.964c-28.867 0-52.263 23.4-52.263 52.268v3.734c0 28.868 23.396 52.269 52.263 52.269H941.26c28.869 0 52.269-23.401 52.269-52.269v-3.734c-0.001-28.868-23.4-52.268-52.269-52.268z" fill="#F0D043"/><path d="M941.26 682.74H328.964c-28.867 0-52.263 23.399-52.263 52.268v3.734c0 28.863 23.396 52.269 52.263 52.269H941.26c28.869 0 52.269-23.405 52.269-52.269v-3.734c-0.001-28.868-23.4-52.268-52.269-52.268z" fill="#4A5699"/><path d="M709.781 458.729H328.964c-28.867 0-52.263 23.4-52.263 52.269v3.734c0 28.873 23.396 52.269 52.263 52.269h380.817c28.866 0 52.271-23.396 52.271-52.269v-3.734c0.001-28.869-23.405-52.269-52.271-52.269z" fill="#E5594F"/>`),
      APPROVAL_LIST: mk(`<path d="M512 64l100.266667 76.8 123.733333-17.066667 46.933333 117.333334 117.333334 46.933333-17.066667 123.733333L960 512l-76.8 100.266667 17.066667 123.733333-117.333334 46.933333-46.933333 117.333334-123.733333-17.066667L512 960l-100.266667-76.8-123.733333 17.066667-46.933333-117.333334-117.333334-46.933333 17.066667-123.733333L64 512l76.8-100.266667-17.066667-123.733333 117.333334-46.933333 46.933333-117.333334 123.733333 17.066667z" fill="#8BC34A"/><path d="M738.133333 311.466667L448 601.6l-119.466667-119.466667-59.733333 59.733334 179.2 179.2 349.866667-349.866667z" fill="#CCFF90"/>`)
    };
    return icons[type] ?? mk(`<rect x="128" y="128" width="768" height="768" rx="80" fill="#94a3b8"/>`);
  }

  doExport(format: 'csv' | 'xls' | 'pdf' | 'png'): void {
    this.exportMenuOpen = false;
    const result = this.drilledData();
    if (!result || result.rows.length === 0) return;
    const name = this.widgetName() ?? 'export';
    switch (format) {
      case 'csv': this.exportCsv(result, name); break;
      case 'xls': this.exportXls(result, name); break;
      case 'pdf': this.exportPdf(result, name); break;
      case 'png': this.exportPng(result, name); break;
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportCsv(result: QueryResult, name: string): void {
    const cols = result.columns;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      cols.map(esc).join(','),
      ...result.rows.map(r => cols.map(c => esc(r[c])).join(','))
    ].join('\n');
    this.triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${name}.csv`);
  }

  private exportXls(result: QueryResult, name: string): void {
    const ws = XLSX.utils.json_to_sheet(result.rows.map(r =>
      Object.fromEntries(result.columns.map(c => [c, r[c] ?? '']))
    ));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${name}.xls`, { bookType: 'xls' });
  }

  private exportPdf(result: QueryResult, name: string): void {
    const cols = result.columns;
    const headerRow = cols.map(c => ({ text: c, bold: true, color: '#fff', fillColor: '#2563eb' }));
    const dataRows = result.rows.map((r, i) =>
      cols.map(c => ({ text: String(r[c] ?? ''), fillColor: i % 2 === 0 ? '#f8fafc' : '#fff' }))
    );
    const docDef: any = {
      pageOrientation: cols.length > 6 ? 'landscape' : 'portrait',
      content: [{
        table: {
          headerRows: 1,
          widths: Array(cols.length).fill('*'),
          body: [headerRow, ...dataRows]
        },
        layout: 'lightHorizontalLines'
      }],
      defaultStyle: { fontSize: 8 }
    };
    pdfMake.createPdf(docDef).download(`${name}.pdf`);
  }

  private exportPng(result: QueryResult, name: string): void {
    const cols = result.columns;
    const rows = result.rows;
    const cellPadX = 10, headerH = 32, rowH = 26;
    const colW = Math.max(100, Math.min(200, Math.floor(1400 / Math.max(cols.length, 1))));
    const canvasW = colW * cols.length;
    const canvasH = headerH + rowH * rows.length + 1;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Header
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, canvasW, headerH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    cols.forEach((col, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(i * colW + cellPadX, 0, colW - cellPadX * 2, headerH);
      ctx.clip();
      ctx.fillText(col, i * colW + cellPadX, headerH - 10);
      ctx.restore();
    });

    // Data rows
    ctx.font = '11px sans-serif';
    rows.forEach((row, ri) => {
      const y = headerH + ri * rowH;
      ctx.fillStyle = ri % 2 === 0 ? '#f8fafc' : '#fff';
      ctx.fillRect(0, y, canvasW, rowH);
      ctx.fillStyle = '#1e293b';
      cols.forEach((col, ci) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ci * colW + cellPadX, y, colW - cellPadX * 2, rowH);
        ctx.clip();
        ctx.fillText(String(row[col] ?? ''), ci * colW + cellPadX, y + 17);
        ctx.restore();
      });
    });

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < cols.length; i++) {
      ctx.beginPath(); ctx.moveTo(i * colW, 0); ctx.lineTo(i * colW, canvasH); ctx.stroke();
    }
    for (let i = 1; i <= rows.length; i++) {
      const y = headerH + i * rowH;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasW, y); ctx.stroke();
    }

    canvas.toBlob(blob => { if (blob) this.triggerDownload(blob, `${name}.png`); });
  }
}
