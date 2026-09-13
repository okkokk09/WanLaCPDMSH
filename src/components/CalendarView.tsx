import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPES, LEAVE_TYPE_MAP, WORK_GROUPS } from '../utils/constants';
import {
  getMonthCalendarCells,
  THAI_MONTHS_FULL,
  THAI_DAYS_SHORT,
  isDateInLeaveRange,
  formatThaiDateFull,
} from '../utils/dateUtils';

interface CalendarViewProps {
  staffList: Staff[];
  records: LeaveRecord[];
  onOpenNewLeaveOnDate: (dateStr: string) => void;
  onDeleteRecord: (recordId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  staffList,
  records,
  onOpenNewLeaveOnDate,
  onDeleteRecord,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth());
  };

  // Filter records based on selected dept, staff and search query
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

  // Calendar cells
  const calendarCells = useMemo(() => {
    return getMonthCalendarCells(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
  }, [staffList]);

  // Detailed records for the selected modal date
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

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Calendar Header with navigation & filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg transition-all text-slate-700 cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg transition-all text-slate-700 cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>
                {THAI_MONTHS_FULL[currentMonth]} {currentYear + 543}
              </span>
              <span className="text-xs font-normal text-slate-400">({currentYear})</span>
            </h2>
          </div>

          <button
            onClick={handleJumpToToday}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
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
              className="pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white w-32 sm:w-44 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedStaffId('all');
              }}
              className="bg-transparent text-slate-700 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all">ทุกกลุ่มงาน</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Staff filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all">บุคลากรทุกคน</option>
              {staffList
                .filter((s) => selectedDept === 'all' || s.department === selectedDept)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-600">
          {THAI_DAYS_SHORT.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-3 ${idx === 0 || idx === 6 ? 'text-rose-500' : 'text-slate-700'}`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarCells.map((cell) => {
            const leavesOnDay = filteredRecords.filter((r) =>
              isDateInLeaveRange(cell.dateStr, r)
            );

            return (
              <div
                key={cell.dateStr}
                onClick={() => setDetailDate(cell.dateStr)}
                className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer relative group ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/50 text-slate-300'
                    : cell.isWeekend
                    ? 'bg-slate-50/30'
                    : 'bg-white hover:bg-indigo-50/30'
                }`}
              >
                {/* Cell Header: Day number & quick add */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      cell.isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : cell.isWeekend && cell.isCurrentMonth
                        ? 'text-rose-500'
                        : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isCurrentMonth && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewLeaveOnDate(cell.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-100 text-indigo-600 rounded-md transition-all cursor-pointer"
                      title="บันทึกการลาในวันนี้"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Leaves Badges */}
                <div className="mt-1 space-y-1 flex-1">
                  {leavesOnDay.slice(0, 3).map((r) => {
                    const staff = staffMap.get(r.staffId);
                    const leaveType = LEAVE_TYPE_MAP.get(r.leaveTypeId);
                    return (
                      <div
                        key={r.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border flex items-center gap-1 ${
                          leaveType?.color.badge || 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={`${staff?.name || ''} - ${leaveType?.name || ''} (${r.daysCount} วัน)`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${leaveType?.color.dot}`} />
                        <span className="truncate">{staff?.name?.split(' ')[0] || 'บุคลากร'}</span>
                      </div>
                    );
                  })}

                  {leavesOnDay.length > 3 && (
                    <div className="text-[10px] font-bold text-slate-500 text-center py-0.5 bg-slate-100 rounded-md">
                      +{leavesOnDay.length - 3} คน
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <CalendarIcon className="w-4 h-4 text-indigo-600" />
          <span>สัญลักษณ์ประเภทการลา:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {LEAVE_TYPES.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${t.color.dot}`} />
              <span className="text-slate-700 font-medium">{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Modal */}
      {detailDate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  ผู้ที่ลาในวันนี้ ({detailRecords.length} คน)
                </span>
                <button
                  onClick={() => {
                    const d = detailDate;
                    setDetailDate(null);
                    onOpenNewLeaveOnDate(d);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>บันทึกการลาในวันนี้</span>
                </button>
              </div>

              {detailRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  ไม่มีบุคลากรลาในวันนี้
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {detailRecords.map(({ record, staff, leaveType }) => (
                    <div
                      key={record.id}
                      className={`p-3.5 rounded-xl border ${leaveType?.color.border || 'border-slate-200'} ${
                        leaveType?.color.bg || 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{staff?.name}</h4>
                          <p className="text-xs text-slate-500">
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

                      <div className="mt-2.5 pt-2 border-t border-black/5 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>จำนวนวันลา: {record.daysCount} วัน</span>
                        </div>
                        {record.reason && (
                          <div className="text-slate-700 italic">
                            เหตุผล: “{record.reason}”
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm('คุณต้องการลบรายการบันทึกการลานี้ใช่หรือไม่?')) {
                              onDeleteRecord(record.id);
                              setDetailDate(null);
                            }
                          }}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                        >
                          ลบรายการนี้
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 text-right">
                <button
                  onClick={() => setDetailDate(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
