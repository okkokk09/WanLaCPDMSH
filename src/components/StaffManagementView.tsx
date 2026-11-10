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
  RotateCcw,
  Undo2,
  Sparkles,
  X,
  Calendar,
  Printer,
  FileText,
} from 'lucide-react';
import type { Staff, LeaveRecord } from '../types';
import {
  LEAVE_TYPES,
  LEAVE_TYPE_MAP,
  WORK_GROUPS,
  getWorkGroupColor,
} from '../utils/constants';
import {
  calculateStaffSummaries,
  rolloverFiscalYear,
  resetCarriedOverVacationDays,
} from '../utils/storage';
import {
  getCurrentFiscalYear,
  getFiscalYear,
  getAvailableFiscalYears,
  formatThaiDateFull,
  formatFiscalYearLabel,
} from '../utils/dateUtils';

/**
 * โครงสร้าง Props ของหน้าจอจัดการบุคลากร (StaffManagementView)
 */
interface StaffManagementViewProps {
  staffList: Staff[];                                         // รายชื่อบุคลากรทั้งหมด
  records: LeaveRecord[];                                     // รายการประวัติการลาทั้งหมด
  onOpenNewStaff: () => void;                                 // เปิด Modal เพิ่มบุคลากรใหม่
  onEditStaff: (staff: Staff) => void;                        // เปิด Modal แก้ไขข้อมูลบุคลากร
  onDeleteStaff: (staffId: string) => void;                   // ลบบุคลากร
  onUpdateStaffList?: (staffList: Staff[]) => void;           // Callback เมื่อรายชื่อบุคลากรได้รับการอัปเดต (เช่น หลัง Rollover)
  onOpenPrintLeave?: (record: LeaveRecord) => void;           // เปิด Modal พิมพ์ใบลา
  selectedFiscalYear?: number | 'all';                       // ปีงบประมาณที่เลือกแสดงผล
  availableFiscalYears?: number[];                            // รายการปีงบประมาณที่มีข้อมูล
  onSelectFiscalYear?: (fy: number | 'all') => void;          // ฟังก์ชันสลับปีงบประมาณ
}

/**
 * คอมโพเนนต์หน้าจอจัดการรายชื่อบุคลากรและโควตาวันลา (StaffManagementView)
 */
export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList,
  records,
  onOpenNewStaff,
  onEditStaff,
  onDeleteStaff,
  onUpdateStaffList,
  onOpenPrintLeave,
  selectedFiscalYear: selectedFiscalYearProp,
  availableFiscalYears: availableFiscalYearsProp,
  onSelectFiscalYear,
}) => {
  // ข้อความค้นหา
  const [searchQuery, setSearchQuery] = useState('');
  // ตัวกรองกลุ่มงาน
  const [selectedDept, setSelectedDept] = useState<string>('all');
  // สถานะเปิด/ปิด Modal จัดการปรับรอบปีงบประมาณ
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  // กลุ่มงานที่กำลังเปิดดูข้อมูล (เปิดได้ทีละกลุ่มงานเพื่อความเรียบร้อย)
  const [openDept, setOpenDept] = useState<string | null>(null);
  // บุคลากรที่ถูกคลิกเพื่อดูรายละเอียดวันลาแยกตามปีงบประมาณ
  const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);

  const currentFiscalYear = getCurrentFiscalYear();
  const activeFiscalYear =
    selectedFiscalYearProp && selectedFiscalYearProp !== 'all'
      ? selectedFiscalYearProp
      : currentFiscalYear;

  const availableFiscalYearsList = useMemo(() => {
    return availableFiscalYearsProp ?? getAvailableFiscalYears(records);
  }, [availableFiscalYearsProp, records]);

  // คำนวณสรุปยอดวันลาเพื่อดูสถิติการใช้วันลาของแต่ละคน แยกตามปีงบประมาณที่เลือกอย่างชัดเจน
  const summaries = useMemo(() => {
    return calculateStaffSummaries(staffList, records, activeFiscalYear);
  }, [staffList, records, activeFiscalYear]);

  // แผนผัง Map ค้นหาสรุปยอดวันลาตาม staffId
  const summaryMap = useMemo(() => {
    return new Map(summaries.map((s) => [s.staff.id, s]));
  }, [summaries]);

  // รายชื่อกลุ่มงานทั้งหมดที่ไม่ซ้ำกัน
  const departments = useMemo(() => {
    return Array.from(new Set([...WORK_GROUPS, ...staffList.map((s) => s.department)]));
  }, [staffList]);

  // รายชื่อบุคลากรหลังผ่านการกรองตามคำค้นหาและกลุ่มงาน
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

  // จัดกลุ่มบุคลากรตามกลุ่มงาน/ฝ่าย โดยเรียงลำดับกลุ่มงานตามระเบียบมาตรฐาน
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

  // ประวัติการลาของบุคลากรที่คลิกเลือกดู (กรองเฉพาะปีงบประมาณที่เลือก)
  const viewingStaffRecords = useMemo(() => {
    if (!viewingStaff) return [];
    return records
      .filter(
        (r) =>
          r.staffId === viewingStaff.id &&
          r.status !== 'rejected' &&
          getFiscalYear(r.startDate) === activeFiscalYear
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [viewingStaff, records, activeFiscalYear]);

  // เปิดกลุ่มงานอัตโนมัติหากผู้ใช้เลือกตัวกรองกลุ่มงาน
  useEffect(() => {
    if (selectedDept !== 'all') {
      setOpenDept(selectedDept);
    }
  }, [selectedDept]);

  // เมื่อค้นหา ให้เปิดกลุ่มงานแรกที่พบผลการค้นหาทันที
  useEffect(() => {
    if (searchQuery.trim() && groupedStaff.length > 0) {
      if (!groupedStaff.some((g) => g.dept === openDept)) {
        setOpenDept(groupedStaff[0].dept);
      }
    }
  }, [searchQuery, groupedStaff, openDept]);

  // สลับการเปิด/ปิด Accordion ของกลุ่มงาน (เมื่อเปิดกลุ่มใหม่ กลุ่มเดิมจะปิดอัตโนมัติ)
  const toggleGroup = (dept: string) => {
    setOpenDept((prev) => (prev === dept ? null : dept));
  };

  // ย่อปิดทุกกลุ่มงาน
  const collapseAll = () => {
    setOpenDept(null);
  };

  // ดำเนินการปรับรอบปีงบประมาณใหม่ตามระเบียบข้าราชการ (คำนวณวันลาสะสมยกมาที่ถูกต้อง)
  const handleApplyCorrectRollover = () => {
    const prevFY = currentFiscalYear - 1;
    const updated = rolloverFiscalYear(staffList, records, prevFY, currentFiscalYear);
    if (onUpdateStaffList) {
      onUpdateStaffList(updated);
    }
    setIsRolloverModalOpen(false);
    alert(`ปรับยอดโควตาและแก้ไขวันลาสะสมยกมาตามสิทธิ์จริงเรียบร้อยแล้ว (${updated.length} ท่าน)`);
  };

  // ย้อนกลับ/ล้างวันลาสะสมยกมาของทุกคนให้เป็น 0 วัน (กรณีเผลอกดปรับย้อนซ้ำ)
  const handleResetCarriedOver = () => {
    if (
      window.confirm(
        `ยืนยันย้อนกลับ: ล้างวันลาสะสมยกมาของทุกคนเป็น 0 วัน ใช่หรือไม่?\n\n(ทุกคนจะเหลือเฉพาะสิทธิ์ลาพักผ่อนประจำปีนี้ 10 วันถ้วนเท่ากัน)`
      )
    ) {
      const updated = resetCarriedOverVacationDays(staffList);
      if (onUpdateStaffList) {
        onUpdateStaffList(updated);
      }
      setIsRolloverModalOpen(false);
      alert(`ล้างวันลาสะสมยกมาเป็น 0 วัน เรียบร้อยแล้ว (${updated.length} ท่าน)`);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 animate-in fade-in duration-200 pr-1">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">จัดการข้อมูลบุคลากรและโควตาวันลา</h2>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {formatFiscalYearLabel(activeFiscalYear, true)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            คลิกที่แถบจำนวนวันลาของบุคลากรเพื่อดูประวัติการลาแยกตามปีงบประมาณ ({activeFiscalYear})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Fiscal Year Switcher */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>ปีงบฯ:</span>
            </span>
            {availableFiscalYearsList.map((fy) => {
              const isSelected = activeFiscalYear === fy;
              return (
                <button
                  key={fy}
                  type="button"
                  onClick={() => onSelectFiscalYear?.(fy)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  {fy}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsRolloverModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            title="ปรับยอดโควตารับปีงบประมาณใหม่ หรือย้อนกลับแก้ไขวันลาสะสมยกมา"
          >
            <RotateCcw className="w-4 h-4" />
            <span>จัดการโควตาปีงบฯ {currentFiscalYear}</span>
          </button>
          <button
            onClick={onOpenNewStaff}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มบุคลากรใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Group Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, กลุ่มงาน..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          {/* Department filter */}
          <div className="w-48">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">ทุกกลุ่มงาน ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Controls & Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            แสดง <b className="text-slate-800 dark:text-slate-200">{filteredStaff.length}</b> คน ({groupedStaff.length} กลุ่มงาน • ปีงบฯ {activeFiscalYear})
          </span>

          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
            <button
              onClick={collapseAll}
              disabled={!openDept}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                openDept
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer'
                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">ไม่พบบุคลากรตามเงื่อนไข</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองกลุ่มงานใหม่</p>
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs transition-all"
              >
                {/* Accordion Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.dept)}
                  className={`w-full p-4 sm:px-5 flex items-center justify-between transition-colors text-left cursor-pointer border-b ${
                    isOpen
                      ? 'bg-slate-50/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${groupColor.bg} dark:bg-slate-800 border ${groupColor.border} dark:border-slate-700 ${groupColor.text} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {group.dept}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        บุคลากร {group.staff.length} คน • ลารวมในปีงบฯ {activeFiscalYear}: <b>{group.totalUsed}</b> วัน
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shadow-2xs ${groupColor.bg} dark:bg-slate-800 ${groupColor.text} ${groupColor.border} dark:border-slate-700`}
                    >
                      {group.staff.length} คน
                    </span>
                    <div className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Staff Horizontal Rows */}
                {isOpen && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.staff.map((staff) => {
                      const summary = summaryMap.get(staff.id);
                      const totalUsed = summary?.totalUsed || 0;
                      const totalRemaining = summary?.totalRemaining || 0;
                      const effectiveCarry = summary?.carriedOverVacationDays || 0;

                      return (
                        <div
                          key={staff.id}
                          className="p-3.5 sm:px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          {/* Col 1: Avatar, Name & Position */}
                          <div className="flex items-center gap-3 min-w-[240px] max-w-md">
                            <div
                              className={`w-10 h-10 rounded-xl ${groupColor.bg} dark:bg-slate-800 border ${groupColor.border} dark:border-slate-700 ${groupColor.text} flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {staff.name}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1" title={staff.position}>
                                {staff.position}
                              </p>
                            </div>
                          </div>

                          {/* Col 2: Leave Quotas (Horizontal compact pills - Clickable to view FY records) */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {LEAVE_TYPES.slice(0, 3).map((type) => {
                              const quota = summary?.quotas[type.id] ?? type.defaultQuota;
                              const remain = summary?.remainingByType[type.id] ?? quota;
                              const used = summary?.usedByType[type.id] ?? 0;
                              return (
                                <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => setViewingStaff(staff)}
                                  className="bg-slate-50 hover:bg-indigo-50/60 dark:bg-slate-800/80 dark:hover:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-700 text-center min-w-[84px] transition-all cursor-pointer"
                                  title={`คลิกเพื่อดูรายละเอียดวันลาปีงบฯ ${activeFiscalYear} • ${type.name}: สิทธิ์รวม ${quota} วัน, ใช้ไป ${used} วัน, คงเหลือ ${remain} วัน${
                                    type.id === 'vacation' && effectiveCarry > 0
                                      ? ` (สะสมยกมา ${effectiveCarry} วัน)`
                                      : ''
                                  }`}
                                >
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${type.color.dot}`} />
                                    <span>{type.shortName}</span>
                                    {type.id === 'vacation' && effectiveCarry > 0 && (
                                      <span
                                        className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold ml-0.5"
                                        title={`สะสมยกมา ${effectiveCarry} วัน`}
                                      >
                                        +{effectiveCarry}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                    <span className="text-emerald-700 dark:text-emerald-400">{remain}</span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">/{quota}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Col 3: Usage Totals */}
                          <div className="flex items-center gap-2.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setViewingStaff(staff)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                              title={`คลิกเพื่อดูรายการวันลาในปีงบประมาณ ${activeFiscalYear}`}
                            >
                              ใช้ไปปีงบฯ {activeFiscalYear}: <b>{totalUsed}</b> วัน
                            </button>
                            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-semibold shadow-2xs">
                              คงเหลือรวม {totalRemaining} วัน
                            </div>
                          </div>

                          {/* Col 4: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end xl:self-center">
                            <button
                              onClick={() => setViewingStaff(staff)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-all cursor-pointer"
                              title={`ดูประวัติวันลาในปีงบประมาณ ${activeFiscalYear}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>ดูวันลา ({totalUsed})</span>
                            </button>
                            <button
                              onClick={() => onEditStaff(staff)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-all cursor-pointer"
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
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 rounded-lg transition-all cursor-pointer"
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

      {/* Modal: Staff Leave Details Filtered by Fiscal Year */}
      {viewingStaff && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingStaff(null);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-16"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>ประวัติการลาของ {viewingStaff.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500 text-white">
                    ปีงบประมาณ {activeFiscalYear}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {viewingStaff.department} • {viewingStaff.position}
                </p>
              </div>
              <button
                onClick={() => setViewingStaff(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Fiscal Year Switcher inside Modal */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เลือกดูตามปีงบประมาณ (แยกไม่ปนกัน):
                </span>
                <div className="flex items-center gap-1.5">
                  {availableFiscalYearsList.map((fy) => (
                    <button
                      key={fy}
                      type="button"
                      onClick={() => onSelectFiscalYear?.(fy)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeFiscalYear === fy
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ปีงบฯ {fy}
                    </button>
                  ))}
                </div>
              </div>

              {viewingStaffRecords.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  ไม่มีประวัติการลาของ <b>{viewingStaff.name}</b> ใน <b>ปีงบประมาณ {activeFiscalYear}</b>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        <th className="py-2.5 px-3">ประเภทการลา</th>
                        <th className="py-2.5 px-3">ช่วงวันที่ลา</th>
                        <th className="py-2.5 px-3 text-center">จำนวนวัน</th>
                        <th className="py-2.5 px-3">เหตุผล</th>
                        <th className="py-2.5 px-3 text-right">พิมพ์ใบลา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewingStaffRecords.map((r) => {
                        const lt = LEAVE_TYPE_MAP.get(r.leaveTypeId);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${lt?.color.badge || ''}`}>
                                {lt?.name || r.leaveTypeId}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {formatThaiDateFull(r.startDate)}
                              {r.startDate !== r.endDate && ` - ${formatThaiDateFull(r.endDate)}`}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                              {r.daysCount} วัน
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              {r.reason || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {onOpenPrintLeave && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingStaff(null);
                                    onOpenPrintLeave(r);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>พิมพ์</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  รวมวันลาในปีงบประมาณ {activeFiscalYear}: <b className="text-slate-900 dark:text-white">{viewingStaffRecords.reduce((s, r) => s + r.daysCount, 0)} วัน</b> ({viewingStaffRecords.length} รายการ)
                </span>
                <button
                  type="button"
                  onClick={() => setViewingStaff(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Fiscal Year Rollover / Revert */}
      {isRolloverModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRolloverModalOpen(false);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-start justify-center p-4 pt-10 sm:pt-16"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl">
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    จัดการโควตาวันลารับปีงบประมาณ {currentFiscalYear}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    ปรับยอดโควตา หรือแก้ไข/ย้อนกลับวันลาสะสมยกมา
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRolloverModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Option 1: Fix / Recalculate true rollover */}
              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>คำนวณวันลาสะสมยกมาตามจริง (แก้ไขกรณีกดซ้ำ)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                        แนะนำ
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      คำนวณวันลาสะสมยกมาจากปี 2569 ตามสิทธิ์จริง (10 วัน ลบวันลาที่ใช้ไปปีก่อน) สูงสุดไม่เกิน 10 วัน <b>ป้องกันการกดซ้ำ ยอดจะไม่เบิ้ล 2 เท่า</b>
                    </p>
                    <button
                      onClick={handleApplyCorrectRollover}
                      className="mt-3 w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>คำนวณและปรับยอดตามสิทธิ์จริง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2: Revert / Reset carryover to 0 */}
              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 hover:border-amber-400 dark:hover:border-amber-600 transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0 mt-0.5">
                    <Undo2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      ย้อนกลับ: ล้างวันลาสะสมยกมาเป็น 0 วัน (ไม่ยกยอด)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      รีเซ็ตวันลาสะสมยกมาของทุกคนเป็น 0 วันทันที เพื่อเริ่มต้นปีใหม่โดยไม่นำวันลาปีก่อนมาคิด ทุกคนจะมีเฉพาะสิทธิ์ลาพักผ่อนประจำปีนี้ 10 วันเต็ม
                    </p>
                    <button
                      onClick={handleResetCarriedOver}
                      className="mt-3 w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>ย้อนกลับ / ล้างวันลาสะสมเป็น 0 วัน</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary of official regulation quotas */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  📋 สรุปเกณฑ์โควตาวันลาปีงบประมาณ {currentFiscalYear}:
                </div>
                <div>• ข้าราชการ/ลูกจ้างประจำ: ป่วย 60 วัน, กิจ 45 วัน, พักผ่อน 10 วัน, คลอด 90 วัน</div>
                <div>• พนักงานราชการ/จ้างเหมา: ป่วย 30 วัน, กิจ 15 วัน, พักผ่อน 10 วัน, คลอด 90 วัน</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRolloverModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
