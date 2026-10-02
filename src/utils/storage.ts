import type { Staff, LeaveRecord, StaffLeaveSummary, UserRole } from '../types';
import { LEAVE_TYPES } from './constants';
import * as XLSX from 'xlsx';
import { toDateString, getFiscalYear, getCurrentFiscalYear } from './dateUtils';
import { sendRecordsToStreamlit } from './streamlitBridge';

const STORAGE_KEYS = {
  STAFF: 'leave_system_staff_v5',
  RECORDS: 'leave_system_records_v5',
};

// Helper: Check if staff is civil servant or permanent employee
export function isCivilServant(position: string): boolean {
  if (!position) return false;
  const p = position.toLowerCase();
  return (
    p.includes('ชำนาญการ') ||
    p.includes('ปฏิบัติการ') ||
    p.includes('ปฏิบัติงาน') ||
    p.includes('อาวุโส') ||
    p.includes('สหกรณ์จังหวัด') ||
    p.includes('ผู้อำนวยการ') ||
    p.includes('ส 2') ||
    p.includes('ลูกจ้างประจำ')
  );
}

// Generate official leave quotas per government regulations
export function getOfficialQuotasForPosition(position: string): Record<string, number> {
  const quotas: Record<string, number> = {};
  LEAVE_TYPES.forEach((t) => {
    quotas[t.id] = 0;
  });

  const isCivil = isCivilServant(position);
  if (isCivil) {
    // ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
    quotas['sick'] = 60; // ลาป่วย 60 วันทำการ
    quotas['business'] = 45; // ลากิจส่วนตัว 45 วันทำการ
    quotas['vacation'] = 10; // ลาพักผ่อน 10 วันทำการ
    quotas['maternity'] = 90; // ลาคลอดบุตร 90 วัน
  } else {
    // ประกาศ คพร. สิทธิประโยชน์ของพนักงานราชการ และเทียบเคียงพนักงานจ้างเหมา
    quotas['sick'] = 30; // ลาป่วย 30 วันทำการ
    quotas['business'] = 15; // ลากิจส่วนตัว 15 วันทำการ
    quotas['vacation'] = 10; // ลาพักผ่อน 10 วันทำการ
    quotas['maternity'] = 90; // ลาคลอดบุตร 90 วัน
  }

  return quotas;
}

// Initial default quotas generator
export function getDefaultQuotas(position?: string): Record<string, number> {
  if (position) {
    return getOfficialQuotasForPosition(position);
  }
  const quotas: Record<string, number> = {};
  LEAVE_TYPES.forEach((t) => {
    quotas[t.id] = t.defaultQuota || 0;
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
].map((s) => ({
  ...s,
  quotas: getOfficialQuotasForPosition(s.position),
}));

export const INITIAL_RECORDS: LeaveRecord[] = [
  {
    id: 'rec-1789358900001',
    staffId: 'staff-6',
    leaveTypeId: 'vacation',
    startDate: '2026-09-17',
    endDate: '2026-09-18',
    period: 'full',
    daysCount: 2,
    skipWeekends: true,
    reason: 'ลาพักผ่อนประจำปี',
    status: 'approved',
    createdAt: '2026-09-14T04:00:00.000Z',
  },
  {
    id: 'rec-1789358900002',
    staffId: 'staff-5',
    leaveTypeId: 'vacation',
    startDate: '2026-09-21',
    endDate: '2026-09-21',
    period: 'full',
    daysCount: 1,
    skipWeekends: true,
    reason: 'ลาพักผ่อนประจำปี',
    status: 'approved',
    createdAt: '2026-09-14T04:00:00.000Z',
  },
];

export function getStaffList(): Staff[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STAFF);
    if (!data) {
      saveStaffList(INITIAL_STAFF);
      return INITIAL_STAFF;
    }
    const staffList: Staff[] = JSON.parse(data);
    let upgradedAny = false;
    const mappedList = staffList.map((s) => {
      const integerQuotas: Record<string, number> = {};
      let totalQuota = 0;
      Object.entries(s.quotas || {}).forEach(([k, v]) => {
        const val = Math.max(0, Math.floor(v));
        integerQuotas[k] = val;
        totalQuota += val;
      });

      // If staff has no quotas or total quota is 0 (legacy data before fiscal year update), upgrade to official regulations
      let finalQuotas = integerQuotas;
      if (totalQuota === 0) {
        finalQuotas = getOfficialQuotasForPosition(s.position);
        upgradedAny = true;
      }

      const department =
        s.id === 'staff-1' || s.position.includes('สหกรณ์จังหวัดแม่ฮ่องสอน')
          ? 'สหกรณ์จังหวัด'
          : s.department;
      // If carriedOverVacationDays was inflated beyond 10 days by multiple clicks, auto-correct to max 10
      const safeCarriedOver = Math.min(10, Math.max(0, s.carriedOverVacationDays || 0));
      if (safeCarriedOver !== (s.carriedOverVacationDays || 0)) {
        upgradedAny = true;
      }

      return {
        ...s,
        department,
        quotas: finalQuotas,
        carriedOverVacationDays: safeCarriedOver,
      };
    });

    if (upgradedAny) {
      saveStaffList(mappedList);
    }
    return mappedList;
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
      saveLeaveRecords(INITIAL_RECORDS, false);
      return INITIAL_RECORDS;
    }
    const parsed: LeaveRecord[] = JSON.parse(data);
    // If local storage is empty array but INITIAL_RECORDS has default items, use INITIAL_RECORDS
    if (Array.isArray(parsed) && parsed.length === 0 && INITIAL_RECORDS.length > 0) {
      saveLeaveRecords(INITIAL_RECORDS, false);
      return INITIAL_RECORDS;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading records from localStorage:', err);
    return INITIAL_RECORDS;
  }
}

export function saveLeaveRecords(records: LeaveRecord[], notifyStreamlit = true): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving records to localStorage:', err);
  }
  if (notifyStreamlit) {
    sendRecordsToStreamlit(records);
  }
}

export async function syncRecordsFromGitHub(): Promise<LeaveRecord[] | null> {
  try {
    let res = await fetch('./records.json?t=' + Date.now()).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(
        'https://raw.githubusercontent.com/okkokk09/WanLaCPDMSH/main/records.json?t=' +
          Date.now()
      ).catch(() => null);
    }
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveLeaveRecords(data, false);
        return data;
      }
    }
  } catch (err) {
    console.warn('Sync from server/GitHub failed:', err);
  }
  return null;
}

export function resetAllData(): void {
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
}

// Calculate summary per staff member (supports filtering by fiscal year, default current fiscal year 2570)
export function calculateStaffSummaries(
  staffList: Staff[],
  records: LeaveRecord[],
  fiscalYear: number | 'all' = getCurrentFiscalYear()
): StaffLeaveSummary[] {
  return staffList.map((staff) => {
    const staffRecords = records.filter((r) => {
      if (r.staffId !== staff.id || r.status === 'rejected') return false;
      if (fiscalYear === 'all') return true;
      return getFiscalYear(r.startDate) === fiscalYear;
    });

    const usedByType: Record<string, number> = {};
    const remainingByType: Record<string, number> = {};
    const quotas: Record<string, number> = { ...getDefaultQuotas(staff.position), ...staff.quotas };

    // Add carried-over vacation days to vacation quota if present
    const carriedOverVacationDays = staff.carriedOverVacationDays || 0;
    if (carriedOverVacationDays > 0) {
      quotas['vacation'] = (quotas['vacation'] || 0) + carriedOverVacationDays;
    }

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
      carriedOverVacationDays,
    };
  });
}

// Rollover / upgrade all staff quotas for a new fiscal year according to regulations
export function rolloverFiscalYear(
  staffList: Staff[],
  records: LeaveRecord[],
  fromYear: number = getCurrentFiscalYear() - 1,
  _toYear: number = getCurrentFiscalYear()
): Staff[] {
  const updatedStaffList: Staff[] = staffList.map((staff) => {
    // Calculate actual vacation days used in the previous fiscal year from leave records
    const usedVacationInFromYear = records
      .filter(
        (r) =>
          r.staffId === staff.id &&
          r.status !== 'rejected' &&
          r.leaveTypeId === 'vacation' &&
          getFiscalYear(r.startDate) === fromYear
      )
      .reduce((sum, r) => sum + r.daysCount, 0);

    // Standard annual vacation quota for previous year was 10 days
    // Carried over days can NEVER exceed remaining days from standard 10 days (max 10 days)
    // This is strictly idempotent: clicking multiple times will NOT inflate or compound the days
    const carriedOver = Math.max(0, 10 - usedVacationInFromYear);

    // Fresh official quotas for new fiscal year
    const officialQuotas = getOfficialQuotasForPosition(staff.position);

    return {
      ...staff,
      quotas: officialQuotas,
      carriedOverVacationDays: carriedOver,
    };
  });

  saveStaffList(updatedStaffList);
  return updatedStaffList;
}

// Reset carried-over vacation days to 0 for all staff (revert carryover completely)
export function resetCarriedOverVacationDays(staffList: Staff[]): Staff[] {
  const updatedStaffList: Staff[] = staffList.map((staff) => ({
    ...staff,
    carriedOverVacationDays: 0,
    quotas: getOfficialQuotasForPosition(staff.position),
  }));

  saveStaffList(updatedStaffList);
  return updatedStaffList;
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
    'วันลาพักผ่อนสะสมยกมา (วัน)',
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
      s.staff.carriedOverVacationDays || 0,
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

// Export staff balance summary to CSV (UTF-8 with BOM for Excel compatibility)
export function exportSummaryToCsv(summaries: StaffLeaveSummary[]): void {
  const headers = [
    'ชื่อ - นามสกุล',
    'ตำแหน่ง',
    'กลุ่มงาน',
    'วันลาพักผ่อนสะสมยกมา (วัน)',
    ...LEAVE_TYPES.flatMap((t) => [`${t.name} (ใช้)`, `${t.name} (โควตา)`, `${t.name} (คงเหลือ)`]),
    'รวมใช้ทั้งหมด (วัน)',
    'รวมโควตาทั้งหมด (วัน)',
    'รวมคงเหลือทั้งหมด (วัน)',
  ];

  const rows = summaries.map((s) => {
    const row: (string | number)[] = [
      `"${(s.staff.name || '').replace(/"/g, '""')}"`,
      `"${(s.staff.position || '').replace(/"/g, '""')}"`,
      `"${(s.staff.department || '').replace(/"/g, '""')}"`,
      s.staff.carriedOverVacationDays || 0,
    ];

    LEAVE_TYPES.forEach((t) => {
      row.push(s.usedByType[t.id] || 0);
      row.push(s.quotas[t.id] || 0);
      row.push(s.remainingByType[t.id] || 0);
    });

    row.push(s.totalUsed);
    row.push(s.totalQuota);
    row.push(s.totalRemaining);

    return row.join(',');
  });

  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `สรุปวันลาคงเหลือ_${toDateString(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

// User Role & Admin Authentication Storage
const ROLE_KEY = 'leave_system_user_role';
const ADMIN_PASSWORD_KEY = 'leave_system_admin_password';
const MY_STAFF_ID_KEY = 'leave_system_my_staff_id';

export function getUserRole(): UserRole {
  try {
    const role = localStorage.getItem(ROLE_KEY);
    if (role === 'admin' || role === 'staff') return role;
    return 'staff'; // Default to staff role
  } catch {
    return 'staff';
  }
}

export function setUserRole(role: UserRole): void {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch (err) {
    console.error('Error saving user role:', err);
  }
}

export function getAdminPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin';
  } catch {
    return 'admin';
  }
}

export function setAdminPassword(password: string): void {
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
  } catch (err) {
    console.error('Error saving admin password:', err);
  }
}

export function verifyAdminPassword(password: string): boolean {
  const currentPassword = getAdminPassword();
  // Allow configured password, default 'admin', or '1234'
  return password === currentPassword || password === 'admin' || password === '1234';
}

export function getMyStaffId(): string | null {
  try {
    return localStorage.getItem(MY_STAFF_ID_KEY) || null;
  } catch {
    return null;
  }
}

export function setMyStaffId(staffId: string | null): void {
  try {
    if (staffId) {
      localStorage.setItem(MY_STAFF_ID_KEY, staffId);
    } else {
      localStorage.removeItem(MY_STAFF_ID_KEY);
    }
  } catch (err) {
    console.error('Error saving my staff ID:', err);
  }
}
