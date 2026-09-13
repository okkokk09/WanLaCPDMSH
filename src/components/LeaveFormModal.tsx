import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Staff, LeaveRecord, LeaveTypeId, LeavePeriod } from '../types';
import { LEAVE_TYPES } from '../utils/constants';
import { calculateLeaveDays, toDateString, formatThaiDateShort } from '../utils/dateUtils';
import { calculateStaffSummaries } from '../utils/storage';

interface LeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<LeaveRecord, 'id' | 'createdAt'>) => void;
  staffList: Staff[];
  existingRecords: LeaveRecord[];
  initialRecord?: LeaveRecord | null;
  defaultDate?: string;
}

export const LeaveFormModal: React.FC<LeaveFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  staffList,
  existingRecords,
  initialRecord,
  defaultDate,
}) => {
  const todayStr = useMemo(() => defaultDate || toDateString(new Date()), [defaultDate]);

  const [staffId, setStaffId] = useState<string>('');
  const [leaveTypeId, setLeaveTypeId] = useState<LeaveTypeId>('sick');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const period: LeavePeriod = 'full';
  const [skipWeekends, setSkipWeekends] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');
  const [status, setStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setStaffId(initialRecord.staffId);
        setLeaveTypeId(initialRecord.leaveTypeId);
        setStartDate(initialRecord.startDate);
        setEndDate(initialRecord.endDate);
        setSkipWeekends(initialRecord.skipWeekends);
        setReason(initialRecord.reason);
        setStatus(initialRecord.status);
      } else {
        setStaffId(staffList.length > 0 ? staffList[0].id : '');
        setLeaveTypeId('sick');
        const d = defaultDate || toDateString(new Date());
        setStartDate(d);
        setEndDate(d);
        setSkipWeekends(true);
        setReason('');
        setStatus('approved');
      }
    }
  }, [isOpen, initialRecord, staffList, defaultDate]);

  // Selected staff details and leave summaries
  const staffSummaries = useMemo(() => {
    return calculateStaffSummaries(staffList, existingRecords);
  }, [staffList, existingRecords]);

  const currentSummary = useMemo(() => {
    return staffSummaries.find((s) => s.staff.id === staffId);
  }, [staffSummaries, staffId]);

  // Remaining days for the selected leave type
  const remainingDays = useMemo(() => {
    if (!currentSummary) return 0;
    // If editing existing record, add back the existing record days
    let extra = 0;
    if (initialRecord && initialRecord.staffId === staffId && initialRecord.leaveTypeId === leaveTypeId) {
      extra = initialRecord.daysCount;
    }
    return (currentSummary.remainingByType[leaveTypeId] ?? 0) + extra;
  }, [currentSummary, leaveTypeId, initialRecord, staffId]);

  // Calculate leave days
  const calculatedDays = useMemo(() => {
    return calculateLeaveDays(startDate, endDate, period, skipWeekends);
  }, [startDate, endDate, period, skipWeekends]);

  // Check quota overflow
  const isOverQuota = calculatedDays > remainingDays;

  // Handle start date change
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) {
      alert('กรุณาเลือกบุคลากร');
      return;
    }
    if (calculatedDays <= 0) {
      alert('จำนวนวันลาต้องมากกว่า 0 วัน (กรุณาตรวจสอบช่วงวันที่)');
      return;
    }

    if (isOverQuota) {
      const confirmOver = window.confirm(
        `คำเตือน: จำนวนวันลาที่ขอ (${calculatedDays} วัน) เกินสิทธิ์คงเหลือ (${remainingDays} วัน)\nคุณยังคงต้องการบันทึกการลานี้หรือไม่?`
      );
      if (!confirmOver) return;
    }

    onSave({
      staffId,
      leaveTypeId,
      startDate,
      endDate,
      period: 'full',
      daysCount: calculatedDays,
      skipWeekends,
      reason: reason.trim(),
      status,
    });

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // safe fallback
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialRecord ? 'แก้ไขบันทึกการลา' : 'บันทึกการลาใหม่'}
              </h2>
              <p className="text-xs text-indigo-100">
                กรอกข้อมูลการลาและตรวจสอบยอดวันลาคงเหลืออัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Step 1: Select Staff */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              บุคลากรผู้ขอลา <span className="text-rose-500">*</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              required
            >
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.department} • {staff.position})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Leave Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              ประเภทการลา <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LEAVE_TYPES.map((type) => {
                const isSelected = leaveTypeId === type.id;
                const quotaRemain = currentSummary?.remainingByType[type.id] ?? type.defaultQuota;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setLeaveTypeId(type.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">{type.shortName}</span>
                      <span className={`w-2 h-2 rounded-full ${type.color.dot}`} />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 truncate">{type.name}</div>
                    <div className="mt-1 text-[11px] font-medium text-indigo-700">
                      เหลือ {quotaRemain} วัน
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Dates & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่เริ่มลา <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {formatThaiDateShort(startDate)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่สิ้นสุดลา <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {formatThaiDateShort(endDate)}
              </span>
            </div>
          </div>

          {/* Options: Skip weekends */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={(e) => setSkipWeekends(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>ไม่นับรวมวันหยุดเสาร์ - อาทิตย์ และวันหยุดราชการ</span>
            </label>

            {/* Calculated Days pill */}
            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>คำนวณวันลา: {calculatedDays} วัน</span>
            </div>
          </div>

          {/* Quota warning or status info */}
          {isOverQuota ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">คำเตือน: ลาเกินโควตาคงเหลือ</span>
                <p className="mt-0.5">
                  โควตาคงเหลือปัจจุบันคือ <b>{remainingDays} วัน</b> แต่ขอลา <b>{calculatedDays} วัน</b> (เกินมา {calculatedDays - remainingDays} วัน)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>โควตาคงเหลือเพียงพอ (คงเหลือ {remainingDays} วัน)</span>
              </div>
              <span className="font-medium">หลังลาจะเหลือ {Math.max(0, remainingDays - calculatedDays)} วัน</span>
            </div>
          )}

          {/* Reason input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เหตุผลการลา / หมายเหตุ
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="ระบุเหตุผลการลา เช่น ไปพบแพทย์, ทำธุระจำเป็น, พักผ่อน..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-700">สถานะการบันทึก:</span>
            <div className="flex items-center gap-2">
              {(['approved', 'pending'] as const).map((st) => (
                <label key={st} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === st}
                    onChange={() => setStatus(st)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{st === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
