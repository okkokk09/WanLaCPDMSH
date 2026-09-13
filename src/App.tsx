import React, { useState, useEffect } from 'react';
import type { Staff, LeaveRecord } from './types';
import { Navbar } from './components/Navbar';
import type { ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LeaveRecordView } from './components/LeaveRecordView';
import { CalendarView } from './components/CalendarView';
import { StaffManagementView } from './components/StaffManagementView';
import { LeaveBalanceView } from './components/LeaveBalanceView';
import { LeaveFormModal } from './components/LeaveFormModal';
import { StaffModal } from './components/StaffModal';
import {
  getStaffList,
  saveStaffList,
  getLeaveRecords,
  saveLeaveRecords,
} from './utils/storage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
  const [defaultLeaveDate, setDefaultLeaveDate] = useState<string | undefined>(undefined);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Load initial data from localStorage
  const loadData = () => {
    setStaffList(getStaffList());
    setRecords(getLeaveRecords());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Leave Record Handlers
  const handleOpenNewLeave = () => {
    setEditingRecord(null);
    setDefaultLeaveDate(undefined);
    setIsLeaveModalOpen(true);
  };

  const handleOpenNewLeaveOnDate = (dateStr: string) => {
    setEditingRecord(null);
    setDefaultLeaveDate(dateStr);
    setIsLeaveModalOpen(true);
  };

  const handleSaveLeaveRecord = (data: Omit<LeaveRecord, 'id' | 'createdAt'>) => {
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

  const handleDeleteLeaveRecord = (recordId: string) => {
    const updated = records.filter((r) => r.id !== recordId);
    saveLeaveRecords(updated);
    setRecords(updated);
  };

  // Staff Handlers
  const handleOpenNewStaff = () => {
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = (staffData: Staff) => {
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

  const handleDeleteStaff = (staffId: string) => {
    const updatedStaff = staffList.filter((s) => s.id !== staffId);
    const updatedRecords = records.filter((r) => r.staffId !== staffId);
    saveStaffList(updatedStaff);
    saveLeaveRecords(updatedRecords);
    setStaffList(updatedStaff);
    setRecords(updatedRecords);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewLeave={handleOpenNewLeave}
        onDataRefresh={loadData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            staffList={staffList}
            records={records}
            onOpenNewLeave={handleOpenNewLeave}
            onOpenNewStaff={handleOpenNewStaff}
            onNavigateTab={setActiveTab}
            onDeleteRecord={handleDeleteLeaveRecord}
          />
        )}

        {activeTab === 'records' && (
          <LeaveRecordView
            staffList={staffList}
            records={records}
            onOpenNewLeave={handleOpenNewLeave}
            onDeleteRecord={handleDeleteLeaveRecord}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            staffList={staffList}
            records={records}
            onOpenNewLeaveOnDate={handleOpenNewLeaveOnDate}
            onDeleteRecord={handleDeleteLeaveRecord}
          />
        )}

        {activeTab === 'staff' && (
          <StaffManagementView
            staffList={staffList}
            records={records}
            onOpenNewStaff={handleOpenNewStaff}
            onEditStaff={handleEditStaff}
            onDeleteStaff={handleDeleteStaff}
          />
        )}

        {activeTab === 'balance' && (
          <LeaveBalanceView
            staffList={staffList}
            records={records}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ระบบบันทึกวันลา (Leave Management System) • สำหรับผู้ดูแลระบบ</span>
          <span>รองรับการบันทึกแบบออฟไลน์ พร้อมสำรองข้อมูลและส่งออก Excel</span>
        </div>
      </footer>

      {/* Leave Form Modal */}
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

      {/* Staff Management Modal */}
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
    </div>
  );
};

export default App;
