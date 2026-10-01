export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_DAYS_FULL = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

// Format YYYY-MM-DD to "12 มี.ค. 2569"
export function formatThaiDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${THAI_MONTHS_SHORT[monthIdx] || ''} ${year}`;
}

// Format YYYY-MM-DD to "12 มีนาคม 2569"
export function formatThaiDateFull(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${THAI_MONTHS_FULL[monthIdx] || ''} ${year}`;
}

// Format Date object to YYYY-MM-DD
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Check if a date string is a weekend (Saturday or Sunday)
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

import { getHolidayInfo, isThaiPublicHoliday, type HolidayInfo } from './holidays';

// Calculate workdays/leave days between start and end date
export function calculateLeaveDays(
  startDateStr: string,
  endDateStr: string,
  period: 'full' | 'morning' | 'afternoon',
  skipWeekends: boolean = true
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (startDateStr > endDateStr) return 0;

  if (period === 'morning' || period === 'afternoon') {
    // Half day only applies to single date
    if (skipWeekends && (isWeekend(startDateStr) || isThaiPublicHoliday(startDateStr))) return 0;
    return 0.5;
  }

  let current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  let days = 0;

  while (current <= end) {
    const dStr = toDateString(current);
    const dayOfWeek = current.getDay();
    const isWk = dayOfWeek === 0 || dayOfWeek === 6;
    const isHol = isThaiPublicHoliday(dStr);

    if (!skipWeekends || (!isWk && !isHol)) {
      days += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Generate calendar cells for a given month and year
export interface CalendarCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  holiday: HolidayInfo | null;
}

export function getMonthCalendarCells(year: number, month: number): CalendarCell[] {
  // month: 0-11
  const todayStr = toDateString(new Date());
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = lastDay.getDate();

  const cells: CalendarCell[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(year, month - 1, dayNum);
    const dStr = toDateString(d);
    cells.push({
      dateStr: dStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      isWeekend: isWeekend(dStr),
      holiday: getHolidayInfo(dStr),
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month, dayNum);
    const dStr = toDateString(d);
    cells.push({
      dateStr: dStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      isWeekend: isWeekend(dStr),
      holiday: getHolidayInfo(dStr),
    });
  }

  // Next month leading days to complete the 35 or 42 grid
  const remaining = 42 - cells.length;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const d = new Date(year, month + 1, dayNum);
    const dStr = toDateString(d);
    cells.push({
      dateStr: dStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      isWeekend: isWeekend(dStr),
      holiday: getHolidayInfo(dStr),
    });
  }

  return cells;
}

// Check if a specific date string falls within a leave record's range
export function isDateInLeaveRange(targetDate: string, record: { startDate: string; endDate: string; skipWeekends: boolean }): boolean {
  if (targetDate < record.startDate || targetDate > record.endDate) {
    return false;
  }
  if (record.skipWeekends && (isWeekend(targetDate) || isThaiPublicHoliday(targetDate))) {
    return false;
  }
  return true;
}

// Get Buddhist Era Fiscal Year for a given YYYY-MM-DD date
// Thai fiscal year runs from 1 October to 30 September.
// If month >= 10, fiscal year = CE Year + 544 (e.g. 2026-10-01 -> 2570)
// If month < 10, fiscal year = CE Year + 543 (e.g. 2026-09-30 -> 2569)
export function getFiscalYear(dateStr: string): number {
  if (!dateStr) return getCurrentFiscalYear();
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return month >= 10 ? year + 544 : year + 543;
}

// Get the current fiscal year in Buddhist Era
export function getCurrentFiscalYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 10 ? year + 544 : year + 543;
}

// Get date range string for a fiscal year (e.g. FY 2570 is 2026-10-01 to 2027-09-30)
export function getFiscalYearDateRange(fiscalYear: number): { startDate: string; endDate: string } {
  const ceEndYear = fiscalYear - 543;
  const ceStartYear = ceEndYear - 1;
  return {
    startDate: `${ceStartYear}-10-01`,
    endDate: `${ceEndYear}-09-30`,
  };
}
