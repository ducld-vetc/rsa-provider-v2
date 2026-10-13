/**
 * ShiftMonthlySchedule.tsx
 * Route: /partner/shift-schedule & /shift-monthly-schedule
 * Thiết kế giao diện chuẩn 100% theo màn /employee-management/shifts trong rsa-provider-portal
 * Bao gồm 3 Tab:
 *   1. Lịch tháng (MonthlyCalendar - Sidebar kéo thả tài xế, Ngày/Tuần/Tháng, DayView, MonthGrid, Footer KPI)
 *   2. Tổng quan (Overview - 6 Thẻ KPI, Lọc khoảng ngày, Danh sách ca thiếu nhân sự + nút Thêm NV)
 *   3. Dạng bảng (ShiftTableView - Khối TRA CỨU, Table danh sách phân ca, Tag trạng thái, Modal chi tiết/sửa/hủy)
 */
import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Search,
  StopCircle,
  Trash2,
  User,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  Truck,
  Wrench,
  ShieldCheck,
  Filter,
  LogIn,
  LogOut,
  Smartphone,
  Check,
  AlertCircle,
  Gauge,
  Camera,
} from 'lucide-react';
import {
  MOCK_STATIONS_FOR_SHIFT,
  MOCK_DRIVERS_BY_STATION,
  type ShiftDefinition,
  type DriverStationMockRecord,
} from '../data/shiftConfigMockData';
import { useShiftConfig } from '../context/ShiftConfigContext';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import { type PartnerPersona, VEHICLES, MASTER_TOOL_CATALOG, VEHICLE_TYPE_LABEL } from '../data/partnerRescueMockData';
import { CheckinModal, type ToolInspectionItem } from '../components/shift/CheckinModal';
import { CheckoutModal } from '../components/shift/CheckoutModal';
import { AppShiftSimulatorModal } from '../components/shift/AppShiftSimulatorModal';

// ─── Enums & Types theo rsa-provider-portal & FDD FL-M2-03 ───────────────────

export type ShiftStatus =
  | 'PLANNED'      // Đã lên lịch (tím)
  | 'IN_PROGRESS'  // Đang diễn ra (xanh dương)
  | 'COMPLETED'    // Đã hoàn thành (xanh lá)
  | 'CANCELLED'    // Đã hủy (đỏ)
  | 'PENDING';     // Đang chờ (cam)

export const shiftStatusLabels: Record<ShiftStatus, string> = {
  PLANNED: 'Đã lên lịch',
  IN_PROGRESS: 'Đang diễn ra',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
  PENDING: 'Đang chờ',
};

export const shiftStatusBadgeStyles: Record<ShiftStatus, string> = {
  PLANNED: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ─── Độ phủ ca (UI-11, BR-03) ────────────────────────────────────────────────

type StaffingState = 'UNDER' | 'OK' | 'FULL' | 'OVER';

function calcStaffingState(assigned: number, minStaff: number, maxStaff?: number): StaffingState {
  if (maxStaff != null && assigned > maxStaff) return 'OVER';
  if (maxStaff != null && assigned >= maxStaff) return 'FULL';
  if (assigned >= minStaff) return 'OK';
  return 'UNDER';
}

const staffingBadgeStyle: Record<StaffingState, string> = {
  UNDER: 'bg-rose-50 text-rose-700 border-rose-200',
  OK: 'bg-emerald-50 text-[#005d2d] border-emerald-200',
  FULL: 'bg-slate-100 text-slate-500 border-slate-300',
  OVER: 'bg-amber-50 text-amber-700 border-amber-200',
};

function staffingLabel(state: StaffingState, assigned: number, minStaff: number, maxStaff?: number): string {
  if (state === 'UNDER') return `Thiếu ${minStaff - assigned}`;
  if (state === 'OVER') return `Thừa ${assigned - maxStaff!}`;
  if (state === 'FULL') return 'Đã đầy';
  return 'Đủ';
}

export interface ShiftAssignmentItem {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  driverRole?: string;
  shiftConfigId: string;
  shiftName: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  staffRole?: string;
  note?: string;
  vehiclePlate?: string;
  vehicleType?: string;
  // Thông tin checkin app
  checkinAt?: string;
  checkoutAt?: string;
  startKm?: number;
  endKm?: number;
  toolCondition?: 'GOOD' | 'BROKEN' | 'MISSING';
  toolItems?: ToolInspectionItem[];
  checkinNote?: string;
  checkoutNote?: string;
}

export interface DragItemData {
  type: 'DRIVER' | 'ASSIGNMENT';
  driverId: string;
  driverName: string;
  assignmentId?: string;
  sourceDate?: string;
}

// ─── Helper ngày tháng chuẩn JS ──────────────────────────────────────────────

const pad2 = (n: number) => n.toString().padStart(2, '0');

const formatDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const isStrictPast = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // T2 = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

// ─── Component chính ShiftMonthlySchedule ────────────────────────────────────

const ShiftMonthlySchedule: React.FC = () => {
  const { shiftDefinitions } = useShiftConfig();
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);

  // Top Filter controls
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('partner-vetc');
  const [selectedStationId, setSelectedStationId] = useState<string>(MOCK_STATIONS_FOR_SHIFT[0].id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tab State: '1' Lịch tháng | '2' Tổng quan | '3' Dạng bảng
  const [activeTab, setActiveTab] = useState<'1' | '2' | '3'>('1');

  // Trạm hiện tại
  const currentStation = useMemo(
    () => MOCK_STATIONS_FOR_SHIFT.find((s) => s.id === selectedStationId) || MOCK_STATIONS_FOR_SHIFT[0],
    [selectedStationId]
  );

  // Danh sách tài xế theo trạm
  const stationDrivers = useMemo(() => {
    return MOCK_DRIVERS_BY_STATION[selectedStationId] || MOCK_DRIVERS_BY_STATION['stn-hn1'];
  }, [selectedStationId]);

  // Ca DRIVER hợp lệ
  const driverShiftDefs = useMemo(() => {
    return shiftDefinitions.filter(
      (d) => d.role === 'DRIVER' && !d.isOvertime && d.status === 'active' && d.type !== 'SPLIT'
    );
  }, [shiftDefinitions]);

  // ─── STATE DỮ LIỆU PHÂN CÔNG CA LÀM ──────────────────────────────────────────

  const [assignments, setAssignments] = useState<ShiftAssignmentItem[]>(() => {
    const list: ShiftAssignmentItem[] = [];
    const today = new Date();
    const monday = getStartOfWeek(today);

    // Mẫu phân ca 7 ngày tuần này cho 5 tài xế đầu tiên
    const sampleShifts = [
      { id: 'shift-c1', name: 'Ca 1 (Sáng)', start: '07:00', end: '15:00' },
      { id: 'shift-c2', name: 'Ca 2 (Chiều)', start: '13:30', end: '21:30' },
      { id: 'shift-cd', name: 'Ca đêm', start: '21:30', end: '07:00' },
    ];

    const drvs = MOCK_DRIVERS_BY_STATION['stn-hn1'] || [];
    drvs.slice(0, 5).forEach((drv, dIdx) => {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        if ((dIdx + dayOffset) % 5 === 0) continue; // một số ngày nghỉ
        const d = new Date(monday);
        d.setDate(monday.getDate() + dayOffset);
        const dateStr = formatDateStr(d);
        const s = sampleShifts[(dIdx + dayOffset) % sampleShifts.length];

        const past = isStrictPast(dateStr);
        const todayDate = isSameDay(d, today);
        let status: ShiftStatus = 'PLANNED';
        if (past) status = 'COMPLETED';
        else if (todayDate) status = 'IN_PROGRESS';

        list.push({
          id: `asg-${drv.id}-${dateStr}-${s.id}`,
          driverId: drv.id,
          driverName: drv.name,
          driverPhone: drv.phone,
          driverRole: 'Lái xe cứu hộ',
          shiftConfigId: s.id,
          shiftName: s.name,
          date: dateStr,
          startTime: s.start,
          endTime: s.end,
          status,
          staffRole: 'Lái xe cứu hộ',
          vehiclePlate: '29A-888.99',
          vehicleType: 'Cứu hộ sàn trượt',
          checkinAt: status === 'IN_PROGRESS' || status === 'COMPLETED' ? '06:50' : undefined,
          startKm: status === 'IN_PROGRESS' || status === 'COMPLETED' ? 45200 : undefined,
          endKm: status === 'COMPLETED' ? 45310 : undefined,
          toolCondition: 'GOOD',
          note: 'Phân công ca trực tiêu chuẩn',
        });
      }
    });

    return list;
  });

  // Xử lý refresh
  const handleRefreshAll = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Đã làm mới dữ liệu lịch ca thành công');
    }, 500);
  };

  // ─── TAB 1: MONTHLY CALENDAR STATES ──────────────────────────────────────────

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [searchDriver, setSearchDriver] = useState('');

  // Lọc tài xế sidebar
  const filteredSidebarDrivers = useMemo(() => {
    const q = searchDriver.toLowerCase().trim();
    if (!q) return stationDrivers;
    return stationDrivers.filter(
      (d) => d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [stationDrivers, searchDriver]);

  // Các ngày cần hiển thị trong Grid (Tuần hoặc Tháng)
  const daysToShow = useMemo(() => {
    if (viewMode === 'day') {
      return [new Date(currentDate)];
    }
    if (viewMode === 'week') {
      const start = getStartOfWeek(currentDate);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
      return days;
    }
    // month view
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const startOfGrid = getStartOfWeek(firstDay);
    const lastDay = new Date(y, m + 1, 0);
    const days: Date[] = [];
    const d = new Date(startOfGrid);
    while (d <= lastDay || d.getDay() !== 1 || days.length < 35) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
      if (days.length >= 42) break;
    }
    return days;
  }, [currentDate, viewMode]);

  // Header Title
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `Tuần ${pad2(start.getDate())}/${pad2(start.getMonth() + 1)} - ${pad2(end.getDate())}/${pad2(
        end.getMonth() + 1
      )}, ${currentDate.getFullYear()}`;
    }
    return `Ngày ${pad2(currentDate.getDate())}/${pad2(currentDate.getMonth() + 1)}/${currentDate.getFullYear()}`;
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  // Drag and drop logic
  const [draggedItem, setDraggedItem] = useState<DragItemData | null>(null);

  const handleDragStart = (e: React.DragEvent, item: DragItemData) => {
    if (item.type === 'ASSIGNMENT' && item.sourceDate && isStrictPast(item.sourceDate)) {
      e.preventDefault();
      showToast('⚠️ Không thể di chuyển ca làm đã diễn ra trong quá khứ');
      return;
    }
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Popup Modal xác nhận phân công / chuyển ca
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleDropSlot = (dateStr: string, shiftDef: ShiftDefinition | { id: string; name: string; timeStart: string; timeEnd: string }) => {
    if (!draggedItem) return;

    if (isStrictPast(dateStr)) {
      showToast('⚠️ Không thể phân ca cho ngày đã qua trong quá khứ');
      return;
    }

    if (draggedItem.type === 'DRIVER') {
      const alreadyInShift = assignments.some(
        (a) => a.date === dateStr && a.driverId === draggedItem.driverId && a.shiftConfigId === shiftDef.id
      );
      if (alreadyInShift) {
        showToast(`Tài xế ${draggedItem.driverName} đã được xếp vào ca này`);
        return;
      }

      setConfirmModal({
        open: true,
        title: 'Xác nhận phân công ca',
        message: `Phân công tài xế "${draggedItem.driverName}" vào ${shiftDef.name} ngày ${formatDisplayDate(dateStr)}?`,
        onConfirm: () => {
          const newAssignment: ShiftAssignmentItem = {
            id: `asg-${draggedItem.driverId}-${dateStr}-${shiftDef.id}-${Date.now()}`,
            driverId: draggedItem.driverId,
            driverName: draggedItem.driverName,
            driverRole: 'Lái xe cứu hộ',
            shiftConfigId: shiftDef.id,
            shiftName: shiftDef.name,
            date: dateStr,
            startTime: shiftDef.timeStart,
            endTime: shiftDef.timeEnd,
            status: isSameDay(new Date(dateStr), new Date()) ? 'IN_PROGRESS' : 'PLANNED',
            staffRole: 'Lái xe cứu hộ',
            vehiclePlate: '29A-888.99',
            vehicleType: 'Cứu hộ sàn trượt',
          };
          setAssignments((prev) => [...prev, newAssignment]);
          showToast(`Đã phân công ${draggedItem.driverName} vào ${shiftDef.name}`);
        },
      });
    } else if (draggedItem.type === 'ASSIGNMENT' && draggedItem.assignmentId) {
      setConfirmModal({
        open: true,
        title: 'Xác nhận chuyển ca',
        message: `Chuyển tài xế "${draggedItem.driverName}" sang ${shiftDef.name} ngày ${formatDisplayDate(dateStr)}?`,
        onConfirm: () => {
          setAssignments((prev) =>
            prev.map((a) => {
              if (a.id === draggedItem.assignmentId) {
                return {
                  ...a,
                  shiftConfigId: shiftDef.id,
                  shiftName: shiftDef.name,
                  date: dateStr,
                  startTime: shiftDef.timeStart,
                  endTime: shiftDef.timeEnd,
                };
              }
              return a;
            })
          );
          showToast(`Đã di chuyển ca làm của ${draggedItem.driverName}`);
        },
      });
    }
    setDraggedItem(null);
  };

  // Xóa / Gỡ phân công
  const handleRemoveAssignment = (assignmentId: string, driverName: string, shiftName: string, dateStr: string) => {
    setConfirmModal({
      open: true,
      title: 'Xác nhận xóa phân công',
      message: `Xóa nhân viên "${driverName}" khỏi ca "${shiftName}" ngày ${formatDisplayDate(dateStr)}?`,
      onConfirm: () => {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        showToast(`Đã xóa phân công nhân viên ${driverName} khỏi ca`);
      },
    });
  };

  // Stats Footer cho Calendar
  const calendarStats = useMemo(() => {
    const uniqueDrivers = new Set(assignments.map((a) => a.driverId));
    const assignedDates = new Set(assignments.map((a) => a.date));
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    return {
      totalAssignments: assignments.length,
      assignedDrivers: uniqueDrivers.size,
      daysWithShifts: assignedDates.size,
      daysNoAssignments: Math.max(0, daysInCurrentMonth - assignedDates.size),
    };
  }, [assignments, currentDate]);

  // Modal Chi tiết ngày (ShiftCalendarDayModal)
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

  // ─── TAB 2: OVERVIEW STATES ──────────────────────────────────────────────────

  const [overviewDateRange, setOverviewDateRange] = useState<[string, string]>(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 6);
    return [formatDateStr(today), formatDateStr(end)];
  });

  // Modal tạo ca làm mới từ Tab Overview hoặc TableView
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    shiftId: '',
    date: formatDateStr(new Date()),
    driverId: '',
    note: '',
  });

  // Modal thêm NV vào ca thiếu
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [selectedUnderstaffedShift, setSelectedUnderstaffedShift] = useState<{
    shiftDefId: string;
    shiftName: string;
    date: string;
    startTime: string;
    endTime: string;
    assignedCount: number;
    minRequired: number;
  } | null>(null);
  const [addStaffDriverId, setAddStaffDriverId] = useState('');

  // Danh sách ca trong khoảng ngày Overview & thống kê
  const shiftsOverviewList = useMemo(() => {
    const list: {
      shiftDefId: string;
      shiftName: string;
      date: string;
      startTime: string;
      endTime: string;
      assignedCount: number;
      minRequired: number;
    }[] = [];

    const [startStr, endStr] = overviewDateRange;
    const start = new Date(startStr);
    const end = new Date(endStr);

    const availableShifts = driverShiftDefs.length > 0 ? driverShiftDefs : [
      { id: 'shift-c1', name: 'Ca 1 (Sáng)', timeStart: '07:00', timeEnd: '15:00', minStaff: 2 },
      { id: 'shift-c2', name: 'Ca 2 (Chiều)', timeStart: '13:30', timeEnd: '21:30', minStaff: 2 },
      { id: 'shift-cd', name: 'Ca đêm', timeStart: '21:30', timeEnd: '07:00', minStaff: 1 },
    ];

    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = formatDateStr(cur);
      availableShifts.forEach((s) => {
        const minStaff = (s as any).minStaff ?? 1;
        const count = assignments.filter((a) => a.date === dateStr && a.shiftConfigId === s.id).length;
        list.push({
          shiftDefId: s.id,
          shiftName: s.name,
          date: dateStr,
          startTime: s.timeStart,
          endTime: s.timeEnd,
          assignedCount: count,
          minRequired: minStaff,
        });
      });
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [overviewDateRange, driverShiftDefs, assignments]);

  // Ca thiếu nhân sự (assignedCount < minRequired)
  const understaffedShifts = useMemo(() => {
    return shiftsOverviewList.filter((s) => s.assignedCount < s.minRequired);
  }, [shiftsOverviewList]);

  // Thống kê ca làm hôm nay
  const todayStats = useMemo(() => {
    const todayStr = formatDateStr(new Date());
    const todayShifts = shiftsOverviewList.filter((s) => s.date === todayStr);
    const totalToday = todayShifts.length;
    const staffedCount = todayShifts.filter((s) => s.assignedCount >= s.minRequired).length;
    const understaffedCount = todayShifts.filter((s) => s.assignedCount < s.minRequired).length;

    // Nhân viên
    const totalActive = stationDrivers.filter((d) => d.status === 'ACTIVE').length;
    const assignedTodayDrivers = new Set(assignments.filter((a) => a.date === todayStr).map((a) => a.driverId));
    const assignedCount = assignedTodayDrivers.size;
    const readyCount = Math.max(0, totalActive - assignedCount);

    return {
      totalToday,
      staffedCount,
      understaffedCount,
      totalActive,
      readyCount,
      assignedCount,
    };
  }, [shiftsOverviewList, stationDrivers, assignments]);

  // ─── TAB 3: SHIFT TABLE VIEW STATES ──────────────────────────────────────────

  const [tableFilters, setTableFilters] = useState({
    dateRange: [formatDateStr(new Date()), formatDateStr(new Date(Date.now() + 30 * 86400000))],
    staffName: '',
    shiftConfigId: '',
    status: '',
  });

  const [tableSearchForm, setTableSearchForm] = useState({ ...tableFilters });
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 10;

  // Lọc danh sách phân ca bảng
  const filteredTableAssignments = useMemo(() => {
    return assignments.filter((item) => {
      if (tableFilters.staffName && !item.driverName.toLowerCase().includes(tableFilters.staffName.toLowerCase())) {
        return false;
      }
      if (tableFilters.shiftConfigId && item.shiftConfigId !== tableFilters.shiftConfigId) {
        return false;
      }
      if (tableFilters.status && item.status !== tableFilters.status) {
        return false;
      }
      if (tableFilters.dateRange[0] && item.date < tableFilters.dateRange[0]) {
        return false;
      }
      if (tableFilters.dateRange[1] && item.date > tableFilters.dateRange[1]) {
        return false;
      }
      return true;
    });
  }, [assignments, tableFilters]);

  // Phân trang
  const paginatedTableAssignments = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredTableAssignments.slice(start, start + tablePageSize);
  }, [filteredTableAssignments, tablePage]);

  // Modal DLG-04: Chi tiết ca làm
  const [detailModalItem, setDetailModalItem] = useState<ShiftAssignmentItem | null>(null);

  // Modal Sửa ca làm
  const [editModalItem, setEditModalItem] = useState<ShiftAssignmentItem | null>(null);
  const [editForm, setEditForm] = useState({
    driverId: '',
    shiftConfigId: '',
    date: '',
    note: '',
  });

  // Modal Check-in & Check-out (FDD FL-M2-03)
  const [checkinModalItem, setCheckinModalItem] = useState<ShiftAssignmentItem | null>(null);
  const [checkoutModalItem, setCheckoutModalItem] = useState<ShiftAssignmentItem | null>(null);
  const [appSimulatorOpen, setAppSimulatorOpen] = useState(false);

  const handleOpenCheckin = (item: ShiftAssignmentItem) => {
    setCheckinModalItem(item);
  };

  const handleOpenCheckout = (item: ShiftAssignmentItem) => {
    setCheckoutModalItem(item);
  };

  const handleSaveCheckin = (data: {
    assignmentId: string;
    vehiclePlate: string;
    vehicleType?: string;
    startKm: number;
    toolCondition: 'GOOD' | 'BROKEN' | 'MISSING';
    toolItems: ToolInspectionItem[];
    checkinNote?: string;
  }) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === data.assignmentId) {
          return {
            ...a,
            vehiclePlate: data.vehiclePlate,
            vehicleType: data.vehicleType || a.vehicleType,
            checkinAt: nowStr,
            startKm: data.startKm,
            toolCondition: data.toolCondition,
            toolItems: data.toolItems,
            checkinNote: data.checkinNote,
            status: 'IN_PROGRESS' as ShiftStatus,
          };
        }
        return a;
      })
    );
    showToast(`✅ Đã check-in nhận ca (${data.vehiclePlate} lúc ${nowStr})`);
    setCheckinModalItem(null);
    if (detailModalItem?.id === data.assignmentId) {
      setDetailModalItem((prev) =>
        prev
          ? {
              ...prev,
              vehiclePlate: data.vehiclePlate,
              vehicleType: data.vehicleType || prev.vehicleType,
              checkinAt: nowStr,
              startKm: data.startKm,
              toolCondition: data.toolCondition,
              toolItems: data.toolItems,
              checkinNote: data.checkinNote,
              status: 'IN_PROGRESS',
            }
          : null
      );
    }
  };

  const handleSaveCheckout = (data: {
    assignmentId: string;
    endKm: number;
    toolCondition: 'GOOD' | 'BROKEN' | 'MISSING';
    toolItems: ToolInspectionItem[];
    checkoutNote?: string;
  }) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === data.assignmentId) {
          return {
            ...a,
            checkoutAt: nowStr,
            endKm: data.endKm,
            toolCondition: data.toolCondition,
            toolItems: data.toolItems,
            checkoutNote: data.checkoutNote,
            status: 'COMPLETED' as ShiftStatus,
          };
        }
        return a;
      })
    );
    showToast(`✅ Đã check-out kết thúc ca làm việc (${nowStr})`);
    setCheckoutModalItem(null);
    if (detailModalItem?.id === data.assignmentId) {
      setDetailModalItem((prev) =>
        prev
          ? {
              ...prev,
              checkoutAt: nowStr,
              endKm: data.endKm,
              toolCondition: data.toolCondition,
              toolItems: data.toolItems,
              checkoutNote: data.checkoutNote,
              status: 'COMPLETED',
            }
          : null
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scope Bar */}
      <PartnerScopeBar onPersonaChange={setPersona} />

      {/* Main Container */}
      <div className="p-4 md:p-6 max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
        {/* Header Title */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Quản lý ca làm</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân công lịch trực cứu hộ, theo dõi độ phủ ca và điều phối nhân sự theo thời gian thực
            </p>
          </div>

        </div>

        {/* Ant Design Card Container */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          {/* Tabs Bar & Controls */}
          <div className="border-b border-slate-200 px-4 md:px-6 pt-3 flex flex-wrap items-center justify-between gap-3 bg-white">
            {/* Tabs List */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('1')}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === '1'
                    ? 'border-[#01a651] text-[#01a651]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                Lịch tháng
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('2')}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === '2'
                    ? 'border-[#01a651] text-[#01a651]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Tổng quan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('3')}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === '3'
                    ? 'border-[#01a651] text-[#01a651]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                Dạng bảng
              </button>
            </div>

            {/* Top Extra Controls */}
            <div className="flex items-center gap-2.5 pb-2">
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#01a651] hover:text-[#01a651] text-slate-700 rounded-md text-xs font-medium transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#01a651]' : ''}`} />
                <span>Refresh</span>
              </button>

              {/* Select Partner */}
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#01a651] shadow-sm min-w-[160px]"
              >
                <option value="partner-vetc">VETC RSA Partner</option>
                <option value="partner-hanoi">Cứu hộ Miền Bắc</option>
                <option value="partner-saigon">Cứu hộ Sài Gòn</option>
              </select>

              {/* Select Station */}
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#01a651] shadow-sm min-w-[190px]"
              >
                {MOCK_STATIONS_FOR_SHIFT.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>

              {/* Nút mô phỏng App Tài xế: Check-in / Check-out (FDD FL-M2-03) */}
              <button
                type="button"
                onClick={() => setAppSimulatorOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005d2d] hover:bg-[#004722] text-white rounded-md text-xs font-bold transition shadow-xs"
                title="Mô phỏng app mobile tài xế xem ca, check-in và check-out theo FDD FL-M2-03"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span>📱 App Tài xế: Check-in / out</span>
              </button>
            </div>
          </div>

          {/* TAB 1: LỊCH THÁNG (MONTHLY CALENDAR) */}
          {activeTab === '1' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-[640px] bg-slate-100/70">
              {/* Sidebar: Tài xế sẵn sàng */}
              <div className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-3.5 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-slate-900">Tài xế sẵn sàng</h3>
                    <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-[#005d2d] rounded-full font-medium">
                      {stationDrivers.length} nhân sự
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kéo tài xế vào ca làm mong muốn</p>
                  <div className="mt-2.5 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm tài xế, SĐT..."
                      value={searchDriver}
                      onChange={(e) => setSearchDriver(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-[#01a651]"
                    />
                  </div>
                </div>

                {/* Danh sách tài xế draggable */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {filteredSidebarDrivers.map((driver) => (
                    <div
                      key={driver.id}
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, {
                          type: 'DRIVER',
                          driverId: driver.id,
                          driverName: driver.name,
                        })
                      }
                      className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-lg cursor-grab active:cursor-grabbing transition shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {driver.name.split(' ').pop()?.charAt(0) || 'T'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs text-slate-800 truncate group-hover:text-[#005d2d]">
                            {driver.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{driver.phone}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{driver.code}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSidebarDrivers.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">Không tìm thấy tài xế phù hợp</div>
                  )}
                </div>
              </div>

              {/* Lịch và view chính */}
              <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* ShiftCalendarHeader */}
                <div className="p-3 md:px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="p-1.5 hover:bg-slate-100 rounded-md border border-slate-200 text-slate-600 transition"
                      title="Trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="font-bold text-sm md:text-base text-slate-800 min-w-[200px] text-center">
                      {getHeaderTitle()}
                    </div>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="p-1.5 hover:bg-slate-100 rounded-md border border-slate-200 text-slate-600 transition"
                      title="Sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 text-xs font-medium border border-slate-300 rounded-md text-slate-700 hover:border-[#01a651] hover:text-[#01a651] transition"
                    >
                      Hôm nay
                    </button>
                  </div>

                  {/* Switch view Ngày / Tuần / Tháng */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 hidden sm:inline">Chế độ xem:</span>
                    <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
                      <button
                        type="button"
                        onClick={() => setViewMode('day')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          viewMode === 'day' ? 'bg-white text-[#01a651] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          viewMode === 'week' ? 'bg-white text-[#01a651] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tuần
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('month')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          viewMode === 'month' ? 'bg-white text-[#01a651] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tháng
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Calendar Body View */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                  {/* VIEW DAY */}
                  {viewMode === 'day' && (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                      <div className="flex bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                        <div className="w-32 md:w-36 p-3 text-center border-r border-slate-200">Khung giờ</div>
                        <div className="flex-1 p-3">Phân công ca làm</div>
                      </div>

                      <div className="divide-y divide-slate-200">
                        {(driverShiftDefs.length > 0 ? driverShiftDefs : [
                          { id: 'shift-c1', name: 'Ca 1 (Sáng)', timeStart: '07:00', timeEnd: '15:00', minStaff: 2, maxStaff: 4 },
                          { id: 'shift-c2', name: 'Ca 2 (Chiều)', timeStart: '13:30', timeEnd: '21:30', minStaff: 2, maxStaff: 4 },
                          { id: 'shift-cd', name: 'Ca đêm', timeStart: '21:30', timeEnd: '07:00', minStaff: 1, maxStaff: 2 },
                        ] as any[]).map((shift) => {
                          const dateStr = formatDateStr(currentDate);
                          const locked = isStrictPast(dateStr);
                          const assignedInThisShift = assignments.filter(
                            (a) => a.date === dateStr && a.shiftConfigId === shift.id
                          );
                          const dvMin: number = (shift as any).minStaff ?? 1;
                          const dvMax: number | undefined = (shift as any).maxStaff;
                          const dvState = calcStaffingState(assignedInThisShift.length, dvMin, dvMax);
                          const dvFull = dvState === 'FULL' || dvState === 'OVER';

                          return (
                            <div key={shift.id} className="flex min-h-[110px]">
                              {/* Cột Khung Giờ */}
                              <div className="w-32 md:w-36 p-4 border-r border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-[#005d2d] border border-emerald-200 rounded-md font-bold text-xs">
                                  <Clock className="w-3 h-3" />
                                  {shift.timeStart}
                                </span>
                                <span className="text-[11px] text-slate-400 my-1">đến</span>
                                <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-[#005d2d] border border-emerald-200 rounded-md font-bold text-xs">
                                  {shift.timeEnd}
                                </span>
                              </div>

                              {/* Cột Phân Công */}
                              <div
                                onDragOver={!locked && !dvFull ? handleDragOver : undefined}
                                onDrop={!locked && !dvFull ? () => handleDropSlot(dateStr, shift as any) : undefined}
                                title={dvFull && !locked ? `Ca đã đủ ${dvMax} người, không thể thêm` : undefined}
                                className={`flex-1 p-4 transition-colors ${
                                  locked ? 'bg-slate-50/40' : dvFull ? 'bg-slate-100/60' : 'bg-white hover:bg-slate-50/20'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-slate-800">{shift.name}</h4>
                                    {locked && (
                                      <span title="Ca đã qua, không thể chỉnh sửa">
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">
                                      {assignedInThisShift.length}{dvMax != null ? `/${dvMax}` : ''} người
                                    </span>
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${staffingBadgeStyle[dvState]}`}
                                      title={dvFull ? `Ca đã đủ ${dvMax} người` : undefined}
                                    >
                                      {staffingLabel(dvState, assignedInThisShift.length, dvMin, dvMax)}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className={`min-h-[50px] p-2 rounded-lg flex flex-wrap gap-2 items-center ${
                                    locked ? 'border border-transparent' : dvFull ? 'border border-dashed border-slate-400 bg-slate-50/60' : 'border border-dashed border-slate-300'
                                  }`}
                                >
                                  {assignedInThisShift.map((item) => (
                                    <div
                                      key={item.id}
                                      draggable={!locked}
                                      onDragStart={(e) =>
                                        handleDragStart(e, {
                                          type: 'ASSIGNMENT',
                                          driverId: item.driverId,
                                          driverName: item.driverName,
                                          assignmentId: item.id,
                                          sourceDate: dateStr,
                                        })
                                      }
                                      onClick={() => setDetailModalItem(item)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#01a651] text-white rounded-md text-xs font-medium shadow-xs cursor-pointer group hover:bg-[#008f45] transition"
                                      title="Bấm để xem chi tiết / Check-in / Check-out"
                                    >
                                      <User className="w-3.5 h-3.5" />
                                      <span>{item.driverName}</span>

                                      {/* Trạng thái Check-in */}
                                      {item.checkinAt ? (
                                        <span className="px-1 py-0.2 bg-black/20 rounded text-[9px] font-mono text-emerald-100 flex items-center gap-0.5">
                                          <Check className="w-2.5 h-2.5" />
                                          <span>{item.checkinAt}</span>
                                          {item.vehiclePlate && (
                                            <span className="text-[8px] opacity-80">· {item.vehiclePlate.split('-')[0]}</span>
                                          )}
                                        </span>
                                      ) : null}

                                      {/* Quick Check-in action button */}
                                      {!item.checkinAt && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenCheckin(item);
                                          }}
                                          className="px-1.5 py-0.2 bg-amber-500 hover:bg-amber-600 text-white rounded text-[9px] font-bold shadow-2xs"
                                          title="Check-in nhận ca"
                                        >
                                          In
                                        </button>
                                      )}

                                      {/* Quick Check-out action button */}
                                      {item.checkinAt && !item.checkoutAt && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenCheckout(item);
                                          }}
                                          className="px-1.5 py-0.2 bg-blue-500 hover:bg-blue-600 text-white rounded text-[9px] font-bold shadow-2xs"
                                          title="Check-out kết thúc ca"
                                        >
                                          Out
                                        </button>
                                      )}

                                      {!locked && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveAssignment(item.id, item.driverName, shift.name, dateStr);
                                          }}
                                          className="p-0.5 hover:bg-black/20 rounded transition"
                                          title="Gỡ khỏi ca"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ))}

                                  {!locked && assignedInThisShift.length === 0 && (
                                    <div className="w-full text-center text-xs text-slate-400 py-2">
                                      Kéo thả tài xế vào đây
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* VIEW WEEK / MONTH GRID */}
                  {(viewMode === 'week' || viewMode === 'month') && (
                    <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
                      {/* 7 Cột thứ */}
                      <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-700 text-center">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
                          <div
                            key={w}
                            className={`p-2.5 border-r border-slate-200 last:border-r-0 ${
                              idx >= 5 ? 'bg-slate-200/60 text-slate-800' : ''
                            }`}
                          >
                            {w}
                          </div>
                        ))}
                      </div>

                      {/* Lưới các ô ngày */}
                      <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-200">
                        {daysToShow.map((day) => {
                          const dateStr = formatDateStr(day);
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const isTodayDate = isSameDay(day, new Date());
                          const locked = isStrictPast(dateStr);
                          const inCurrentMonth = day.getMonth() === currentDate.getMonth();

                          // Các ca trong ngày
                          const dayShifts: any[] = driverShiftDefs.length > 0 ? driverShiftDefs : [
                            { id: 'shift-c1', name: 'Ca 1 (Sáng)', timeStart: '07:00', timeEnd: '15:00', minStaff: 2, maxStaff: 4 },
                            { id: 'shift-c2', name: 'Ca 2 (Chiều)', timeStart: '13:30', timeEnd: '21:30', minStaff: 2, maxStaff: 4 },
                            { id: 'shift-cd', name: 'Ca đêm', timeStart: '21:30', timeEnd: '07:00', minStaff: 1, maxStaff: 2 },
                          ];

                          return (
                            <div
                              key={dateStr}
                              className={`p-2 min-h-[140px] flex flex-col justify-between transition-colors ${
                                isWeekend ? 'bg-slate-100/70' : 'bg-white'
                              } ${!inCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''}`}
                            >
                              {/* Header ngày */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {viewMode === 'week' ? formatDisplayDate(dateStr) : ''}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    isTodayDate
                                      ? 'bg-[#01a651] text-white shadow-xs'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {day.getDate()}
                                </span>
                              </div>

                              {/* Danh sách các ca trong ngày */}
                              <div className="space-y-1.5 flex-1">
                                {dayShifts.map((shift) => {
                                  const assigned = assignments.filter(
                                    (a) => a.date === dateStr && a.shiftConfigId === shift.id
                                  );
                                  const gMin: number = (shift as any).minStaff ?? 1;
                                  const gMax: number | undefined = (shift as any).maxStaff;
                                  const gState = calcStaffingState(assigned.length, gMin, gMax);
                                  const gFull = gState === 'FULL' || gState === 'OVER';

                                  return (
                                    <div
                                      key={shift.id}
                                      onDragOver={!locked && !gFull ? handleDragOver : undefined}
                                      onDrop={!locked && !gFull ? () => handleDropSlot(dateStr, shift as any) : undefined}
                                      title={gFull && !locked ? `Ca đã đủ ${gMax} người` : undefined}
                                      className={`p-1.5 rounded-md border text-[11px] transition ${
                                        locked
                                          ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
                                          : gFull
                                          ? 'bg-slate-50 border-slate-300 opacity-75'
                                          : 'bg-[#e6fbed] border-[#b7eb8f] hover:border-[#01a651]'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between font-bold text-[#005d2d] mb-0.5">
                                        <span className="truncate text-[10px]">{shift.name}</span>
                                        <span className={`inline-flex px-1 py-0 rounded text-[9px] font-bold border ${staffingBadgeStyle[gState]}`}>
                                          {staffingLabel(gState, assigned.length, gMin, gMax)}
                                        </span>
                                      </div>

                                      {/* Danh sách nhân viên trong ca */}
                                      <div
                                        onClick={() => setDayModalDate(day)}
                                        className="space-y-1 cursor-pointer"
                                        title="Bấm để xem & chỉnh sửa chi tiết ngày"
                                      >
                                        {assigned.slice(0, 3).map((staff) => (
                                          <div
                                            key={staff.id}
                                            draggable={!locked}
                                            onDragStart={(e) => {
                                              e.stopPropagation();
                                              handleDragStart(e, {
                                                type: 'ASSIGNMENT',
                                                driverId: staff.driverId,
                                                driverName: staff.driverName,
                                                assignmentId: staff.id,
                                                sourceDate: dateStr,
                                              });
                                            }}
                                            className="px-1.5 py-0.5 bg-white border border-emerald-200 rounded text-[10px] text-slate-800 font-medium truncate flex items-center justify-between hover:border-[#01a651]"
                                          >
                                            <div className="flex items-center gap-1 truncate">
                                              {staff.checkinAt && (
                                                <span className="text-[8px] font-bold text-emerald-600 shrink-0" title={`Đã check-in: ${staff.checkinAt}`}>✓</span>
                                              )}
                                              <span className="truncate">{staff.driverName}</span>
                                            </div>
                                            {staff.vehiclePlate && (
                                              <span className="text-[9px] text-emerald-700 ml-1 font-mono shrink-0">
                                                {staff.vehiclePlate.split('-')[0]}
                                              </span>
                                            )}
                                          </div>
                                        ))}

                                        {assigned.length > 3 && (
                                          <span className="inline-block px-1.5 py-0.2 bg-[#01a651] text-white rounded text-[9px] font-bold">
                                            +{assigned.length - 3}
                                          </span>
                                        )}
                                        {assigned.length === 0 && !locked && (
                                          <div className="text-[10px] text-slate-400 italic text-center py-0.5">
                                            + Thả tài xế
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ShiftCalendarFooter (Thống kê 4 số liệu) */}
                <div className="p-3 px-5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-6">
                    <div>
                      Tổng lượt phân công: <strong className="text-slate-900">{calendarStats.totalAssignments}</strong>
                    </div>
                    <div>
                      Số tài xế được phân công: <strong className="text-slate-900">{calendarStats.assignedDrivers}</strong>
                    </div>
                    <div>
                      Số ngày có ca: <strong className="text-emerald-700">{calendarStats.daysWithShifts}</strong>
                    </div>
                    <div>
                      Số ngày chưa có phân công: <strong className="text-amber-700">{calendarStats.daysNoAssignments}</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    💡 Kéo thả thẻ tài xế từ thanh bên trái hoặc giữa các ca để điều chuyển
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TỔNG QUAN (OVERVIEW) */}
          {activeTab === '2' && (
            <div className="p-4 md:p-6 bg-slate-50 flex-1 space-y-4">
              {/* Top Controls: Nút tạo ca làm & Lọc khoảng ngày */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Khoảng ngày:</span>
                  <input
                    type="date"
                    value={overviewDateRange[0]}
                    onChange={(e) => setOverviewDateRange([e.target.value, overviewDateRange[1]])}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                  />
                  <span className="text-slate-400 text-xs">đến</span>
                  <input
                    type="date"
                    value={overviewDateRange[1]}
                    onChange={(e) => setOverviewDateRange([overviewDateRange[0], e.target.value])}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#01a651] hover:bg-[#008c44] text-white text-xs font-semibold rounded-md shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo ca làm</span>
                </button>
              </div>

              {/* Bố cục 2 Cột: Cột trái (Thống kê 2 Card) & Cột phải (Ca thiếu nhân viên) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Cột trái (4/12) */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Card Thống kê ca làm */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <h3 className="font-bold text-sm text-slate-800 pb-3 border-b border-slate-100">
                      Thống kê ca làm hôm nay
                    </h3>
                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Tổng ca hôm nay:</span>
                        <strong className="text-slate-900 text-sm">{todayStats.totalToday}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Ca đủ nhân sự:</span>
                        <strong className="text-[#01a651] text-sm">{todayStats.staffedCount}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Ca thiếu nhân sự:</span>
                        <strong className="text-rose-600 text-sm">{todayStats.understaffedCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Nhân viên sẵn sàng */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <User className="w-4 h-4 text-slate-500" />
                      <h3 className="font-bold text-sm text-slate-800">Nhân viên sẵn sàng</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Thống kê nhân viên theo ngày hôm nay</p>

                    <div className="mt-3 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Tổng nhân viên hoạt động:</span>
                        <strong className="text-slate-900 text-sm">{todayStats.totalActive}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Nhân viên sẵn sàng:</span>
                        <strong className="text-[#01a651] text-sm">{todayStats.readyCount}</strong>
                      </div>
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Nhân viên đã phân công:</span>
                        <strong className="text-blue-600 text-sm">{todayStats.assignedCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cột phải (8/12): Danh sách Ca thiếu nhân viên */}
                <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2.5 text-amber-600 pb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-bold text-base text-slate-900">Ca thiếu nhân viên</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Các ca chưa đủ số lượng nhân sự tối thiểu theo cấu hình trạm. Bấm "Thêm NV" để bổ sung nhân sự.
                  </p>

                  <div className="space-y-3">
                    {understaffedShifts.map((shift, idx) => (
                      <div
                        key={`${shift.shiftDefId}-${shift.date}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          {/* Deficit badge vuông */}
                          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 font-bold text-base flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
                            {shift.assignedCount}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">
                              {shift.shiftName} — {formatDisplayDate(shift.date)}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {shift.startTime} – {shift.endTime} • Đã phân công{' '}
                              <strong className="text-slate-800">{shift.assignedCount}</strong> / Yêu cầu tối thiểu{' '}
                              <strong className="text-rose-600">{shift.minRequired}</strong> NV
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-full">
                            Thiếu {shift.minRequired - shift.assignedCount} NV
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUnderstaffedShift(shift);
                              setAddStaffDriverId('');
                              setAddStaffModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#01a651] hover:bg-[#008c44] text-white text-xs font-semibold rounded-md shadow-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm NV</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {understaffedShifts.length === 0 && (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        Tất cả các ca trong khoảng ngày đều đã đáp ứng đầy đủ nhân sự!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DẠNG BẢNG (SHIFT TABLE VIEW) */}
          {activeTab === '3' && (
            <div className="p-4 md:p-6 bg-slate-50 flex-1 space-y-4">
              {/* Card TRA CỨU */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs tracking-wider uppercase border-b border-slate-100 pb-2.5">
                  <Search className="w-4 h-4 text-[#01a651]" />
                  <span>TRA CỨU</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Khoảng ngày</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={tableSearchForm.dateRange[0]}
                        onChange={(e) =>
                          setTableSearchForm({
                            ...tableSearchForm,
                            dateRange: [e.target.value, tableSearchForm.dateRange[1]],
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                      />
                      <span className="text-slate-400 text-xs">-</span>
                      <input
                        type="date"
                        value={tableSearchForm.dateRange[1]}
                        onChange={(e) =>
                          setTableSearchForm({
                            ...tableSearchForm,
                            dateRange: [tableSearchForm.dateRange[0], e.target.value],
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Tên nhân viên</label>
                    <input
                      type="text"
                      placeholder="Nhập tên nhân viên..."
                      value={tableSearchForm.staffName}
                      onChange={(e) =>
                        setTableSearchForm({ ...tableSearchForm, staffName: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Ca làm</label>
                    <select
                      value={tableSearchForm.shiftConfigId}
                      onChange={(e) =>
                        setTableSearchForm({ ...tableSearchForm, shiftConfigId: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                    >
                      <option value="">Tất cả ca làm</option>
                      {(driverShiftDefs.length > 0 ? driverShiftDefs : [
                        { id: 'shift-c1', name: 'Ca 1 (Sáng)' },
                        { id: 'shift-c2', name: 'Ca 2 (Chiều)' },
                        { id: 'shift-cd', name: 'Ca đêm' },
                      ]).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Trạng thái</label>
                    <select
                      value={tableSearchForm.status}
                      onChange={(e) =>
                        setTableSearchForm({ ...tableSearchForm, status: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="PLANNED">Đã lên lịch</option>
                      <option value="IN_PROGRESS">Đang diễn ra</option>
                      <option value="COMPLETED">Đã hoàn thành</option>
                      <option value="CANCELLED">Đã hủy</option>
                      <option value="PENDING">Đang chờ</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      const def = {
                        dateRange: [formatDateStr(new Date()), formatDateStr(new Date(Date.now() + 30 * 86400000))],
                        staffName: '',
                        shiftConfigId: '',
                        status: '',
                      };
                      setTableSearchForm(def);
                      setTableFilters(def);
                      setTablePage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition"
                  >
                    Thiết lập lại
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTableFilters({ ...tableSearchForm });
                      setTablePage(1);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#01a651] hover:bg-[#008c44] text-white rounded-md shadow-xs transition"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Tìm kiếm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo ca làm</span>
                  </button>
                </div>
              </div>

              {/* Table Ant Design Style */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Ngày</th>
                        <th className="py-3 px-4">Tên nhân viên</th>
                        <th className="py-3 px-4">Ca làm</th>
                        <th className="py-3 px-4">Khung giờ</th>
                        <th className="py-3 px-4">Phương tiện</th>
                        <th className="py-3 px-4">Nhân sự</th>
                        <th className="py-3 px-4">Check-in / Check-out</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {paginatedTableAssignments.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                            {formatDisplayDate(row.date)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {row.driverName.split(' ').pop()?.charAt(0) || 'T'}
                            </div>
                            <span>{row.driverName}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{row.shiftName}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                            {row.startTime} – {row.endTime}
                          </td>
                          <td className="py-3 px-4">
                            {row.vehiclePlate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 text-[11px] font-mono">
                                <Truck className="w-3 h-3 text-slate-500" />
                                {row.vehiclePlate}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Chưa gán</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium">
                              {row.staffRole || 'Lái xe'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {row.checkinAt ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                  <span className="text-emerald-700">✓ In: {row.checkinAt}</span>
                                  {row.checkoutAt && <span className="text-blue-700">· Out: {row.checkoutAt}</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {row.startKm ? `${row.startKm.toLocaleString()} km` : ''}
                                  {row.endKm && row.startKm ? ` → +${row.endKm - row.startKm} km` : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa check-in</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                shiftStatusBadgeStyles[row.status]
                              }`}
                            >
                              {shiftStatusLabels[row.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Xem chi tiết */}
                              <button
                                type="button"
                                onClick={() => setDetailModalItem(row)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Check-in nhanh */}
                              {!row.checkinAt && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCheckin(row)}
                                  className="p-1 hover:bg-emerald-50 rounded text-[#01a651] transition"
                                  title="Check-in nhận ca"
                                >
                                  <LogIn className="w-4 h-4" />
                                </button>
                              )}

                              {/* Check-out nhanh */}
                              {row.checkinAt && !row.checkoutAt && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCheckout(row)}
                                  className="p-1 hover:bg-blue-50 rounded text-blue-600 transition"
                                  title="Check-out kết thúc ca"
                                >
                                  <LogOut className="w-4 h-4" />
                                </button>
                              )}

                              {/* Sửa ca làm */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditModalItem(row);
                                  setEditForm({
                                    driverId: row.driverId,
                                    shiftConfigId: row.shiftConfigId,
                                    date: row.date,
                                    note: row.note || '',
                                  });
                                }}
                                disabled={row.status === 'COMPLETED' || row.status === 'CANCELLED'}
                                className="p-1 hover:bg-slate-100 rounded text-[#01a651] disabled:opacity-40 transition"
                                title="Sửa ca làm"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Hủy ca làm */}
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmModal({
                                    open: true,
                                    title: 'Xác nhận hủy ca làm',
                                    message: `Bạn có chắc muốn hủy ca làm này của tài xế "${row.driverName}"?`,
                                    onConfirm: () => {
                                      setAssignments((prev) =>
                                        prev.map((a) => (a.id === row.id ? { ...a, status: 'CANCELLED' } : a))
                                      );
                                      showToast(`Đã hủy ca làm của ${row.driverName}`);
                                    },
                                  });
                                }}
                                disabled={row.status === 'COMPLETED' || row.status === 'CANCELLED'}
                                className="p-1 hover:bg-slate-100 rounded text-rose-500 disabled:opacity-40 transition"
                                title="Hủy ca làm"
                              >
                                <StopCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {paginatedTableAssignments.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                            Không tìm thấy ca làm phù hợp với bộ lọc
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-3 px-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Hiển thị {paginatedTableAssignments.length} trên tổng số {filteredTableAssignments.length} ca
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={tablePage <= 1}
                      onClick={() => setTablePage(tablePage - 1)}
                      className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <span className="px-2 font-medium text-slate-800">Trang {tablePage}</span>
                    <button
                      type="button"
                      disabled={tablePage * tablePageSize >= filteredTableAssignments.length}
                      onClick={() => setTablePage(tablePage + 1)}
                      className="px-2.5 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL DLG-05: TẠO CA LÀM MỚI ────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Tạo ca làm mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">Điền thông tin để tạo phân công ca làm việc</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Ca làm việc <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.shiftId}
                  onChange={(e) => setCreateForm({ ...createForm, shiftId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                >
                  <option value="">-- Chọn ca làm --</option>
                  {(driverShiftDefs.length > 0 ? driverShiftDefs : [
                    { id: 'shift-c1', name: 'Ca 1 (Sáng) 07:00 – 15:00' },
                    { id: 'shift-c2', name: 'Ca 2 (Chiều) 13:30 – 21:30' },
                    { id: 'shift-cd', name: 'Ca đêm 21:30 – 07:00' },
                  ]).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Ngày làm việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nhân viên thực hiện <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.driverId}
                  onChange={(e) => setCreateForm({ ...createForm, driverId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {stationDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú phân ca nếu có..."
                  value={createForm.note}
                  onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 text-xs font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!createForm.shiftId || !createForm.date || !createForm.driverId) {
                    showToast('Vui lòng điền đầy đủ các trường bắt buộc');
                    return;
                  }
                  if (isStrictPast(createForm.date)) {
                    showToast('⚠️ Không thể tạo ca làm cho ngày đã qua trong quá khứ');
                    return;
                  }
                  const drv = stationDrivers.find((d) => d.id === createForm.driverId);
                  const s = (driverShiftDefs as any[]).find((x) => x.id === createForm.shiftId) || {
                    name: 'Ca phân công',
                    timeStart: '07:00',
                    timeEnd: '15:00',
                  };

                  const newAsg: ShiftAssignmentItem = {
                    id: `asg-${createForm.driverId}-${createForm.date}-${createForm.shiftId}-${Date.now()}`,
                    driverId: createForm.driverId,
                    driverName: drv?.name || 'Nhân viên',
                    driverPhone: drv?.phone,
                    driverRole: 'Lái xe cứu hộ',
                    shiftConfigId: createForm.shiftId,
                    shiftName: s.name,
                    date: createForm.date,
                    startTime: s.timeStart || '07:00',
                    endTime: s.timeEnd || '15:00',
                    status: isSameDay(new Date(createForm.date), new Date()) ? 'IN_PROGRESS' : 'PLANNED',
                    staffRole: 'Lái xe cứu hộ',
                    vehiclePlate: '29A-888.99',
                    vehicleType: 'Cứu hộ sàn trượt',
                    note: createForm.note,
                  };
                  setAssignments((prev) => [...prev, newAsg]);
                  setCreateModalOpen(false);
                  showToast('Đã tạo ca làm mới thành công');
                }}
                className="px-4 py-2 bg-[#01a651] hover:bg-[#008c44] text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                Tạo ca làm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL THÊM NV VÀO CA THIẾU (TỪ TAB OVERVIEW) ────────────────────── */}
      {addStaffModalOpen && selectedUnderstaffedShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Thêm nhân viên vào ca</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bổ sung nhân sự cho {selectedUnderstaffedShift.shiftName} ({formatDisplayDate(selectedUnderstaffedShift.date)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddStaffModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedUnderstaffedShift.shiftName}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Ngày {formatDisplayDate(selectedUnderstaffedShift.date)} • Khung giờ {selectedUnderstaffedShift.startTime} - {selectedUnderstaffedShift.endTime}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Chọn nhân viên bổ sung <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addStaffDriverId}
                  onChange={(e) => setAddStaffDriverId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                >
                  <option value="">-- Chọn nhân viên sẵn sàng --</option>
                  {stationDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setAddStaffModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 text-xs font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!addStaffDriverId) {
                    showToast('Vui lòng chọn nhân viên');
                    return;
                  }
                  const drv = stationDrivers.find((d) => d.id === addStaffDriverId);
                  const newAsg: ShiftAssignmentItem = {
                    id: `asg-${addStaffDriverId}-${selectedUnderstaffedShift.date}-${selectedUnderstaffedShift.shiftDefId}-${Date.now()}`,
                    driverId: addStaffDriverId,
                    driverName: drv?.name || 'Nhân viên',
                    driverPhone: drv?.phone,
                    driverRole: 'Lái xe cứu hộ',
                    shiftConfigId: selectedUnderstaffedShift.shiftDefId,
                    shiftName: selectedUnderstaffedShift.shiftName,
                    date: selectedUnderstaffedShift.date,
                    startTime: selectedUnderstaffedShift.startTime,
                    endTime: selectedUnderstaffedShift.endTime,
                    status: isSameDay(new Date(selectedUnderstaffedShift.date), new Date()) ? 'IN_PROGRESS' : 'PLANNED',
                    staffRole: 'Lái xe cứu hộ',
                    vehiclePlate: '29A-888.99',
                    vehicleType: 'Cứu hộ sàn trượt',
                  };
                  setAssignments((prev) => [...prev, newAsg]);
                  setAddStaffModalOpen(false);
                  showToast(`Đã thêm ${drv?.name} vào ca làm`);
                }}
                className="px-4 py-2 bg-[#01a651] hover:bg-[#008c44] text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                Thêm nhân viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DLG-04: CHI TIẾT CA LÀM ────────────────────────────────────────── */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Chi tiết phân công ca làm</h3>
                <p className="text-xs text-slate-500 mt-0.5">Mã ca: {detailModalItem.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Thông tin nhân viên & trạng thái */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {detailModalItem.driverName.split(' ').pop()?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{detailModalItem.driverName}</h4>
                    <p className="text-slate-500 text-[11px]">{detailModalItem.driverPhone || '0988 123 456'}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    shiftStatusBadgeStyles[detailModalItem.status]
                  }`}
                >
                  {shiftStatusLabels[detailModalItem.status]}
                </span>
              </div>

              {/* Thông tin ca làm */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Ca làm việc:</span>
                  <strong className="text-slate-800">{detailModalItem.shiftName}</strong>
                </div>
                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Ngày làm việc:</span>
                  <strong className="text-slate-800">{formatDisplayDate(detailModalItem.date)}</strong>
                </div>
                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Khung giờ:</span>
                  <strong className="text-slate-800">
                    {detailModalItem.startTime} – {detailModalItem.endTime}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Phương tiện cứu hộ:</span>
                  <strong className="text-slate-800">{detailModalItem.vehiclePlate || '29A-888.99'}</strong>
                </div>
              </div>

              {/* Dữ liệu kiểm tra xe & checkin */}
              <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#005d2d]">
                    <ShieldCheck className="w-4 h-4 text-[#01a651]" />
                    <span>Dữ liệu bàn giao ca & check-in (FDD FL-M2-03)</span>
                  </div>
                  {detailModalItem.checkinAt ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ✓ Đã Check-in ({detailModalItem.checkinAt})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      Chưa Check-in
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Km nhận ca:</span>
                    <strong className="text-slate-800">
                      {detailModalItem.startKm ? `${detailModalItem.startKm.toLocaleString()} km` : '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Km kết thúc:</span>
                    <strong className="text-slate-800">
                      {detailModalItem.endKm ? `${detailModalItem.endKm.toLocaleString()} km` : (detailModalItem.checkinAt ? 'Đang chạy...' : '—')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Quãng đường ca:</span>
                    <strong className="text-blue-700 font-bold">
                      {detailModalItem.startKm && detailModalItem.endKm
                        ? `+${(detailModalItem.endKm - detailModalItem.startKm).toLocaleString()} km`
                        : '—'}
                    </strong>
                  </div>
                </div>

                {detailModalItem.toolItems && detailModalItem.toolItems.some(t => t.condition !== 'GOOD') && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <span className="text-[10px] text-amber-800 font-bold block mb-1">
                      ⚠️ Công cụ có vấn đề ghi nhận lúc bàn giao:
                    </span>
                    <div className="space-y-1">
                      {detailModalItem.toolItems.filter(t => t.condition !== 'GOOD').map(t => (
                        <div key={t.name} className="flex items-center justify-between text-[10px] px-2 py-1 bg-amber-50 rounded border border-amber-200">
                          <span className="font-semibold">{t.name} ({t.actualQty}/{t.standardQty} {t.unit})</span>
                          <span className="text-amber-800 font-bold">{t.condition === 'BROKEN' ? 'Hỏng' : 'Thiếu'} {t.note ? `· ${t.note}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {detailModalItem.checkinNote && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Ghi chú nhận ca:</span>
                  <p className="text-slate-700">{detailModalItem.checkinNote}</p>
                </div>
              )}

              {detailModalItem.checkoutNote && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <span className="text-[11px] text-blue-700 block mb-0.5">Ghi chú bàn giao xe / trả ca:</span>
                  <p className="text-slate-700">{detailModalItem.checkoutNote}</p>
                </div>
              )}

              {detailModalItem.note && !detailModalItem.checkinNote && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Ghi chú:</span>
                  <p className="text-slate-700">{detailModalItem.note}</p>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                {!detailModalItem.checkinAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = detailModalItem;
                      setDetailModalItem(null);
                      handleOpenCheckin(item);
                    }}
                    className="px-3.5 py-2 bg-[#01a651] hover:bg-[#008f45] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Check-in nhận ca ngay</span>
                  </button>
                ) : !detailModalItem.checkoutAt ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = detailModalItem;
                      setDetailModalItem(null);
                      handleOpenCheckout(item);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Check-out kết thúc ca</span>
                  </button>
                ) : (
                  <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ca làm đã hoàn tất bàn giao</span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL SỬA CA LÀM ─────────────────────────────────────────────────── */}
      {editModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Cập nhật ca làm</h3>
                <p className="text-xs text-slate-500 mt-0.5">Chỉnh sửa thông tin phân công</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nhân viên</label>
                <select
                  value={editForm.driverId}
                  onChange={(e) => setEditForm({ ...editForm, driverId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                >
                  {stationDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ca làm việc</label>
                <select
                  value={editForm.shiftConfigId}
                  onChange={(e) => setEditForm({ ...editForm, shiftConfigId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                >
                  {(driverShiftDefs.length > 0 ? driverShiftDefs : [
                    { id: 'shift-c1', name: 'Ca 1 (Sáng)' },
                    { id: 'shift-c2', name: 'Ca 2 (Chiều)' },
                    { id: 'shift-cd', name: 'Ca đêm' },
                  ]).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ngày làm việc</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#01a651]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 text-xs font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const drv = stationDrivers.find((d) => d.id === editForm.driverId);
                  const s = (driverShiftDefs as any[]).find((x) => x.id === editForm.shiftConfigId) || {
                    name: 'Ca phân công',
                  };

                  setAssignments((prev) =>
                    prev.map((a) => {
                      if (a.id === editModalItem.id) {
                        return {
                          ...a,
                          driverId: editForm.driverId,
                          driverName: drv?.name || a.driverName,
                          shiftConfigId: editForm.shiftConfigId,
                          shiftName: s.name,
                          date: editForm.date,
                          note: editForm.note,
                        };
                      }
                      return a;
                    })
                  );
                  setEditModalItem(null);
                  showToast('Đã cập nhật ca làm thành công');
                }}
                className="px-4 py-2 bg-[#01a651] hover:bg-[#008c44] text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CHI TIẾT NGÀY (ShiftCalendarDayModal) ────────────────────────── */}
      {dayModalDate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Lịch trực ngày {formatDisplayDate(formatDateStr(dayModalDate))}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách phân công ca làm & điều phối nhân sự theo từng ca
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDayModalDate(null)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(driverShiftDefs.length > 0 ? driverShiftDefs : [
                { id: 'shift-c1', name: 'Ca 1 (Sáng)', timeStart: '07:00', timeEnd: '15:00' },
                { id: 'shift-c2', name: 'Ca 2 (Chiều)', timeStart: '13:30', timeEnd: '21:30' },
                { id: 'shift-cd', name: 'Ca đêm', timeStart: '21:30', timeEnd: '07:00' },
              ]).map((shift) => {
                const dateStr = formatDateStr(dayModalDate);
                const assigned = assignments.filter((a) => a.date === dateStr && a.shiftConfigId === shift.id);
                const locked = isStrictPast(dateStr);

                return (
                  <div key={shift.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{shift.name}</h4>
                        <span className="text-xs text-slate-500">
                          {shift.timeStart} – {shift.timeEnd}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-[#005d2d] border border-emerald-200 rounded-full font-bold text-xs">
                        {assigned.length} nhân viên
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {assigned.map((staff) => (
                        <div
                          key={staff.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-2xs hover:border-slate-300 transition"
                        >
                          <div
                            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                            onClick={() => {
                              setDayModalDate(null);
                              setDetailModalItem(staff);
                            }}
                          >
                            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {staff.driverName.split(' ').pop()?.charAt(0) || 'T'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs text-slate-800 truncate flex items-center gap-1.5">
                                <span>{staff.driverName}</span>
                                {staff.checkinAt && (
                                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                    ✓ In {staff.checkinAt}
                                  </span>
                                )}
                                {staff.checkoutAt && (
                                  <span className="text-[10px] font-normal text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                    Out {staff.checkoutAt}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {staff.vehiclePlate || 'Chưa gán xe'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {!staff.checkinAt ? (
                              <button
                                type="button"
                                onClick={() => setCheckinModalItem(staff)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition"
                                title="Check-in nhận ca"
                              >
                                <LogIn className="w-3 h-3" />
                                In
                              </button>
                            ) : !staff.checkoutAt ? (
                              <button
                                type="button"
                                onClick={() => setCheckoutModalItem(staff)}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition"
                                title="Check-out trả ca"
                              >
                                <LogOut className="w-3 h-3" />
                                Out
                              </button>
                            ) : null}

                            {!locked && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveAssignment(staff.id, staff.driverName, shift.name, dateStr)
                                }
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded transition"
                                title="Xóa nhân viên khỏi ca"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {assigned.length === 0 && (
                        <div className="col-span-2 text-center py-4 text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                          Chưa có nhân viên nào được phân công trong ca này
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => setDayModalDate(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CONFIRM CHUNG ──────────────────────────────────────────────── */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5">
              <h3 className="font-bold text-base text-slate-900 mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                className="px-3.5 py-1.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 text-xs font-medium transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, open: false });
                }}
                className="px-4 py-1.5 bg-[#01a651] hover:bg-[#008c44] text-white rounded-md text-xs font-semibold shadow-xs transition"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CHECK-IN NHẬN CA ────────────────────────────────────────── */}
      {checkinModalItem && (
        <CheckinModal
          isOpen={Boolean(checkinModalItem)}
          assignment={checkinModalItem}
          onClose={() => setCheckinModalItem(null)}
          onConfirm={handleSaveCheckin}
        />
      )}

      {/* ─── MODAL CHECK-OUT KẾT THÚC CA ───────────────────────────────────── */}
      {checkoutModalItem && (
        <CheckoutModal
          isOpen={Boolean(checkoutModalItem)}
          assignment={checkoutModalItem}
          onClose={() => setCheckoutModalItem(null)}
          onConfirm={handleSaveCheckout}
        />
      )}

      {/* ─── MODAL MÔ PHỎNG APP MOBILE TÀI XẾ ─────────────────────────────── */}
      <AppShiftSimulatorModal
        isOpen={appSimulatorOpen}
        onClose={() => setAppSimulatorOpen(false)}
        assignments={assignments}
        drivers={stationDrivers || []}
        onTriggerCheckin={(item) => setCheckinModalItem(item)}
        onTriggerCheckout={(item) => setCheckoutModalItem(item)}
      />
    </div>
  );
};

export default ShiftMonthlySchedule;
