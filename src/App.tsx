import React, { useState, useEffect, useMemo } from 'react';
import type { Staff, LeaveRecord, UserRole } from './types';
import { Navbar } from './components/Navbar';
import type { ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LeaveRecordView } from './components/LeaveRecordView';
import { CalendarView } from './components/CalendarView';
import { StaffManagementView } from './components/StaffManagementView';
import { LeaveBalanceView } from './components/LeaveBalanceView';
import { MyLeaveView } from './components/MyLeaveView';
import { LeaveFormModal } from './components/LeaveFormModal';
import { StaffModal } from './components/StaffModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { PrintLeaveModal } from './components/PrintLeaveModal';
import {
  getStaffList,
  saveStaffList,
  getLeaveRecords,
  saveLeaveRecords,
  getUserRole,
  setUserRole,
  getMyStaffId,
  setMyStaffId,
  syncRecordsFromGitHub,
} from './utils/storage';
import { initStreamlitBridge, setStreamlitFrameHeight } from './utils/streamlitBridge';
import { getCurrentFiscalYear, getAvailableFiscalYears } from './utils/dateUtils';

/**
 * คอมโพเนนต์หลักของระบบ (App Component)
 * ทำหน้าที่บริหารจัดการ State ส่วนกลางของแอปพลิเคชัน:
 * - สิทธิ์ผู้ใช้งาน (UserRole: 'admin' หรือ 'staff')
 * - ปีงบประมาณที่เลือกแสดงผล (Fiscal Year: พ.ศ. 2570, 2569, หรือ 'all')
 * - แท็บเมนูที่กำลังเปิด (ActiveTab)
 * - รายชื่อบุคลากร (StaffList) และประวัติการลา (Records)
 * - ธีมสี (Light / Dark Mode)
 * - การเชื่อมต่อรับส่งข้อมูลกับ Streamlit Backend & GitHub Sync
 */
export const App: React.FC = () => {
  // สถานะสิทธิ์ผู้ใช้งาน ('admin' | 'staff')
  const [userRole, setUserRoleState] = useState<UserRole>(() => getUserRole());
  // รหัสบุคลากรของตนเอง (สำหรับกรองแสดงข้อมูลเฉพาะบุคคล)
  const [myStaffId, setMyStaffIdState] = useState<string | null>(null);
  // สถานะเปิด/ปิด Modal เข้าสู่ระบบผู้ดูแลระบบ
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // สถานะปีงบประมาณ พ.ศ. (เช่น 2570, 2569 หรือ 'all' สำหรับดูทั้งหมด)
  const currentFiscalYear = getCurrentFiscalYear();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | 'all'>(currentFiscalYear);

  // แท็บเมนูเริ่มต้น: หากเป็นแอดมินเปิดหน้าภาพรวม (Dashboard), หากเป็นเจ้าหน้าที่เปิดหน้าปฏิทิน (Calendar)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const role = getUserRole();
    return role === 'admin' ? 'dashboard' : 'calendar';
  });

  // ข้อมูลบุคลากรและประวัติการลาทั้งหมด
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);

  // คำนวณรายการปีงบประมาณที่มีข้อมูลจริงในระบบแบบไดนามิก (สำหรับ Dropdown สลับปีงบประมาณ)
  const availableFiscalYears = useMemo(() => {
    return getAvailableFiscalYears(records);
  }, [records]);

  // สถานะสำหรับหน้าต่างป็อปอัป (Modal) บันทึกการลา
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
  const [defaultLeaveDate, setDefaultLeaveDate] = useState<string | undefined>(undefined);

  // สถานะสำหรับหน้าต่างป็อปอัปจัดการข้อมูลบุคลากร
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // สถานะรายการลาที่เลือกพิมพ์ใบลา (Print Leave Document)
  const [printingRecord, setPrintingRecord] = useState<LeaveRecord | null>(null);

  // สถานะธีมสีระบบ ('light' หรือ 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('leave_system_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  // ซิงก์คลาส dark เข้ากับ document.documentElement เมื่อสลับธีม
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('leave_system_theme', theme);
    } catch {
      // ดักจับข้อผิดพลาดกรณีเบราว์เซอร์ไม่อนุญาตเข้าถึง localStorage
    }
  }, [theme]);

  // ฟังก์ชันสลับธีมสี
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // โหลดข้อมูลบุคลากรและประวัติการลาเริ่มต้นจาก localStorage
  const loadData = () => {
    const loadedStaff = getStaffList();
    setStaffList(loadedStaff);
    setRecords(getLeaveRecords());

    // ตรวจสอบความถูกต้องของ myStaffId หากไม่มีในรายชื่อแล้วให้ล้างค่าออก
    const currentMyId = getMyStaffId();
    if (currentMyId && !loadedStaff.some((s) => s.id === currentMyId)) {
      setMyStaffIdState(null);
    }
  };

  // ดำเนินการเมื่อ Component โหลดครั้งแรก (Mount)
  useEffect(() => {
    loadData();

    // เริ่มต้นเชื่อมต่อ Streamlit Bridge สำหรับรับข้อมูลใหม่เมื่อ Streamlit สั่ง Render
    const cleanupStreamlit = initStreamlitBridge((args) => {
      if (args.records && Array.isArray(args.records)) {
        setRecords(args.records);
        saveLeaveRecords(args.records, false);
      }
    });

    // ดึงข้อมูลประวัติการลาล่าสุดจาก GitHub Repository ในพื้นหลัง
    syncRecordsFromGitHub().then((synced) => {
      if (synced && synced.length > 0) {
        setRecords(synced);
      }
    });

    return () => {
      cleanupStreamlit();
    };
  }, []);

  // ปรับความสูงของ Streamlit iframe อัตโนมัติเมื่อเนื้อหาหรือแท็บเปลี่ยนแปลง
  useEffect(() => {
    const timer = setTimeout(() => {
      setStreamlitFrameHeight();
    }, 150);
    return () => clearTimeout(timer);
  }, [activeTab, records, staffList]);

  // ตรวจสอบความปลอดภัยตามสิทธิ์: หากเป็นเจ้าหน้าที่ทั่วไปไม่อนุญาตให้เปิดแท็บของผู้ดูแลระบบ
  useEffect(() => {
    if (userRole === 'staff') {
      if (activeTab !== 'calendar' && activeTab !== 'my-leave') {
        setActiveTab('calendar');
      }
    }
  }, [userRole, activeTab]);

  // ตัวจัดการการเลือกบุคลากร (สำหรับกรองแสดงข้อมูลเฉพาะคน)
  const handleSelectStaff = (staffId: string) => {
    const nextId = staffId && staffId !== 'all' ? staffId : null;
    setMyStaffIdState(nextId);
    setMyStaffId(nextId);
  };

  // สลับไปยังโหมดเจ้าหน้าที่ทั่วไป (Staff Role)
  const handleSwitchToStaff = () => {
    setUserRoleState('staff');
    setUserRole('staff');
    setMyStaffIdState(null);
    setActiveTab('calendar');
  };

  // เมื่อเข้าสู่ระบบผู้ดูแลระบบสำเร็จ (Admin Login Success)
  const handleAdminLoginSuccess = () => {
    setUserRoleState('admin');
    setUserRole('admin');
    setActiveTab('dashboard');
  };

  // -------------------------------------------------------------
  // ฟังก์ชันจัดการรายการลา (Leave Record Handlers - สิทธิ์ Admin)
  // -------------------------------------------------------------
  // เปิดฟอร์มบันทึกการลาใหม่
  const handleOpenNewLeave = () => {
    if (userRole !== 'admin') return;
    setEditingRecord(null);
    setDefaultLeaveDate(undefined);
    setIsLeaveModalOpen(true);
  };

  // เปิดฟอร์มบันทึกการลาใหม่โดยระบุวันที่ล่วงหน้าจากการคลิกบนปฏิทิน
  const handleOpenNewLeaveOnDate = (dateStr: string) => {
    if (userRole !== 'admin') return;
    setEditingRecord(null);
    setDefaultLeaveDate(dateStr);
    setIsLeaveModalOpen(true);
  };

  // บันทึกรายการลา (เพิ่มใหม่หรือแก้ไขรายการเดิม)
  const handleSaveLeaveRecord = (data: Omit<LeaveRecord, 'id' | 'createdAt'>) => {
    if (userRole !== 'admin') return;
    let updated: LeaveRecord[];
    if (editingRecord) {
      updated = records.map((r) =>
        r.id === editingRecord.id ? { ...data, id: r.id, createdAt: r.createdAt } : r
      );
    } else {
      const newRecord: LeaveRecord = {
        ...data,
        id: `rec-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updated = [newRecord, ...records];
    }
    saveLeaveRecords(updated);
    setRecords(updated);
  };

  // ลบรายการลา
  const handleDeleteLeaveRecord = (recordId: string) => {
    if (userRole !== 'admin') return;
    const updated = records.filter((r) => r.id !== recordId);
    saveLeaveRecords(updated);
    setRecords(updated);
  };

  // -------------------------------------------------------------
  // ฟังก์ชันจัดการบุคลากร (Staff Handlers - สิทธิ์ Admin)
  // -------------------------------------------------------------
  // เปิดฟอร์มเพิ่มบุคลากรใหม่
  const handleOpenNewStaff = () => {
    if (userRole !== 'admin') return;
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  // เปิดฟอร์มแก้ไขข้อมูลบุคลากร
  const handleEditStaff = (staff: Staff) => {
    if (userRole !== 'admin') return;
    setEditingStaff(staff);
    setIsStaffModalOpen(true);
  };

  // บันทึกข้อมูลบุคลากร (เพิ่มใหม่หรือแก้ไข)
  const handleSaveStaff = (staffData: Staff) => {
    if (userRole !== 'admin') return;
    let updated: Staff[];
    const exists = staffList.some((s) => s.id === staffData.id);
    if (exists) {
      updated = staffList.map((s) => (s.id === staffData.id ? staffData : s));
    } else {
      updated = [...staffList, staffData];
    }
    saveStaffList(updated);
    setStaffList(updated);
  };

  // ลบบุคลากรออกจากระบบ (รวมถึงลบประวัติการลาของบุคลากรท่านนั้นด้วย)
  const handleDeleteStaff = (staffId: string) => {
    if (userRole !== 'admin') return;
    const updatedStaff = staffList.filter((s) => s.id !== staffId);
    const updatedRecords = records.filter((r) => r.staffId !== staffId);
    saveStaffList(updatedStaff);
    saveLeaveRecords(updatedRecords);
    setStaffList(updatedStaff);
    setRecords(updatedRecords);
  };

  const isAdmin = userRole === 'admin';

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewLeave={handleOpenNewLeave}
        onDataRefresh={loadData}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        userRole={userRole}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        onSwitchToStaff={handleSwitchToStaff}
        staffList={staffList}
        selectedStaffId={myStaffId}
        onSelectStaff={handleSelectStaff}
        selectedFiscalYear={selectedFiscalYear}
        availableFiscalYears={availableFiscalYears}
        onSelectFiscalYear={setSelectedFiscalYear}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        {/* Admin Tabs */}
        {isAdmin && activeTab === 'dashboard' && (
          <DashboardView
            staffList={staffList}
            records={records}
            onOpenNewLeave={handleOpenNewLeave}
            onOpenNewStaff={handleOpenNewStaff}
            onNavigateTab={setActiveTab}
            onDeleteRecord={handleDeleteLeaveRecord}
            onOpenPrintLeave={setPrintingRecord}
            selectedFiscalYear={selectedFiscalYear}
            availableFiscalYears={availableFiscalYears}
            onSelectFiscalYear={setSelectedFiscalYear}
          />
        )}

        {isAdmin && activeTab === 'records' && (
          <LeaveRecordView
            staffList={staffList}
            records={records}
            onOpenNewLeave={handleOpenNewLeave}
            onDeleteRecord={handleDeleteLeaveRecord}
            onOpenPrintLeave={setPrintingRecord}
            selectedFiscalYear={selectedFiscalYear}
            availableFiscalYears={availableFiscalYears}
            onSelectFiscalYear={setSelectedFiscalYear}
          />
        )}

        {isAdmin && activeTab === 'staff' && (
          <StaffManagementView
            staffList={staffList}
            records={records}
            onOpenNewStaff={handleOpenNewStaff}
            onEditStaff={handleEditStaff}
            onDeleteStaff={handleDeleteStaff}
            onUpdateStaffList={setStaffList}
          />
        )}

        {isAdmin && activeTab === 'balance' && (
          <LeaveBalanceView
            staffList={staffList}
            records={records}
            selectedFiscalYear={selectedFiscalYear}
            availableFiscalYears={availableFiscalYears}
            onSelectFiscalYear={setSelectedFiscalYear}
          />
        )}

        {/* Common Tab: Calendar (Available to both roles, with permission flags) */}
        {activeTab === 'calendar' && (
          <CalendarView
            staffList={staffList}
            records={records}
            onOpenNewLeaveOnDate={isAdmin ? handleOpenNewLeaveOnDate : undefined}
            onDeleteRecord={isAdmin ? handleDeleteLeaveRecord : undefined}
            onOpenPrintLeave={setPrintingRecord}
            isAdmin={isAdmin}
            selectedStaffId={myStaffId}
            onSelectStaff={handleSelectStaff}
          />
        )}

        {/* Staff Tab: My Leave (Available to staff role) */}
        {activeTab === 'my-leave' && (
          <MyLeaveView
            staffList={staffList}
            records={records}
            selectedStaffId={myStaffId}
            onSelectStaff={handleSelectStaff}
            onOpenPrintLeave={setPrintingRecord}
            selectedFiscalYear={selectedFiscalYear}
            availableFiscalYears={availableFiscalYears}
            onSelectFiscalYear={setSelectedFiscalYear}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 shrink-0 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400 dark:text-slate-500 no-print transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
          <span>
            ระบบบันทึกวันลา (Leave Management System) • {isAdmin ? 'โหมดผู้ดูแลระบบ' : 'โหมดบุคลากรทั่วไป'}
          </span>
          <span>
            {isAdmin
              ? 'รองรับการบันทึกแบบออฟไลน์ พร้อมสำรองข้อมูลและส่งออก Excel'
              : 'ตรวจสอบสิทธิ์วันลาและปฏิทินวันลา'}
          </span>
        </div>
      </footer>

      {/* Modals for Admin */}
      {isAdmin && (
        <>
          <LeaveFormModal
            isOpen={isLeaveModalOpen}
            onClose={() => {
              setIsLeaveModalOpen(false);
              setEditingRecord(null);
              setDefaultLeaveDate(undefined);
            }}
            onSave={handleSaveLeaveRecord}
            staffList={staffList}
            existingRecords={records}
            initialRecord={editingRecord}
            defaultDate={defaultLeaveDate}
          />

          <StaffModal
            isOpen={isStaffModalOpen}
            onClose={() => {
              setIsStaffModalOpen(false);
              setEditingStaff(null);
            }}
            onSave={handleSaveStaff}
            initialStaff={editingStaff}
            existingStaffList={staffList}
          />
        </>
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Modal พิมพ์ใบลามาตรฐานสำนักงาน (Print Leave Document Modal) */}
      <PrintLeaveModal
        isOpen={!!printingRecord}
        onClose={() => setPrintingRecord(null)}
        record={printingRecord}
        staff={printingRecord ? staffList.find((s) => s.id === printingRecord.staffId) || null : null}
        records={records}
        staffList={staffList}
      />
    </div>
  );
};

export default App;
