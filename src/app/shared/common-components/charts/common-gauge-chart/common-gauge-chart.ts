import { CommonModule } from '@angular/common';
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

export type GaugeByRange = Partial<Record<RangeKey, { value: number | string }>>;

@Component({
  selector: 'common-gauge-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './common-gauge-chart.html',
  styleUrls: ['./common-gauge-chart.scss'],
})
export class CommonGaugeChart implements OnChanges {
  /** Header title */
  @Input() headerTitle = 'Gauge';

  /** Range toggles visibility */
  @Input() showWeekly = true;
  @Input() showMonthly = true;
  @Input() showYearly = true;

  /** Backend data: { weekly: {value}, monthly?:{value}, yearly?:{value} } */
  @Input() dataByRange?: GaugeByRange;

  /** Optional external range control (not required) */
  @Input() range: RangeKey = 'weekly';
  @Output() rangeChange = new EventEmitter<RangeKey>();

  /** Visual defaults */
  @Input() height = 260;
  @Input() min = 0;
  @Input() max = 100;
  @Input() suffix = '%';
  @Input() gradient = true;

  /** Apex parts */
  chart!: ApexChart;
  series!: ApexNonAxisChartSeries;
  plotOptions!: ApexPlotOptions;
  fill!: ApexFill;
  stroke!: ApexStroke;
  legend!: ApexLegend;
  title!: ApexTitleSubtitle;
  tooltip!: ApexTooltip;
  colors!: string[];

  private order: RangeKey[] = ['weekly', 'monthly', 'yearly'];

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

  private coerceVal(v: number | string | undefined | null): number {
    const num = typeof v === 'string' ? Number(v) : (v ?? 0);
    return isFinite(num) ? num : 0;
  }

  private clamp(v: number): number {
    return Math.max(this.min, Math.min(this.max, v));
  }

  private asPercent(v: number): number {
    if (this.max === this.min) return 0;
    const pct = ((v - this.min) / (this.max - this.min)) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  private buildFromRange(r: RangeKey): void {
    const raw = this.dataByRange?.[r]?.value;
    const value = this.clamp(this.coerceVal(raw));
    const percent = this.asPercent(value);

    this.series = [percent];
    this.colors = ['#22c55e']; // base green

    this.chart = {
      type: 'radialBar',
      height: this.height,
      toolbar: { show: false },
      sparkline: { enabled: true },
      foreColor: '#ffffff',
      fontFamily: 'inherit',
    };

    this.plotOptions = {
      radialBar: {
        startAngle: -90,
        endAngle: 270, // full circle
        hollow: {
          size: '70%',
          background: '#1f2940', // dark inner background
          dropShadow: {
            enabled: true,
            top: 2,
            blur: 6,
            opacity: 0.25,
          },
        },
        track: {
          background: '#eef2f7',
          strokeWidth: '100%',
          margin: 0,
          dropShadow: {
            enabled: true,
            top: 2,
            blur: 4,
            opacity: 0.15,
          },
        },
        dataLabels: {
          show: true,
          name: {
            show: false
          },
          value: {
            show: true,
            color: '#ffffff',
            fontSize: '35px',
            fontWeight: 400,
            offsetY: 10,
            formatter: () => `${Math.round(value)}${this.suffix ?? ''}`,
          },
        },
      },
    };

    this.fill = this.gradient
      ? {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          shadeIntensity: 0.35,
          type: 'horizontal',
          gradientToColors: ['#06b6d4'], // green → cyan
          inverseColors: false,
          opacityFrom: 0.95,
          opacityTo: 0.95,
          stops: [0, 100],
        },
      }
      : { type: 'solid', colors: ['#22c55e'] };

    this.stroke = { lineCap: 'round' };
    this.legend = { show: false };
    this.title = { text: '' };
    this.tooltip = { enabled: false };
  }

  ngOnChanges(): void {
    if (this.dataByRange) {
      if (!this.has(this.range)) {
        const fallback = this.firstAvailable();
        if (fallback) this.range = fallback;
      }
      if (this.has(this.range)) this.buildFromRange(this.range);
    } else {
      this.series = [0];
      this.buildFromRange(this.range);
    }
  }

  setRange(r: RangeKey): void {
    if (this.dataByRange && !this.has(r)) return;
    this.range = r;
    this.rangeChange.emit(r);
    this.buildFromRange(r);
  }
}
