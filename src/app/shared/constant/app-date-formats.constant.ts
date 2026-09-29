import { MatDateFormats } from '@angular/material/core';

export const AppDateFormatsConstant: MatDateFormats = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy',
  }
};

// Extended formats for custom date adapter
export const ExtendedDateFormats = {
  'DD/MM/YYYY': 'DD/MM/YYYY',
  'MM/DD/YYYY': 'MM/DD/YYYY',
  'YYYY/MM/DD': 'YYYY/MM/DD',
  'DD-MM-YYYY': 'DD-MM-YYYY',
  'MM-DD-YYYY': 'MM-DD-YYYY',
  'YYYY-MM-DD': 'YYYY-MM-DD',
  'DD MMM, YYYY': 'DD MMM, YYYY'
};
