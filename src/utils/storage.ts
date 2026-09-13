import type { Staff, LeaveRecord, StaffLeaveSummary } from '../types';
import { LEAVE_TYPES } from './constants';
import * as XLSX from 'xlsx';
import { toDateString } from './dateUtils';

const STORAGE_KEYS = {
  STAFF: 'leave_system_staff_v5',
  RECORDS: 'leave_system_records_v5',
};

// Initial default quotas generator (All 0 by default)
export function getDefaultQuotas(): Record<string, number> {
  const quotas: Record<string, number> = {};
  LEAVE_TYPES.forEach((t) => {
    quotas[t.id] = 0;
  });
  return quotas;
}

export const INITIAL_STAFF: Staff[] = [
  // สหกรณ์จังหวัด
  {
    id: 'staff-1',
    name: 'นายบรมัตถ์ ทิพกนก',
    position: 'สหกรณ์จังหวัดแม่ฮ่องสอน',
    department: 'สหกรณ์จังหวัด',
    quotas: getDefaultQuotas(),
    notes: 'สหกรณ์จังหวัดแม่ฮ่องสอน',
  },
  // ฝ่ายบริหารทั่วไป
  {
    id: 'staff-2',
    name: 'นางภัทรามาศ สุนทรพานิชกิจ',
    position: 'หัวหน้าฝ่ายบริหารทั่วไป / นักจัดการงานทั่วไปชำนาญการ',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-3',
    name: 'นางสาวอวิรดา นารีสกุลมาศ',
    position: 'เจ้าพนักงานธุรการปฏิบัติงาน',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-4',
    name: 'นายฐานันดร พรหมปัญญา',
    position: 'พนักงานขับรถยนต์ ส 2',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-5',
    name: 'นายธนกฤต สุธรรม',
    position: 'นักจัดการงานทั่วไป',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-6',
    name: 'นายอภิชาติ ศรีธงชัย',
    position: 'นักวิเคราะห์นโยบายและแผน',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-7',
    name: 'นางสาวนัทธ์หทัย จรูญปัญญามณี',
    position: 'เจ้าพนักงานธุรการ',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-8',
    name: 'นางณัฐชยา มนทนม',
    position: 'เจ้าหน้าที่การเงินและบัญชี',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-9',
    name: 'นางสาวณัฐชนา เงินแก๊ง',
    position: 'เจ้าพนักงานธุรการ',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-10',
    name: 'นายจาตุรงค์ วงศ์ษา',
    position: 'พนักงานจ้างเหมาขับรถยนต์',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-11',
    name: 'นายปรเมษฐ์ แก่นตัน',
    position: 'พนักงานจ้างเหมารักษาความปลอดภัย',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-12',
    name: 'นายสุรศักดิ์ เลี้ยงประเสริฐ',
    position: 'พนักงานจ้างเหมารักษาความปลอดภัย',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-13',
    name: 'นายวินัย ศรเจริญชัย',
    position: 'พนักงานจ้างเหมาทำความสะอาด',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-14',
    name: 'นางสาวศิราณี ปอรอ',
    position: 'พนักงานจ้างเหมาทำความสะอาด',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-15',
    name: 'นายถาวร ขาวลา',
    position: 'พนักงานจ้างเหมาขับรถยนต์',
    department: 'ฝ่ายบริหารทั่วไป',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มจัดตั้งและส่งเสริมสหกรณ์
  {
    id: 'staff-16',
    name: 'นางสาวเสาวลักษณ์ สุวรรณ์',
    position: 'ผู้อำนวยการกลุ่มจัดตั้งและส่งเสริมสหกรณ์ / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มจัดตั้งและส่งเสริมสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-17',
    name: 'นางสาวศิวพร นวลจันทร์',
    position: 'นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มจัดตั้งและส่งเสริมสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-18',
    name: 'นางจันทร์ศรี เครือทอง',
    position: 'นักวิชาการสหกรณ์',
    department: 'กลุ่มจัดตั้งและส่งเสริมสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-19',
    name: 'นายยศพนธ์ บุญชาญ',
    position: 'เจ้าพนักงานส่งเสริมสหกรณ์',
    department: 'กลุ่มจัดตั้งและส่งเสริมสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์
  {
    id: 'staff-20',
    name: 'นางสาวกนกวรรณ วนาศิริ',
    position: 'ผู้อำนวยการกลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์ / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-21',
    name: 'นายอรรถพงศ์ แสงอรุณ',
    position: 'นักวิชาการสหกรณ์ปฏิบัติการ',
    department: 'กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-22',
    name: 'นายสุทิวัส ปัญญา',
    position: 'นักวิชาการมาตรฐานสินค้า',
    department: 'กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-23',
    name: 'นางจตุพร ศรีบุญมา',
    position: 'เจ้าพนักงานส่งเสริมสหกรณ์',
    department: 'กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์
  {
    id: 'staff-24',
    name: 'นายพีรกร พวงบุตร',
    position: 'ผู้อำนวยการกลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์ / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-25',
    name: 'นางสาวเสาวลักษณ์ จิรกิตติ์สิริกุล',
    position: 'นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-26',
    name: 'นางสาวสุรัสวดี ทุนจันทร์ฉาย',
    position: 'เจ้าพนักงานส่งเสริมสหกรณ์',
    department: 'กลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มตรวจการสหกรณ์
  {
    id: 'staff-27',
    name: 'นายภูวนาท คำปัน',
    position: 'ผู้อำนวยการกลุ่มตรวจการสหกรณ์ / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มตรวจการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-28',
    name: 'นายปิยพัทธ์ ศิริไพบูลย์',
    position: 'นิติกรปฏิบัติการ',
    department: 'กลุ่มตรวจการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-29',
    name: 'นางสาวจุฬาลักษณ์ คันธีสาร',
    position: 'นักวิชาการสหกรณ์',
    department: 'กลุ่มตรวจการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-30',
    name: 'นายนิติกร มนเทียร',
    position: 'นิติกร',
    department: 'กลุ่มตรวจการสหกรณ์',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มส่งเสริมสหกรณ์ 1
  {
    id: 'staff-31',
    name: 'นายรภัทร กันทาสุข',
    position: 'ผู้อำนวยการกลุ่มส่งเสริมสหกรณ์ 1 / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 1',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-32',
    name: 'นางสาวญานิศา อุนจะนำ',
    position: 'นักวิชาการสหกรณ์ปฏิบัติการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 1',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-33',
    name: 'นายพัฒฐพงค์ วุฒิสาร',
    position: 'นักวิชาการสหกรณ์ปฏิบัติการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 1',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-34',
    name: 'นางสาวสมจิตย์ กุณะ',
    position: 'นักวิชาการสหกรณ์',
    department: 'กลุ่มส่งเสริมสหกรณ์ 1',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-35',
    name: 'นายสมชาย นานาวรรณาคาร',
    position: 'พนักงานขับรถยนต์ ส 2',
    department: 'กลุ่มส่งเสริมสหกรณ์ 1',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มส่งเสริมสหกรณ์ 2
  {
    id: 'staff-36',
    name: 'นายวรากร เลิศปรีชา',
    position: 'ผู้อำนวยการกลุ่มส่งเสริมสหกรณ์ 2 / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 2',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-37',
    name: 'นางสาวอรจิรา บงกชกุสุมาลย์',
    position: 'นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 2',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-38',
    name: 'นางสาวพีรญา สุนันท์',
    position: 'นักวิชาการสหกรณ์ปฏิบัติการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 2',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-39',
    name: 'นายชัยชาญ จันทะวงค์',
    position: 'พนักงานจ้างเหมาขับรถยนต์',
    department: 'กลุ่มส่งเสริมสหกรณ์ 2',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มส่งเสริมสหกรณ์ 3
  {
    id: 'staff-40',
    name: 'นางสาวอริศรา ฝ่ายรีย์',
    position: 'ผู้อำนวยการกลุ่มส่งเสริมสหกรณ์ 3 / นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 3',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-41',
    name: 'นางพิมพ์พิศา คำคง',
    position: 'นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 3',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-42',
    name: 'นายอรรคพล พงษ์แก้ว',
    position: 'พนักงานจ้างเหมาขับรถยนต์',
    department: 'กลุ่มส่งเสริมสหกรณ์ 3',
    quotas: getDefaultQuotas(),
  },
  // กลุ่มส่งเสริมสหกรณ์ 4
  {
    id: 'staff-43',
    name: 'นายจรัลวิทย์ อาชนี',
    position: 'ผู้อำนวยการกลุ่มส่งเสริมสหกรณ์ 4 / เจ้าพนักงานส่งเสริมสหกรณ์อาวุโส',
    department: 'กลุ่มส่งเสริมสหกรณ์ 4',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-44',
    name: 'นางสาวดรุณ ปัญญา',
    position: 'นักวิชาการสหกรณ์ชำนาญการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 4',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-45',
    name: 'นางสาวรุ้งลาวรรณ อินขะ',
    position: 'นักวิชาการสหกรณ์ปฏิบัติการ',
    department: 'กลุ่มส่งเสริมสหกรณ์ 4',
    quotas: getDefaultQuotas(),
  },
  {
    id: 'staff-46',
    name: 'นางสาวปิยวดี มะโนธรรม',
    position: 'เจ้าพนักงานส่งเสริมสหกรณ์',
    department: 'กลุ่มส่งเสริมสหกรณ์ 4',
    quotas: getDefaultQuotas(),
  },
];

export const INITIAL_RECORDS: LeaveRecord[] = [];

export function getStaffList(): Staff[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (!data) {
      saveStaffList(INITIAL_STAFF);
      return INITIAL_STAFF;
    }
    const staffList: Staff[] = JSON.parse(data);
    return staffList.map((s) => {
      const integerQuotas: Record<string, number> = {};
      Object.entries(s.quotas || {}).forEach(([k, v]) => {
        integerQuotas[k] = Math.max(0, Math.floor(v));
      });
      const department =
        s.id === 'staff-1' || s.position.includes('สหกรณ์จังหวัดแม่ฮ่องสอน')
          ? 'สหกรณ์จังหวัด'
          : s.department;
      return { ...s, department, quotas: integerQuotas };
    });
  } catch (err) {
    console.error('Error reading staff from localStorage:', err);
    return INITIAL_STAFF;
  }
}

export function saveStaffList(staffList: Staff[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
  } catch (err) {
    console.error('Error saving staff to localStorage:', err);
  }
}

export function getLeaveRecords(): LeaveRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!data) {
      saveLeaveRecords(INITIAL_RECORDS);
      return INITIAL_RECORDS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading records from localStorage:', err);
    return INITIAL_RECORDS;
  }
}

export function saveLeaveRecords(records: LeaveRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving records to localStorage:', err);
  }
}

export function resetAllData(): void {
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
}

// Calculate summary per staff member
export function calculateStaffSummaries(staffList: Staff[], records: LeaveRecord[]): StaffLeaveSummary[] {
  return staffList.map((staff) => {
    const staffRecords = records.filter((r) => r.staffId === staff.id && r.status !== 'rejected');
    const usedByType: Record<string, number> = {};
    const remainingByType: Record<string, number> = {};
    const quotas: Record<string, number> = { ...getDefaultQuotas(), ...staff.quotas };

    LEAVE_TYPES.forEach((t) => {
      usedByType[t.id] = 0;
    });

    staffRecords.forEach((r) => {
      if (usedByType[r.leaveTypeId] !== undefined) {
        usedByType[r.leaveTypeId] += r.daysCount;
      } else {
        usedByType[r.leaveTypeId] = r.daysCount;
      }
    });

    let totalQuota = 0;
    let totalUsed = 0;

    LEAVE_TYPES.forEach((t) => {
      const quota = quotas[t.id] || 0;
      const used = usedByType[t.id] || 0;
      remainingByType[t.id] = Math.max(0, quota - used);
      totalQuota += quota;
      totalUsed += used;
    });

    return {
      staff,
      usedByType,
      remainingByType,
      quotas,
      totalQuota,
      totalUsed,
      totalRemaining: Math.max(0, totalQuota - totalUsed),
    };
  });
}

// Export all data to JSON
export function exportDataToJson(): void {
  const data = {
    exportDate: new Date().toISOString(),
    system: 'Leave Management System',
    staff: getStaffList(),
    records: getLeaveRecords(),
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leave_system_backup_${toDateString(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import all data from JSON string
export function importDataFromJson(jsonStr: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.staff || !Array.isArray(data.staff)) {
      return { success: false, message: 'ไฟล์ข้อมูลไม่ถูกต้อง: ไม่พบรายการบุคลากร' };
    }
    if (!data.records || !Array.isArray(data.records)) {
      return { success: false, message: 'ไฟล์ข้อมูลไม่ถูกต้อง: ไม่พบรายการบันทึกการลา' };
    }
    saveStaffList(data.staff);
    saveLeaveRecords(data.records);
    return { success: true, message: 'นำเข้าข้อมูลเรียบร้อยแล้ว' };
  } catch {
    return { success: false, message: 'รูปแบบไฟล์ JSON ไม่ถูกต้อง' };
  }
}

// Export staff balance summary to Excel
export function exportSummaryToExcel(summaries: StaffLeaveSummary[]): void {
  const headers = [
    'ชื่อ - นามสกุล',
    'ตำแหน่ง',
    'กลุ่มงาน',
    ...LEAVE_TYPES.flatMap((t) => [`${t.name} (ใช้)`, `${t.name} (โควตา)`, `${t.name} (คงเหลือ)`]),
    'รวมใช้ทั้งหมด (วัน)',
    'รวมโควตาทั้งหมด (วัน)',
    'รวมคงเหลือทั้งหมด (วัน)',
  ];

  const rows = summaries.map((s) => {
    const row: (string | number)[] = [
      s.staff.name,
      s.staff.position,
      s.staff.department,
    ];

    LEAVE_TYPES.forEach((t) => {
      row.push(s.usedByType[t.id] || 0);
      row.push(s.quotas[t.id] || 0);
      row.push(s.remainingByType[t.id] || 0);
    });

    row.push(s.totalUsed);
    row.push(s.totalQuota);
    row.push(s.totalRemaining);

    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'สรุปวันลาคงเหลือ');

  XLSX.writeFile(wb, `สรุปวันลาคงเหลือ_${toDateString(new Date())}.xlsx`);
}

// Export leave records history to Excel
export function exportRecordsToExcel(records: LeaveRecord[], staffList: Staff[]): void {
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const headers = [
    'ชื่อ - นามสกุล',
    'กลุ่มงาน',
    'ตำแหน่ง',
    'ประเภทการลา',
    'วันที่เริ่มลา',
    'วันที่สิ้นสุด',
    'จำนวนวันลา',
    'เหตุผลการลา',
    'สถานะ',
    'วันที่บันทึก',
  ];

  const statusLabel = {
    approved: 'อนุมัติ',
    pending: 'รอตรวจสอบ',
    rejected: 'ยกเลิก',
  };

  const rows = records.map((r) => {
    const staff = staffMap.get(r.staffId);
    const leaveType = LEAVE_TYPES.find((t) => t.id === r.leaveTypeId);

    return [
      staff?.name || 'ไม่ทราบชื่อ',
      staff?.department || '-',
      staff?.position || '-',
      leaveType?.name || r.leaveTypeId,
      r.startDate,
      r.endDate,
      r.daysCount,
      r.reason || '-',
      statusLabel[r.status] || r.status,
      r.createdAt.split('T')[0],
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการลา');

  XLSX.writeFile(wb, `ประวัติการลา_${toDateString(new Date())}.xlsx`);
}
