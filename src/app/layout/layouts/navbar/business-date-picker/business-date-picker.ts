import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../../../core/calendar-event/calendar-event.service';
import { UserPreferencesService } from '../../../../shared/services/user-preferences.service';
import { formatDateAs } from '../../../../shared/helpers/date-format.helper';
import type { DateFormat } from '../../../../shared/common-components/input-types/input-date/input-date';

/** One rendered cell in the month grid. */
interface DayCell {
  iso: string;          // "2026-07-12"
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSelectable: boolean;   // a business day within range
  isWeekend: boolean;      // Saturday / Sunday
  isHoliday: boolean;      // any holiday marker on this date
  markers: CalendarEvent[]; // every marker on this date (may be empty)
}

/**
 * Custom transaction-date calendar for the navbar.
 *
 * Holidays and events are drawn as colored dots on their actual dates; full
 * titles are revealed in a hover popover. Only business dates (from the
 * office-day-status API) are selectable. Navbar-scoped — does NOT touch the
 * shared input-date component.
 */
@Component({
  selector: 'app-business-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './business-date-picker.html',
  styleUrl: './business-date-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessDatePicker implements OnInit {
  /** Currently selected transaction date, ISO "YYYY-MM-DD". */
  readonly selectedDate = input<string>('');
  /** Selectable business days, ISO strings. */
  readonly businessDates = input<string[]>([]);
  /** Holidays / events to annotate the grid. */
  readonly events = input<CalendarEvent[]>([]);
  /** Navigation bounds, ISO strings (optional). */
  readonly minDate = input<string>('');
  readonly maxDate = input<string>('');

  /** Emits the chosen business day, ISO "YYYY-MM-DD". */
  readonly dateSelected = output<string>();

  private host = inject(ElementRef<HTMLElement>);
  private readonly prefsService = inject(UserPreferencesService);

  readonly WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  private readonly MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /** Human label for a marker category (shown in the hover popover). */
  readonly TYPE_LABEL: Record<CalendarEvent['type'], string> = {
    business: 'Business',
    holiday: 'Holiday',
    event: 'Event',
  };

  readonly open = signal(false);
  /** First-of-month currently on screen. */
  private readonly view = signal(this.baseView());

  /**
   * Effective display format: the user's Date Format preference (Settings →
   * Preferences). 'none' means "no global format", so fall back to the app
   * default rather than leaving the pill unformatted.
   */
  private readonly dateFormat = computed<DateFormat>(() => {
    const pref = this.prefsService.prefs().dateFormat;
    return pref && pref !== 'none' ? pref : 'DD/MM/YYYY';
  });

  readonly triggerLabel = computed(() => {
    const d = this.parseIso(this.selectedDate());
    if (!d) return 'Select date';
    return formatDateAs(d, this.dateFormat());
  });

  readonly monthLabel = computed(() => {
    const v = this.view();
    return `${this.MONTHS[v.m]} ${v.y}`;
  });

  readonly weeks = computed<DayCell[][]>(() => {
    const { y, m } = this.view();
    const sel = this.selectedDate();
    const business = new Set(this.businessDates());
    const todayIso = this.toIso(new Date());
    const min = this.minDate();
    const max = this.maxDate();

    // When the office-day list is empty (e.g. dev with no officeId), fall back
    // to letting every in-month day be selectable so the calendar isn't dead.
    const noBusinessList = business.size === 0;

    // Group every marker by its ISO date so a day can carry several dots.
    const byDate = new Map<string, CalendarEvent[]>();
    for (const ev of this.events()) {
      const list = byDate.get(ev.date);
      if (list) list.push(ev);
      else byDate.set(ev.date, [ev]);
    }

    // Start the grid on the Sunday on/before the 1st of the month.
    const startOffset = new Date(y, m, 1).getDay();
    const weeks: DayCell[][] = [];

    for (let w = 0; w < 6; w++) {
      const row: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(y, m, 1 - startOffset + w * 7 + d);
        const iso = this.toIso(date);
        const inMonth = date.getMonth() === m;
        const markers = byDate.get(iso) ?? [];
        const withinRange = (!min || iso >= min) && (!max || iso <= max);
        row.push({
          iso,
          day: date.getDate(),
          inMonth,
          isToday: iso === todayIso,
          isSelected: iso === sel,
          isSelectable: inMonth && withinRange && (noBusinessList || business.has(iso)),
          isWeekend: d === 5 || d === 6,   // Friday & Saturday (BD weekend)
          isHoliday: markers.some(mk => mk.type === 'holiday'),
          markers,
        });
      }
      weeks.push(row);
    }
    return weeks;
  });

  readonly canPrev = computed(() => {
    const min = this.parseIso(this.minDate());
    if (!min) return true;
    const { y, m } = this.view();
    return y > min.getFullYear() || (y === min.getFullYear() && m > min.getMonth());
  });

  readonly canNext = computed(() => {
    const max = this.parseIso(this.maxDate());
    if (!max) return true;
    const { y, m } = this.view();
    return y < max.getFullYear() || (y === max.getFullYear() && m < max.getMonth());
  });

  ngOnInit(): void {
    // The service is a singleton that can be constructed before Keycloak
    // decodes the token, i.e. before the user-scoped key is readable. Catch up
    // here so a hard reload shows the stored format, not the default.
    this.prefsService.refresh();
  }

  toggle(): void {
    if (!this.open()) {
      // Re-anchor the view to the selected month each time it opens.
      this.view.set(this.baseView());
    }
    this.open.update(o => !o);
  }

  prevMonth(): void {
    if (this.canPrev()) this.view.update(v => this.shiftMonth(v, -1));
  }

  nextMonth(): void {
    if (this.canNext()) this.view.update(v => this.shiftMonth(v, 1));
  }

  selectDay(cell: DayCell): void {
    if (!cell.isSelectable) return;
    this.dateSelected.emit(cell.iso);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private baseView(): { y: number; m: number } {
    const base = this.parseIso(this.selectedDate()) ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  }

  private shiftMonth(v: { y: number; m: number }, delta: number): { y: number; m: number } {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }

  /** Local-timezone-safe ISO (avoids the UTC shift of toISOString). */
  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private parseIso(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
}
