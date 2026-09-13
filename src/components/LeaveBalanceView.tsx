import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  Printer,
  ShieldAlert,
  ShieldCheck,
  PieChart,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { WORK_GROUPS } from '../utils/constants';
import { calculateStaffSummaries, exportSummaryToExcel } from '../utils/storage';

interface LeaveBalanceViewProps {
  staffList: Staff[];
  records: LeaveRecord[];
}

export const LeaveBalanceView: React.FC<LeaveBalanceViewProps> = ({
  staffList,
  records,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Calculate summaries for all staff
  const summaries = useMemo(() => {
    return calculateStaffSummaries(staffList, records);
  }, [staffList, records]);

  // Unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
  }, [staffList]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.staff.name.toLowerCase().includes(q) ||
        s.staff.position.toLowerCase().includes(q) ||
        s.staff.department.toLowerCase().includes(q);

      const matchDept = selectedDept === 'all' || s.staff.department === selectedDept;

      return matchQuery && matchDept;
    });
  }, [summaries, searchQuery, selectedDept]);

  // Overall statistics totals
  const totals = useMemo(() => {
    let totalQuota = 0;
    let totalUsed = 0;
    let totalRemaining = 0;

    summaries.forEach((s) => {
      totalQuota += s.totalQuota;
      totalUsed += s.totalUsed;
      totalRemaining += s.totalRemaining;
    });

    return { totalQuota, totalUsed, totalRemaining };
  }, [summaries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-900">สรุปยอดวันลาคงเหลือและสถิติ</h2>
          <p className="text-xs text-slate-500 mt-1">
            รายงานตรวจสอบสิทธิ์วันลา โควตารวม วันที่ใช้ไป และวันลาคงเหลือของบุคลากรทุกคน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>พิมพ์รายงาน</span>
          </button>
          <button
            onClick={() => exportSummaryToExcel(summaries)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* Top 3 Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">โควตารวมทั้งหมด</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totals.totalQuota}</span>
            <span className="text-xs text-slate-500">วัน</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">จากบุคลากร {staffList.length} คน</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">ใช้วันลาแล้วรวม</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{totals.totalUsed}</span>
            <span className="text-xs text-slate-500">วัน</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">บันทึกการลาทั้งหมดในระบบ</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">วันลาคงเหลือรวม</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totals.totalRemaining}</span>
            <span className="text-xs text-slate-500">วัน</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">สามารถใช้ลาได้ตามสิทธิ์</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Department filter */}
          <div className="w-44">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">ทุกกลุ่มงาน ({staffList.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          แสดง <b className="text-slate-800">{filteredSummaries.length}</b> คน
        </div>
      </div>

      {/* Leave Balances Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">บุคลากร</th>
                <th className="py-3 px-3 text-center bg-rose-50/40 text-rose-800 border-x border-slate-100">
                  ลาป่วย <br />
                  <span className="text-[10px] font-normal text-rose-600">ใช้ / โควตา (คงเหลือ)</span>
                </th>
                <th className="py-3 px-3 text-center bg-amber-50/40 text-amber-800 border-r border-slate-100">
                  ลากิจ <br />
                  <span className="text-[10px] font-normal text-amber-600">ใช้ / โควตา (คงเหลือ)</span>
                </th>
                <th className="py-3 px-3 text-center bg-emerald-50/40 text-emerald-800 border-r border-slate-100">
                  ลาพักผ่อน <br />
                  <span className="text-[10px] font-normal text-emerald-600">ใช้ / โควตา (คงเหลือ)</span>
                </th>
                <th className="py-3 px-3 text-center bg-purple-50/40 text-purple-800 border-r border-slate-100">
                  อื่นๆ <br />
                  <span className="text-[10px] font-normal text-purple-600">ใช้ / คงเหลือ</span>
                </th>
                <th className="py-3 px-4 text-center">รวมใช้ทั้งหมด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.map((s) => {
                const sickQuota = s.quotas['sick'] || 30;
                const sickUsed = s.usedByType['sick'] || 0;
                const sickRemain = s.remainingByType['sick'] ?? sickQuota;

                const bizQuota = s.quotas['business'] || 6;
                const bizUsed = s.usedByType['business'] || 0;
                const bizRemain = s.remainingByType['business'] ?? bizQuota;

                const vacQuota = s.quotas['vacation'] || 10;
                const vacUsed = s.usedByType['vacation'] || 0;
                const vacRemain = s.remainingByType['vacation'] ?? vacQuota;

                const otherUsed =
                  (s.usedByType['maternity'] || 0) +
                  (s.usedByType['ordination'] || 0) +
                  (s.usedByType['other'] || 0);

                return (
                  <tr key={s.staff.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Staff info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.staff.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {s.staff.department} • {s.staff.position}
                      </div>
                    </td>

                    {/* Sick Leave */}
                    <td className="py-3 px-3 text-center border-x border-slate-100">
                      <div className="font-semibold text-slate-800">
                        <span className="text-rose-600">{sickUsed}</span> / {sickQuota}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        เหลือ {sickRemain} วัน
                      </div>
                    </td>

                    {/* Business Leave */}
                    <td className="py-3 px-3 text-center border-r border-slate-100">
                      <div className="font-semibold text-slate-800">
                        <span className="text-amber-600">{bizUsed}</span> / {bizQuota}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        เหลือ {bizRemain} วัน
                      </div>
                    </td>

                    {/* Vacation Leave */}
                    <td className="py-3 px-3 text-center border-r border-slate-100">
                      <div className="font-semibold text-slate-800">
                        <span className="text-emerald-600">{vacUsed}</span> / {vacQuota}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        เหลือ {vacRemain} วัน
                      </div>
                    </td>

                    {/* Other leaves */}
                    <td className="py-3 px-3 text-center border-r border-slate-100">
                      <div className="font-semibold text-slate-700">{otherUsed} วัน</div>
                    </td>

                    {/* Total Used and Remaining */}
                    <td className="py-3 px-4 text-center">
                      <div className="font-bold text-slate-900 text-sm">{s.totalUsed} วัน</div>
                      <div className="text-[11px] text-slate-400">จากโควตา {s.totalQuota} วัน</div>
                      <div className="text-[11px] text-emerald-700 font-medium">คงเหลือรวม {s.totalRemaining} วัน</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
