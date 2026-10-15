// ========================================================
// ฟังก์ชันจัดการวันที่และปีงบประมาณราชการไทย (Date & Fiscal Year Utilities)
// สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน
// ========================================================

import { getHolidayInfo, isThaiPublicHoliday, type HolidayInfo } from './holidays';

/**
 * รายชื่อเดือนภาษาไทยแบบเต็ม (12 เดือน)
 */
export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * รายชื่อเดือนภาษาไทยแบบย่อ
 */
export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * อักษรย่อวันในสัปดาห์ (อาทิตย์ ถึง เสาร์)
 */
export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/**
 * ชื่อเต็มวันในสัปดาห์
 */
export const THAI_DAYS_FULL = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

/**
 * แปลงวันที่ในรูปแบบ YYYY-MM-DD เป็นวันที่ไทยแบบย่อพร้อมปี พ.ศ.
 * ตัวอย่าง: "2026-03-12" -> "12 มี.ค. 2569"
 */
export function formatThaiDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543; // แปลง ค.ศ. เป็น พ.ศ.
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${THAI_MONTHS_SHORT[monthIdx] || ''} ${year}`;
}

/**
 * แปลงวันที่ในรูปแบบ YYYY-MM-DD เป็นวันที่ไทยแบบเต็มพร้อมปี พ.ศ.
 * ตัวอย่าง: "2026-03-12" -> "12 มีนาคม 2569"
 */
export function formatThaiDateFull(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10) + 543;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${THAI_MONTHS_FULL[monthIdx] || ''} ${year}`;
}

/**
 * แปลง Date Object ของ JavaScript เป็นสตริงรูปแบบมาตรฐาน YYYY-MM-DD
 */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ตรวจสอบว่าวันที่ระบุเป็นวันเสาร์หรือวันอาทิตย์หรือไม่
 * @param dateStr สตริงวันที่ YYYY-MM-DD
 * @returns true หากเป็นวันเสาร์หรือวันอาทิตย์
 */
export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = วันอาทิตย์, 6 = วันเสาร์
}

/**
 * คำนวณจำนวนวันลาสุทธิระหว่างวันที่เริ่มต้นถึงวันที่สิ้นสุด
 * รองรับการเลือกข้ามวันเสาร์-อาทิตย์ และวันหยุดราชการ
 * @param startDateStr วันที่เริ่มลา YYYY-MM-DD
 * @param endDateStr วันที่สิ้นสุดการลา YYYY-MM-DD
 * @param period ช่วงเวลา ('full' = เต็มวัน, 'morning'/'afternoon' = ครึ่งวัน)
 * @param skipWeekends ข้ามวันหยุดเสาร์-อาทิตย์และวันหยุดราชการหรือไม่ (ค่าเริ่มต้น true)
 * @returns จำนวนวันลาที่นับได้ (เช่น 0.5, 1, 3 วัน)
 */
export function calculateLeaveDays(
  startDateStr: string,
  endDateStr: string,
  period: 'full' | 'morning' | 'afternoon',
  skipWeekends: boolean = true
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (startDateStr > endDateStr) return 0;

  // กรณีลาครึ่งวัน (ใช้ได้กับวันเดียวเท่านั้น)
  if (period === 'morning' || period === 'afternoon') {
    if (skipWeekends && (isWeekend(startDateStr) || isThaiPublicHoliday(startDateStr))) return 0;
    return 0.5;
  }

  let current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  let days = 0;

  // วนลูปนับทีละวัน
  while (current <= end) {
    const dStr = toDateString(current);
    const dayOfWeek = current.getDay();
    const isWk = dayOfWeek === 0 || dayOfWeek === 6;
    const isHol = isThaiPublicHoliday(dStr);

    // หากไม่เลือกข้าม หรือวันที่นั้นไม่ใช่วันเสาร์อาทิตย์และไม่ใช่วันหยุดราชการ -> ให้นับเป็น 1 วันลา
    if (!skipWeekends || (!isWk && !isHol)) {
      days += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * โครงสร้างข้อมูลช่องตารางปฏิทินแต่ละช่อง (Calendar Cell)
 */
export interface CalendarCell {
  dateStr: string;            // วันที่ YYYY-MM-DD
  dayNumber: number;          // ตัวเลขวันที่ 1-31
  isCurrentMonth: boolean;    // อยู่ในเดือนปัจจุบันที่กำลังแสดงผลหรือไม่
  isToday: boolean;           // เป็นวันนี้หรือไม่
  isWeekend: boolean;         // เป็นวันเสาร์หรือวันอาทิตย์หรือไม่
  holiday: HolidayInfo | null;// ข้อมูลวันหยุดราชการ (ถ้ามี)
}

/**
 * สร้างตารางช่องปฏิทินแบบ 7 คอลัมน์ (ครบทั้งสัปดาห์ รวมถึงวันของเดือนก่อนหน้าและเดือนถัดไป)
 * @param year ปี ค.ศ.
 * @param month เลขเดือน 0-11 (0 = มกราคม)
 */
export function getMonthCalendarCells(year: number, month: number): CalendarCell[] {
  const todayStr = toDateString(new Date());
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 (อาทิตย์) ถึง 6 (เสาร์)
  const daysInMonth = lastDay.getDate();

  const cells: CalendarCell[] = [];

  // 1. เติมวันตกค้างของเดือนก่อนหน้า (Leading Days)
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

  // 2. เติมวันในเดือนปัจจุบัน (Current Month Days)
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

  // 3. เติมวันของเดือนถัดไปให้ครบช่องตาราง (Trailing Days ครบ 35 หรือ 42 ช่อง)
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

/**
 * ตรวจสอบว่าวันที่เป้าหมาย (targetDate) อยู่ในช่วงของการบันทึกการลาหรือไม่
 * และตรวจสอบตัวเลือกข้ามเสาร์-อาทิตย์/วันหยุดราชการ
 */
export function isDateInLeaveRange(
  targetDate: string,
  record: { startDate: string; endDate: string; skipWeekends: boolean }
): boolean {
  if (targetDate < record.startDate || targetDate > record.endDate) {
    return false;
  }
  if (record.skipWeekends && (isWeekend(targetDate) || isThaiPublicHoliday(targetDate))) {
    return false;
  }
  return true;
}

/**
 * คำนวณปีงบประมาณไทย (พ.ศ.) สำหรับวันที่ระบุ
 * ระเบียบราชการไทย: ปีงบประมาณเริ่ม 1 ตุลาคม ถึง 30 กันยายน ของปีถัดไป
 * - เดือน 10, 11, 12: ปีงบประมาณ = ปี ค.ศ. + 544 (เช่น ต.ค. 2026 -> ปีงบฯ 2570)
 * - เดือน 1 ถึง 9: ปีงบประมาณ = ปี ค.ศ. + 543 (เช่น ก.ย. 2026 -> ปีงบฯ 2569)
 */
export function getFiscalYear(dateStr: string): number {
  if (!dateStr) return getCurrentFiscalYear();
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return month >= 10 ? year + 544 : year + 543;
}

/**
 * ดึงปีงบประมาณปัจจุบันของระบบ (พ.ศ.)
 */
export function getCurrentFiscalYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 10 ? year + 544 : year + 543;
}

/**
 * ดึงช่วงวันที่เริ่มต้นและสิ้นสุดของปีงบประมาณที่ระบุ (1 ต.ค. ถึง 30 ก.ย.)
 * @param fiscalYear ปีงบประมาณ พ.ศ. (เช่น 2570)
 * @returns { startDate: '2026-10-01', endDate: '2027-09-30' }
 */
export function getFiscalYearDateRange(fiscalYear: number): { startDate: string; endDate: string } {
  const ceEndYear = fiscalYear - 543;
  const ceStartYear = ceEndYear - 1;
  return {
    startDate: `${ceStartYear}-10-01`,
    endDate: `${ceEndYear}-09-30`,
  };
}

/**
 * รวบรวมรายชื่อปีงบประมาณทั้งหมดที่มีอยู่ในระบบ เรียงจากใหม่ไปเก่า
 * @param records รายการบันทึกการลา
 */
export function getAvailableFiscalYears(records?: { startDate: string; endDate?: string }[]): number[] {
  const currentFY = getCurrentFiscalYear();
  const years = new Set<number>([currentFY, 2570, 2569]);
  if (records) {
    for (const r of records) {
      if (r.startDate) years.add(getFiscalYear(r.startDate));
      if (r.endDate) years.add(getFiscalYear(r.endDate));
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * จัดรูปแบบข้อความแสดงชื่อปีงบประมาณพร้อมช่วงวันที่
 * @param fy ปีงบประมาณ หรือ 'all'
 * @param full แสดงแบบเต็มหรือย่อ
 * ตัวอย่าง: "ปีงบประมาณ 2570 (1 ต.ค. 2569 – 30 ก.ย. 2570)"
 */
export function formatFiscalYearLabel(fy: number | 'all', full: boolean = false): string {
  if (fy === 'all') return 'ทุกปีงบประมาณ';
  const range = getFiscalYearDateRange(fy);
  const startParts = range.startDate.split('-');
  const startBE = parseInt(startParts[0], 10) + 543;
  if (full) {
    return `ปีงบประมาณ ${fy} (1 ต.ค. ${startBE} – 30 ก.ย. ${fy})`;
  }
  return `ปีงบฯ ${fy} (1 ต.ค. ${startBE % 100} – 30 ก.ย. ${fy % 100})`;
}

/**
 * โครงสร้างผลลัพธ์การแจกแจงรายละเอียดวันลา
 */
export interface LeaveBreakdown {
  totalCalendarDays: number;            // จำนวนวันปฏิทินทั้งหมดในช่วงวันที่เลือก
  calculatedDays: number;               // จำนวนวันลาสุทธิที่ต้องตัดยอดโควตา
  weekendDaysCount: number;             // จำนวนวันเสาร์-อาทิตย์ที่ตรวจพบและข้าม
  holidaysCount: number;                // จำนวนวันหยุดราชการนักขัตฤกษ์ที่ตรวจพบและหักออก
  holidaysList: { date: string; name: string }[]; // รายการวันหยุดราชการพร้อมชื่อ
  skippedDates: string[];               // วันที่ที่ถูกยกเว้นทั้งหมด
}

/**
 * วิเคราะห์และแจกแจงรายละเอียดการคำนวณวันลาอย่างแม่นยำ 100%
 * คำนวณวันปฏิทิน, วันหยุดเสาร์-อาทิตย์, และวันหยุดนักขัตฤกษ์ เพื่อแสดงใน UI ให้ผู้ใช้เห็นความโปร่งใส
 */
export function getLeaveDaysBreakdown(
  startDateStr: string,
  endDateStr: string,
  period: 'full' | 'morning' | 'afternoon' = 'full',
  skipWeekends: boolean = true
): LeaveBreakdown {
  if (!startDateStr || !endDateStr || startDateStr > endDateStr) {
    return {
      totalCalendarDays: 0,
      calculatedDays: 0,
      weekendDaysCount: 0,
      holidaysCount: 0,
      holidaysList: [],
      skippedDates: [],
    };
  }

  let totalCalendarDays = 0;
  let weekendDaysCount = 0;
  let holidaysCount = 0;
  const holidaysList: { date: string; name: string }[] = [];
  const skippedDates: string[] = [];
  let calculatedDays = 0;

  // กรณีลาครึ่งวัน
  if (period === 'morning' || period === 'afternoon') {
    totalCalendarDays = 1;
    const isWk = isWeekend(startDateStr);
    const hol = getHolidayInfo(startDateStr);
    if (isWk) {
      weekendDaysCount = 1;
      skippedDates.push(startDateStr);
    }
    if (hol) {
      holidaysList.push({ date: startDateStr, name: hol.name });
      if (!isWk) {
        holidaysCount = 1;
        skippedDates.push(startDateStr);
      }
    }
    if (skipWeekends && (isWk || hol)) {
      calculatedDays = 0;
    } else {
      calculatedDays = 0.5;
    }
    return {
      totalCalendarDays,
      calculatedDays,
      weekendDaysCount,
      holidaysCount,
      holidaysList,
      skippedDates,
    };
  }

  // กรณีลาเต็มวันหนึ่งวันขึ้นไป
  let current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (current <= end) {
    totalCalendarDays += 1;
    const dStr = toDateString(current);
    const dayOfWeek = current.getDay();
    const isWk = dayOfWeek === 0 || dayOfWeek === 6;
    const hol = getHolidayInfo(dStr);

    if (isWk) {
      weekendDaysCount += 1;
      skippedDates.push(dStr);
    }

    if (hol) {
      holidaysList.push({ date: dStr, name: hol.name });
      if (!isWk) {
        holidaysCount += 1;
        skippedDates.push(dStr);
      }
    }

    if (!skipWeekends || (!isWk && !hol)) {
      calculatedDays += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return {
    totalCalendarDays,
    calculatedDays,
    weekendDaysCount,
    holidaysCount,
    holidaysList,
    skippedDates,
  };
}
