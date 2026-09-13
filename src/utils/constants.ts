import type { LeaveTypeConfig, LeaveTypeId } from '../types';

export const LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    id: 'sick',
    name: 'ลาป่วย',
    shortName: 'ป่วย',
    defaultQuota: 0,
    color: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800 border-red-300',
      dot: 'bg-red-500',
    },
    description: 'การลาเนื่องจากอาการเจ็บป่วยหรือต้องรักษาตัว',
  },
  {
    id: 'business',
    name: 'ลากิจส่วนตัว',
    shortName: 'กิจ',
    defaultQuota: 0,
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      dot: 'bg-blue-500',
    },
    description: 'การลาเพื่อไปทำธุระจำเป็นส่วนตัว',
  },
  {
    id: 'vacation',
    name: 'ลาพักผ่อน',
    shortName: 'พักผ่อน',
    defaultQuota: 0,
    color: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500',
    },
    description: 'การลาหยุดพักผ่อนประจำปี',
  },
  {
    id: 'maternity',
    name: 'ลาคลอดบุตร',
    shortName: 'คลอด',
    defaultQuota: 0,
    color: {
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-200',
      badge: 'bg-pink-100 text-pink-800 border-pink-300',
      dot: 'bg-pink-500',
    },
    description: 'การลาเพื่อคลอดบุตรและดูแลบุตรแรกเกิด',
  },
  {
    id: 'ordination',
    name: 'ลาอุปสมบท / พิธีทางศาสนา',
    shortName: 'บวช',
    defaultQuota: 0,
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
    },
    description: 'การลาเพื่อเข้าพิธีอุปสมบทหรือประกอบพิธีทางศาสนา',
  },
  {
    id: 'other',
    name: 'ลาอื่นๆ',
    shortName: 'อื่นๆ',
    defaultQuota: 0,
    color: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      dot: 'bg-slate-500',
    },
    description: 'การลาประเภทอื่นๆ เช่น ลาอบรม สัมมนา',
  },
];

export const LEAVE_TYPE_MAP = new Map<LeaveTypeId, LeaveTypeConfig>(
  LEAVE_TYPES.map((t) => [t.id, t])
);

export const WORK_GROUPS = [
  'สหกรณ์จังหวัด',
  'ฝ่ายบริหารทั่วไป',
  'กลุ่มจัดตั้งและส่งเสริมสหกรณ์',
  'กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์',
  'กลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์',
  'กลุ่มตรวจการสหกรณ์',
  'กลุ่มส่งเสริมสหกรณ์ 1',
  'กลุ่มส่งเสริมสหกรณ์ 2',
  'กลุ่มส่งเสริมสหกรณ์ 3',
  'กลุ่มส่งเสริมสหกรณ์ 4',
];

export const DEPARTMENTS = WORK_GROUPS;

export interface GroupColorConfig {
  bg: string;
  text: string;
  border: string;
  badge: string;
}

export const WORK_GROUP_COLORS: Record<string, GroupColorConfig> = {
  'สหกรณ์จังหวัด': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  'ฝ่ายบริหารทั่วไป': {
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
  },
  'กลุ่มจัดตั้งและส่งเสริมสหกรณ์': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  'กลุ่มส่งเสริมและพัฒนาธุรกิจสหกรณ์': {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  'กลุ่มส่งเสริมและพัฒนาการบริหารการจัดการสหกรณ์': {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
  },
  'กลุ่มตรวจการสหกรณ์': {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
  },
  'กลุ่มส่งเสริมสหกรณ์ 1': {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  'กลุ่มส่งเสริมสหกรณ์ 2': {
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-700',
  },
  'กลุ่มส่งเสริมสหกรณ์ 3': {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
  },
  'กลุ่มส่งเสริมสหกรณ์ 4': {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
  },
};

export function getWorkGroupColor(deptName: string): GroupColorConfig {
  return (
    WORK_GROUP_COLORS[deptName] || {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-700',
    }
  );
}
