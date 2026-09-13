export type LeaveTypeId = 'sick' | 'business' | 'vacation' | 'maternity' | 'ordination' | 'other';

export interface LeaveTypeConfig {
  id: LeaveTypeId;
  name: string;
  shortName: string;
  defaultQuota: number;
  color: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    dot: string;
  };
  description: string;
}

export interface Staff {
  id: string;
  name: string;
  position: string;
  department: string;
  quotas: Record<string, number>; // leaveTypeId -> days quota
  notes?: string;
  empId?: string;
  phone?: string;
  startDate?: string;
}

export type LeavePeriod = 'full' | 'morning' | 'afternoon';

export interface LeaveRecord {
  id: string;
  staffId: string;
  leaveTypeId: LeaveTypeId;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  period: LeavePeriod; // 'full' | 'morning' | 'afternoon'
  daysCount: number;  // e.g. 0.5, 1, 2...
  skipWeekends: boolean;
  reason: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string; // ISO date
}

export interface StaffLeaveSummary {
  staff: Staff;
  usedByType: Record<string, number>;
  remainingByType: Record<string, number>;
  quotas: Record<string, number>;
  totalQuota: number;
  totalUsed: number;
  totalRemaining: number;
}
