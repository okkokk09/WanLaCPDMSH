import React, { useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  PlusCircle,
  UserPlus,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPE_MAP } from '../utils/constants';
import { toDateString, formatThaiDateShort, isDateInLeaveRange } from '../utils/dateUtils';
import { exportSummaryToExcel, calculateStaffSummaries } from '../utils/storage';

interface DashboardViewProps {
  staffList: Staff[];
  records: LeaveRecord[];
  onOpenNewLeave: () => void;
  onOpenNewStaff: () => void;
  onNavigateTab: (tab: 'records' | 'calendar' | 'staff' | 'balance') => void;
  onDeleteRecord: (recordId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  staffList,
  records,
  onOpenNewLeave,
  onOpenNewStaff,
  onNavigateTab,
  onDeleteRecord,
}) => {
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);

  // People on leave today
  const leavesToday = useMemo(() => {
    return records
      .filter((r) => r.status !== 'rejected' && isDateInLeaveRange(todayStr, r))
      .map((r) => ({
        record: r,
        staff: staffMap.get(r.staffId),
        leaveType: LEAVE_TYPE_MAP.get(r.leaveTypeId),
      }));
  }, [records, todayStr, staffMap]);

  // Current month leave records
  const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"
  const recordsThisMonth = useMemo(() => {
    return records.filter(
      (r) =>
        r.status !== 'rejected' &&
        (r.startDate.startsWith(currentMonthPrefix) || r.endDate.startsWith(currentMonthPrefix))
    );
  }, [records, currentMonthPrefix]);

  const totalDaysThisMonth = useMemo(() => {
    return recordsThisMonth.reduce((sum, r) => sum + r.daysCount, 0);
  }, [recordsThisMonth]);


  // Recent 5 leave records
  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [records]);

  // Staff leave summaries for quick export
  const staffSummaries = useMemo(() => {
    return calculateStaffSummaries(staffList, records);
  }, [staffList, records]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-indigo-200 mb-2 backdrop-blur-xs">
            📅 ยินดีต้อนรับสู่ระบบบันทึกวันลา
          </span>
          <h2 className="text-2xl font-bold tracking-tight">ภาพรวมข้อมูลการลาบุคลากร</h2>
          <p className="text-sm text-indigo-200 mt-1">
            วันนี้ {formatThaiDateShort(todayStr)} • บริหารจัดการวันลาบุคลากรได้ครบจบในที่เดียว
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
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Staff */}
        <div
          onClick={() => onNavigateTab('staff')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              บุคลากรทั้งหมด
            </span>
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{staffList.length}</span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <p className="mt-2 text-xs text-indigo-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            <span>จัดการรายชื่อและโควตา</span> →
          </p>
        </div>

        {/* Card 2: People on Leave Today */}
        <div
          onClick={() => onNavigateTab('calendar')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ผู้ที่ลาวันนี้
            </span>
            <div className={`p-2.5 rounded-xl transition-colors ${
              leavesToday.length > 0
                ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
            }`}>
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{leavesToday.length}</span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            {leavesToday.length > 0 ? 'กำลังลาอยู่ในขณะนี้' : 'ไม่มีผู้ลา ทุกคนปฏิบัติงาน'}
          </p>
        </div>

        {/* Card 3: Days used this month */}
        <div
          onClick={() => onNavigateTab('records')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              การลาในเดือนนี้
            </span>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalDaysThisMonth}</span>
            <span className="text-xs text-slate-500">วัน ({recordsThisMonth.length} รายการ)</span>
          </div>
          <p className="mt-2 text-xs text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            <span>ดูรายการบันทึกทั้งหมด</span> →
          </p>
        </div>
      </div>

      {/* Main Row: Today's Leaves & Leave Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Today's Leaves & Recent History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Leaves Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900">
                  วันนี้ใครลาบ้าง? ({formatThaiDateShort(todayStr)})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>เปิดดูปฏิทินทั้งเดือน</span>
              </button>
            </div>

            {leavesToday.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">วันนี้ไม่มีบุคลากรลา</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ทุกคนปฏิบัติงานตามปกติ หรือยังไม่มีการบันทึกการลาในวันนี้
                </p>
                <button
                  onClick={onOpenNewLeave}
                  className="mt-3 text-xs bg-white text-indigo-600 border border-indigo-200 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1 cursor-pointer"
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
                    className={`p-3.5 rounded-xl border ${leaveType?.color.border || 'border-slate-200'} ${
                      leaveType?.color.bg || 'bg-slate-50'
                    } flex flex-col justify-between`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {staff?.name || 'ไม่พบข้อมูล'}
                        </span>
                        <span className="text-[11px] text-slate-500">
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

                    <div className="mt-2 pt-2 border-t border-black/5 text-xs text-slate-600">
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">รายการบันทึกล่าสุด</h3>
              <button
                onClick={() => onNavigateTab('records')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>ดูทั้งหมด ({records.length})</span> →
              </button>
            </div>

            {recentRecords.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">ยังไม่มีประวัติการลา</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                      <th className="pb-2.5">บุคลากร</th>
                      <th className="pb-2.5">ประเภทการลา</th>
                      <th className="pb-2.5">ช่วงวันที่ลา</th>
                      <th className="pb-2.5">จำนวนวัน</th>
                      <th className="pb-2.5 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRecords.map((r) => {
                      const staff = staffMap.get(r.staffId);
                      const leaveType = LEAVE_TYPE_MAP.get(r.leaveTypeId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 font-medium text-slate-800">
                            <div>{staff?.name || '-'}</div>
                            <div className="text-[10px] text-slate-400">{staff?.department}</div>
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
                          <td className="py-2.5 text-slate-600">
                            {formatThaiDateShort(r.startDate)}
                            {r.startDate !== r.endDate && ` - ${formatThaiDateShort(r.endDate)}`}
                          </td>
                          <td className="py-2.5 font-semibold text-slate-700">
                            {r.daysCount} วัน
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm('คุณต้องการลบรายการบันทึกการลานี้ใช่หรือไม่?')) {
                                  onDeleteRecord(r.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              เมนูลัดการทำงาน
            </h4>
            <div className="space-y-2">
              <button
                onClick={onOpenNewLeave}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer border border-indigo-100"
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-600" />
                  บันทึกการลาใหม่
                </span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('calendar')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  เปิดดูปฏิทินวันลา
                </span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('balance')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  ตรวจสอบสรุปวันลาคงเหลือ
                </span>
                <span>→</span>
              </button>
              <button
                onClick={() => onNavigateTab('staff')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-slate-500" />
                  จัดการรายชื่อบุคลากร
                </span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Quick Actions & Report Download */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-2xl border border-indigo-100 p-5">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
              รายงานและการส่งออก
            </h4>
            <p className="text-xs text-slate-600 mb-3.5">
              ดาวน์โหลดสรุปวันลาคงเหลือของบุคลากรเป็นไฟล์ Excel เพื่อพิมพ์หรือนำเสนอผู้บริหาร
            </p>

            <button
              onClick={() => exportSummaryToExcel(staffSummaries)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ดาวน์โหลด Excel สรุปวันลาคงเหลือ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
