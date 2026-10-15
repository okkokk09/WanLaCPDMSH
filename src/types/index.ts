// ========================================================
// ประเภทข้อมูลหลักของระบบบันทึกวันลา (Type Definitions)
// สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน
// ========================================================

/**
 * รหัสประเภทการลา (Leave Type Identifier)
 * - 'sick': ลาป่วย (สิทธิ์ 60 วันทำการ ตามระเบียบราชการ)
 * - 'business': ลากิจส่วนตัว (สิทธิ์ 45 วันทำการ)
 * - 'vacation': ลาพักผ่อนประจำปี (สิทธิ์เริ่มต้น 10 วันทำการ + วันสะสม)
 * - 'maternity': ลาคลอดบุตร (สิทธิ์ 90 วัน)
 * - 'ordination': ลาอุปสมบทหรือไปประกอบพิธีฮัจญ์
 * - 'other': การลาประเภทอื่นๆ
 */
export type LeaveTypeId = 'sick' | 'business' | 'vacation' | 'maternity' | 'ordination' | 'other';

/**
 * บทบาทผู้ใช้งานระบบ (User Roles)
 * - 'admin': ผู้ดูแลระบบ (สามารถบันทึก, แก้ไข, ลบข้อมูล, จัดการบุคลากร และดูภาพรวมได้)
 * - 'staff': บุคลากรทั่วไป (ดูปฏิทินวันลา และตรวจสอบสิทธิ์วันลาคงเหลือของตนเอง)
 */
export type UserRole = 'admin' | 'staff';

/**
 * โครงสร้างการตั้งค่าประเภทการลา (Configuration for each Leave Type)
 */
export interface LeaveTypeConfig {
  id: LeaveTypeId;          // รหัสอ้างอิงประเภทการลา
  name: string;             // ชื่อเต็มภาษาไทย (เช่น "วันลาพักผ่อนประจำปี")
  shortName: string;        // ชื่อย่อสำหรับการแสดงผลบนป้าย (Badge)
  defaultQuota: number;     // โควตาวันลาเริ่มต้นตามระเบียบ
  color: {
    bg: string;             // คลาสสีพื้นหลัง (Tailwind CSS)
    text: string;           // คลาสสีตัวอักษร
    border: string;         // คลาสสีกรอบ
    badge: string;          // คลาสสีป้ายกำกับ
    dot: string;            // คลาสสีจุดสถานะ
  };
  description: string;      // คำอธิบายระเบียบการลา
}

/**
 * โครงสร้างข้อมูลบุคลากร (Staff Member Data Structure)
 */
export interface Staff {
  id: string;                               // รหัสเฉพาะของบุคลากร (เช่น staff-1, staff-2)
  name: string;                             // ชื่อ - สกุล
  position: string;                         // ตำแหน่งทางราชการ (เช่น นักวิชาการสหกรณ์, เจ้าพนักงานธุรการ)
  department: string;                       // กลุ่มงาน/ฝ่ายที่สังกัด
  quotas: Record<string, number>;           // โควตาวันลาแต่ละประเภท (leaveTypeId -> จำนวนวัน)
  carriedOverVacationDays?: number;         // วันลาพักผ่อนสะสมยกมาจากปีงบประมาณก่อนหน้า
  notes?: string;                           // บันทึกช่วยจำเพิ่มเติม
  empId?: string;                           // รหัสประจำตัวเจ้าหน้าที่
  phone?: string;                           // เบอร์โทรศัพท์ติดต่อ
  startDate?: string;                       // วันที่เริ่มบรรจุ/เข้าปฏิบัติงาน
}

/**
 * ช่วงเวลาการลาในแต่ละวัน (Leave Period)
 * - 'full': ลาเต็มวัน (1 วัน)
 * - 'morning': ลาครึ่งวันเช้า (0.5 วัน)
 * - 'afternoon': ลาครึ่งวันบ่าย (0.5 วัน)
 */
export type LeavePeriod = 'full' | 'morning' | 'afternoon';

/**
 * โครงสร้างข้อมูลรายการบันทึกการลา (Leave Record Data Structure)
 */
export interface LeaveRecord {
  id: string;               // รหัสเฉพาะของรายการบันทึก (เช่น rec-1790580360544)
  staffId: string;          // รหัสบุคลากรที่ขอลา (อ้างอิง Staff.id)
  leaveTypeId: LeaveTypeId; // ประเภทการลา
  startDate: string;        // วันที่เริ่มลา (รูปแบบ YYYY-MM-DD สากล)
  endDate: string;          // วันที่สิ้นสุดการลา (รูปแบบ YYYY-MM-DD สากล)
  period: LeavePeriod;      // ช่วงเวลาการลา (เต็มวัน / ครึ่งวัน)
  daysCount: number;        // จำนวนวันลาสุทธิที่คำนวณได้ (เช่น 0.5, 1, 2.5 วัน)
  skipWeekends: boolean;    // ตัวเลือกไม่นับรวมวันหยุดเสาร์-อาทิตย์ และวันหยุดราชการ
  reason: string;           // เหตุผลการลา หรือหมายเหตุ
  status: 'approved' | 'pending' | 'rejected'; // สถานะการอนุมัติ
  createdAt: string;        // เวลาที่บันทึกข้อมูล (รูปแบบ ISO String)
}

/**
 * โครงสร้างข้อมูลสรุปยอดวันลาคงเหลือของบุคลากร (Staff Leave Summary)
 * ใช้สำหรับการประมวลผล สรุปรายบุคคล และการส่งออกรายงาน Excel/CSV
 */
export interface StaffLeaveSummary {
  staff: Staff;                             // ข้อมูลบุคลากร
  usedByType: Record<string, number>;       // จำนวนวันที่ใช้ไปแล้วแยกตามประเภท
  remainingByType: Record<string, number>;  // จำนวนวันคงเหลือแยกตามประเภท
  quotas: Record<string, number>;           // สิทธิ์โควตาทั้งหมดที่ได้รับ (รวมวันสะสมยกมา)
  totalQuota: number;                       // ยอดรวมโควตาทุกประเภท
  totalUsed: number;                        // ยอดรวมการใช้วันลาทุกประเภท
  totalRemaining: number;                   // ยอดรวมวันคงเหลือทุกประเภท
  carriedOverVacationDays?: number;         // วันลาพักผ่อนสะสมยกมา
}
