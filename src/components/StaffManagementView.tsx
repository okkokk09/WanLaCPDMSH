import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Briefcase,
  Users,
  User,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import { LEAVE_TYPES, WORK_GROUPS, getWorkGroupColor } from '../utils/constants';
import { calculateStaffSummaries } from '../utils/storage';

interface StaffManagementViewProps {
  staffList: Staff[];
  records: LeaveRecord[];
  onOpenNewStaff: () => void;
  onEditStaff: (staff: Staff) => void;
  onDeleteStaff: (staffId: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList,
  records,
  onOpenNewStaff,
  onEditStaff,
  onDeleteStaff,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Calculate summaries to see each staff member's total used days
  const summaries = useMemo(() => {
    return calculateStaffSummaries(staffList, records);
  }, [staffList, records]);

  const summaryMap = useMemo(() => {
    return new Map(summaries.map((s) => [s.staff.id, s]));
  }, [summaries]);

  // Unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
  }, [staffList]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);

      const matchDept = selectedDept === 'all' || s.department === selectedDept;

      return matchQuery && matchDept;
    });
  }, [staffList, searchQuery, selectedDept]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">จัดการข้อมูลบุคลากรและโควตาวันลา</h2>
          <p className="text-xs text-slate-500 mt-1">
            เพิ่ม แก้ไข ลบ ข้อมูลบุคลากร และกำหนดสิทธิ์โควตาวันลาเฉพาะบุคคล
          </p>
        </div>

        <button
          onClick={onOpenNewStaff}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>เพิ่มบุคลากรใหม่</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
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
          แสดง <b className="text-slate-800">{filteredStaff.length}</b> จากทั้งหมด {staffList.length} คน
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">ไม่พบบุคลากรตามเงื่อนไข</h3>
          <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเพิ่มบุคลากรใหม่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const summary = summaryMap.get(staff.id);
            const totalUsed = summary?.totalUsed || 0;
            const totalRemaining = summary?.totalRemaining || 0;
            const groupColor = getWorkGroupColor(staff.department);

            return (
              <div
                key={staff.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Avatar & Actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl ${groupColor.bg} border ${groupColor.border} ${groupColor.text} flex items-center justify-center shadow-2xs shrink-0 transition-colors`}
                        title={`กลุ่มงาน: ${staff.department}`}
                      >
                        <User className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {staff.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {staff.position}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditStaff(staff)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขข้อมูล"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `คุณต้องการลบข้อมูลบุคลากร "${staff.name}" ใช่หรือไม่?\n(ประวัติการลาทั้งหมดของบุคลากรรายนี้จะถูกลบไปด้วย)`
                            )
                          ) {
                            onDeleteStaff(staff.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบบุคลากร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details: Work Group & Position */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Briefcase className={`w-3.5 h-3.5 ${groupColor.text} shrink-0`} />
                      <span className="font-medium text-slate-700">{staff.department}</span>
                    </div>
                  </div>

                  {/* Quotas breakdown chips */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-indigo-500" />
                        โควตาวันลา (คงเหลือ / สิทธิ์)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {LEAVE_TYPES.slice(0, 3).map((type) => {
                        const quota = summary?.quotas[type.id] ?? type.defaultQuota;
                        const remain = summary?.remainingByType[type.id] ?? quota;
                        return (
                          <div
                            key={type.id}
                            className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center"
                          >
                            <span className="text-[10px] text-slate-500 block truncate">
                              {type.shortName}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {remain} <span className="text-[10px] font-normal text-slate-400">/{quota}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom summary bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    ใช้วันลาแล้ว: <b className="text-slate-700">{totalUsed} วัน</b>
                  </span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                    คงเหลือรวม {totalRemaining} วัน
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
