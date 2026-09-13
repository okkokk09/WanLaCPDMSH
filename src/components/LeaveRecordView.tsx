import React, { useState, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  Calendar,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPES, LEAVE_TYPE_MAP, WORK_GROUPS } from '../utils/constants';
import { formatThaiDateShort } from '../utils/dateUtils';
import { exportRecordsToExcel } from '../utils/storage';

interface LeaveRecordViewProps {
  staffList: Staff[];
  records: LeaveRecord[];
  onOpenNewLeave: () => void;
  onDeleteRecord: (recordId: string) => void;
}

export const LeaveRecordView: React.FC<LeaveRecordViewProps> = ({
  staffList,
  records,
  onOpenNewLeave,
  onDeleteRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

  const staffMap = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);

  // Unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
  }, [staffList]);

  // Filtered list of records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const staff = staffMap.get(r.staffId);
        const staffName = staff?.name?.toLowerCase() || '';
        const reason = r.reason?.toLowerCase() || '';
        const query = searchQuery.toLowerCase().trim();

        // Search query
        if (query && !staffName.includes(query) && !reason.includes(query)) {
          return false;
        }

        // Leave type filter
        if (selectedType !== 'all' && r.leaveTypeId !== selectedType) {
          return false;
        }

        // Department filter
        if (selectedDept !== 'all' && staff?.department !== selectedDept) {
          return false;
        }

        // Staff filter
        if (selectedStaffId !== 'all' && r.staffId !== selectedStaffId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [records, staffMap, searchQuery, selectedType, selectedDept, selectedStaffId]);

  const totalFilteredDays = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.daysCount, 0);
  }, [filteredRecords]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ประวัติและบันทึกการลาทั้งหมด</h2>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหา ตรวจสอบ และจัดการประวัติการลาของบุคลากรทุกคน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportRecordsToExcel(records, staffList)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออก Excel</span>
          </button>
          <button
            onClick={onOpenNewLeave}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกการลาใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, เหตุผล..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Leave type filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">ทุกประเภทการลา</option>
              {LEAVE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
          <div>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">บุคลากรทุกคน</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Count summary bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            พบข้อมูลการลาทั้งหมด <b className="text-slate-800">{filteredRecords.length}</b> รายการ (รวม{' '}
            <b className="text-indigo-600">{totalFilteredDays}</b> วัน)
          </div>
          {(searchQuery || selectedType !== 'all' || selectedDept !== 'all' || selectedStaffId !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('all');
                setSelectedDept('all');
                setSelectedStaffId('all');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">ไม่พบรายการบันทึกการลา</h3>
            <p className="text-xs text-slate-400 mt-1">
              ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง หรือบันทึกรายการลาใหม่
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">บุคลากร</th>
                  <th className="py-3 px-4">ประเภทการลา</th>
                  <th className="py-3 px-4">ช่วงวันที่ลา</th>
                  <th className="py-3 px-4 text-center">จำนวนวัน</th>
                  <th className="py-3 px-4">เหตุผล / หมายเหตุ</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const staff = staffMap.get(r.staffId);
                  const leaveType = LEAVE_TYPE_MAP.get(r.leaveTypeId);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Staff */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{staff?.name || '-'}</div>
                        <div className="text-[11px] text-slate-400">
                          {staff?.department} • {staff?.position}
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                            leaveType?.color.badge || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${leaveType?.color.dot}`} />
                          {leaveType?.name || r.leaveTypeId}
                        </span>
                      </td>

                      {/* Date Range */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {formatThaiDateShort(r.startDate)}
                        {r.startDate !== r.endDate && (
                          <span className="block text-[11px] text-slate-400">
                            ถึง {formatThaiDateShort(r.endDate)}
                          </span>
                        )}
                      </td>

                      {/* Days count */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {r.daysCount} วัน
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {r.reason || <span className="text-slate-300">-</span>}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {r.status === 'approved' ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              อนุมัติ
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              รอตรวจสอบ
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm('คุณต้องการลบรายการบันทึกการลานี้ใช่หรือไม่?')) {
                              onDeleteRecord(r.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
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
  );
};
