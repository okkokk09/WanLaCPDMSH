import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Users,
  PieChart,
  PlusCircle,
  Download,
  Upload,
  RotateCcw,
  Menu,
  X,
  Sun,
  Moon,
  ShieldCheck,
  KeyRound,
  LogOut,
  UserCheck,
} from 'lucide-react';
import type { UserRole, Staff } from '../types';
import { exportDataToJson, importDataFromJson, resetAllData } from '../utils/storage';

export type ActiveTab = 'dashboard' | 'records' | 'calendar' | 'staff' | 'balance' | 'my-leave';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNewLeave: () => void;
  onDataRefresh: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  userRole: UserRole;
  onOpenAdminLogin: () => void;
  onSwitchToStaff: () => void;
  staffList: Staff[];
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenNewLeave,
  onDataRefresh,
  theme,
  onToggleTheme,
  userRole,
  onOpenAdminLogin,
  onSwitchToStaff,
  staffList,
  selectedStaffId,
  onSelectStaff,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  const isAdmin = userRole === 'admin';

  // Tabs based on user role
  const navItems = isAdmin
    ? [
        { id: 'dashboard' as ActiveTab, label: 'แดชบอร์ด', icon: LayoutDashboard },
        { id: 'records' as ActiveTab, label: 'บันทึกการลา', icon: FileText },
        { id: 'calendar' as ActiveTab, label: 'ปฏิทินวันลา', icon: CalendarDays },
        { id: 'staff' as ActiveTab, label: 'จัดการบุคลากร', icon: Users },
        { id: 'balance' as ActiveTab, label: 'สรุปวันลาคงเหลือ', icon: PieChart },
      ]
    : [
        { id: 'calendar' as ActiveTab, label: 'ปฏิทินวันลา', icon: CalendarDays },
        { id: 'my-leave' as ActiveTab, label: 'วันลาของฉัน', icon: UserCheck },
      ];

  const handleResetData = () => {
    if (
      window.confirm(
        'คุณต้องการรีเซ็ตข้อมูลเป็นข้อมูลตัวอย่างเริ่มต้นใช่หรือไม่? (ข้อมูลที่บันทึกไว้จะถูกแทนที่)'
      )
    ) {
      resetAllData();
      onDataRefresh();
      setShowDataMenu(false);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataFromJson(content);
      if (res.success) {
        alert('นำเข้าข้อมูลสำเร็จ!');
        onDataRefresh();
      } else {
        alert(res.message);
      }
      setShowDataMenu(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  ระบบบันทึกวันลา
                </h1>
                {isAdmin ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                    <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    ผู้ดูแลระบบ
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    บุคลากรทั่วไป
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                สำนักงานสหกรณ์จังหวัดแม่ฮ่องสอน
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Theme Toggle Button (Light/Dark) */}
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200"
              title={theme === 'dark' ? 'คลิกเพื่อเปลี่ยนเป็นโหมดสว่าง' : 'คลิกเพื่อเปลี่ยนเป็นโหมดมืด'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0 animate-in spin-in-180 duration-200" />
                  <span className="hidden lg:inline text-amber-300 font-medium">ธีมสว่าง</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0 animate-in spin-in-180 duration-200" />
                  <span className="hidden lg:inline text-indigo-700 font-medium">ธีมมืด</span>
                </>
              )}
            </button>

            {/* Role-Specific Controls */}
            {isAdmin ? (
              <>
                {/* Switch to Staff Mode Button */}
                <button
                  onClick={onSwitchToStaff}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  title="สลับเป็นโหมดบุคลากรทั่วไป (ดูปฏิทินและวันลาส่วนบุคคล)"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden xl:inline">โหมดบุคลากร</span>
                </button>

                {/* Quick Record Button (Admin Only) */}
                <button
                  onClick={onOpenNewLeave}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>บันทึกการลา</span>
                </button>

                {/* Data Management Dropdown (Admin Only) */}
                <div className="relative">
                  <button
                    onClick={() => setShowDataMenu(!showDataMenu)}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="จัดการข้อมูลและสำรอง"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {showDataMenu && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                      onMouseLeave={() => setShowDataMenu(false)}
                    >
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        สำรองและกู้คืนข้อมูล
                      </div>
                      <button
                        onClick={() => {
                          exportDataToJson();
                          setShowDataMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>ส่งออกข้อมูลสำรอง (JSON)</span>
                      </button>

                      <label className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left cursor-pointer">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>นำเข้าข้อมูลสำรอง (JSON)</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportJson}
                          className="hidden"
                        />
                      </label>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        onClick={handleResetData}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-500" />
                        <span>รีเซ็ตเป็นข้อมูลตัวอย่าง</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Staff Selector Dropdown (Staff Mode) */}
                <div className="hidden lg:flex items-center">
                  <select
                    value={selectedStaffId || ''}
                    onChange={(e) => {
                      onSelectStaff(e.target.value);
                      if (activeTab !== 'my-leave' && activeTab !== 'calendar') {
                        onTabChange('my-leave');
                      }
                    }}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[170px] truncate"
                    title="เลือกชื่อของคุณเพื่อดูวันลาส่วนตัว"
                  >
                    <option value="">
                      👤 ยังไม่เลือก (ไม่มี)
                    </option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Admin Login Button */}
                <button
                  onClick={onOpenAdminLogin}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer shadow-2xs"
                  title="เข้าสู่ระบบผู้ดูแลระบบ (สำหรับเจ้าหน้าที่ดูแลระบบ)"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>เข้าสู่ระบบผู้ดูแล</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu & Theme Button */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-600" />
              )}
            </button>

            {isAdmin && (
              <button
                onClick={onOpenNewLeave}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer"
                title="บันทึกการลา"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-2">
          {/* Mobile Role Status & Switch */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              สถานะ: {isAdmin ? '🛡️ ผู้ดูแลระบบ' : '👤 บุคลากรทั่วไป'}
            </span>
            {isAdmin ? (
              <button
                onClick={() => {
                  onSwitchToStaff();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
              >
                สลับเป็นบุคลากรทั่วไป
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminLogin();
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                เข้าสู่ระบบผู้ดูแล
              </button>
            )}
          </div>

          {/* Mobile Staff Selector if staff mode */}
          {!isAdmin && (
            <div className="py-1">
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                เลือกชื่อของท่าน:
              </label>
              <select
                value={selectedStaffId || ''}
                onChange={(e) => {
                  onSelectStaff(e.target.value);
                  onTabChange('my-leave');
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="">
                  -- ยังไม่เลือกบุคลากร (ไม่มี) --
                </option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab Navigation items */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin backup actions */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  exportDataToJson();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                สำรอง JSON
              </button>
              <button
                onClick={() => {
                  handleResetData();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-600 dark:text-rose-400"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                รีเซ็ตข้อมูล
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
