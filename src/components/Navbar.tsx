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
} from 'lucide-react';
import { exportDataToJson, importDataFromJson, resetAllData } from '../utils/storage';

export type ActiveTab = 'dashboard' | 'records' | 'calendar' | 'staff' | 'balance';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNewLeave: () => void;
  onDataRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenNewLeave,
  onDataRefresh,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'แดชบอร์ด', icon: LayoutDashboard },
    { id: 'records' as ActiveTab, label: 'บันทึกการลา', icon: FileText },
    { id: 'calendar' as ActiveTab, label: 'ปฏิทินวันลา', icon: CalendarDays },
    { id: 'staff' as ActiveTab, label: 'จัดการบุคลากร', icon: Users },
    { id: 'balance' as ActiveTab, label: 'สรุปวันลาคงเหลือ', icon: PieChart },
  ];

  const handleResetData = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลเป็นข้อมูลตัวอย่างเริ่มต้นใช่หรือไม่? (ข้อมูลที่บันทึกไว้จะถูกแทนที่)')) {
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">ระบบบันทึกวันลา</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Leave Management System</p>
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
                      ? 'bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Quick Record Button */}
            <button
              onClick={onOpenNewLeave}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>บันทึกการลา</span>
            </button>

            {/* Data Management Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="จัดการข้อมูลและสำรอง"
              >
                <Download className="w-4 h-4" />
              </button>

              {showDataMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowDataMenu(false)}
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    สำรองและกู้คืนข้อมูล
                  </div>
                  <button
                    onClick={() => {
                      exportDataToJson();
                      setShowDataMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>ส่งออกข้อมูลสำรอง (JSON)</span>
                  </button>

                  <label className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left cursor-pointer">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>นำเข้าข้อมูลสำรอง (JSON)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJson}
                      className="hidden"
                    />
                  </label>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={handleResetData}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-rose-600 hover:bg-rose-50 text-left cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-500" />
                    <span>รีเซ็ตเป็นข้อมูลตัวอย่าง</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={onOpenNewLeave}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
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
                  isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                exportDataToJson();
                setMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              สำรอง JSON
            </button>
            <button
              onClick={() => {
                handleResetData();
                setMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-rose-200 rounded-lg text-rose-600"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีเซ็ตข้อมูล
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
