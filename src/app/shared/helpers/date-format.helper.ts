import type { DateFormat } from '../common-components/input-types/input-date/input-date';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Renders a Date using one of the app's supported display formats.
 *
 * Single source of truth for the format switch so anything outside the
 * input-date component (e.g. the navbar transaction-date pill) can honour the
 * user's Date Format preference without duplicating the cases.
 */
export function formatDateAs(date: Date, format: DateFormat): string {
  if (!date || isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  const monthAbbr = MONTH_ABBR[date.getMonth()];
  const year = date.getFullYear();

  switch (format) {
    case 'MM/DD/YYYY': return `${monthNum}/${day}/${year}`;
    case 'YYYY/MM/DD': return `${year}/${monthNum}/${day}`;
    case 'DD-MM-YYYY': return `${day}-${monthNum}-${year}`;
    case 'MM-DD-YYYY': return `${monthNum}-${day}-${year}`;
    case 'YYYY-MM-DD': return `${year}-${monthNum}-${day}`;
    case 'DD MMM, YYYY': return `${day} ${monthAbbr}, ${year}`;
    case 'DD/MM/YYYY':
    default: return `${day}/${monthNum}/${year}`;
  }
}
