import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Users,
  Filter,
  X,
  Clock,
  Search,
  Flag,
  Printer,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPES, LEAVE_TYPE_MAP, WORK_GROUPS } from '../utils/constants';
import { getHolidayInfo } from '../utils/holidays';
import {
  getMonthCalendarCells,
  THAI_MONTHS_FULL,
  THAI_DAYS_SHORT,
  isDateInLeaveRange,
  formatThaiDateFull,
} from '../utils/dateUtils';

/**
 * โครงสร้าง Props ของหน้าจอปฏิทินวันลา (CalendarView)
 */
interface CalendarViewProps {
  staffList: Staff[];                                         // รายชื่อบุคลากรทั้งหมด
  records: LeaveRecord[];                                     // รายการประวัติการลาทั้งหมด
  onOpenNewLeaveOnDate?: (dateStr: string) => void;           // ฟังก์ชันเปิด Modal บันทึกการลาใหม่โดยระบุวันที่ล่วงหน้า
  onDeleteRecord?: (recordId: string) => void;                 // ฟังก์ชันลบรายการลา (สิทธิ์ Admin)
  onOpenPrintLeave?: (record: LeaveRecord) => void;           // ฟังก์ชันเปิดพิมพ์ใบลามาตรฐาน
  isAdmin?: boolean;                                          // เป็นผู้ดูแลระบบหรือไม่
  selectedStaffId?: string | null;                            // รหัสบุคลากรที่เลือกกรองจากภายนอก
  onSelectStaff?: (staffId: string) => void;                  // ฟังก์ชันแจ้งเตือนเมื่อเปลี่ยนการเลือกบุคลากร
}

/**
 * คอมโพเนนต์ปฏิทินวันลาปฏิบัติงาน (CalendarView)
 * ประกอบด้วย:
 * - ปฏิทินแสดงผลรายเดือน พร้อมแปลงปี ค.ศ. เป็น พ.ศ. และชื่อเดือนภาษาไทย
 * - แถบนำทางเดือน (เดือนก่อนหน้า, เดือนถัดไป, ปุ่มกระโดดกลับมา "วันนี้")
 * - การแสดงวันหยุดนักขัตฤกษ์ราชการ พ.ศ. 2569–2571 พร้อมชื่อวันหยุด
 * - การแสดงแท็ก/ชิปรายการลาของแต่ละคนแยกสีตามประเภทการลาและกลุ่มงาน
 * - ตัวกรองกลุ่มงาน, ตัวกรองบุคลากร และช่องค้นหาชื่อ
 * - หน้าต่างป็อปอัปแสดงรายละเอียดผู้ลาในวันที่คลิกเลือก (Date Detail Modal)
 */
export const CalendarView: React.FC<CalendarViewProps> = ({
  staffList,
  records,
  onOpenNewLeaveOnDate,
  onDeleteRecord,
  onOpenPrintLeave,
  isAdmin = true,
  selectedStaffId: propSelectedStaffId,
  onSelectStaff,
}) => {
  const today = new Date();
  // ปี ค.ศ. ปัจจุบันในปฏิทิน
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  // เดือนปัจจุบันในปฏิทิน (0 = มกราคม, 11 = ธันวาคม)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  // ตัวกรองกลุ่มงาน
  const [selectedDept, setSelectedDept] = useState<string>('all');
  // ตัวกรองรหัสบุคลากร
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    propSelectedStaffId && propSelectedStaffId !== '' ? propSelectedStaffId : 'all'
  );
  // คำค้นหาชื่อบุคลากร
  const [searchQuery, setSearchQuery] = useState<string>('');
  // วันที่ที่ถูกคลิกเพื่อดูรายละเอียดเชิงลึก (Modal Detail) ในรูปแบบ "YYYY-MM-DD"
  const [detailDate, setDetailDate] = useState<string | null>(null);

  // แผนผัง Map ค้นหาข้อมูลบุคลากรตาม staffId (O(1))
  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);

  // ซิงก์ค่า selectedStaffId กับ Prop ที่ส่งมาจากภายนอก (Navbar)
  useEffect(() => {
    const targetId = propSelectedStaffId && propSelectedStaffId !== '' ? propSelectedStaffId : 'all';
    setSelectedStaffId(targetId);
    if (targetId !== 'all') {
      const staff = staffMap.get(targetId);
      if (staff && selectedDept !== 'all' && staff.department !== selectedDept) {
        setSelectedDept('all');
      }
    }
  }, [propSelectedStaffId, staffMap, selectedDept]);

  // จัดการเมื่อผู้ใช้เลือกบุคลากรใน Dropdown
  const handleStaffChange = (newStaffId: string) => {
    setSelectedStaffId(newStaffId);
    if (onSelectStaff) {
      onSelectStaff(newStaffId === 'all' ? '' : newStaffId);
    }
  };

  // เลื่อนไปเดือนก่อนหน้า
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // เลื่อนไปเดือนถัดไป
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // กระโดดกลับมาดูเดือนและปีปัจจุบัน (วันนี้)
  const handleJumpToToday = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth());
  };

  // กรองรายการลาที่จะนำมาแสดงบนปฏิทินตามกลุ่มงาน, บุคลากร และคำค้นหา
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (r.status === 'rejected') return false;
      const staff = staffMap.get(r.staffId);
      if (!staff) return false;
      if (selectedDept !== 'all' && staff.department !== selectedDept) return false;
      if (selectedStaffId !== 'all' && staff.id !== selectedStaffId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = staff.name.toLowerCase().includes(q);
        const matchPos = staff.position.toLowerCase().includes(q);
        if (!matchName && !matchPos) return false;
      }
      return true;
    });
  }, [records, staffMap, selectedDept, selectedStaffId, searchQuery]);

  // คำนวณช่องตารางปฏิทิน 35-42 ช่อง (รวมวันของเดือนก่อนหน้าและเดือนถัดไป)
  const calendarCells = useMemo(() => {
    return getMonthCalendarCells(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // รายชื่อกลุ่มงานทั้งหมดที่ไม่ซ้ำกัน
  const departments = useMemo(() => {
    return Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
  }, [staffList]);

  // รายการลาของวันที่ถูกคลิกเลือกใน Modal แสดงรายละเอียด
  const detailRecords = useMemo(() => {
    if (!detailDate) return [];
    return filteredRecords
      .filter((r) => isDateInLeaveRange(detailDate, r))
      .map((r) => ({
        record: r,
        staff: staffMap.get(r.staffId),
        leaveType: LEAVE_TYPE_MAP.get(r.leaveTypeId),
      }));
  }, [detailDate, filteredRecords, staffMap]);

  // ข้อมูลวันหยุดนักขัตฤกษ์ของวันที่ถูกคลิกเลือก (ถ้ามี)
  const detailHoliday = useMemo(() => {
    return detailDate ? getHolidayInfo(detailDate) : null;
  }, [detailDate]);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 animate-in fade-in duration-200 overflow-hidden">
      {/* Calendar Header with navigation & filters */}
      <div className="flex-shrink-0 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs rounded-lg transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-xs rounded-lg transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                {THAI_MONTHS_FULL[currentMonth]} {currentYear + 543}
              </span>
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({currentYear})</span>
            </h2>
          </div>

          <button
            onClick={handleJumpToToday}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors cursor-pointer"
          >
            วันนี้
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 w-32 sm:w-44 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedStaffId('all');
              }}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ทุกกลุ่มงาน</option>
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Staff filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStaffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">บุคลากรทุกคน</option>
              {staffList
                .filter((s) => selectedDept === 'all' || s.department === selectedDept)
                .map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Staff Filter Banner */}
      {selectedStaffId !== 'all' && staffMap.get(selectedStaffId) && (
        <div className="flex-shrink-0 shrink-0 flex items-center justify-between px-3.5 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-800 dark:text-indigo-200 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span>
              กำลังแสดงผลเฉพาะวันลาของ: <strong className="font-bold underline underline-offset-2">{staffMap.get(selectedStaffId)?.name}</strong>
              <span className="text-indigo-600/80 dark:text-indigo-400/80 ml-1.5 font-normal">
                ({staffMap.get(selectedStaffId)?.department})
              </span>
            </span>
          </div>
          <button
            onClick={() => handleStaffChange('all')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer font-medium shadow-2xs"
            title="ล้างตัวกรองและแสดงบุคลากรทุกคน"
          >
            <X className="w-3.5 h-3.5" />
            <span>แสดงทุกคน</span>
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Weekday headers */}
        <div className="flex-shrink-0 shrink-0 grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
          {THAI_DAYS_SHORT.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-2 sm:py-2.5 ${idx === 0 || idx === 6 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div
          className="flex-1 min-h-0 grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto"
          style={{ gridTemplateRows: `repeat(${calendarCells.length / 7}, minmax(0, 1fr))` }}
        >
          {calendarCells.map((cell) => {
            const leavesOnDay = filteredRecords.filter((r) =>
              isDateInLeaveRange(cell.dateStr, r)
            );

            return (
              <div
                key={cell.dateStr}
                onClick={() => setDetailDate(cell.dateStr)}
                className={`min-h-0 p-1 sm:p-1.5 flex flex-col justify-between transition-colors cursor-pointer relative group overflow-hidden ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/50 dark:bg-slate-950/50 text-slate-300 dark:text-slate-600'
                    : cell.holiday
                    ? 'bg-rose-50/35 dark:bg-rose-950/25 hover:bg-rose-100/50 dark:hover:bg-rose-900/40'
                    : cell.isWeekend
                    ? 'bg-slate-50/30 dark:bg-slate-950/30'
                    : 'bg-white dark:bg-slate-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30'
                }`}
              >
                {/* Cell Header: Day number, holiday badge & quick add */}
                <div className="flex-shrink-0 shrink-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                        cell.isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : cell.isWeekend && cell.isCurrentMonth
                          ? 'text-rose-500'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {isAdmin && cell.isCurrentMonth && onOpenNewLeaveOnDate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenNewLeaveOnDate(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 sm:p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-md transition-all cursor-pointer"
                        title="บันทึกการลาในวันนี้"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Holiday Badge */}
                  {cell.holiday && cell.isCurrentMonth && (
                    <div
                      className="mt-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-[10px] font-semibold truncate border border-rose-200 dark:border-rose-900 flex items-center gap-1 shadow-2xs"
                      title={`วันหยุดราชการ: ${cell.holiday.name}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">{cell.holiday.name}</span>
                    </div>
                  )}
                </div>

                {/* Leaves Badges */}
                <div className="mt-1 space-y-1 flex-1 min-h-0 max-h-[120px] overflow-y-auto pr-0.5">
                  {leavesOnDay.map((r) => {
                    const staff = staffMap.get(r.staffId);
                    const leaveType = LEAVE_TYPE_MAP.get(r.leaveTypeId);
                    return (
                      <div
                        key={r.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border flex items-center justify-between gap-1 shadow-2xs ${
                          leaveType?.color.badge || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={`${staff?.name || ''} - ${leaveType?.name || ''} (${r.daysCount} วัน)`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${leaveType?.color.dot}`} />
                          <span className="truncate">{staff?.name?.split(' ')[0] || 'บุคลากร'}</span>
                        </div>
                        <span className="text-[9px] font-semibold opacity-80 shrink-0">
                          {leaveType?.shortName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
          <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>สัญลักษณ์ประเภทการลา:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[11px] font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/60" />
            <span className="font-semibold">วันหยุดราชการ</span>
          </div>
          {LEAVE_TYPES.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium shadow-2xs ${t.color.badge}`}
            >
              <span className={`w-2 h-2 rounded-full ${t.color.dot}`} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Modal */}
      {detailDate && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailDate(null);
            }
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>รายละเอียดการลา</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatThaiDateFull(detailDate)}
                </p>
              </div>
              <button
                onClick={() => setDetailDate(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Public Holiday Banner */}
              {detailHoliday && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/60 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                      วันหยุดราชการ
                    </span>
                    <span className="text-sm font-bold text-rose-950 dark:text-rose-200">{detailHoliday.name}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                  ผู้ที่ลาในวันนี้ ({detailRecords.length} คน)
                </span>
                {isAdmin && onOpenNewLeaveOnDate && (
                  <button
                    onClick={() => {
                      const d = detailDate;
                      setDetailDate(null);
                      onOpenNewLeaveOnDate(d);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>บันทึกการลาในวันนี้</span>
                  </button>
                )}
              </div>

              {detailRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  ไม่มีบุคลากรลาในวันนี้
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {detailRecords.map(({ record, staff, leaveType }) => (
                    <div
                      key={record.id}
                      className={`p-3.5 rounded-xl border ${leaveType?.color.border || 'border-slate-200 dark:border-slate-700'} ${
                        leaveType?.color.bg || 'bg-slate-50'
                      } dark:bg-slate-800/60 dark:border-slate-700/60`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{staff?.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {staff?.department} • {staff?.position}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                            leaveType?.color.badge || 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {leaveType?.name}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>จำนวนวันลา: {record.daysCount} วัน</span>
                        </div>
                        {record.reason && (
                          <div className="text-slate-700 dark:text-slate-300 italic">
                            เหตุผล: “{record.reason}”
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
                        {onOpenPrintLeave ? (
                          <button
                            onClick={() => {
                              onOpenPrintLeave(record);
                              setDetailDate(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                            title="พิมพ์ใบลามาตรฐานสำนักงาน"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>พิมพ์ใบลา</span>
                          </button>
                        ) : <div />}

                        {isAdmin && onDeleteRecord && (
                          <button
                            onClick={() => {
                              if (window.confirm('คุณต้องการลบรายการบันทึกการลานี้ใช่หรือไม่?')) {
                                onDeleteRecord(record.id);
                                setDetailDate(null);
                              }
                            }}
                            className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-medium cursor-pointer"
                          >
                            ลบรายการนี้
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-right">
                <button
                  onClick={() => setDetailDate(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
