// moment-date-formats.constant.ts
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports
import {default as _rollupMoment} from 'moment';

const moment = _rollupMoment || _moment;

// Moment.js date formats configuration
// See the Moment.js docs for format meanings: https://momentjs.com/docs/#/displaying/format/
export const MOMENT_DATE_FORMATS = {
  parse: {
    dateInput: 'LL', // 'LL' format parses "January 1, 2024"
  },
  display: {
    dateInput: 'LL', // Display format "January 1, 2024"
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export { moment };