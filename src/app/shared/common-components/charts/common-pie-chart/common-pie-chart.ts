import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexLegend,
  ApexFill,
  ApexTooltip,
  ApexDataLabels,
} from 'ng-apexcharts';

type RangeKey = 'weekly' | 'monthly' | 'yearly';

export interface PieChartPack {
  labels: string[];
  data: number[];
}

export type PieChartAllRanges = Partial<Record<RangeKey, PieChartPack>>;

@Component({
  selector: 'common-pie-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, NgClass],
  templateUrl: './common-pie-chart.html',
  styleUrls: ['./common-pie-chart.scss'],
})
export class CommonPieChart implements OnChanges {
  /** Header title */
  @Input() headerTitle = 'Pie Chart';
  @Input() tooltipLabel?: string;

  /** Range toggles */
  @Input() showWeekly = true;
  @Input() showMonthly = true;
  @Input() showYearly = true;

  /** Data */
  @Input() dataByRange?: PieChartAllRanges;

  /** Visual configuration */
  @Input() height = 340;
  @Input() colors: string[] = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  @Input() showLegend = true;
  @Input() legendPosition: 'bottom' | 'right' = 'bottom';
  @Input() showDataLabels = true;

  /** Range control */
  @Input() range: RangeKey = 'weekly';
  @Output() rangeChange = new EventEmitter<RangeKey>();

  /** Apex config */
  series: ApexNonAxisChartSeries = [];
  chart!: ApexChart;
  labels: string[] = [];
  legend!: ApexLegend;
  fill!: ApexFill;
  tooltip!: ApexTooltip;
  dataLabels!: ApexDataLabels;
  responsive: ApexResponsive[] = [];

  private order: RangeKey[] = ['weekly', 'monthly', 'yearly'];

  has(r: RangeKey): boolean {
    const hasData = !!this.dataByRange?.[r];
    const enabled =
      r === 'weekly'
        ? this.showWeekly
        : r === 'monthly'
          ? this.showMonthly
          : this.showYearly;
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
      if (this.has(this.range)) this.buildChart();
    } else {
      this.series = [];
      this.buildChart();
    }
  }

  setRange(r: RangeKey): void {
    if (this.dataByRange && !this.has(r)) return;
    this.range = r;
    this.rangeChange.emit(r);
    this.buildChart();
  }

  private buildChart(): void {
    const pack = this.dataByRange?.[this.range];
    this.series = pack?.data ?? [];
    this.labels = pack?.labels ?? [];
    const label = this.tooltipLabel || this.headerTitle;

    this.chart = {
      type: 'pie',
      height: this.height,
      foreColor: '#334155',
      fontFamily: 'inherit',
      toolbar: { show: false },
    };

    this.legend = {
      show: this.showLegend,
      position: this.legendPosition,
      fontSize: '13px',
      labels: { colors: '#334155' },
    };

    this.tooltip = {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex];
        const value = series[seriesIndex];
        const color = w.globals.colors[seriesIndex];
        const title = this.tooltipLabel || this.headerTitle;

        return `
      <div style="
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        padding: 0;
        margin: 0;
      ">
        <!-- Header -->
        <div style="
          background: #f1f5f9;
          padding: 6px 10px;
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          border-bottom: 1px solid #e2e8f0;
        ">
          ${label}
        </div>

        <!-- Body -->
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          font-size: 13px;
          color: #1f2937;
          background: #ffffff;
        ">
          <span style="
            display: inline-block;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: ${color};
            flex-shrink: 0;
          "></span>
          ${title}: <strong style="font-weight: 600;">${value.toLocaleString()}</strong>
        </div>
      </div>
    `;
      },
    };


    this.fill = { colors: this.colors };
    this.dataLabels = {
      enabled: this.showDataLabels,
      style: {
        fontSize: '13px',
        colors: ['#fff'],
      },
      dropShadow: { enabled: true },
    };

    this.responsive = [
      {
        breakpoint: 480,
        options: {
          chart: { height: 300 },
          legend: { position: 'bottom' },
        },
      },
    ];
  }
}
