import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexTooltip,
  ApexLegend,
  ApexAnnotations,
  ApexFill,
  ApexTitleSubtitle,
  ApexPlotOptions,
} from 'ng-apexcharts';

type RangeKey = 'weekly' | 'monthly' | 'yearly';

export interface StackedRangePack {
  categories: (string | number)[];
  series: ApexAxisChartSeries; // each series is { name, data: number[] }
  yMin?: number;
  yMax?: number;
}

export type StackedAllRangesPartial = Partial<Record<RangeKey, StackedRangePack>>;

@Component({
  selector: 'common-stacked-column-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './common-stacked-column-chart.html',
  styleUrls: ['./common-stacked-column-chart.scss']
})
export class CommonStackedColumnChart implements OnChanges {
  /** Header */
  @Input() headerTitle: string = 'Stacked Column';

  /** Range toggles */
  @Input() showWeekly = false;
  @Input() showMonthly = false;
  @Input() showYearly = false;

  /** Optional external control */
  @Input() range: RangeKey = 'weekly';
  @Output() rangeChange = new EventEmitter<RangeKey>();

  /** Backend bundle (may be partial) */
  @Input() dataByRange?: StackedAllRangesPartial;

  /** Classic inputs (used if dataByRange not provided) */
  @Input() series: ApexAxisChartSeries = [];
  @Input() categories: (string | number)[] = [];

  /** Visual config */
  @Input() height = 340;
  @Input() colors: string[] = [];
  @Input() yTitle?: string;
  @Input() xTitle?: string;
  @Input() yMin?: number;
  @Input() yMax?: number;
  @Input() showToolbar = false;
  @Input() showLegend = true;
  @Input() annotations: ApexAnnotations = {};
  @Input() title: string = ''; // (optional) Apex internal title if you want it on the chart area

  /** Internal option parts */
  chart!: ApexChart;
  xaxis!: ApexXAxis;
  yaxis!: ApexYAxis | ApexYAxis[];
  dataLabels!: ApexDataLabels;
  stroke!: ApexStroke;
  grid!: ApexGrid;
  tooltip!: ApexTooltip;
  legend!: ApexLegend;
  fill!: ApexFill;
  apexTitle!: ApexTitleSubtitle;
  plotOptions!: ApexPlotOptions;

  private order: RangeKey[] = ['weekly', 'monthly', 'yearly'];

  /** Public so template can call it in @if */
  has(r: RangeKey): boolean {
    const hasData = !!this.dataByRange?.[r];
    const enabled =
      r === 'weekly'  ? this.showWeekly  :
        r === 'monthly' ? this.showMonthly :
          this.showYearly;
    return hasData && enabled;
  }


  private firstAvailable(): RangeKey | null {
    for (const r of this.order) if (this.has(r)) return r;
    return null;
  }

  ngOnChanges(): void {
    if (this.dataByRange) {
      if (!this.has(this.range)) {
        const fallback = this.firstAvailable();
        if (fallback) this.range = fallback;
      }
      this.applyRangePack(this.range);
    }
    this.buildOptions();
  }

  setRange(r: RangeKey): void {
    if (this.dataByRange && !this.has(r)) return;

    this.range = r;
    if (this.dataByRange) {
      this.applyRangePack(r);
      this.buildOptions();
    } else {
      this.rangeChange.emit(r);
    }
  }

  private applyRangePack(r: RangeKey): void {
    const pack = this.dataByRange?.[r];
    if (!pack) return;

    const palette = (this.colors?.length ? this.colors : []) as string[];

    // Enforce per-series colors so palette always applies
    this.series = (pack.series || []).map((s, i) => ({
      ...s,
      color: palette.length ? palette[i % palette.length] : undefined
    }));

    this.categories = pack.categories ?? [];
    this.yMin = pack.yMin;
    this.yMax = pack.yMax;
  }

  private buildOptions(): void {
    this.chart = {
      type: 'bar',
      height: this.height,
      stacked: true,
      toolbar: { show: this.showToolbar },
      animations: { enabled: true },
      foreColor: '#334155',
      fontFamily: 'inherit'
    };

    this.plotOptions = {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 3,
        dataLabels: {
          total: {
            enabled: false
          }
        }
      }
    };

    this.apexTitle = { text: this.title || '' };

    this.xaxis = {
      categories: this.categories,
      title: this.xTitle ? { text: this.xTitle } : undefined,
      axisBorder: { show: false },
      axisTicks: { show: false }
    };

    this.yaxis = {
      min: this.yMin,
      max: this.yMax,
      title: this.yTitle ? { text: this.yTitle } : undefined
    };

    this.dataLabels = { enabled: false };

    this.stroke = {
      show: true,
      width: 1,
      colors: this.colors?.length ? this.colors : undefined
    };

    this.grid = {
      strokeDashArray: 4,
      padding: { left: 10, right: 10 }
    };

    this.tooltip = {
      shared: false,        // <- NOT shared
      intersect: true,      // <- must hover the actual bar segment
      followCursor: true,   // optional: keeps tooltip near cursor
      y: {
        formatter: (val) => (val != null ? String(val) : '')
      }
    };

    this.legend = {
      show: this.showLegend,
      position: 'bottom',
      markers: {
        width: 12,
        height: 12,
        offsetX: 0,
        offsetY: 0
      } as any,
      itemMargin: {
        horizontal: 8,
        vertical: 4
      } as any
    };


    this.fill = { opacity: 0.9 };
  }
}
