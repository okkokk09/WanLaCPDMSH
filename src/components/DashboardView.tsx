import React, { useMemo, useState } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  PlusCircle,
  UserPlus,
  Calendar,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  CheckCircle2,
  Trash2,
  Printer,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPE_MAP } from '../utils/constants';
import {
  toDateString,
  formatThaiDateShort,
  isDateInLeaveRange,
  getCurrentFiscalYear,
  getFiscalYear,
  getAvailableFiscalYears,
  formatFiscalYearLabel,
} from '../utils/dateUtils';
import { exportSummaryToExcel, exportSummaryToCsv, calculateStaffSummaries } from '../utils/storage';

/**
 * โครงสร้าง Props ของหน้าจอภาพรวมแดชบอร์ด (DashboardView)
 */
interface DashboardViewProps {
  staffList: Staff[];                                                           // รายชื่อบุคลากรทั้งหมด
  records: LeaveRecord[];                                                       // ประวัติการลาทั้งหมด
  onOpenNewLeave: () => void;                                                   // เปิด Modal บันทึกการลาใหม่
  onOpenNewStaff: () => void;                                                   // เปิด Modal เพิ่มบุคลากรใหม่
  onNavigateTab: (tab: 'records' | 'calendar' | 'staff' | 'balance') => void;   // สลับไปยังแท็บอื่น
  onDeleteRecord: (recordId: string) => void;                                   // ลบรายการลา
  onOpenPrintLeave?: (record: LeaveRecord) => void;                             // ฟังก์ชันเปิดพิมพ์ใบลามาตรฐาน
  selectedFiscalYear?: number | 'all';                                         // ปีงบประมาณที่เลือกจาก Navbar หรือ State ส่วนกลาง
  availableFiscalYears?: number[];                                              // รายการปีงบประมาณที่มีข้อมูล
  onSelectFiscalYear?: (fy: number | 'all') => void;                            // ฟังก์ชันสลับปีงบประมาณ
}

/**
 * คอมโพเนนต์หน้าจอแดชบอร์ดภาพรวมระบบ (DashboardView)
 * ประกอบด้วย:
 * - ตัวสลับปีงบประมาณ (Fiscal Year Switcher)
 * - การ์ดตัวชี้วัดหลัก (Metric Cards): จำนวนบุคลากร, วันลาสะสมในปีงบประมาณ, วันลาในเดือนนี้, บุคลากรที่กำลังลาวันนี้
 * - รายชื่อบุคลากรที่ลาปฏิบัติงานวันนี้ (Today's Leaves)
 * - ประวัติการลาล่าสุด 5 รายการ (Recent Leaves) พร้อมปุ่มลบรายการ
 * - เมนูด่วนสำหรับส่งออกรายงานเป็น Excel / CSV
 */
export const DashboardView: React.FC<DashboardViewProps> = ({
  staffList,
  records,
  onOpenNewLeave,
  onOpenNewStaff,
  onNavigateTab,
  onDeleteRecord,
  onOpenPrintLeave,
  selectedFiscalYear: selectedFiscalYearProp,
  availableFiscalYears: availableFiscalYearsProp,
  onSelectFiscalYear,
}) => {
  // วันที่ปัจจุบันในรูปแบบ "YYYY-MM-DD"
  const todayStr = useMemo(() => toDateString(new Date()), []);
  // แผนผัง Map ค้นหาข้อมูลบุคลากรจาก staffId (O(1))
  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  
  // ปีงบประมาณที่เลือก
  const currentFiscalYear = getCurrentFiscalYear();
  const activeFiscalYear = selectedFiscalYearProp !== undefined ? selectedFiscalYearProp : currentFiscalYear;
  // รายการปีงบประมาณทั้งหมดที่มีข้อมูล
  const availableFiscalYearsList = useMemo(() => {
    return availableFiscalYearsProp ?? getAvailableFiscalYears(records);
  }, [availableFiscalYearsProp, records]);

  // คำนวณรายชื่อบุคลากรที่ลาปฏิบัติงานในวันนี้ (เปรียบเทียบกับช่วงวันที่เริ่ม-สิ้นสุดลา)
  const leavesToday = useMemo(() => {
    return records
      .filter((r) => r.status !== 'rejected' && isDateInLeaveRange(todayStr, r))
      .map((r) => ({
        record: r,
        staff: staffMap.get(r.staffId),
        leaveType: LEAVE_TYPE_MAP.get(r.leaveTypeId),
      }));
  }, [records, todayStr, staffMap]);

  // กรองรายการลาที่อยู่ในปีงบประมาณที่เลือก
  const recordsInFY = useMemo(() => {
    return records.filter(
      (r) =>
        r.status !== 'rejected' &&
        (activeFiscalYear === 'all' || getFiscalYear(r.startDate) === activeFiscalYear)
    );
  }, [records, activeFiscalYear]);

  // ผลรวมจำนวนวันลาทั้งหมดในปีงบประมาณที่เลือก
  const totalDaysInFY = useMemo(() => {
    return recordsInFY.reduce((sum, r) => sum + r.daysCount, 0);
  }, [recordsInFY]);

  // กรองรายการลาที่อยู่ในเดือนปัจจุบัน
  const currentMonthPrefix = todayStr.substring(0, 7); // รูปแบบ "YYYY-MM"
  const recordsThisMonth = useMemo(() => {
    return records.filter(
      (r) =>
        r.status !== 'rejected' &&
        (r.startDate.startsWith(currentMonthPrefix) || r.endDate.startsWith(currentMonthPrefix))
    );
  }, [records, currentMonthPrefix]);

  // ผลรวมจำนวนวันลาในเดือนปัจจุบัน
  const totalDaysThisMonth = useMemo(() => {
    return recordsThisMonth.reduce((sum, r) => sum + r.daysCount, 0);
  }, [recordsThisMonth]);

  // รายการบันทึกการลาล่าสุด 5 รายการ (จัดเรียงตามเวลาที่สร้างล่าสุด)
  const recentRecords = useMemo(() => {
    return [...records]
      .filter(
        (r) =>
          activeFiscalYear === 'all' || getFiscalYear(r.startDate) === activeFiscalYear
      )
      .sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime())
      .slice(0, 5);
  }, [records, activeFiscalYear]);

  // สรุปสถิติวันลาของบุคลากรสำหรับปุ่มส่งออก Excel / CSV
  const staffSummaries = useMemo(() => {
    return calculateStaffSummaries(staffList, records, activeFiscalYear);
  }, [staffList, records, activeFiscalYear]);

  // สถานะเปิด/ปิดเมนู Dropdown ส่งออกรายงาน
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-5 animate-in fade-in duration-200 pr-1">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-indigo-200 backdrop-blur-xs">
              📅 ยินดีต้อนรับสู่ระบบบันทึกวันลา
            </span>

            {/* Fiscal Year Switcher Button Group */}
            <div className="inline-flex items-center bg-black/30 p-1 rounded-xl border border-white/15 backdrop-blur-xs gap-1">
              <span className="text-[11px] font-semibold text-indigo-200 px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>ปีงบประมาณ:</span>
              </span>
              {availableFiscalYearsList.map((fy) => {
                const isSelected = activeFiscalYear === fy;
                return (
                  <button
                    key={fy}
                    type="button"
                    onClick={() => onSelectFiscalYear?.(fy)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-300/40'
                        : 'text-indigo-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ปีงบฯ {fy}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onSelectFiscalYear?.('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFiscalYear === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-300/40'
                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                }`}
              >
                ทั้งหมด
              </button>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">ภาพรวมข้อมูลการลาบุคลากร</h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            วันนี้ {formatThaiDateShort(todayStr)} • {activeFiscalYear !== 'all' ? formatFiscalYearLabel(activeFiscalYear, true) : 'แสดงรวมทุกปีงบประมาณ'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenNewLeave}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกการลา</span>
          </button>
          <button
            onClick={onOpenNewStaff}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3.5 py-2.5 rounded-xl backdrop-blur-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มบุคลากร</span>
          </button>

          {/* Export to Excel/CSV Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              title="ส่งออกรายงานสรุปวันลาคงเหลือ"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export to Excel/CSV</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {exportDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    ดาวน์โหลดรายงานสรุปวันลาคงเหลือ
                  </div>
                  <button
                    onClick={() => {
                      exportSummaryToExcel(staffSummaries);
                      setExportDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div>Export to Excel (.xlsx)</div>
                      <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">สรุปวันลาคงเหลือทุกคน</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportSummaryToCsv(staffSummaries);
                      setExportDropdownOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <div>
                      <div>Export to CSV (.csv)</div>
                      <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">รองรับภาษาไทย UTF-8</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Staff */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              บุคลากรทั้งหมด
            </span>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{staffList.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">คน</span>
          </div>
          <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            <span>จัดการรายชื่อและโควตา</span> →
          </p>
        </div>

        {/* Card 2: People on Leave Today */}
        <div
          onClick={() => onNavigateTab('calendar')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              ผู้ที่ลาวันนี้
            </span>
            <div className={`p-2.5 rounded-xl transition-colors ${
              leavesToday.length > 0
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'
            }`}>
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{leavesToday.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">คน</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {leavesToday.length > 0 ? 'กำลังลาอยู่ในขณะนี้' : 'ไม่มีผู้ลา ทุกคนปฏิบัติงาน'}
          </p>
        </div>

        {/* Card 3: Days used in selected fiscal year */}
        <div
          onClick={() => onNavigateTab('records')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {activeFiscalYear === 'all' ? 'การลาทั้งหมด' : `การลาในปีงบฯ ${activeFiscalYear}`}
            </span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{totalDaysInFY}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วัน ({recordsInFY.length} รายการ)</span>
          </div>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center justify-between">
            <span>เดือนนี้: {totalDaysThisMonth} วัน</span>
            <span>ดูประวัติทั้งหมด →</span>
          </p>
        </div>
      </div>

      {/* Main Row: Today's Leaves & Leave Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Leaves & Recent History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Leaves Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  วันนี้ใครลาบ้าง? ({formatThaiDateShort(todayStr)})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>เปิดดูปฏิทินทั้งเดือน</span>
              </button>
            </div>

            {leavesToday.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">วันนี้ไม่มีบุคลากรลา</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ทุกคนปฏิบัติงานตามปกติ หรือยังไม่มีการบันทึกการลาในวันนี้
                </p>
                <button
                  onClick={onOpenNewLeave}
                  className="mt-3 text-xs bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  บันทึกการลาวันนี้
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {leavesToday.map(({ record, staff, leaveType }) => (
                  <div
                    key={record.id}
                    className={`p-3.5 rounded-xl border ${leaveType?.color.border || 'border-slate-200 dark:border-slate-700'} ${
                      leaveType?.color.bg || 'bg-slate-50 dark:bg-slate-800/60'
                    } dark:bg-slate-800/70 dark:border-slate-700/80 flex flex-col justify-between`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                          {staff?.name || 'ไม่พบข้อมูล'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {staff?.department} • {staff?.position}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          leaveType?.color.badge || 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {leaveType?.shortName} ({record.daysCount} วัน)
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                      <span className="truncate block">
                        {record.reason ? `“${record.reason}”` : 'ไม่ได้ระบุเหตุผล'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">รายการบันทึกล่าสุด</h3>
              <button
                onClick={() => onNavigateTab('records')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>ดูทั้งหมด ({records.length})</span> →
              </button>
            </div>

            {recentRecords.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">ยังไม่มีประวัติการลา</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase">
                      <th className="pb-2.5">บุคลากร</th>
                      <th className="pb-2.5">ประเภทการลา</th>
                      <th className="pb-2.5">ช่วงวันที่ลา</th>
                      <th className="pb-2.5">จำนวนวัน</th>
                      <th className="pb-2.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentRecords.map((r) => {
                      const staff = staffMap.get(r.staffId);
                      const leaveType = LEAVE_TYPE_MAP.get(r.leaveTypeId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            <div>{staff?.name || '-'}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{staff?.department}</div>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                leaveType?.color.badge || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {leaveType?.name || r.leaveTypeId}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-300">
                            {formatThaiDateShort(r.startDate)}
                            {r.startDate !== r.endDate && ` - ${formatThaiDateShort(r.endDate)}`}
                          </td>
                          <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                            {r.daysCount} วัน
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onOpenPrintLeave && (
                                <button
                                  onClick={() => onOpenPrintLeave(r)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                                  title="พิมพ์ใบลามาตรฐานสำนักงาน"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (window.confirm('คุณต้องการลบรายการบันทึกการลานี้ใช่หรือไม่?')) {
                                    onDeleteRecord(r.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Quick Shortcuts & Exports */}
        <div className="space-y-6">
          {/* Quick Shortcuts */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              เมนูลัดการทำงาน
            </h4>
            <div className="space-y-2">
              <button
                onClick={onOpenNewLeave}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900/60"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  บันทึกการลาใหม่
                </span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  เปิดดูปฏิทินวันลา
                </span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('balance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  ตรวจสอบสรุปวันลาคงเหลือ
                </span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('staff')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  จัดการรายชื่อบุคลากร
                </span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Quick Actions & Report Download */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 p-5">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>รายงานและการส่งออก</span>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-semibold">Summary</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3.5 leading-relaxed">
              ดาวน์โหลดสรุปวันลาคงเหลือของบุคลากรทุกคนเพื่อพิมพ์ ตรวจสอบ หรือประมวลผลต่อ
            </p>

            <div className="space-y-2">
              <button
                onClick={() => exportSummaryToExcel(staffSummaries)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export to Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => exportSummaryToCsv(staffSummaries)}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Export to CSV (.csv)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
