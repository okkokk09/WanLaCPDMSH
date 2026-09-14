import React, { useState, useMemo } from 'react';
import {
  User,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPES, LEAVE_TYPE_MAP } from '../utils/constants';
import { calculateStaffSummaries } from '../utils/storage';
import { formatThaiDateFull } from '../utils/dateUtils';

interface MyLeaveViewProps {
  staffList: Staff[];
  records: LeaveRecord[];
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string) => void;
}

export const MyLeaveView: React.FC<MyLeaveViewProps> = ({
  staffList,
  records,
  selectedStaffId,
  onSelectStaff,
}) => {
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');

  // Find the selected staff member
  const currentStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffList.find((s) => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  // Calculate summaries for this staff member
  const staffSummary = useMemo(() => {
    if (!currentStaff) return null;
    const summaries = calculateStaffSummaries([currentStaff], records);
    return summaries[0] || null;
  }, [currentStaff, records]);

  // Filter leave records for current staff
  const myRecords = useMemo(() => {
    if (!currentStaff) return [];
    return records
      .filter((r) => r.staffId === currentStaff.id)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [currentStaff, records]);

  // Filtered records by search and type
  const filteredRecords = useMemo(() => {
    return myRecords.filter((r) => {
      const matchType = filterLeaveType === 'all' || r.leaveTypeId === filterLeaveType;
      const q = searchHistoryQuery.toLowerCase().trim();
      const typeName = LEAVE_TYPE_MAP.get(r.leaveTypeId)?.name || '';
      const matchQuery =
        !q ||
        r.startDate.includes(q) ||
        r.endDate.includes(q) ||
        typeName.toLowerCase().includes(q) ||
        (r.reason && r.reason.toLowerCase().includes(q));

      return matchType && matchQuery;
    });
  }, [myRecords, filterLeaveType, searchHistoryQuery]);

  // If no staff selected, show friendly picker
  if (!currentStaff) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            เลือกชื่อบุคลากรของคุณ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            กรุณาเลือกชื่อของคุณจากรายชื่อเพื่อเข้าดูข้อมูลวันลา โควตาวันลาสะสม
            และประวัติการลาส่วนบุคคล (ระบบจะจดจำชื่อของท่านไว้สำหรับครั้งต่อไป)
          </p>

          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                รายชื่อบุคลากร ({staffList.length} ท่าน)
              </label>
              <select
                value=""
                onChange={(e) => onSelectStaff(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="" disabled>
                  -- แตะเพื่อเลือกชื่อของคุณ --
                </option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.department} • {s.position})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                หากท่านเป็นผู้ดูแลระบบที่ต้องการบันทึกหรือจัดการข้อมูล สามารถกดปุ่ม <b>"เข้าสู่ระบบผู้ดูแล"</b> ที่มุมบนขวาได้
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quota metrics for selected staff
  const sickQuota = staffSummary?.quotas['sick'] || 30;
  const sickUsed = staffSummary?.usedByType['sick'] || 0;
  const sickRemain = staffSummary?.remainingByType['sick'] ?? sickQuota;

  const bizQuota = staffSummary?.quotas['business'] || 6;
  const bizUsed = staffSummary?.usedByType['business'] || 0;
  const bizRemain = staffSummary?.remainingByType['business'] ?? bizQuota;

  const vacQuota = staffSummary?.quotas['vacation'] || 10;
  const vacUsed = staffSummary?.usedByType['vacation'] || 0;
  const vacRemain = staffSummary?.remainingByType['vacation'] ?? vacQuota;
  const carriedOver = currentStaff.carriedOverVacationDays || 0;

  const totalUsed = staffSummary?.totalUsed || 0;
  const totalRemaining = staffSummary?.totalRemaining || 0;
  const totalQuota = staffSummary?.totalQuota || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-indigo-100 dark:shadow-none shrink-0">
            {currentStaff.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {currentStaff.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                บุคลากรทั่วไป
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              {currentStaff.position}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              สังกัด: {currentStaff.department} {currentStaff.empId ? `• รหัส: ${currentStaff.empId}` : ''}
            </p>
          </div>
        </div>

        {/* Switch staff button / selector */}
        <div className="w-full md:w-auto flex items-center gap-2">
          <div className="flex-1 md:w-56">
            <label className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold mb-1">
              สลับดูข้อมูลบุคลากรท่านอื่น:
            </label>
            <select
              value={currentStaff.id}
              onChange={(e) => onSelectStaff(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quotas & Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vacation Leave Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">
              วันลาพักผ่อน
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {vacRemain}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันคงเหลือ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ใช้ไปแล้ว: <b className="text-slate-800 dark:text-slate-200">{vacUsed}</b> วัน</span>
            <span>สิทธิ์รวม: <b className="text-slate-800 dark:text-slate-200">{vacQuota}</b> วัน</span>
          </div>
          {carriedOver > 0 && (
            <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              (รวมสะสมยกมา {carriedOver} วัน)
            </div>
          )}
        </div>

        {/* Sick Leave Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase">
              วันลาป่วย
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {sickRemain}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันคงเหลือ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ใช้ไปแล้ว: <b className="text-slate-800 dark:text-slate-200">{sickUsed}</b> วัน</span>
            <span>โควตา: <b className="text-slate-800 dark:text-slate-200">{sickQuota}</b> วัน</span>
          </div>
        </div>

        {/* Business Leave Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase">
              วันลากิจ
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {bizRemain}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันคงเหลือ</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ใช้ไปแล้ว: <b className="text-slate-800 dark:text-slate-200">{bizUsed}</b> วัน</span>
            <span>โควตา: <b className="text-slate-800 dark:text-slate-200">{bizQuota}</b> วัน</span>
          </div>
        </div>

        {/* Total Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              ภาพรวมทุกประเภท
            </span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {totalRemaining}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันคงเหลือรวม</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>ใช้วันลาแล้ว: <b className="text-slate-800 dark:text-slate-200">{totalUsed}</b> วัน</span>
            <span>จากโควตารวม: <b className="text-slate-800 dark:text-slate-200">{totalQuota}</b> วัน</span>
          </div>
        </div>
      </div>

      {/* Personal Leave History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Header & Filters */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>ประวัติการลาของฉัน</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              รายการวันลาที่บันทึกไว้ในระบบทั้งหมด ({myRecords.length} รายการ)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchHistoryQuery}
                onChange={(e) => setSearchHistoryQuery(e.target.value)}
                placeholder="ค้นหาวันที่, เหตุผล..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Leave Type filter */}
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">ทุกประเภท</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 stroke-[1.5] text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {myRecords.length === 0
                  ? 'ยังไม่มีประวัติการลาในระบบ'
                  : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                เมื่อผู้ดูแลระบบบันทึกการลา รายการจะปรากฏในตารางนี้โดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">ประเภทการลา</th>
                  <th className="py-3 px-4">ช่วงวันที่ลา</th>
                  <th className="py-3 px-3 text-center">ช่วงเวลา</th>
                  <th className="py-3 px-3 text-center">จำนวนวัน</th>
                  <th className="py-3 px-4">เหตุผลการลา</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((r) => {
                  const typeConfig = LEAVE_TYPE_MAP.get(r.leaveTypeId);
                  const periodLabel =
                    r.period === 'morning'
                      ? 'ครึ่งวันเช้า'
                      : r.period === 'afternoon'
                      ? 'ครึ่งวันบ่าย'
                      : 'เต็มวัน';

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Leave Type */}
                      <td className="py-3 px-4 font-medium">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            typeConfig?.color?.badge || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              typeConfig?.color?.dot || 'bg-slate-400'
                            }`}
                          />
                          {typeConfig?.name || r.leaveTypeId}
                        </span>
                      </td>

                      {/* Date Range */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatThaiDateFull(r.startDate)}
                        </div>
                        {r.startDate !== r.endDate && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            ถึง {formatThaiDateFull(r.endDate)}
                          </div>
                        )}
                      </td>

                      {/* Period */}
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">
                        {periodLabel}
                      </td>

                      {/* Days Count */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {r.daysCount} วัน
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {r.reason || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {r.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            อนุมัติ
                          </span>
                        )}
                        {r.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            รอตรวจสอบ
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            ยกเลิก
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Note / Disclaimer */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            คำแนะนำสำหรับบุคลากร:
          </span>{' '}
          หน้าจอนี้แสดงข้อมูลสิทธิ์วันลาและประวัติการลาส่วนบุคคลของท่าน เพื่อตรวจสอบยอดคงเหลือ
          หากต้องการยื่นใบลา แก้ไขข้อมูล หรือตรวจสอบสิทธิ์เพิ่มเติม
          กรุณาติดต่อผู้ดูแลระบบ (งานการเจ้าหน้าที่ / ฝ่ายบริหารทั่วไป)
        </div>
      </div>
    </div>
  );
};
