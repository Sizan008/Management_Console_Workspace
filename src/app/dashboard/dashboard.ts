import {Component, OnInit} from '@angular/core';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-3d';
import {HighchartsChartModule} from 'highcharts-angular';
import { CommonBarChart } from '../shared/common-components/charts/common-bar-chart/common-bar-chart';
import { CommonDonutChart } from '../shared/common-components/charts/common-donut-chart/common-donut-chart';
import { CommonGaugeChart } from '../shared/common-components/charts/common-gauge-chart/common-gauge-chart';
import { CommonHistogram } from '../shared/common-components/charts/common-histogram/common-histogram';
import { CommonLineChartComponent } from '../shared/common-components/charts/common-line-chart/common-line-chart';
import { CommonPieChart } from '../shared/common-components/charts/common-pie-chart/common-pie-chart';
import { CommonStackedColumnChart } from '../shared/common-components/charts/common-stacked-column-chart/common-stacked-column-chart';
import { BUTTON_VISIBILITY } from '../shared/constant/button-signals.constant';

@Component({
  selector: 'app-dashboard',
  imports: [
    HighchartsChartModule,
    CommonLineChartComponent,
    CommonStackedColumnChart,
    CommonGaugeChart,
    CommonHistogram,
    CommonBarChart,
    CommonPieChart,
    CommonDonutChart,


  ],
  templateUrl: './dashboard.html',
  standalone: true,
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {

  LineChartData = {
    weekly: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [
        {name: 'USD', data: [1000, 1200, 900, 1500, 1700, 1600, 1800]},
        {name: 'GBP', data: [700, 820, 760, 980, 1100, 1000, 1150]},
      ],
      yMin: 0, yMax: 2000
    },

    monthly: {
      categories: ['W1', 'W2', 'W3', 'W4'],
      series: [
        {name: 'USD', data: [4200, 4600, 4800, 5100]},
        {name: 'GBP', data: [3200, 3300, 3500, 3700]},
      ],
      yMin: 0, yMax: 6000
    },

    yearly: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [
        {
          "name": "USD",
          "data": [
            90000,
            80000,
            100000,
            110000,
            120000,
            130000,
            120000,
            120000,
            110000,
            100000,
            90000,
            80000
          ]
        },
        {
          "name": "GBP",
          "data": [
            70000,
            95000,
            80000,
            90000,
            100000,
            110000,
            100000,
            10,
            90000,
            80000,
            70000,
            70000
          ]
        },
        {
          "name": "EURO",
          "data": [
            70000,
            70000,
            80000,
            90000,
            100000,
            110000,
            100000,
            10,
            90000,
            80000,
            70000,
            70000
          ]
        },
        {
          "name": "POUND",
          "data": [
            71000, // Changed from 70000
            50000,
            80000,
            90000,
            100000,
            110000,
            100000,
            10,
            90000,
            80000,
            70000,
            70000
          ]
        },
        {
          "name": "YUAN",
          "data": [
            70000,
            72000, // Changed from 70000 to be unique from EURO
            80000,
            90000,
            100000,
            110000,
            100000,
            10,
            90000,
            80000,
            70000,
            70000
          ]
        },
        {
          "name": "YEN",
          "data": [
            70000,
            30000,
            81000, // Changed from 80000
            90000,
            100000,
            110000,
            100000,
            10,
            90000,
            80000,
            70000,
            70000
          ]
        },
        {
          "name": "DINAR",
          "data": [
            69000, // Changed from 70000
            10000,
            80000,
            90000,
            100000,
            110000,
            100000,
            10,
            90000,
            80000,
            70000,
            70000
          ]
        }
      ],
      yMin: 0, yMax: 150000
    }
  };

  stackedData = {
    weekly: {
      categories: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      series: [
        { name: 'Standard Chartered', data: [2530, 3220, 2810, 3805, 2250, 2900, 3100] },
        { name: 'HSBC',     data: [1800, 2505, 2205, 3505, 2270, 2400, 2600] },
        { name: 'Citi',     data: [1200, 1400, 1350, 1600, 1500, 1450, 1550] },
      ],
      yMin: 0, yMax: 10000
    },
    monthly: {
      categories: ['W1','W2','W3','W4'],
      series: [
        { name: 'Standard Chartered', data: [9500, 10200, 9900, 11000] },
        { name: 'HSBC',     data: [8200, 8700, 8400, 9000] },
        { name: 'Citi',     data: [6000, 6400, 6300, 6700] },
      ],
      yMin: 0, yMax: 30000
    },
    yearly: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [
        {
          "name": "Standard Chartered",
          "data": [
            90000,
            80000,
            100000,
            110000,
            120000,
            130000,
            120000,
            120000,
            110000,
            100000,
            90000,
            80000
          ]
        },
        {
          "name": "HSBC",
          "data": [
            70000,
            95000,
            80000,
            90000,
            100000,
            110000,
            100000,
            50555,
            90000,
            80000,
            70000,
            70000
          ]
        },
        {
          "name": "Citi",
          "data": [
            70000,
            70000,
            80000,
            90000,
            100000,
            110000,
            100000,
            10244,
            90000,
            80000,
            70000,
            70000
          ]
        },
      ]
    }
  };

  gaugeData = {
    weekly:  { value: '80' },
    monthly: { value: '65' },
    yearly:  { value: '92' },
  };

  histogramData = {
    weekly: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [200000, 100000, 500000, 900000, 300000, 400000, 250000],
    },
    monthly: {
      categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      data: [1000000, 1200000, 800000, 600000],
    },
    yearly: {
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      data: [2400000, 1800000, 1600000, 2200000],
    },
  };

  barData = {
    weekly: {
      categories: ['Sales', 'Marketing', 'HR', 'Finance', 'IT'],
      series: [
        {
          name: 'Performance',
          data: [80, 65, 90, 70, 85],
        },
      ],
    },
    monthly: {
      categories: ['Sales', 'Marketing', 'HR', 'Finance', 'IT'],
      series: [
        {
          name: 'Performance',
          data: [75, 80, 68, 85, 90],
        },
      ],
    },
    yearly: {
      categories: ['Sales', 'Marketing', 'HR', 'Finance', 'IT'],
      series: [
        {
          name: 'Performance',
          data: [78, 82, 88, 91, 95],
        },
      ],
    },
  };

  pieData = {
    weekly: {
    labels: ['RTGS', 'i-Life', 'FinBook', 'CenterPoint'],
    data: [44, 55, 13, 33],
    },
    monthly: {
      labels: ['RTGS', 'i-Life', 'FinBook', 'CenterPoint'],
      data: [30, 40, 20, 10],
    },
    yearly: {
      labels: ['RTGS', 'i-Life', 'FinBook', 'CenterPoint'],
      data: [400, 300, 200, 100],
    },
  };

  donutData = {
    weekly: {
          labels: ['RTGS', 'i-Life', 'FinBook', 'CenterPoint'],
      series: [30, 40, 15, 15]
    },
    monthly: {
          labels: ['RTGS', 'i-Life', 'FinBook', 'CenterPoint'],
      series: [25, 35, 20, 20]
    },
    yearly: {
          labels: ['RTGS', 'i-Life', 'FinBook', 'CenterPoint'],
      series: [20, 45, 15, 20]},
  };






  pieColors = [
    // Soft Neutrals & Calm Tones
    '#B2F5EA', // Soft Teal - Savings
    '#A0AEC0', // Cool Gray - Current
    '#FFC4B9', // Light Orange - Fixed Deposit
    '#bfc6f7', // Light Violet - Recurring
    '#E2E8F0', // Off White Gray - Camt 053
    '#CBD5E0', // Light Gray
    '#C6F6D5', // Mint Green
    '#FED7E2', // Soft Pink
    '#FAF089', // Pale Yellow
  ];
  barColors = [
    '#4C6EF5', // Soft Indigo
    '#6C8EBF', // Muted Blue
    '#A0C4FF', // Soft Sky Blue
    '#BDB2FF', // Muted Purple
    '#FFDAC1', // Soft Peach
    '#FFB5A7', // Light Coral
    '#C8E6C9', // Minty Green
    '#DDE5B6', // Light Olive
    '#F0EFEB',  // Off-white Beige
  ];
  Highcharts: typeof Highcharts = Highcharts;
  pieChartFilter: 'weekly' | 'monthly' = 'weekly';
  barChartFilter: 'weekly' | 'monthly' = 'weekly';

  constructor() {
  }

  ngOnInit(): void {
    BUTTON_VISIBILITY.set({
      save: false,
      update: false,
      view: false,
      delete: false,
      exit: false,
      reset: false
    });
  }

  setPieChartFilter(filter: 'weekly' | 'monthly'): void {
    this.pieChartFilter = filter;
    this.updatePieChart();
  }

  setBarChartFilter(filter: 'weekly' | 'monthly'): void {
    this.barChartFilter = filter;
    this.updateBarChart();
  }

  updatePieChart(): void {
    if (this.pieChartFilter === 'weekly') {
      this.chartOptionsPie = {
        ...this.chartOptionsPie,
        series: [{
          type: 'pie',
          name: 'Total Incoming Messages',
          data: [
            ['Pacs 009', 150000],
            ['Pacs 008', 250000],
            ['Pacs 002', 150000],
            ['Pacs 004', 250000],
            ['Camt 053', 200000]
          ]
        }]
      };
    } else {
      this.chartOptionsPie = {
        ...this.chartOptionsPie,
        series: [{
          type: 'pie',
          name: 'Total Incoming Messages',
          data: [
            ['Pacs 009', 2800000],
            ['Pacs 008', 4200000],
            ['Pacs 002', 2800000],
            ['Pacs 004', 4200000],
            ['Camt 053', 3500000]
          ]
        }]
      };
    }
  }

  updateBarChart(): void {
    if (this.barChartFilter === 'weekly') {
      this.chartOptionsBar = {
        ...this.chartOptionsBar,
        yAxis: {
          allowDecimals: false,
          min: 0,
          max: 4000,
          title: {
            text: 'Message Count'
          }
        },
        series: [
          {
            name: 'JPMorgan Chase',
            data: [2530, 3220, 2810, 3805, 2250],
            type: 'column'
          },
          {
            name: 'HSBC Bank',
            data: [3805, 2505, 2205, 3505, 3270],
            type: 'column'
          },
          {
            name: 'Deutsche Bank',
            data: [2250, 3805, 3505, 2205, 2505],
            type: 'column'
          },
          {
            name: 'Standard Chartered',
            data: [3505, 3205, 3005, 3805, 3005],
            type: 'column'
          }
        ]
      };
    } else {
      this.chartOptionsBar = {
        ...this.chartOptionsBar,
        yAxis: {
          allowDecimals: false,
          min: 1000,
          max: 100000,
          title: {
            text: 'Message Count'
          }
        },
        series: [
          {
            name: 'JPMorgan Chase',
            data: [95020, 72020, 68020, 82020, 88020],
            type: 'column'
          },
          {
            name: 'HSBC Bank',
            data: [82020, 68020, 62020, 78020, 82020],
            type: 'column'
          },
          {
            name: 'Deutsche Bank',
            data: [88020, 72020, 68020, 78020, 82020],
            type: 'column'
          },
          {
            name: 'Standard Chartered',
            data: [78020, 62020, 58020, 72020, 76020],
            type: 'column'
          }
        ]
      };
    }
  }

  chartOptionsPie: Highcharts.Options = {
    colors: this.pieColors,
    chart: {
      type: 'pie',
      height: 320,
      backgroundColor: 'transparent',
      options3d: {
        enabled: true,
        alpha: 55,
        beta: 0,
      },
    },
    title: {text: ''},
    legend: {
      enabled: true,
      align: 'center',
      verticalAlign: 'bottom',
      y: 0,
      itemStyle: {
        color: '#333',
      },
    },
    plotOptions: {
      pie: {
        minSize: 0, // Ensures even small values are visible
        ignoreHiddenPoint: false, // Ensures small values are not ignored
        showInLegend: true,
        innerSize: 90,
        depth: 40,
        dataLabels: {enabled: true, format: '{point.name}: {point.y}'},
      },
    },
    series: [{
      type: 'pie',
      name: 'Total Incoming Messages',
      data: [
        ['Pacs 009', 150000],
        ['Pacs 008', 250000],
        ['Pacs 002', 150000],
        ['Pacs 004', 250000],
        ['Camt 053', 200000]
      ]
    }],
    credits: {
      enabled: false,
    },
  };

  chartOptionsBar: Highcharts.Options = {
    colors: this.barColors,
    chart: {
      type: 'column',
      height: 320,
      backgroundColor: 'transparent',
      marginTop: 55,
      marginBottom: 80,

      marginRight: 20,
    },
    title: {
      text: '',
      align: 'left',
    },
    xAxis: {
      categories: ['Pacs 008', 'Pacs 009', 'Camt 053', 'Pacs 002', 'Pacs 004']
    },
    yAxis: {
      allowDecimals: false,
      min: 0,
      title: {
        text: 'Message Count'
      }
    },
    tooltip: {
      pointFormat: '<b>{x}</b><br/>{series.name}: {y} messages'
    },
    plotOptions: {
      column: {
        stacking: undefined
      }
    },
    series: [
      {
        name: 'AB Bank Mumbai',
        data: [2530, 3220, 2810, 3805, 2250],
        type: 'column'
      },
      {
        name: 'Reagent Bank',
        data: [3805, 2505, 2205, 3505, 3270],
        type: 'column'
      },
      {
        name: 'Citi Bank',
        data: [3205, 2805, 2505, 3205, 3505],
        type: 'column'
      },
      {
        name: 'HSBC',
        data: [3505, 2205, 2345, 2805, 3005],
        type: 'column'
      }
    ],
    credits: {
      enabled: false
    }
  };


}
