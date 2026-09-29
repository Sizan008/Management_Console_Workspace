import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
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

export interface BarChartPack {
  categories: (string | number)[];
  series: ApexAxisChartSeries;
}

export type BarChartAllRanges = Partial<Record<RangeKey, BarChartPack>>;

@Component({
  selector: 'common-bar-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, NgClass],
  templateUrl: './common-bar-chart.html',
  styleUrls: ['./common-bar-chart.scss'],
})
export class CommonBarChart implements OnChanges {
  /** Header title (displayed above chart) */
  @Input() headerTitle = 'Bar Chart';

  /** Tooltip label (optional, defaults to headerTitle) */
  @Input() tooltipLabel?: string;

  /** Show/hide range buttons */
  @Input() showWeekly = true;
  @Input() showMonthly = true;
  @Input() showYearly = true;

  /** Data object per range */
  @Input() dataByRange?: BarChartAllRanges;

  /** Customization options */
  @Input() height = 350;
  @Input() barColor = '#3b82f6';
  @Input() colors: string[] = [];
  @Input() showToolbar = false;
  @Input() showLegend = false;
  @Input() yTitle = 'Value';
  @Input() xTitle = 'Category';
  @Input() horizontal = true; // by default, bar chart horizontal

  /** Optional external range control */
  @Input() range: RangeKey = 'weekly';
  @Output() rangeChange = new EventEmitter<RangeKey>();

  /** Internal chart options */
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
    const categories = pack?.categories ?? [];
    const series = pack?.series ?? [];

    const label = this.tooltipLabel || this.headerTitle;

    //  If multiple colors provided, assign per-data-point coloring
    const resolvedColors = this.colors.length ? this.colors : [this.barColor];

    // inject color per bar if single series
    if (series.length === 1 && resolvedColors.length > 1) {
      const coloredSeries = {
        ...series[0],
        data: (series[0].data as number[]).map((val, i) => ({
          x: categories[i],
          y: val,
          fillColor: resolvedColors[i % resolvedColors.length],
        })),
      };
      this.series = [coloredSeries];
    } else {
      this.series = series;
    }

    this.chart = {
      type: 'bar',
      height: this.height,
      toolbar: { show: this.showToolbar },
      foreColor: '#334155',
      fontFamily: 'inherit',
      animations: { enabled: true },
    };

    this.plotOptions = {
      bar: {
        horizontal: this.horizontal,
        columnWidth: '55%',
        borderRadius: 4,
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
        formatter: (val) => val.toLocaleString(),
        title: { formatter: () => label },
      },
    };

    this.legend = { show: this.showLegend, position: 'bottom' };
    this.stroke = { show: false };
    this.fill = { colors: [this.barColor], opacity: 0.9 };
    this.apexTitle = { text: '' };
  }
}
