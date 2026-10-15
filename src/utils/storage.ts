import type { Staff, LeaveRecord, StaffLeaveSummary, UserRole } from '../types';
import { LEAVE_TYPES } from './constants';
import * as XLSX from 'xlsx';
import { toDateString, getFiscalYear, getCurrentFiscalYear } from './dateUtils';
import { sendRecordsToStreamlit } from './streamlitBridge';

/**
 * คีย์สำหรับบันทึกข้อมูลลงใน localStorage ของเว็บเบราว์เซอร์
 */
const STORAGE_KEYS = {
  STAFF: 'leave_system_staff_v5',     // คีย์เก็บข้อมูลรายชื่อบุคลากรและโควตาวันลา
  RECORDS: 'leave_system_records_v5', // คีย์เก็บรายการประวัติการลาทั้งหมด
};

/**
 * ฟังก์ชันตรวจสอบว่าตำแหน่งของบุคลากรเป็น "ข้าราชการ" หรือ "ลูกจ้างประจำ" หรือไม่
 * ใช้พิจารณาเงื่อนไขการให้สิทธิ์วันลาตามระเบียบข้าราชการ (ลาป่วย 60 วัน, ลากิจ 45 วัน)
 * เทียบกับ พนักงานราชการ / จ้างเหมาบริการ (ลาป่วย 30 วัน, ลากิจ 15 วัน)
 * @param position ชื่อตำแหน่ง
 * @returns true หากเป็นข้าราชการ/ลูกจ้างประจำ, false หากเป็นพนักงานราชการหรือจ้างเหมา
 */
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

/**
 * คำนวณโควตาวันลามาตรฐานตามระเบียบทางราชการสำหรับแต่ละตำแหน่ง
 * - ข้าราชการ: ลาป่วย 60 วันทำการ, ลากิจ 45 วันทำการ, ลาพักผ่อน 10 วันทำการ, ลาคลอด 90 วัน
 * - พนักงานราชการ / จ้างเหมา: ลาป่วย 30 วันทำการ, ลากิจ 15 วันทำการ, ลาพักผ่อน 10 วันทำการ, ลาคลอด 90 วัน
 * @param position ชื่อตำแหน่งงาน
 * @returns ออบเจกต์ Record<leaveTypeId, จำนวนวันโควตา>
 */
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
    // ประกาศ คพร. เรื่อง สิทธิประโยชน์ของพนักงานราชการ และเทียบเคียงพนักงานจ้างเหมา
    quotas['sick'] = 30; // ลาป่วย 30 วันทำการ
    quotas['business'] = 15; // ลากิจส่วนตัว 15 วันทำการ
    quotas['vacation'] = 10; // ลาพักผ่อน 10 วันทำการ
    quotas['maternity'] = 90; // ลาคลอดบุตร 90 วัน
  }

  return quotas;
}

/**
 * สร้างโควตาวันลาเริ่มต้นสำหรับบุคลากร หากระบุตำแหน่งจะใช้โควตาตามระเบียบตำแหน่งนั้น
 * @param position ตำแหน่งงาน (ถ้ามี)
 * @returns ออบเจกต์โควตาวันลา
 */
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
/**
 * กำหนดค่าเริ่มต้นของรายการบุคลากร พร้อมคำนวณโควตาวันลาเริ่มต้นตามประเภทตำแหน่ง
 */
].map((s) => ({
  ...s,
  quotas: getOfficialQuotasForPosition(s.position),
}));

/**
 * ตัวอย่างข้อมูลประวัติการลาเริ่มต้นสำหรับการแสดงผลครั้งแรกของระบบ
 */
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

/**
 * โหลดรายชื่อบุคลากรทั้งหมดจาก localStorage
 * มีระบบตรวจสอบและปรับปรุงข้อมูลอัตโนมัติ (Data Migration / Self-healing):
 * - แปลงโควตาเป็นจำนวนเต็มบวก
 * - หากโควตาเป็น 0 หรือว่าง จะอัปเกรดเป็นโควตาราชการตามตำแหน่งทันที
 * - ควบคุมวันลาพักผ่อนสะสมยกมา (carriedOverVacationDays) ให้อยู่ในช่วง 0-10 วัน ไม่ให้เกิดข้อผิดพลาดสะสมทบเกินจริง
 * @returns รายชื่อบุคลากร Staff[]
 */
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

      // หากบุคลากรไม่มีโควตา หรือโควตารวมเป็น 0 ให้อัปเกรดเป็นโควตาตามระเบียบข้าราชการทันที
      let finalQuotas = integerQuotas;
      if (totalQuota === 0) {
        finalQuotas = getOfficialQuotasForPosition(s.position);
        upgradedAny = true;
      }

      const department =
        s.id === 'staff-1' || s.position.includes('สหกรณ์จังหวัดแม่ฮ่องสอน')
          ? 'สหกรณ์จังหวัด'
          : s.department;
      // ป้องกันปัญหาวันลาสะสมยกมาเกิน 10 วันจากการกดปุ่มซ้ำ
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

/**
 * บันทึกรายชื่อบุคลากรลงใน localStorage
 * @param staffList รายชื่อบุคลากรทั้งหมด
 */
export function saveStaffList(staffList: Staff[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staffList));
  } catch (err) {
    console.error('Error saving staff to localStorage:', err);
  }
}

/**
 * ดึงรายการประวัติการลาทั้งหมดจาก localStorage
 * หากไม่มีข้อมูลหรือเป็นอาร์เรย์ว่าง จะใช้ค่า INITIAL_RECORDS
 * @returns รายการ LeaveRecord[]
 */
export function getLeaveRecords(): LeaveRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!data) {
      saveLeaveRecords(INITIAL_RECORDS, false);
      return INITIAL_RECORDS;
    }
    const parsed: LeaveRecord[] = JSON.parse(data);
    // กรณีที่ localStorage เป็นอาร์เรย์ว่าง ให้ใช้ค่าเริ่มต้น
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

/**
 * บันทึกรายการประวัติการลาลงใน localStorage พร้อมส่งสัญญาณ postMessage ไปยัง Streamlit Backend
 * เพื่อสั่งบันทึกลงไฟล์ records.json และ Auto-commit ขึ้น GitHub ทันที
 * @param records รายการประวัติการลาทั้งหมด
 * @param notifyStreamlit ส่งข้อมูลอัปเดตไปยัง Streamlit หรือไม่ (ค่าเริ่มต้น true)
 */
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

/**
 * ดึงข้อมูลประวัติการลาล่าสุดจาก GitHub Repository (records.json)
 * เพื่อให้แน่ใจว่าอุปกรณ์ทุกเครื่องได้รับข้อมูลที่เป็นปัจจุบันและตรงกัน
 * @returns รายการ LeaveRecord[] ล่าสุด หรือ null หากดึงข้อมูลไม่สำเร็จ
 */
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

/**
 * ล้างข้อมูลและรีเซ็ตระบบกลับเป็นค่าเริ่มต้นทั้งหมด (Factory Reset)
 */
export function resetAllData(): void {
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(INITIAL_STAFF));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
}

/**
 * คำนวณสรุปสถิติวันลาของบุคลากรทุกคน โดยรองรับการกรองตามปีงบประมาณ
 * - คำนวณวันลาที่ใช้ไปแยกตามประเภทการลา (sick, business, vacation, maternity)
 * - คำนวณโควตารวมโดยบวกวันลาพักผ่อนสะสมยกมา (carriedOverVacationDays) เข้ากับโควตาพักผ่อนประจำปี
 * - คำนวณวันลาคงเหลือ
 * @param staffList รายชื่อบุคลากร
 * @param records ประวัติการลาทั้งหมด
 * @param fiscalYear ปีงบประมาณ พ.ศ. ที่ต้องการคำนวณ หรือ 'all' (ค่าเริ่มต้น: ปีงบประมาณปัจจุบัน 2570)
 * @returns อาร์เรย์ StaffLeaveSummary[]
 */
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

/**
 * ฟังก์ชันปรับรอบปีงบประมาณใหม่ (Rollover Fiscal Year) ตามระเบียบราชการ:
 * 1. คำนวณวันลาพักผ่อนที่ใช้ไปจริงในปีงบประมาณก่อนหน้า
 * 2. คำนวณวันลาพักผ่อนที่เหลือยกมาสะสม (สูงสุดไม่เกิน 10 วันทำการ ตามระเบียบ)
 * 3. เติมโควตาวันลาใหม่เต็มจำนวนตามตำแหน่งงานสำหรับปีงบประมาณใหม่
 * 4. การทำงานเป็นแบบ Idempotent: กดซ้ำกี่ครั้งก็จะไม่สะสมเบิ้ลหรือเกิน 10 วัน
 * @param staffList รายชื่อบุคลากร
 * @param records ประวัติการลาทั้งหมด
 * @param fromYear ปีงบประมาณเดิมที่ต้องการคำนวณวันลาพักผ่อนคงเหลือ (ค่าเริ่มต้น: ปีก่อนหน้า)
 * @param _toYear ปีงบประมาณใหม่ (ค่าเริ่มต้น: ปีปัจจุบัน)
 * @returns รายชื่อบุคลากรที่ได้รับการอัปเดต Staff[]
 */
export function rolloverFiscalYear(
  staffList: Staff[],
  records: LeaveRecord[],
  fromYear: number = getCurrentFiscalYear() - 1,
  _toYear: number = getCurrentFiscalYear()
): Staff[] {
  const updatedStaffList: Staff[] = staffList.map((staff) => {
    // คำนวณวันลาพักผ่อนที่ใช้ไปจริงในรอบปีงบประมาณก่อนหน้า
    const usedVacationInFromYear = records
      .filter(
        (r) =>
          r.staffId === staff.id &&
          r.status !== 'rejected' &&
          r.leaveTypeId === 'vacation' &&
          getFiscalYear(r.startDate) === fromYear
      )
      .reduce((sum, r) => sum + r.daysCount, 0);

    // โควตาวันลาพักผ่อนประจำปีมาตรฐานคือ 10 วันทำการ
    // วันลาสะสมยกมาต้องไม่เกินวันที่เหลือ และไม่เกิน 10 วัน (Math.max(0, 10 - used))
    const carriedOver = Math.max(0, 10 - usedVacationInFromYear);

    // รับโควตามาตรฐานใหม่เต็มจำนวนตามตำแหน่ง
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

/**
 * ย้อนกลับ/ล้างวันลาพักผ่อนสะสมยกมา (carriedOverVacationDays) ของทุกคนให้เป็น 0
 * ใช้สำหรับกรณีผู้ดูแลระบบเผลอกดปรับย้อนรอบปีงบประมาณ หรือต้องการรีเซ็ตวันลายกมา
 * @param staffList รายชื่อบุคลากร
 * @returns รายชื่อบุคลากรที่ถูกรีเซ็ต Staff[]
 */
export function resetCarriedOverVacationDays(staffList: Staff[]): Staff[] {
  const updatedStaffList: Staff[] = staffList.map((staff) => ({
    ...staff,
    carriedOverVacationDays: 0,
    quotas: getOfficialQuotasForPosition(staff.position),
  }));

  saveStaffList(updatedStaffList);
  return updatedStaffList;
}

/**
 * ส่งออก (Export) ข้อมูลทั้งหมดของระบบ (บุคลากรและประวัติการลา) เป็นไฟล์ JSON สำหรับสำรองข้อมูล (Backup)
 */
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

/**
 * นำเข้า (Import) ข้อมูลระบบจากข้อความ JSON ที่ได้จากการสำรองข้อมูล
 * @param jsonStr ข้อความ JSON
 * @returns ออบเจกต์ผลลัพธ์ { success: boolean, message: string }
 */
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

/**
 * ส่งออกรายงานสรุปวันลาคงเหลือของบุคลากรทุกคนเป็นไฟล์ Microsoft Excel (.xlsx)
 * @param summaries รายการสรุปสถิติวันลา StaffLeaveSummary[]
 */
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

/**
 * ส่งออกรายงานสรุปวันลาคงเหลือเป็นไฟล์ CSV (เข้ารหัส UTF-8 พร้อม BOM เพื่อให้เปิดใน Excel ภาษาไทยไม่เพี้ยน)
 * @param summaries รายการสรุปสถิติวันลา StaffLeaveSummary[]
 */
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

  // ใส่ BOM (\uFEFF) หน้าข้อความ CSV เพื่อให้ Microsoft Excel แสดงผลภาษาไทยได้อย่างถูกต้อง
  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `สรุปวันลาคงเหลือ_${toDateString(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * ส่งออกประวัติการลาทั้งหมดเป็นไฟล์ Microsoft Excel (.xlsx)
 * @param records รายการประวัติการลา
 * @param staffList รายชื่อบุคลากร
 */
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

// -------------------------------------------------------------
// ระบบจัดการสิทธิ์ผู้ใช้งานและการยืนยันตัวตน (Authentication & Roles)
// -------------------------------------------------------------
const ROLE_KEY = 'leave_system_user_role';
const ADMIN_PASSWORD_KEY = 'leave_system_admin_password';
const MY_STAFF_ID_KEY = 'leave_system_my_staff_id';

/**
 * ดึงบทบาทผู้ใช้งานปัจจุบัน (admin หรือ staff)
 * ค่าเริ่มต้นคือ 'staff' (เจ้าหน้าที่ทั่วไป)
 */
export function getUserRole(): UserRole {
  try {
    const role = localStorage.getItem(ROLE_KEY);
    if (role === 'admin' || role === 'staff') return role;
    return 'staff';
  } catch {
    return 'staff';
  }
}

/**
 * กำหนดบทบาทผู้ใช้งานปัจจุบันลงใน localStorage
 * @param role บทบาท 'admin' หรือ 'staff'
 */
export function setUserRole(role: UserRole): void {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch (err) {
    console.error('Error saving user role:', err);
  }
}

/**
 * ดึงรหัสผ่านผู้ดูแลระบบ (Admin) ค่าเริ่มต้นคือ 'admin'
 */
export function getAdminPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin';
  } catch {
    return 'admin';
  }
}

/**
 * ตั้งค่ารหัสผ่านผู้ดูแลระบบใหม่
 * @param password รหัสผ่านใหม่
 */
export function setAdminPassword(password: string): void {
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
  } catch (err) {
    console.error('Error saving admin password:', err);
  }
}

/**
 * ตรวจสอบความถูกต้องของรหัสผ่านผู้ดูแลระบบ
 * รองรับรหัสผ่านที่ตั้งไว้, ค่าเริ่มต้น 'admin' หรือ '1234'
 * @param password รหัสผ่านที่ผู้ใช้ป้อนเข้ามา
 * @returns true ถ้ารหัสถูกต้อง, false ถ้าไม่ถูกต้อง
 */
export function verifyAdminPassword(password: string): boolean {
  const currentPassword = getAdminPassword();
  return password === currentPassword || password === 'admin' || password === '1234';
}

/**
 * ดึงรหัสบุคลากรของตนเอง (My Staff ID) ที่เลือกจำไว้ในระบบ
 */
export function getMyStaffId(): string | null {
  try {
    return localStorage.getItem(MY_STAFF_ID_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * บันทึกรหัสบุคลากรของตนเอง (My Staff ID) เพื่อให้ระบบจำตัวบุคคลได้อัตโนมัติ
 * @param staffId รหัสบุคลากร หรือ null หากต้องการล้างค่า
 */
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
