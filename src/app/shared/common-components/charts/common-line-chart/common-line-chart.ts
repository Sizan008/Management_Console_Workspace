import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {NgApexchartsModule} from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexMarkers,
  ApexTooltip,
  ApexLegend,
  ApexAnnotations,
  ApexFill,
  ApexTitleSubtitle,
} from 'ng-apexcharts';

type RangeKey = 'weekly' | 'monthly' | 'yearly';

export interface LineChartRangePack {
  categories: (string | number)[];
  series: ApexAxisChartSeries;
  yMin?: number;
  yMax?: number;
}

// Accept partial: any subset of weekly/monthly/yearly
export type LineChartAllRangesPartial = Partial<Record<RangeKey, LineChartRangePack>>;

@Component({
  selector: 'common-line-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './common-line-chart.html',
  styleUrls: ['./common-line-chart.scss'],
})
export class CommonLineChartComponent implements OnChanges {
  /** Toggle buttons */
  @Input() showWeekly = false;
  @Input() showMonthly = false;
  @Input() showYearly = false;

  /** Optional external control; if don't want to bind this, parent doesn't need a `range` var */
  @Input() range: RangeKey = 'weekly';
  @Output() rangeChange = new EventEmitter<RangeKey>();

  /** Backend bundle (can be missing some ranges) */
  @Input() dataByRange?: LineChartAllRangesPartial;

  /** Classic inputs (still supported). If dataByRange exists, these get overridden. */
  @Input() series: ApexAxisChartSeries = [];
  @Input() categories: (string | number)[] = [];

  /** Visual config */
  @Input() title: string = '';
  @Input() height = 320;
  @Input() curve: 'straight' | 'smooth' | 'stepline' = 'smooth';
  @Input() showToolbar = false;
  @Input() sparkline = false;
  @Input() showLegend = true;
  @Input() headerTitle: string = ''; // new title shown above buttons/chart


  /** Axes & extras */
  @Input() yMin?: number;
  @Input() yMax?: number;
  @Input() yTitle?: string;
  @Input() xTitle?: string;
  @Input() colors: string[] = [];
  @Input() annotations: ApexAnnotations = {};
  @Input() formatY?: (val: number) => string;

  // Chart option parts (bound in template)
  chart!: ApexChart;
  xaxis!: ApexXAxis;
  yaxis!: ApexYAxis | ApexYAxis[];
  dataLabels!: ApexDataLabels;
  stroke!: ApexStroke;
  grid!: ApexGrid;
  markers!: ApexMarkers;
  tooltip!: ApexTooltip;
  legend!: ApexLegend;
  fill!: ApexFill;
  apexTitle!: ApexTitleSubtitle;

  // ---- Helpers ----
  private availableOrder: RangeKey[] = ['weekly', 'monthly', 'yearly'];

  /** Check if a given range exists in the backend bundle */
  has(range: RangeKey): boolean {
    return !!this.dataByRange?.[range];
  }

  /** Pick the first available range by preferred order */
  private firstAvailable(): RangeKey | null {
    for (const r of this.availableOrder) {
      if (this.has(r)) return r;
    }
    return null;
  }

  constructor() {
    this.buildOptions();
  }

  ngOnChanges(): void {
    // If we have backend data, ensure the active range is valid and apply it
    if (this.dataByRange) {
      if (!this.has(this.range)) {
        const fallback = this.firstAvailable();
        if (fallback) this.range = fallback;
      }
      this.applyRangePack(this.range);
    }
    this.buildOptions();
  }

  /** Called when clicking the internal buttons */
  setRange(r: RangeKey): void {
    // Don't allow switching to a non-existent range
    if (this.dataByRange && !this.has(r)) return;

    this.range = r;

    if (this.dataByRange) {
      this.applyRangePack(r);
      this.buildOptions();
    } else {
      // If no backend bundle, let the parent react and swap series/categories
      this.rangeChange.emit(r);
    }
  }

  private applyRangePack(r: RangeKey): void {
    const pack = this.dataByRange?.[r];
    if (!pack) return;

    // keep original series but enforce color
    const palette = (this.colors && this.colors.length ? this.colors : []) as string[];

    this.series = (pack.series || []).map((s, i) => ({
      ...s,
      // Apex allows per-series color
      color: palette.length ? palette[i % palette.length] : undefined,
    }));

    this.categories = pack.categories ?? [];
    this.yMin = pack.yMin;
    this.yMax = pack.yMax;
  }


  private buildOptions(): void {
    this.chart = {
      type: 'line',
      height: this.height,
      toolbar: {show: this.showToolbar},
      sparkline: {enabled: this.sparkline},
      animations: {enabled: true},
      foreColor: '#334155',
      fontFamily: 'inherit',
    };

    this.apexTitle = {text: this.title};

    this.xaxis = {
      categories: this.categories,
      title: this.xTitle ? {text: this.xTitle} : undefined,
      axisBorder: {show: false},
      axisTicks: {show: false},
    };

    this.yaxis = {
      min: this.yMin,
      max: this.yMax,
      title: this.yTitle ? {text: this.yTitle} : undefined,
      labels: {formatter: this.formatY},
    };

    this.dataLabels = {enabled: false};
    this.stroke = {curve: this.curve, width: 2};
    this.grid = {strokeDashArray: 4, padding: {left: 10, right: 10}};
    this.markers = {size: 3};

    this.tooltip = {
      shared: true,
      intersect: false,
      y: {formatter: this.formatY},
    };

    this.legend = {show: this.showLegend, position: 'bottom'};

    this.fill = {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.2,
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    };

    this.stroke = {
      curve: this.curve,
      width: 2,
      colors: this.colors && this.colors.length ? this.colors : undefined,
    };

    this.markers = {
      size: 3,
      colors: this.colors && this.colors.length ? this.colors : undefined,
      strokeColors: this.colors && this.colors.length ? this.colors : undefined,
    };

  }
}
