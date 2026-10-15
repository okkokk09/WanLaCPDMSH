import React, { useState, useMemo } from 'react';
import { Printer, X, FileText, Sparkles } from 'lucide-react';
import type { Staff, LeaveRecord, LeaveTypeId } from '../types';
import { getFiscalYear, formatThaiDateFull, getThaiDateParts } from '../utils/dateUtils';

interface PrintLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LeaveRecord | null;
  staff: Staff | null;
  records: LeaveRecord[];
  staffList: Staff[];
}

/**
 * คอมโพเนนต์หน้าต่าง Modal พิมพ์ใบลามาตรฐานสำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน
 * รองรับ 2 แบบฟอร์มตามระเบียบราชการ:
 * 1. แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร (สำหรับ sick, business, maternity)
 * 2. ใบลาพักผ่อน (สำหรับ vacation)
 */
export const PrintLeaveModal: React.FC<PrintLeaveModalProps> = ({
  isOpen,
  onClose,
  record,
  staff,
  records,
  staffList,
}) => {
  // ข้อมูลที่สามารถปรับแต่งเพิ่มเติมก่อนพิมพ์
  const [writtenAt, setWrittenAt] = useState('สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน');
  const [recipient, setRecipient] = useState('สหกรณ์จังหวัดแม่ฮ่องสอน');
  const [contactAddress, setContactAddress] = useState('ตามที่อยู่ที่ให้ไว้กับสำนักงานฯ / โทรศัพท์มือถือ');
  const [substituteStaffId, setSubstituteStaffId] = useState<string>('');
  const [substituteCustomName, setSubstituteCustomName] = useState<string>('');

  // ค้นหาผู้ปฏิบัติหน้าที่แทน
  const substituteStaff = useMemo(() => {
    return staffList.find((s) => s.id === substituteStaffId) || null;
  }, [staffList, substituteStaffId]);

  const substituteDisplayName = substituteCustomName.trim()
    ? substituteCustomName.trim()
    : substituteStaff
    ? `${substituteStaff.name} (${substituteStaff.position})`
    : '...........................................................................';

  // วันที่เขียนใบลา (ใช้วันที่สร้าง หรือวันที่เริ่มลา)
  const writeDateParts = useMemo(() => {
    const dStr = record?.createdAt ? record.createdAt.split('T')[0] : record?.startDate;
    return getThaiDateParts(dStr);
  }, [record]);

  // วันที่เริ่มและสิ้นสุดลาแบบภาษาไทย
  const startDateThai = useMemo(() => (record ? formatThaiDateFull(record.startDate) : ''), [record]);
  const endDateThai = useMemo(() => (record ? formatThaiDateFull(record.endDate) : ''), [record]);

  // คำนวณสถิติวันลาสะสมในรอบปีงบประมาณเดียวกันก่อนถึงใบลานี้
  const leaveStats = useMemo(() => {
    if (!record || !staff) {
      return {
        sick: { usedBefore: 0, current: 0, total: 0, isCurrent: false },
        business: { usedBefore: 0, current: 0, total: 0, isCurrent: false },
        maternity: { usedBefore: 0, current: 0, total: 0, isCurrent: false },
        vacation: { usedBefore: 0, current: 0, total: 0, isCurrent: false },
      };
    }

    const targetFY = getFiscalYear(record.startDate);
    const priorRecords = records.filter((r) => {
      if (r.staffId !== staff.id || r.status === 'rejected') return false;
      if (getFiscalYear(r.startDate) !== targetFY) return false;
      // บันทึกที่เกิดขึ้นก่อนหน้านี้
      if (r.id === record.id) return false;
      if (r.startDate < record.startDate) return true;
      if (r.startDate === record.startDate && r.createdAt < record.createdAt) return true;
      return false;
    });

    const getStatsForType = (typeId: LeaveTypeId) => {
      const usedBefore = priorRecords
        .filter((r) => r.leaveTypeId === typeId)
        .reduce((sum, r) => sum + r.daysCount, 0);
      const isCurrent = record.leaveTypeId === typeId;
      const current = isCurrent ? record.daysCount : 0;
      const total = usedBefore + current;
      return { usedBefore, current, total, isCurrent };
    };

    return {
      sick: getStatsForType('sick'),
      business: getStatsForType('business'),
      maternity: getStatsForType('maternity'),
      vacation: getStatsForType('vacation'),
    };
  }, [record, staff, records]);

  // ค้นหาประวัติการลาประเภทเดียวกัน "ครั้งสุดท้าย" ก่อนหน้านี้
  const lastLeaveRecord = useMemo(() => {
    if (!record || !staff) return null;
    const priorSameType = records
      .filter((r) => {
        if (r.staffId !== staff.id || r.status === 'rejected') return false;
        if (r.leaveTypeId !== record.leaveTypeId) return false;
        if (r.id === record.id) return false;
        return r.startDate < record.startDate;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    return priorSameType[0] || null;
  }, [record, staff, records]);

  if (!isOpen || !record || !staff) return null;

  const isVacation = record.leaveTypeId === 'vacation';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="w-full max-w-4xl my-4 print:my-0 flex flex-col gap-4">
        {/* Floating Controls Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ตัวอย่างพิมพ์ใบลา: {isVacation ? 'ใบลาพักผ่อน' : 'แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {staff.name} • {staff.department} ({staff.position})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบลา (Print / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Settings Panel (Hidden on Print) */}
        <div className="bg-indigo-50/70 dark:bg-slate-850 border border-indigo-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-xs space-y-3 no-print">
          <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>ปรับแต่งข้อความก่อนพิมพ์ (ไม่จำเป็นต้องแก้หากข้อมูลถูกต้องแล้ว):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">เขียนที่:</label>
              <input
                type="text"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">เรียน:</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">ที่ติดต่อระหว่างลา:</label>
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          {isVacation && (
            <div className="pt-2 border-t border-indigo-100 dark:border-slate-800">
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                ผู้ปฏิบัติราชการแทน (ในระหว่างลาพักผ่อน):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={substituteStaffId}
                  onChange={(e) => {
                    setSubstituteStaffId(e.target.value);
                    if (e.target.value) setSubstituteCustomName('');
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs cursor-pointer"
                >
                  <option value="">-- เลือกจากรายชื่อบุคลากร --</option>
                  {staffList
                    .filter((s) => s.id !== staff.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department} • {s.position})
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  placeholder="หรือระบุชื่อตำแหน่งผู้รับมอบงานเอง..."
                  value={substituteCustomName}
                  onChange={(e) => setSubstituteCustomName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Printable Document Sheet (A4 Ratio) */}
        <div
          id="print-leave-document"
          className="bg-white text-slate-900 shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] p-[16mm] sm:p-[20mm] border border-slate-200 rounded-sm print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none print:w-full print:min-h-0 text-[14px] leading-relaxed select-text font-serif"
          style={{ fontFamily: "'Sarabun', 'TH Sarabun New', 'Angsana New', 'Cordia New', serif" }}
        >
          {isVacation ? (
            /* ========================================================
               TEMPLATE 2: ใบลาพักผ่อน
               ======================================================== */
            <div className="space-y-4">
              {/* Header Title */}
              <div className="text-center font-bold text-xl mb-4 tracking-wide">
                ใบลาพักผ่อน
              </div>

              {/* Written At & Date */}
              <div className="flex justify-end">
                <div className="text-right space-y-1 w-64">
                  <div>{writtenAt}</div>
                  <div>
                    วันที่ <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[28px]">{writeDateParts.day}</span> เดือน <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[70px]">{writeDateParts.month}</span> พ.ศ. <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[45px]">{writeDateParts.yearBE}</span>
                  </div>
                </div>
              </div>

              {/* Subject & Recipient */}
              <div className="space-y-1.5">
                <div>
                  <span className="font-bold">เรื่อง</span> ขอลาพักผ่อน
                </div>
                <div>
                  <span className="font-bold">เรียน</span> {recipient}
                </div>
              </div>

              {/* Body Paragraph */}
              <div className="indent-10 text-justify leading-loose pt-1">
                ข้าพเจ้า <span className="font-bold">{staff.name}</span> ตำแหน่ง <span className="font-bold">{staff.position}</span> สังกัด <span className="font-bold">สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน</span> มีวันลาพักผ่อนสะสม <span className="font-bold">{staff.carriedOverVacationDays || 0}</span> วันทำการ มีสิทธิลาพักผ่อนประจำปีนี้อีก <span className="font-bold">10</span> วันทำการ รวมเป็น <span className="font-bold">{(staff.carriedOverVacationDays || 0) + 10}</span> วันทำการ ขอลาพักผ่อน ตั้งแต่วันที่ <span className="font-bold">{startDateThai}</span> ถึงวันที่ <span className="font-bold">{endDateThai}</span> มีกำหนด <span className="font-bold">{record.daysCount}</span> วัน ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <span className="underline decoration-dotted">{contactAddress}</span>
              </div>

              {/* Middle Section: Stats Table (Left) + Salutation & Supervisor (Right) */}
              <div className="grid grid-cols-2 gap-6 pt-4">
                {/* Left: Vacation Leave Stats */}
                <div className="space-y-3">
                  <div className="font-bold text-center text-xs">สถิติการลาในปีงบประมาณนี้</div>
                  <table className="w-full border-collapse border border-slate-800 text-center text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-800 py-1.5 px-2">ลามาแล้ว<br/>(วันทำการ)</th>
                        <th className="border border-slate-800 py-1.5 px-2">ลาครั้งนี้<br/>(วันทำการ)</th>
                        <th className="border border-slate-800 py-1.5 px-2">รวมเป็น<br/>(วันทำการ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-800 py-2">{leaveStats.vacation.usedBefore}</td>
                        <td className="border border-slate-800 py-2 font-bold">{leaveStats.vacation.current}</td>
                        <td className="border border-slate-800 py-2 font-bold">{leaveStats.vacation.total}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Auditor Signature */}
                  <div className="text-center pt-2 space-y-1 text-xs">
                    <div>(ลงชื่อ) .................................................... ผู้ตรวจสอบ</div>
                    <div>(ตำแหน่ง) ....................................................</div>
                    <div>วันที่ .......... / .......... / ..........</div>
                  </div>
                </div>

                {/* Right: Signature & Supervisor Opinion */}
                <div className="space-y-5 text-center">
                  <div className="space-y-1">
                    <div>ขอแสดงความนับถือ</div>
                    <div className="pt-5">(ลงชื่อ) ....................................................</div>
                    <div>( {staff.name} )</div>
                  </div>

                  <div className="text-left space-y-1.5 pt-1 text-xs">
                    <div className="font-bold">ความเห็นผู้บังคับบัญชา</div>
                    <div className="border-b border-dotted border-slate-700 h-5"></div>
                    <div className="text-center pt-2">
                      (ลงชื่อ) ....................................................
                    </div>
                    <div className="text-center">
                      ตำแหน่ง ....................................................
                    </div>
                    <div className="text-center">
                      วันที่ .......... / .......... / ..........
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Delegation (Left) + Authority Order (Right) */}
              <div className="grid grid-cols-2 gap-6 pt-5 border-t border-slate-300">
                {/* Left: Work Delegation */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold">ในระหว่างลาพักผ่อนขอมอบหมายงานให้</div>
                  <div className="leading-relaxed">
                    <span className="font-bold underline decoration-dotted">{substituteDisplayName}</span> เป็นผู้ปฏิบัติราชการแทน
                  </div>
                  <div className="pt-2 text-center space-y-1">
                    <div>(ลงชื่อ) .................................................... ผู้รับมอบ</div>
                    <div>.......... / .......... / ..........</div>
                  </div>
                  <div className="pt-2 text-center space-y-1">
                    <div>(ลงชื่อ) .................................................... ผู้ส่งมอบ</div>
                    <div>.......... / .......... / ..........</div>
                  </div>
                </div>

                {/* Right: Authority Order */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold">คำสั่งผู้มีอำนาจ</div>
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="inline-block w-3.5 h-3.5 border border-slate-800 rounded-xs"></span>
                      <span>อนุญาต</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="inline-block w-3.5 h-3.5 border border-slate-800 rounded-xs"></span>
                      <span>ไม่อนุญาต</span>
                    </label>
                  </div>
                  <div className="border-b border-dotted border-slate-700 h-5"></div>
                  <div className="text-center pt-3 space-y-1">
                    <div>(ลงชื่อ) ....................................................</div>
                    <div className="font-medium">ตำแหน่ง สหกรณ์จังหวัดแม่ฮ่องสอน</div>
                    <div>วันที่ .......... / .......... / ..........</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               TEMPLATE 1: แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร
               ======================================================== */
            <div className="space-y-4">
              {/* Header Title */}
              <div className="text-center font-bold text-xl mb-4 tracking-wide">
                แบบใบลาป่วย ลากิจส่วนตัว ลาคลอดบุตร
              </div>

              {/* Written At & Date */}
              <div className="flex justify-end">
                <div className="text-right space-y-1 w-64">
                  <div>เขียนที่ <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[120px]">{writtenAt}</span></div>
                  <div>
                    วันที่ <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[28px]">{writeDateParts.day}</span> เดือน <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[70px]">{writeDateParts.month}</span> พ.ศ. <span className="inline-block border-b border-dotted border-slate-800 text-center min-w-[45px]">{writeDateParts.yearBE}</span>
                  </div>
                </div>
              </div>

              {/* Subject & Recipient */}
              <div className="space-y-1.5">
                <div>
                  <span className="font-bold">เรื่อง</span> ขอลาป่วย ลากิจส่วนตัว ลาคลอด
                </div>
                <div>
                  <span className="font-bold">เรียน</span> {recipient}
                </div>
              </div>

              {/* Paragraph 1: Staff identity */}
              <div className="indent-10 text-justify leading-loose">
                ข้าพเจ้า <span className="font-bold">{staff.name}</span> ตำแหน่ง <span className="font-bold">{staff.position}</span> สังกัด <span className="font-bold">{staff.department}</span>
              </div>

              {/* Leave Type Checklist */}
              <div className="pl-6 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-bold">ขอลา</span>
                  <label className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center w-4 h-4 border border-slate-800 rounded-xs text-[10px] ${record.leaveTypeId === 'sick' ? 'font-bold bg-slate-200' : ''}`}>
                      {record.leaveTypeId === 'sick' ? '✓' : ''}
                    </span>
                    <span>ป่วย</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center w-4 h-4 border border-slate-800 rounded-xs text-[10px] ${record.leaveTypeId === 'business' ? 'font-bold bg-slate-200' : ''}`}>
                      {record.leaveTypeId === 'business' ? '✓' : ''}
                    </span>
                    <span>กิจส่วนตัว</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center w-4 h-4 border border-slate-800 rounded-xs text-[10px] ${record.leaveTypeId === 'maternity' ? 'font-bold bg-slate-200' : ''}`}>
                      {record.leaveTypeId === 'maternity' ? '✓' : ''}
                    </span>
                    <span>ลาคลอด</span>
                  </label>
                  <span className="ml-2">เนื่องจาก</span>
                  <span className="font-bold underline decoration-dotted flex-1">{record.reason || 'มีอาการเจ็บป่วย / มีธุระจำเป็น'}</span>
                </div>
              </div>

              {/* Dates & Last Leave History */}
              <div className="space-y-1.5 text-justify leading-loose">
                <div>
                  ตั้งแต่วันที่ <span className="font-bold">{startDateThai}</span> ถึงวันที่ <span className="font-bold">{endDateThai}</span> มีกำหนด <span className="font-bold">{record.daysCount}</span> วัน
                </div>
                <div>
                  ข้าพเจ้าได้ลา
                  <span className="inline-flex items-center gap-1 mx-2">
                    <span className="w-3.5 h-3.5 border border-slate-800 inline-block text-center text-[10px] leading-3">{lastLeaveRecord?.leaveTypeId === 'sick' ? '✓' : ''}</span> ป่วย
                  </span>
                  <span className="inline-flex items-center gap-1 mx-2">
                    <span className="w-3.5 h-3.5 border border-slate-800 inline-block text-center text-[10px] leading-3">{lastLeaveRecord?.leaveTypeId === 'business' ? '✓' : ''}</span> กิจส่วนตัว
                  </span>
                  <span className="inline-flex items-center gap-1 mx-2">
                    <span className="w-3.5 h-3.5 border border-slate-800 inline-block text-center text-[10px] leading-3">{lastLeaveRecord?.leaveTypeId === 'maternity' ? '✓' : ''}</span> คลอดบุตร
                  </span>
                  ครั้งสุดท้าย
                </div>
                <div>
                  ตั้งแต่วันที่ <span className="font-medium underline decoration-dotted">{lastLeaveRecord ? formatThaiDateFull(lastLeaveRecord.startDate) : '-'}</span> ถึงวันที่ <span className="font-medium underline decoration-dotted">{lastLeaveRecord ? formatThaiDateFull(lastLeaveRecord.endDate) : '-'}</span> มีกำหนด <span className="font-medium underline decoration-dotted">{lastLeaveRecord ? `${lastLeaveRecord.daysCount} วัน` : '- วัน'}</span>
                </div>
                <div>
                  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ <span className="underline decoration-dotted">{contactAddress}</span>
                </div>
              </div>

              {/* Salutation Signature (Right-aligned) */}
              <div className="flex justify-end pt-3">
                <div className="text-center w-64 space-y-1">
                  <div>ขอแสดงความนับถือ</div>
                  <div className="pt-6">(ลงชื่อ) ....................................................</div>
                  <div>( {staff.name} )</div>
                </div>
              </div>

              {/* Bottom 2 Columns: Stats Table (Left) + Opinions & Order (Right) */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300">
                {/* Left: Stats Table for 3 leave types */}
                <div className="space-y-3">
                  <div className="font-bold text-center text-xs">สถิติการลาในปีงบประมาณนี้</div>
                  <table className="w-full border-collapse border border-slate-800 text-center text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-800 py-1 px-1.5">ประเภทลา</th>
                        <th className="border border-slate-800 py-1 px-1.5">ลามาแล้ว</th>
                        <th className="border border-slate-800 py-1 px-1.5">ลาครั้งนี้</th>
                        <th className="border border-slate-800 py-1 px-1.5">รวมเป็น</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-800 py-1.5 px-2 text-left font-medium">ป่วย</td>
                        <td className="border border-slate-800 py-1.5">{leaveStats.sick.usedBefore > 0 ? leaveStats.sick.usedBefore : '-'}</td>
                        <td className="border border-slate-800 py-1.5 font-bold">{leaveStats.sick.isCurrent ? leaveStats.sick.current : '-'}</td>
                        <td className="border border-slate-800 py-1.5 font-bold">{leaveStats.sick.total > 0 ? leaveStats.sick.total : '-'}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 py-1.5 px-2 text-left font-medium">กิจส่วนตัว</td>
                        <td className="border border-slate-800 py-1.5">{leaveStats.business.usedBefore > 0 ? leaveStats.business.usedBefore : '-'}</td>
                        <td className="border border-slate-800 py-1.5 font-bold">{leaveStats.business.isCurrent ? leaveStats.business.current : '-'}</td>
                        <td className="border border-slate-800 py-1.5 font-bold">{leaveStats.business.total > 0 ? leaveStats.business.total : '-'}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-800 py-1.5 px-2 text-left font-medium">คลอดบุตร</td>
                        <td className="border border-slate-800 py-1.5">{leaveStats.maternity.usedBefore > 0 ? leaveStats.maternity.usedBefore : '-'}</td>
                        <td className="border border-slate-800 py-1.5 font-bold">{leaveStats.maternity.isCurrent ? leaveStats.maternity.current : '-'}</td>
                        <td className="border border-slate-800 py-1.5 font-bold">{leaveStats.maternity.total > 0 ? leaveStats.maternity.total : '-'}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Auditor Signature */}
                  <div className="text-center pt-2 space-y-1 text-xs">
                    <div>(ลงชื่อ) .................................................... ผู้ตรวจสอบ</div>
                    <div>ตำแหน่ง ....................................................</div>
                    <div>วันที่ .......... เดือน .................... พ.ศ. ..........</div>
                  </div>
                </div>

                {/* Right: Supervisor Opinion and Order */}
                <div className="space-y-4 text-xs">
                  {/* Supervisor Opinion */}
                  <div className="space-y-1">
                    <div className="font-bold">ความเห็นของผู้บังคับบัญชา</div>
                    <div className="border-b border-dotted border-slate-700 h-4"></div>
                    <div className="text-center pt-2 space-y-0.5">
                      <div>(ลงชื่อ) ....................................................</div>
                      <div>ตำแหน่ง ....................................................</div>
                      <div>วันที่ .......... เดือน .................... พ.ศ. ..........</div>
                    </div>
                  </div>

                  {/* Order */}
                  <div className="space-y-1 pt-2 border-t border-slate-200">
                    <div className="font-bold">คำสั่ง</div>
                    <div className="flex items-center gap-6 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="inline-block w-3.5 h-3.5 border border-slate-800 rounded-xs"></span>
                        <span>อนุญาต</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="inline-block w-3.5 h-3.5 border border-slate-800 rounded-xs"></span>
                        <span>ไม่อนุญาต</span>
                      </label>
                    </div>
                    <div className="border-b border-dotted border-slate-700 h-4"></div>
                    <div className="text-center pt-2 space-y-0.5">
                      <div>(ลงชื่อ) ....................................................</div>
                      <div className="font-medium">ตำแหน่ง สหกรณ์จังหวัดแม่ฮ่องสอน</div>
                      <div>วันที่ .......... เดือน .................... พ.ศ. ..........</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
