import { CommonModule, NgClass } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexGrid,
  ApexTooltip,
  ApexLegend,
  ApexStroke,
  ApexFill,
  ApexTitleSubtitle,
  ApexPlotOptions,
} from 'ng-apexcharts';

type RangeKey = 'weekly' | 'monthly' | 'yearly';

export interface SimpleHistogramPack {
  categories: (string | number)[];
  data: number[];
}

export type SimpleHistogramAllRanges = Partial<Record<RangeKey, SimpleHistogramPack>>;

@Component({
  selector: 'common-histogram',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, NgClass],
  templateUrl: './common-histogram.html',
  styleUrls: ['./common-histogram.scss'],
})
export class CommonHistogram implements OnChanges {
  @Input() headerTitle = 'Histogram';
  @Input() showWeekly = true;
  @Input() showMonthly = true;
  @Input() showYearly = true;
  @Input() dataByRange?: SimpleHistogramAllRanges;

  @Input() height = 350;
  @Input() barColor = '#3b82f6';
  @Input() yTitle = 'Bin count';
  @Input() xTitle = 'Category';
  @Input() tooltipLabel?: string;

  range: RangeKey = 'weekly';

  // Apex options
  series: ApexAxisChartSeries = [];
  chart!: ApexChart;
  xaxis!: ApexXAxis;
  yaxis!: ApexYAxis | ApexYAxis[];
  plotOptions!: ApexPlotOptions;
  grid!: ApexGrid;
  tooltip!: ApexTooltip;
  legend!: ApexLegend;
  stroke!: ApexStroke;
  fill!: ApexFill;
  apexTitle!: ApexTitleSubtitle;
  dataLabels!: ApexDataLabels;

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
      // pick a valid range if current one is hidden or missing
      if (!this.has(this.range)) {
        const fallback = this.firstAvailable();
        if (fallback) this.range = fallback;
      }
      if (this.has(this.range)) this.buildChart();
    } else {
      // empty case
      this.series = [{ name: this.headerTitle, data: [] }];
      this.buildChart();
    }
  }

  setRange(r: RangeKey): void {
    if (this.dataByRange && !this.has(r)) return;
    this.range = r;
    this.buildChart();
  }

  private buildChart(): void {
    const pack = this.dataByRange?.[this.range];
    const categories = pack?.categories ?? [];
    const data = pack?.data ?? [];

    const label = this.tooltipLabel || this.headerTitle;

    this.series = [{ name: label, data }];

    this.chart = {
      type: 'bar',
      height: this.height,
      toolbar: { show: false },
      foreColor: '#334155',
      fontFamily: 'inherit',
      animations: { enabled: true },
    };

    this.plotOptions = {
      bar: {
        horizontal: false,
        columnWidth: '100%',
        borderRadius: 0,
      },
    };

    this.xaxis = {
      categories,
      title: { text: this.xTitle },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };

    this.yaxis = {
      title: { text: this.yTitle },
      min: 0,
    };

    this.grid = { strokeDashArray: 4, padding: { left: 10, right: 10 } };
    this.dataLabels = { enabled: false };
    this.tooltip = {
      y: {
        formatter: (val) => `${val.toLocaleString()}`,
        title: {
          formatter: () => label,
        },
      },
    };    this.legend = { show: false };
    this.stroke = { show: false };
    this.fill = { colors: [this.barColor], opacity: 0.9 };
    this.apexTitle = { text: '' };
  }
}
