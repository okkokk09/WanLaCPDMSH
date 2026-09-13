import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, Sparkles } from 'lucide-react';
import type { Staff } from '../types';
import { LEAVE_TYPES, DEPARTMENTS } from '../utils/constants';
import { getDefaultQuotas } from '../utils/storage';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: Staff) => void;
  initialStaff?: Staff | null;
  existingStaffList: Staff[];
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStaff,
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [quotas, setQuotas] = useState<Record<string, number>>(getDefaultQuotas());
  const [carriedOverVacationDays, setCarriedOverVacationDays] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialStaff) {
        setName(initialStaff.name);
        setPosition(initialStaff.position);
        setDepartment(initialStaff.department);
        const integerQuotas: Record<string, number> = {};
        Object.entries({ ...getDefaultQuotas(), ...initialStaff.quotas }).forEach(([k, v]) => {
          integerQuotas[k] = Math.max(0, Math.floor(v));
        });
        setQuotas(integerQuotas);
        setCarriedOverVacationDays(initialStaff.carriedOverVacationDays || 0);
        setNotes(initialStaff.notes || '');
      } else {
        setName('');
        setPosition('');
        setDepartment(DEPARTMENTS[0]);
        setQuotas(getDefaultQuotas());
        setCarriedOverVacationDays(0);
        setNotes('');
      }
    }
  }, [isOpen, initialStaff]);

  const handleQuotaChange = (leaveTypeId: string, value: number) => {
    setQuotas((prev) => ({
      ...prev,
      [leaveTypeId]: Math.max(0, Math.floor(value)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุลบุคลากร');
      return;
    }

    const integerQuotas: Record<string, number> = {};
    Object.entries(quotas).forEach(([k, v]) => {
      integerQuotas[k] = Math.max(0, Math.floor(v));
    });

    const newStaff: Staff = {
      id: initialStaff ? initialStaff.id : `staff-${Date.now()}`,
      name: name.trim(),
      position: position.trim() || 'บุคลากร',
      department: department.trim() || DEPARTMENTS[0],
      quotas: integerQuotas,
      carriedOverVacationDays,
      notes: notes.trim(),
    };

    onSave(newStaff);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialStaff ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
              </h2>
              <p className="text-xs text-slate-300">
                จัดการข้อมูลกลุ่มงาน ตำแหน่ง และกำหนดโควตาสิทธิ์วันลาประจำปี
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* General Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>ข้อมูลบุคลากร</span>
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ - นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น นายสมชาย มั่นคง"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
            </div>

            {/* Group and Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กลุ่มงาน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="เช่น นักวิชาการสหกรณ์ชำนาญการ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Leave Quotas Configuration */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>กำหนดโควตาวันลาประจำปี (วัน/ปี)</span>
              </h3>
              <button
                type="button"
                onClick={() => setQuotas(getDefaultQuotas())}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                รีเซ็ตเป็น 0 วัน
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {LEAVE_TYPES.map((type) => (
                <div key={type.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 truncate">{type.shortName}</span>
                    <span className={`w-2 h-2 rounded-full ${type.color.dot}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="365"
                      step="1"
                      value={quotas[type.id] ?? type.defaultQuota}
                      onChange={(e) => handleQuotaChange(type.id, parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 shrink-0">วัน</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Carried-over Vacation Days */}
            <div className="mt-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>วันลาพักผ่อนสะสมยกมา (Carried-over vacation days)</span>
                  </label>
                  <p className="text-[11px] text-emerald-700">
                    วันลาพักผ่อนที่สะสมมาจากปีก่อนหน้า (จะนำไปรวมกับสิทธิลาพักผ่อนประจำปีนี้อัตโนมัติ)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-32 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={carriedOverVacationDays}
                    onChange={(e) => setCarriedOverVacationDays(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-center text-sm font-bold text-emerald-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-emerald-800 shrink-0">วัน</span>
                </div>
              </div>

              {/* Dynamic Vacation Calculation Preview */}
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-800">
                <span>
                  สิทธิปีนี้: <b>{quotas['vacation'] ?? 0}</b> วัน + สะสมยกมา: <b>{carriedOverVacationDays}</b> วัน
                </span>
                <span className="font-bold bg-white text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                  รวมสิทธิลาพักผ่อนทั้งหมด: {(quotas['vacation'] ?? 0) + carriedOverVacationDays} วัน
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับบุคลากรรายนี้..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
              บันทึกบุคลากร
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
