import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexChart,
  ApexFill,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip,
} from 'ng-apexcharts';

type RangeKey = 'weekly' | 'monthly' | 'yearly';

export interface DonutRangePack {
  labels: string[];
  series: number[];
}

export type DonutAllRangesPartial = Partial<Record<RangeKey, DonutRangePack>>;

@Component({
  selector: 'common-donut-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, NgClass],
  templateUrl: './common-donut-chart.html',
  styleUrls: ['./common-donut-chart.scss'],
})
export class CommonDonutChart implements OnChanges {
  /** Header */
  @Input() headerTitle = 'Donut Chart';

  /** Ranges */
  @Input() showWeekly = true;
  @Input() showMonthly = true;
  @Input() showYearly = true;
  @Input() dataByRange?: DonutAllRangesPartial;
  @Input() range: RangeKey = 'weekly';
  @Output() rangeChange = new EventEmitter<RangeKey>();

  /** Visuals */
  @Input() colors: string[] = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  @Input() height = 330;

  chart!: ApexChart;
  series!: ApexNonAxisChartSeries;
  labels!: string[];
  plotOptions!: ApexPlotOptions;
  fill!: ApexFill;
  stroke!: ApexStroke;
  legend!: ApexLegend;
  tooltip!: ApexTooltip;
  title!: ApexTitleSubtitle;

  private order: RangeKey[] = ['weekly', 'monthly', 'yearly'];

  has(r: RangeKey): boolean {
    const hasData = !!this.dataByRange?.[r];
    const enabled =
      r === 'weekly' ? this.showWeekly :
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
      this.buildChart(this.range);
    }
  }

  setRange(r: RangeKey): void {
    if (this.dataByRange && !this.has(r)) return;
    this.range = r;
    this.rangeChange.emit(r);
    this.buildChart(r);
  }

  private buildChart(r: RangeKey): void {
    const pack = this.dataByRange?.[r];
    const series = pack?.series ?? [];
    const labels = pack?.labels ?? [];

    this.series = series;
    this.labels = labels;

    this.chart = {
      type: 'donut',
      height: this.height,
      toolbar: { show: false },
      foreColor: '#334155',
      fontFamily: 'Inter, sans-serif',
    };

    this.plotOptions = {
      pie: {
        donut: {
          size: '60%', // thicker ring
          background: 'transparent',
          labels: { show: false }, // no inner text
        },
      },
    };

    this.fill = {
      type: 'gradient',
      gradient: {
        shade: 'light',
        shadeIntensity: 0.25,
        gradientToColors: this.colors.map(c => c),
        inverseColors: false,
        opacityFrom: 0.95,
        opacityTo: 0.95,
        stops: [0, 100],
      },
    };

    this.stroke = {
      show: true,
      width: 3,
      colors: ['#ffffff'],
    };

    this.legend = {
      show: true,
      position: 'bottom',
      fontSize: '13px',
      markers: {
        width: 10,
        height: 10,
        radius: 12,
      },
      itemMargin: { horizontal: 8, vertical: 2 },
    } as {};

    this.tooltip = {
      custom: ({ series, seriesIndex, w }) => {
        const label = w.globals.labels[seriesIndex];
        const value = series[seriesIndex];
        const color = w.globals.colors[seriesIndex];
        return `
          <div style="
            background: #fff;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            overflow: hidden;
            font-family: 'Inter', sans-serif;
          ">
            <div style="
              background: #f8fafc;
              padding: 6px 10px;
              font-size: 13px;
              font-weight: 600;
              color: #111827;
              border-bottom: 1px solid #e2e8f0;
            ">
              ${label}
            </div>
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 10px;
              font-size: 13px;
              color: #1f2937;
            ">
              <span style="
                display:inline-block;
                width:9px;
                height:9px;
                border-radius:50%;
                background:${color};
              "></span>
              ${this.headerTitle}: <strong>${value}</strong>
            </div>
          </div>
        `;
      },
    };

    this.title = { text: '' };
  }
}
