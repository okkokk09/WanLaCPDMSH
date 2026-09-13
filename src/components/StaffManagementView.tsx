import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Briefcase,
  Users,
  User,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import {
  LEAVE_TYPES,
  WORK_GROUPS,
  getWorkGroupColor,
} from '../utils/constants';
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
  // Single-open accordion: only one work group is open at any time
  const [openDept, setOpenDept] = useState<string | null>('สหกรณ์จังหวัด');

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

  // Group filtered staff by work group (preserving official order)
  const groupedStaff = useMemo(() => {
    const groupOrder = Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
    const groups: {
      dept: string;
      staff: Staff[];
      totalUsed: number;
      totalRemaining: number;
    }[] = [];

    groupOrder.forEach((dept) => {
      const staffInGroup = filteredStaff.filter((s) => s.department === dept);
      if (staffInGroup.length > 0) {
        let totalUsed = 0;
        let totalRemaining = 0;
        staffInGroup.forEach((s) => {
          const sum = summaryMap.get(s.id);
          totalUsed += sum?.totalUsed || 0;
          totalRemaining += sum?.totalRemaining || 0;
        });

        groups.push({
          dept,
          staff: staffInGroup,
          totalUsed,
          totalRemaining,
        });
      }
    });

    return groups;
  }, [filteredStaff, staffList, summaryMap]);

  // Auto-expand selected department if user filters by department
  useEffect(() => {
    if (selectedDept !== 'all') {
      setOpenDept(selectedDept);
    }
  }, [selectedDept]);

  // Auto-expand first matching group when searching if current open group is no longer in results
  useEffect(() => {
    if (searchQuery.trim() && groupedStaff.length > 0) {
      if (!groupedStaff.some((g) => g.dept === openDept)) {
        setOpenDept(groupedStaff[0].dept);
      }
    }
  }, [searchQuery, groupedStaff, openDept]);

  // Accordion toggle: opening any group automatically closes all other groups
  const toggleGroup = (dept: string) => {
    setOpenDept((prev) => (prev === dept ? null : dept));
  };

  const collapseAll = () => {
    setOpenDept(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">จัดการข้อมูลบุคลากรและโควตาวันลา</h2>
          <p className="text-xs text-slate-500 mt-1">
            แบ่งกลุ่มงานตามโครงสร้างสำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน พร้อมแสดงผลแบบแถวแนวนอน
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

      {/* Filter, Search & Group Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, กลุ่มงาน..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Department filter */}
          <div className="w-48">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">ทุกกลุ่มงาน ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Controls & Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 text-xs">
          <span className="text-slate-500">
            แสดง <b className="text-slate-800">{filteredStaff.length}</b> คน ({groupedStaff.length} กลุ่มงาน)
          </span>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <button
              onClick={collapseAll}
              disabled={!openDept}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                openDept
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title="ปิดกลุ่มงานที่เปิดอยู่"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
              <span>ปิดกลุ่มงาน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {groupedStaff.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">ไม่พบบุคลากรตามเงื่อนไข</h3>
          <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองกลุ่มงานใหม่</p>
        </div>
      ) : (
        /* Work Groups List (Accordions - Single Open at a time) */
        <div className="space-y-4">
          {groupedStaff.map((group) => {
            const groupColor = getWorkGroupColor(group.dept);
            const isOpen = openDept === group.dept;

            return (
              <div
                key={group.dept}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
              >
                {/* Accordion Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.dept)}
                  className={`w-full p-4 sm:px-5 flex items-center justify-between transition-colors text-left cursor-pointer border-b ${
                    isOpen
                      ? 'bg-slate-50/90 border-slate-200'
                      : 'bg-white hover:bg-slate-50/70 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${groupColor.bg} border ${groupColor.border} ${groupColor.text} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {group.dept}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        บุคลากร {group.staff.length} คน • ลารวม {group.totalUsed} วัน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs ${groupColor.bg} ${groupColor.text} ${groupColor.border}`}
                    >
                      {group.staff.length} คน
                    </span>
                    <div className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Staff Horizontal Rows */}
                {isOpen && (
                  <div className="divide-y divide-slate-100">
                    {group.staff.map((staff) => {
                      const summary = summaryMap.get(staff.id);
                      const totalUsed = summary?.totalUsed || 0;
                      const totalRemaining = summary?.totalRemaining || 0;

                      return (
                        <div
                          key={staff.id}
                          className="p-3.5 sm:px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Col 1: Avatar, Name & Position */}
                          <div className="flex items-center gap-3 min-w-[240px] max-w-md">
                            <div
                              className={`w-10 h-10 rounded-xl ${groupColor.bg} border ${groupColor.border} ${groupColor.text} flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                {staff.name}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={staff.position}>
                                {staff.position}
                              </p>
                            </div>
                          </div>

                          {/* Col 2: Leave Quotas (Horizontal compact pills) */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {LEAVE_TYPES.slice(0, 3).map((type) => {
                              const quota = summary?.quotas[type.id] ?? type.defaultQuota;
                              const remain = summary?.remainingByType[type.id] ?? quota;
                              const used = summary?.usedByType[type.id] ?? 0;
                              return (
                                  <div
                                    key={type.id}
                                    className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-center min-w-[80px]"
                                    title={`${type.name}: สิทธิ์รวม ${quota} วัน, ใช้ไป ${used} วัน, คงเหลือ ${remain} วัน${
                                      type.id === 'vacation' && staff.carriedOverVacationDays
                                        ? ` (สะสมยกมา ${staff.carriedOverVacationDays} วัน)`
                                        : ''
                                    }`}
                                  >
                                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${type.color.dot}`} />
                                      <span>{type.shortName}</span>
                                      {type.id === 'vacation' && Boolean(staff.carriedOverVacationDays) && (
                                        <span
                                          className="text-[9px] text-emerald-600 font-bold ml-0.5"
                                          title={`สะสมยกมา ${staff.carriedOverVacationDays} วัน`}
                                        >
                                          +{staff.carriedOverVacationDays}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                                      <span className="text-emerald-700">{remain}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">/{quota}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Col 3: Usage Totals */}
                          <div className="flex items-center gap-2.5 text-xs">
                            <div className="text-slate-500">
                              ใช้ไป: <b className="text-slate-800">{totalUsed}</b> วัน
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg font-semibold shadow-2xs">
                              คงเหลือรวม {totalRemaining} วัน
                            </div>
                          </div>

                          {/* Col 4: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end xl:self-center">
                            <button
                              onClick={() => onEditStaff(staff)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer"
                              title="แก้ไขข้อมูลและกำหนดโควตาวันลา"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>แก้ไข</span>
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
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer"
                              title="ลบบุคลากร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
