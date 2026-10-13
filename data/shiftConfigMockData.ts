export type ShiftRole = 'OSA' | 'CSKH' | 'DRIVER';

export type ShiftType = 'ADMIN' | 'TIME_SLOT' | 'SPLIT';

/** Ca làm việc — KEY dùng cho Excel, có khung giờ để tính chồng lấn */
export type ShiftDefinition = {
  id: string;
  role: ShiftRole;
  shiftKey: string;
  name: string;
  type: ShiftType;
  timeStart: string;
  timeEnd: string;
  splitPart?: 'AM' | 'PM';
  status: 'active' | 'inactive';
  description?: string;
  /** Ca đêm — cấu hình khi tạo/sửa ca làm việc */
  isNightShift?: boolean;
  /** Làm ca đêm → nghỉ cả ngày hôm sau (mặc định bật khi là ca đêm) */
  restDayAfterShift?: boolean;
  /** Ca OT — hiển thị màu riêng, dùng khi thiếu người */
  isOvertime?: boolean;
  /** Nhóm ca chính — dùng cho tổng hợp cảnh báo */
  staffingGroup?: 'SPLIT' | 'FULL';
  /** Số người tối thiểu / tối đa theo KEY ca (9 ca chính) */
  minStaff?: number;
  maxStaff?: number;
  /** Nghỉ giữa ca (work_shift_break) */
  breakStart?: string;
  breakEnd?: string;
};

/**
 * Khung giờ trong ngày — cảnh báo thiếu/thừa người tính theo TỔNG người
 * đang làm việc trong khung (gộp mọi loại ca chồng lấn), KHÔNG theo từng KEY ca.
 */
export type TimeSlotStaffingRule = {
  id: string;
  role: ShiftRole;
  label: string;
  timeStart: string;
  timeEnd: string;
  minStaff: number;
  maxStaff?: number;
  status: 'active' | 'inactive';
};

export type MonthlyEmployee = {
  id: string;
  code: string;
  name: string;
  isNewEmployee: boolean;
  assignments: Record<number, string | null>;
};

/** Trạng thái làm việc thực tế theo đơn — chỉ áp dụng ngày đã qua */
export type EmployeeActualWorkStatus = 'WORKED' | 'NO_ORDERS' | 'OFF';

export type EmployeeDayWorkFact = {
  employeeId: string;
  day: number;
  status: EmployeeActualWorkStatus;
  orderCount: number;
};

export const ACTUAL_WORK_META: Record<
  EmployeeActualWorkStatus,
  { label: string; cell: string; dot: string; badge: string }
> = {
  WORKED: {
    label: 'Có đơn',
    cell: 'border-l-2 border-l-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-600 text-white',
  },
  NO_ORDERS: {
    label: 'Không có đơn',
    cell: 'border-l-2 border-l-red-500 ring-1 ring-amber-200',
    dot: 'bg-red-500',
    badge: 'bg-amber-600 text-white',
  },
  OFF: {
    label: 'Nghỉ',
    cell: '',
    dot: 'bg-slate-300',
    badge: 'bg-slate-400 text-white',
  },
};

export function actualWorkFactKey(employeeId: string, day: number): string {
  return `${employeeId}-${day}`;
}

export function isStrictPastDay(
  yearMonth: string,
  day: number,
  refDate: Date = new Date()
): boolean {
  const currentYearMonth = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  if (yearMonth < currentYearMonth) return true;
  if (yearMonth > currentYearMonth) return false;
  return day < refDate.getDate();
}

/** Ngày tương lai trên lịch (sau hôm nay) — giữ nguyên hôm nay & quá khứ khi đổi cấu hình ca */
export function isFutureScheduleDay(
  yearMonth: string,
  day: number,
  refDate: Date = new Date()
): boolean {
  const currentYearMonth = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  if (yearMonth > currentYearMonth) return true;
  if (yearMonth < currentYearMonth) return false;
  return day > refDate.getDate();
}

export type FutureShiftKeyUsage = {
  yearMonth: string;
  cellCount: number;
  employeeCount: number;
  days: number[];
};

/** Đếm ô lịch tương lai đang gán KEY ca (hỗ trợ KEY ghép `C1+CG1`) */
export function summarizeFutureShiftKeyUsage(
  shiftKey: string,
  employees: MonthlyEmployee[],
  yearMonth: string,
  refDate: Date = new Date()
): FutureShiftKeyUsage {
  const daysInMonth = getDaysInMonth(yearMonth);
  const employeeIds = new Set<string>();
  const daySet = new Set<number>();
  let cellCount = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (!isFutureScheduleDay(yearMonth, day, refDate)) continue;
    employees.forEach((emp) => {
      const raw = emp.assignments[day];
      if (!raw) return;
      const keys = raw.split('+').map((s) => s.trim());
      if (!keys.includes(shiftKey)) return;
      cellCount += 1;
      employeeIds.add(emp.id);
      daySet.add(day);
    });
  }

  return {
    yearMonth,
    cellCount,
    employeeCount: employeeIds.size,
    days: [...daySet].sort((a, b) => a - b),
  };
}

/** Mock kiểm tra đơn thực tế theo ngày đã qua (BE sẽ thay bằng API) */
export function buildMockActualWorkFacts(
  employees: MonthlyEmployee[],
  yearMonth: string
): Map<string, EmployeeDayWorkFact> {
  const map = new Map<string, EmployeeDayWorkFact>();
  const now = new Date();
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let pastDays: number[] = [];
  if (yearMonth < currentYearMonth) {
    pastDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  } else if (yearMonth === currentYearMonth) {
    const today = now.getDate();
    pastDays = Array.from({ length: Math.max(0, today - 1) }, (_, i) => i + 1);
  } else {
    return map;
  }

  employees.forEach((emp) => {
    pastDays.forEach((day) => {
      const shiftKey = emp.assignments[day];
      const key = actualWorkFactKey(emp.id, day);

      if (!shiftKey) {
        if (emp.id === 'e2' && day === 5) {
          map.set(key, { employeeId: emp.id, day, status: 'WORKED', orderCount: 1 });
        } else if (emp.id === 'c2' && day === 4) {
          map.set(key, { employeeId: emp.id, day, status: 'WORKED', orderCount: 2 });
        } else {
          map.set(key, { employeeId: emp.id, day, status: 'OFF', orderCount: 0 });
        }
        return;
      }

      const noOrderDemo =
        (emp.id === 'e1' && (day === 2 || day === 4)) ||
        (emp.id === 'e2' && day === 3) ||
        (emp.id === 'e3' && day === 6) ||
        (emp.id === 'e5' && day === 8) ||
        (emp.id === 'c1' && day === 2) ||
        (emp.id === 'c3' && day === 6);

      if (noOrderDemo) {
        map.set(key, { employeeId: emp.id, day, status: 'NO_ORDERS', orderCount: 0 });
      } else {
        const orderCount = 1 + ((day + emp.code.length) % 4);
        map.set(key, { employeeId: emp.id, day, status: 'WORKED', orderCount });
      }
    });
  });

  return map;
}

export type ShiftDayWarning = {
  date: string;
  shiftKey: string;
  shiftTimeLabel: string;
  type: 'UNDERSTAFFED' | 'OVERSTAFFED' | 'ALL_NEW';
  assigned: number;
  minStaff: number;
  maxStaff: number;
  message: string;
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  ADMIN: 'Ca hành chính',
  TIME_SLOT: 'Ca theo khung giờ',
  SPLIT: 'Ca gãy (Nửa ca)',
};

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  ADMIN: 'bg-blue-50 text-blue-700 border-blue-200',
  TIME_SLOT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SPLIT: 'bg-amber-50 text-amber-700 border-amber-200',
};

/** Thứ tự hiển thị 9 ca chính */
export const CANONICAL_SHIFT_ORDER = [
  'CG1', 'CG2', 'CG3', 'CG4', 'CG5', 'CG6', 'C1', 'C2', 'C3',
] as const;

type CanonicalTemplate = Omit<ShiftDefinition, 'id' | 'role'>;

const CANONICAL_SHIFT_TEMPLATES: CanonicalTemplate[] = [
  { shiftKey: 'CG1', name: 'Ca gãy 1', type: 'SPLIT', timeStart: '07:00', timeEnd: '11:00', staffingGroup: 'SPLIT', minStaff: 2, maxStaff: 4, status: 'active' },
  { shiftKey: 'CG2', name: 'Ca gãy 2', type: 'SPLIT', timeStart: '08:00', timeEnd: '12:00', staffingGroup: 'SPLIT', minStaff: 2, maxStaff: 4, status: 'active' },
  { shiftKey: 'CG3', name: 'Ca gãy 3', type: 'SPLIT', timeStart: '13:00', timeEnd: '17:00', staffingGroup: 'SPLIT', minStaff: 2, maxStaff: 4, status: 'active' },
  { shiftKey: 'CG4', name: 'Ca gãy 4', type: 'SPLIT', timeStart: '15:00', timeEnd: '19:00', staffingGroup: 'SPLIT', minStaff: 2, maxStaff: 4, status: 'active' },
  { shiftKey: 'CG5', name: 'Ca gãy 5', type: 'SPLIT', timeStart: '17:00', timeEnd: '21:00', staffingGroup: 'SPLIT', minStaff: 2, maxStaff: 4, status: 'active' },
  { shiftKey: 'CG6', name: 'Ca gãy 6', type: 'SPLIT', timeStart: '17:30', timeEnd: '21:30', staffingGroup: 'SPLIT', minStaff: 2, maxStaff: 4, status: 'active' },
  { shiftKey: 'C1', name: 'Ca 1', type: 'TIME_SLOT', timeStart: '07:00', timeEnd: '15:00', staffingGroup: 'FULL', minStaff: 3, maxStaff: 5, status: 'active' },
  { shiftKey: 'C2', name: 'Ca 2', type: 'TIME_SLOT', timeStart: '13:30', timeEnd: '21:30', staffingGroup: 'FULL', minStaff: 3, maxStaff: 5, status: 'active' },
  {
    shiftKey: 'C3',
    name: 'Ca 3',
    type: 'TIME_SLOT',
    timeStart: '21:30',
    timeEnd: '07:00',
    staffingGroup: 'FULL',
    minStaff: 2,
    maxStaff: 3,
    status: 'active',
    isNightShift: true,
    restDayAfterShift: true,
  },
];

const OT_SHIFT_TEMPLATE: CanonicalTemplate = {
  shiftKey: 'OT',
  name: 'Ca OT',
  type: 'TIME_SLOT',
  timeStart: '00:00',
  timeEnd: '23:59',
  status: 'active',
  isOvertime: true,
  description: 'Tăng ca khi thiếu người',
};

function buildRoleShifts(role: ShiftRole): ShiftDefinition[] {
  const canonical = CANONICAL_SHIFT_TEMPLATES.map((t) => ({
    ...t,
    id: `${role.toLowerCase()}-${t.shiftKey.toLowerCase()}`,
    role,
  }));
  if (role === 'OSA') {
    return canonical;
  }
  return [...canonical, { ...OT_SHIFT_TEMPLATE, id: `${role.toLowerCase()}-ot`, role }];
}

export const MOCK_SHIFT_DEFINITIONS: ShiftDefinition[] = [
  ...buildRoleShifts('OSA'),
  ...buildRoleShifts('CSKH'),
  ...buildRoleShifts('DRIVER'),
];

const DAY_END_MIN = 24 * 60;

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function rangeCrossesMidnight(start: string, end: string): boolean {
  return toMinutes(end) <= toMinutes(start);
}

export function formatShiftTimeLabel(timeStart: string, timeEnd: string): string {
  const fmt = (t: string) => t.replace(':00', 'h').replace(':', 'h');
  if (rangeCrossesMidnight(timeStart, timeEnd)) {
    return `${fmt(timeStart)}→${fmt(timeEnd)}`;
  }
  return `${fmt(timeStart)}–${fmt(timeEnd)}`;
}

/** Định mức công tối thiểu/tháng — do BE cấu hình, FE chỉ đọc */
export const MOCK_MIN_SHIFT_UNITS_FROM_BE: Record<ShiftRole, number> = {
  OSA: 16,
  CSKH: 18,
  DRIVER: 16,
};

/** @deprecated Dùng minStaff trên ShiftDefinition — giữ cho màn cấu hình tương thích */
export const MOCK_TIME_SLOT_RULES: TimeSlotStaffingRule[] = MOCK_SHIFT_DEFINITIONS.filter(
  (s) => s.minStaff != null && !s.isOvertime
).map((s) => ({
  id: `${s.role}-${s.shiftKey}`,
  role: s.role,
  label: `${s.shiftKey} (${formatShiftTimeLabel(s.timeStart, s.timeEnd)})`,
  timeStart: s.timeStart,
  timeEnd: s.timeEnd,
  minStaff: s.minStaff!,
  maxStaff: s.maxStaff,
  status: 'active' as const,
}));

export const MOCK_SHIFT_LEADERS: Record<ShiftRole, { id: string; name: string; code: string }[]> = {
  OSA: [
    { id: 'l1', code: 'OSA-TL-01', name: 'Nguyễn Thị Lan' },
    { id: 'l2', code: 'OSA-TL-02', name: 'Trần Văn Hùng' },
  ],
  CSKH: [
    { id: 'l3', code: 'CSKH-TL-01', name: 'Phạm Minh Anh' },
    { id: 'l4', code: 'CSKH-TL-02', name: 'Lê Hoài Thu' },
  ],
  DRIVER: [
    { id: 'l5', code: 'DRV-TL-01', name: 'Ngô Đức Minh' },
    { id: 'l6', code: 'DRV-TL-02', name: 'Trần Văn Bình' },
  ],
};

// ─── Driver mock data per station ──────────────────────────────────────────

export interface DriverStationMockRecord {
  id: string;
  code: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export const MOCK_STATIONS_FOR_SHIFT = [
  { id: 'stn-hn1', name: 'Trạm HN - Hoàng Mai' },
  { id: 'stn-hn2', name: 'Trạm HN - Cầu Giấy' },
  { id: 'stn-hp1', name: 'Trạm Hải Phòng' },
  { id: 'stn-hcm1', name: 'Trạm HCM - Bình Thạnh' },
  { id: 'stn-dn1', name: 'Trạm Đà Nẵng' },
];

export const MOCK_DRIVERS_BY_STATION: Record<string, DriverStationMockRecord[]> = {
  'stn-hn1': [
    { id: 'drv-hn1-01', code: 'TX-HN1-01', name: 'NGÔ ĐỨC MINH', phone: '0988 123 456', status: 'ACTIVE' },
    { id: 'drv-hn1-02', code: 'TX-HN1-02', name: 'LÊ VĂN CƯỜNG', phone: '0977 234 567', status: 'ACTIVE' },
    { id: 'drv-hn1-03', code: 'TX-HN1-03', name: 'PHẠM HOÀNG ANH', phone: '0966 345 678', status: 'ACTIVE' },
    { id: 'drv-hn1-04', code: 'TX-HN1-04', name: 'TRẦN MINH NHẬT', phone: '0955 456 789', status: 'ACTIVE' },
    { id: 'drv-hn1-05', code: 'TX-HN1-05', name: 'ĐINH VĂN PHÚC', phone: '0944 567 890', status: 'ACTIVE' },
    { id: 'drv-hn1-06', code: 'TX-HN1-06', name: 'NGUYỄN QUỐC BẢO', phone: '0933 678 901', status: 'INACTIVE' },
  ],
  'stn-hn2': [
    { id: 'drv-hn2-01', code: 'TX-HN2-01', name: 'HOÀNG MINH ĐĂNG', phone: '0922 789 012', status: 'ACTIVE' },
    { id: 'drv-hn2-02', code: 'TX-HN2-02', name: 'VŨ THANH LONG', phone: '0911 890 123', status: 'ACTIVE' },
    { id: 'drv-hn2-03', code: 'TX-HN2-03', name: 'BÙI VĂN HÙNG', phone: '0900 901 234', status: 'ACTIVE' },
  ],
  'stn-hp1': [
    { id: 'drv-hp1-01', code: 'TX-HP1-01', name: 'TRẦN VĂN BÌNH', phone: '0977 012 345', status: 'ACTIVE' },
    { id: 'drv-hp1-02', code: 'TX-HP1-02', name: 'NGUYỄN ĐỨC SƠN', phone: '0966 123 456', status: 'ACTIVE' },
    { id: 'drv-hp1-03', code: 'TX-HP1-03', name: 'LÝ VĂN TUẤN', phone: '0955 234 567', status: 'ACTIVE' },
    { id: 'drv-hp1-04', code: 'TX-HP1-04', name: 'PHÙNG QUANG VINH', phone: '0944 345 678', status: 'ACTIVE' },
  ],
  'stn-hcm1': [
    { id: 'drv-hcm1-01', code: 'TX-HCM1-01', name: 'LÊ HOÀNG CƯỜNG', phone: '0933 456 789', status: 'ACTIVE' },
    { id: 'drv-hcm1-02', code: 'TX-HCM1-02', name: 'ĐẶNG VĂN KHOA', phone: '0922 567 890', status: 'ACTIVE' },
    { id: 'drv-hcm1-03', code: 'TX-HCM1-03', name: 'MAI THANH TÙNG', phone: '0911 678 901', status: 'ACTIVE' },
  ],
  'stn-dn1': [
    { id: 'drv-dn1-01', code: 'TX-DN1-01', name: 'PHAN THỊ DUYÊN', phone: '0900 789 012', status: 'ACTIVE' },
    { id: 'drv-dn1-02', code: 'TX-DN1-02', name: 'TRƯƠNG VĂN ĐẠT', phone: '0988 890 123', status: 'ACTIVE' },
    { id: 'drv-dn1-03', code: 'TX-DN1-03', name: 'HỒ VĂN KHẢI', phone: '0977 901 234', status: 'ACTIVE' },
  ],
};

export const MOCK_MIN_SHIFT_UNITS_FROM_BE_EXTENDED: Record<ShiftRole, number> = {
  OSA: 18,
  CSKH: 14,
  DRIVER: 16,
};

function slotMinuteRanges(slot: TimeSlotStaffingRule): [number, number][] {
  const s = toMinutes(slot.timeStart);
  const e = toMinutes(slot.timeEnd);
  if (!rangeCrossesMidnight(slot.timeStart, slot.timeEnd)) {
    return s < e ? [[s, e]] : [];
  }
  return [
    [s, DAY_END_MIN],
    [0, e],
  ];
}

/** Phần ca nằm trên calendarDay khi được gán ở assignmentDay */
function shiftRangesOnCalendarDay(
  shift: ShiftDefinition,
  assignmentDay: number,
  calendarDay: number
): [number, number][] {
  if (calendarDay < assignmentDay || calendarDay > assignmentDay + 1) return [];

  if (shift.isOvertime) {
    return [[0, DAY_END_MIN]];
  }

  const s = toMinutes(shift.timeStart);
  const e = toMinutes(shift.timeEnd);
  const overnight = rangeCrossesMidnight(shift.timeStart, shift.timeEnd);

  if (calendarDay === assignmentDay) {
    if (!overnight) return s < e ? [[s, e]] : [];
    return [[s, DAY_END_MIN]];
  }
  if (overnight) return [[0, e]];
  return [];
}

function rangesOverlap(a: [number, number][], b: [number, number][]): boolean {
  for (const [a0, a1] of a) {
    for (const [b0, b1] of b) {
      if (a0 < b1 && b0 < a1) return true;
    }
  }
  return false;
}

export function shiftCoversSlotOnDay(
  shift: ShiftDefinition,
  slot: TimeSlotStaffingRule,
  assignmentDay: number,
  calendarDay: number
): boolean {
  const shiftRanges = shiftRangesOnCalendarDay(shift, assignmentDay, calendarDay);
  const slotRanges = slotMinuteRanges(slot);
  return rangesOverlap(shiftRanges, slotRanges);
}

export const timeRangesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const slotLike = (start: string, end: string): [number, number][] => {
    const s = toMinutes(start);
    const e = toMinutes(end);
    if (!rangeCrossesMidnight(start, end)) return s < e ? [[s, e]] : [];
    return [
      [s, DAY_END_MIN],
      [0, e],
    ];
  };
  return rangesOverlap(slotLike(startA, endA), slotLike(startB, endB));
};

export type ShiftScheduleConfig = {
  shiftDefinitions?: ShiftDefinition[];
  timeSlotRules?: TimeSlotStaffingRule[];
};

function resolveShiftDefinitions(role: ShiftRole, config?: ShiftScheduleConfig) {
  const source = config?.shiftDefinitions ?? MOCK_SHIFT_DEFINITIONS;
  return source.filter((s) => s.role === role && s.status === 'active');
}

function resolveTimeSlotRules(role: ShiftRole, config?: ShiftScheduleConfig) {
  const source = config?.timeSlotRules ?? MOCK_TIME_SLOT_RULES;
  return source.filter((r) => r.role === role && r.status === 'active');
}

export function getStaffingShiftsForRole(role: ShiftRole, config?: ShiftScheduleConfig): ShiftDefinition[] {
  const defs = resolveShiftDefinitions(role, config);
  const order = CANONICAL_SHIFT_ORDER as readonly string[];
  return defs
    .filter((s) => s.minStaff != null && !s.isOvertime)
    .sort((a, b) => order.indexOf(a.shiftKey) - order.indexOf(b.shiftKey));
}

/** Đếm NV được gán đúng KEY ca trong ngày */
export function countStaffOnShiftKey(
  day: number,
  shiftKey: string,
  employees: MonthlyEmployee[]
): MonthlyEmployee[] {
  return employees.filter((emp) => {
    const raw = emp.assignments[day];
    if (!raw) return false;
    return raw.split('+').map((s) => s.trim()).includes(shiftKey);
  });
}

export function getShiftDefinitionsForRole(role: ShiftRole, config?: ShiftScheduleConfig) {
  return resolveShiftDefinitions(role, config);
}

export function getTimeSlotRulesForRole(role: ShiftRole, config?: ShiftScheduleConfig) {
  return resolveTimeSlotRules(role, config);
}

function getShiftDefMap(role: ShiftRole, config?: ShiftScheduleConfig): Map<string, ShiftDefinition> {
  return new Map(resolveShiftDefinitions(role, config).map((s) => [s.shiftKey, s]));
}

/** Đếm NV đang làm việc trong khung giờ (gộp ca cùng ngày + đuôi ca đêm hôm trước) */
export function countStaffInTimeSlot(
  day: number,
  slot: TimeSlotStaffingRule,
  employees: MonthlyEmployee[],
  shiftByKey: Map<string, ShiftDefinition>
): MonthlyEmployee[] {
  return employees.filter((emp) => {
    const checks: { assignmentDay: number; key: string | null | undefined }[] = [
      { assignmentDay: day, key: emp.assignments[day] },
    ];
    if (day > 1) {
      checks.push({ assignmentDay: day - 1, key: emp.assignments[day - 1] });
    }
    return checks.some(({ assignmentDay, key }) => {
      if (!key) return false;
      const shift = shiftByKey.get(key);
      if (!shift) return false;
      return shiftCoversSlotOnDay(shift, slot, assignmentDay, day);
    });
  });
}

export function slotOverlapsShift(
  slot: TimeSlotStaffingRule,
  shift: ShiftDefinition | undefined
): boolean {
  if (!shift) return false;
  if (shift.isOvertime) return true;
  return timeRangesOverlap(shift.timeStart, shift.timeEnd, slot.timeStart, slot.timeEnd);
}

const buildAssignments = (
  pattern: (day: number) => string | null,
  daysInMonth: number
): Record<number, string | null> => {
  const result: Record<number, string | null> = {};
  for (let d = 1; d <= daysInMonth; d += 1) {
    result[d] = pattern(d);
  }
  return result;
};

const applyFutureUnconfiguredDemo = (
  employees: MonthlyEmployee[],
  role: ShiftRole,
  daysInMonth: number,
  yearMonth: string
) => {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (yearMonth !== currentYearMonth) return;

  const today = now.getDate();
  const fullyUnconfiguredIds =
    role === 'OSA' ? ['e3', 'e4', 'e8', 'e10'] : ['c3', 'c4', 'c9', 'c11'];
  const partiallyUnconfiguredIds =
    role === 'OSA' ? ['e5', 'e6', 'e7'] : ['c5', 'c6', 'c7'];

  employees.forEach((emp) => {
    if (fullyUnconfiguredIds.includes(emp.id)) {
      for (let d = today + 1; d <= daysInMonth; d += 1) {
        emp.assignments[d] = null;
      }
      return;
    }
    if (partiallyUnconfiguredIds.includes(emp.id)) {
      for (let d = today + 1; d <= daysInMonth; d += 2) {
        emp.assignments[d] = null;
      }
    }
  });
};

export const buildMockMonthlyEmployees = (
  role: ShiftRole,
  daysInMonth: number,
  config?: ShiftScheduleConfig,
  yearMonth?: string
): MonthlyEmployee[] => {
  const keys = getShiftDefinitionsForRole(role, config).map((s) => s.shiftKey);
  const workKeys = keys.filter((k) => k !== 'OT');
  const k = (key: string) => (keys.includes(key) ? key : workKeys[0] ?? null);

  const pick = (day: number, offset: number) => {
    if (day % 7 === 0) return null;
    return workKeys[(day + offset) % workKeys.length];
  };

  const base = (id: string, code: string, name: string, isNew: boolean, pattern: (d: number) => string | null) => ({
    id,
    code,
    name,
    isNewEmployee: isNew,
    assignments: buildAssignments(pattern, daysInMonth),
  });

  if (role === 'OSA') {
    const employees = [
      base('e1', 'OSA-001', 'Nguyễn Văn A', false, (d) => pick(d, 0)),
      base('e2', 'OSA-002', 'Trần Thị B', false, (d) => pick(d, 1)),
      base('e3', 'OSA-003', 'Lê Văn C', true, (d) => pick(d, 2)),
      base('e4', 'OSA-004', 'Phạm Thị D', true, (d) => pick(d, 3)),
      base('e5', 'OSA-005', 'Hoàng Văn E', false, (d) => pick(d, 4)),
      base('e6', 'OSA-006', 'Võ Thị F', false, (d) => pick(d, 5)),
      base('e7', 'OSA-007', 'Đặng Văn G', false, (d) => pick(d, 6)),
      base('e8', 'OSA-008', 'Bùi Thị H', true, (d) => pick(d, 7)),
      base('e9', 'OSA-009', 'Ngô Văn I', false, (d) => pick(d, 0)),
      base('e10', 'OSA-010', 'Dương Thị K', false, (d) => pick(d, 1)),
    ];

    const setDay = (day: number, assign: Record<string, string | null>) => {
      if (day > daysInMonth) return;
      employees.forEach((emp) => {
        if (assign[emp.id] !== undefined) {
          emp.assignments[day] = assign[emp.id];
        }
      });
    };

    setDay(7, {
      e1: k('CG1'), e2: null, e3: null, e4: null, e5: null,
      e6: null, e7: null, e8: null, e9: null, e10: null,
    });
    setDay(14, {
      e1: k('C1'), e2: null, e3: null, e4: null, e5: null,
      e6: null, e7: null, e8: null, e9: null, e10: null,
    });
    setDay(3, {
      e1: k('CG1'), e2: k('CG1'), e3: k('CG1'), e4: k('CG1'), e5: k('CG1'),
      e6: k('CG1'), e7: k('CG1'), e8: k('CG1'), e9: k('CG1'), e10: k('CG1'),
    });
    setDay(10, {
      e1: null, e2: null, e3: k('CG3'), e4: k('CG3'), e5: null,
      e6: null, e7: null, e8: k('CG3'), e9: null, e10: null,
    });
    setDay(21, {
      e1: null, e2: null, e3: k('C3'), e4: k('C3'), e5: null,
      e6: null, e7: null, e8: null, e9: null, e10: null,
    });

    if (yearMonth) applyFutureUnconfiguredDemo(employees, role, daysInMonth, yearMonth);
    return employees;
  }

  const employees = [
    base('c1', 'CSKH-001', 'Vũ Thị F', false, (d) => pick(d, 0)),
    base('c2', 'CSKH-002', 'Đỗ Văn G', false, (d) => pick(d, 1)),
    base('c3', 'CSKH-003', 'Bùi Thị H', true, (d) => pick(d, 2)),
    base('c4', 'CSKH-004', 'Mai Văn I', true, (d) => pick(d, 3)),
    base('c5', 'CSKH-005', 'Cao Thị K', false, (d) => pick(d, 4)),
    base('c6', 'CSKH-006', 'Dương Văn L', false, (d) => pick(d, 5)),
    base('c7', 'CSKH-007', 'Hồ Thị M', false, (d) => pick(d, 6)),
    base('c8', 'CSKH-008', 'Lý Văn N', false, (d) => pick(d, 0)),
    base('c9', 'CSKH-009', 'Trịnh Thị O', true, (d) => pick(d, 1)),
    base('c10', 'CSKH-010', 'Phan Văn P', false, (d) => pick(d, 2)),
    base('c11', 'CSKH-011', 'Vương Thị Q', false, (d) => pick(d, 3)),
  ];

  const setDay = (day: number, assign: Record<string, string | null>) => {
    if (day > daysInMonth) return;
    employees.forEach((emp) => {
      if (assign[emp.id] !== undefined) {
        emp.assignments[day] = assign[emp.id];
      }
    });
  };

  setDay(7, {
    c1: k('CG2'), c2: null, c3: null, c4: null, c5: null, c6: null,
    c7: null, c8: null, c9: null, c10: null, c11: null,
  });
  setDay(5, {
    c1: k('CG1'), c2: k('CG1'), c3: k('CG1'), c4: k('CG1'), c5: k('CG1'), c6: k('CG1'),
    c7: k('CG1'), c8: k('CG1'), c9: k('CG1'), c10: k('CG1'), c11: k('CG1'),
  });
  setDay(12, {
    c1: null, c2: null, c3: k('C1'), c4: k('C1'), c5: null, c6: null,
    c7: null, c8: null, c9: null, c10: null, c11: null,
  });
  setDay(18, {
    c1: k('C1'), c2: null, c3: null, c4: null, c5: null, c6: null,
    c7: null, c8: null, c9: null, c10: null, c11: null,
  });
  setDay(25, {
    c1: null, c2: null, c3: k('C3'), c4: k('C3'), c5: null, c6: null,
    c7: null, c8: null, c9: null, c10: null, c11: null,
  });

  if (yearMonth) applyFutureUnconfiguredDemo(employees, role, daysInMonth, yearMonth);
  return employees;
};

/** Build mock monthly employees for DRIVER role, keyed by stationId */
export const buildMockDriverEmployees = (
  stationId: string,
  daysInMonth: number,
  yearMonth?: string
): MonthlyEmployee[] => {
  const drivers = MOCK_DRIVERS_BY_STATION[stationId] ?? [];
  const keys = ['C1', 'C2', 'C3'];
  const workKeys = keys;

  const pick = (day: number, offset: number): string | null => {
    if (day % 7 === 0) return null; // nghỉ CN
    return workKeys[(day + offset) % workKeys.length];
  };

  const base = (driver: typeof drivers[0], offset: number): MonthlyEmployee => ({
    id: driver.id,
    code: driver.code,
    name: driver.name,
    isNewEmployee: false,
    assignments: (() => {
      const a: Record<number, string | null> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        a[d] = driver.status === 'ACTIVE' ? pick(d, offset) : null;
      }
      return a;
    })(),
  });

  return drivers
    .filter((d) => d.status === 'ACTIVE')
    .map((d, i) => base(d, i));
};

export function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export type ShiftCoverageDayStat = {
  shiftKey: string;
  assigned: number;
  minStaff: number;
  maxStaff: number;
  warnings: ShiftDayWarning[];
  onDutyEmployees: MonthlyEmployee[];
};

/** @deprecated alias — dùng ShiftCoverageDayStat */
export type TimeSlotDayStat = ShiftCoverageDayStat;

export type ShiftDailySummaryStat = {
  c1Assigned: number;
  c2Assigned: number;
  c3Assigned: number;
  splitAssigned: number;
  fullAssigned: number;
  offCount: number;
  totalEquivalent: number;
  totalRequired: number;
  shortage: number;
};

export type SessionSummary = {
  morning: number;
  afternoon: number;
  night: number;
  requiredMorning: number;
  requiredAfternoon: number;
  requiredNight: number;
  shortageMorning: number;
  shortageAfternoon: number;
  shortageNight: number;
};

export function computeShiftCoverageStats(
  role: ShiftRole,
  yearMonth: string,
  employees: MonthlyEmployee[],
  config?: ShiftScheduleConfig
): Map<string, ShiftCoverageDayStat> {
  const daysInMonth = getDaysInMonth(yearMonth);
  const staffingShifts = getStaffingShiftsForRole(role, config).filter(
    (s) => s.staffingGroup === 'FULL'
  );
  const allWarnings = computeShiftWarnings(role, yearMonth, employees, config);
  const map = new Map<string, ShiftCoverageDayStat>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateLabel = `${String(day).padStart(2, '0')}/${yearMonth.slice(5, 7)}/${yearMonth.slice(0, 4)}`;
    for (const shift of staffingShifts) {
      const onDuty = countStaffOnShiftKey(day, shift.shiftKey, employees);
      const minStaff = shift.minStaff ?? 0;
      const maxStaff = shift.maxStaff ?? minStaff + 2;
      const warnings = allWarnings.filter(
        (w) => w.shiftKey === shift.shiftKey && w.date === dateLabel
      );
      map.set(`${day}-${shift.shiftKey}`, {
        shiftKey: shift.shiftKey,
        assigned: onDuty.length,
        minStaff,
        maxStaff,
        warnings,
        onDutyEmployees: onDuty,
      });
    }
  }
  return map;
}

/** @deprecated Dùng computeShiftCoverageStats */
export function computeTimeSlotDayStats(
  role: ShiftRole,
  yearMonth: string,
  employees: MonthlyEmployee[],
  config?: ShiftScheduleConfig
): Map<string, ShiftCoverageDayStat> {
  return computeShiftCoverageStats(role, yearMonth, employees, config);
}

export function computeShiftWarnings(
  role: ShiftRole,
  yearMonth: string,
  employees: MonthlyEmployee[],
  config?: ShiftScheduleConfig
): ShiftDayWarning[] {
  const daysInMonth = getDaysInMonth(yearMonth);
  const staffingShifts = getStaffingShiftsForRole(role, config).filter(
    (s) => s.staffingGroup === 'FULL'
  );
  const warnings: ShiftDayWarning[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateLabel = `${String(day).padStart(2, '0')}/${yearMonth.slice(5, 7)}/${yearMonth.slice(0, 4)}`;

    for (const shift of staffingShifts) {
      const onDuty = countStaffOnShiftKey(day, shift.shiftKey, employees);
      const assigned = onDuty.length;
      const minStaff = shift.minStaff ?? 0;
      const maxStaff = shift.maxStaff ?? minStaff + 2;
      const timeLabel = formatShiftTimeLabel(shift.timeStart, shift.timeEnd);

      if (assigned < minStaff) {
        warnings.push({
          date: dateLabel,
          shiftKey: shift.shiftKey,
          shiftTimeLabel: timeLabel,
          type: 'UNDERSTAFFED',
          assigned,
          minStaff,
          maxStaff,
          message: `${shift.shiftKey} (${timeLabel}) ngày ${dateLabel}: thiếu ${minStaff - assigned} người (${assigned}/${minStaff})`,
        });
      }

      if (assigned > maxStaff) {
        warnings.push({
          date: dateLabel,
          shiftKey: shift.shiftKey,
          shiftTimeLabel: timeLabel,
          type: 'OVERSTAFFED',
          assigned,
          minStaff,
          maxStaff,
          message: `${shift.shiftKey} (${timeLabel}) ngày ${dateLabel}: thừa ${assigned - maxStaff} người (${assigned}/${maxStaff})`,
        });
      }

      if (assigned > 0 && onDuty.every((e) => e.isNewEmployee)) {
        warnings.push({
          date: dateLabel,
          shiftKey: shift.shiftKey,
          shiftTimeLabel: timeLabel,
          type: 'ALL_NEW',
          assigned,
          minStaff,
          maxStaff,
          message: `${shift.shiftKey} (${timeLabel}) ngày ${dateLabel}: toàn nhân viên mới (${assigned} người)`,
        });
      }
    }
  }

  return warnings;
}

/** Cảnh báo áp dụng cho ô NV nếu ca họ đang gán thuộc 9 ca chính và đang lỗi */
export function getWarningsForEmployeeCell(
  day: number,
  shiftKey: string | null,
  role: ShiftRole,
  yearMonth: string,
  employees: MonthlyEmployee[],
  config?: ShiftScheduleConfig
): ShiftDayWarning[] {
  if (!shiftKey) return [];
  const keys = shiftKey.split('+').map((s) => s.trim()).filter(Boolean);
  const staffingKeys = new Set(
    getStaffingShiftsForRole(role, config)
      .filter((s) => s.staffingGroup === 'FULL')
      .map((s) => s.shiftKey)
  );
  const matched = keys.filter((k) => staffingKeys.has(k));
  if (matched.length === 0) return [];

  const dateLabel = `${String(day).padStart(2, '0')}/${yearMonth.slice(5, 7)}/${yearMonth.slice(0, 4)}`;
  return computeShiftWarnings(role, yearMonth, employees, config).filter(
    (w) => w.date === dateLabel && matched.includes(w.shiftKey)
  );
}

export function computeDailySummaryStats(
  role: ShiftRole,
  yearMonth: string,
  employees: MonthlyEmployee[],
  config?: ShiftScheduleConfig
): Map<number, ShiftDailySummaryStat> {
  const daysInMonth = getDaysInMonth(yearMonth);
  const map = new Map<number, ShiftDailySummaryStat>();
  const defs = getStaffingShiftsForRole(role, config);
  const c1 = defs.find((d) => d.shiftKey === 'C1');
  const c2 = defs.find((d) => d.shiftKey === 'C2');
  const c3 = defs.find((d) => d.shiftKey === 'C3');
  const splitKeys = new Set(defs.filter((d) => d.staffingGroup === 'SPLIT').map((d) => d.shiftKey));
  const required = [c1, c2, c3].reduce((sum, s) => sum + (s?.minStaff ?? 0), 0);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const c1Assigned = c1 ? countStaffOnShiftKey(day, c1.shiftKey, employees).length : 0;
    const c2Assigned = c2 ? countStaffOnShiftKey(day, c2.shiftKey, employees).length : 0;
    const c3Assigned = c3 ? countStaffOnShiftKey(day, c3.shiftKey, employees).length : 0;
    const splitAssigned = employees.reduce((acc, e) => {
      const key = e.assignments[day];
      if (!key) return acc;
      const splitCount = key
        .split('+')
        .map((s) => s.trim())
        .filter((k) => splitKeys.has(k)).length;
      return acc + splitCount;
    }, 0);
    const fullAssigned = c1Assigned + c2Assigned + c3Assigned;
    const offCount = employees.filter((e) => !e.assignments[day]).length;
    const totalEquivalent = fullAssigned + splitAssigned * 0.5;
    const shortage = Math.max(0, required - totalEquivalent);

    map.set(day, {
      c1Assigned,
      c2Assigned,
      c3Assigned,
      splitAssigned,
      fullAssigned,
      offCount,
      totalEquivalent,
      totalRequired: required,
      shortage,
    });
  }
  return map;
}

function getSessionByShiftKey(shiftKey: string): keyof SessionSummary | null {
  if (shiftKey === 'C3') return 'night';
  if (shiftKey === 'C2' || ['CG3', 'CG4', 'CG5', 'CG6'].includes(shiftKey)) return 'afternoon';
  if (shiftKey === 'C1' || ['CG1', 'CG2'].includes(shiftKey)) return 'morning';
  return null;
}

export function computeSessionSummaryStats(
  role: ShiftRole,
  yearMonth: string,
  employees: MonthlyEmployee[],
  config?: ShiftScheduleConfig
): Map<number, SessionSummary> {
  const daysInMonth = getDaysInMonth(yearMonth);
  const defs = getStaffingShiftsForRole(role, config);
  const requiredMorning = defs.find((d) => d.shiftKey === 'C1')?.minStaff ?? 0;
  const requiredAfternoon = defs.find((d) => d.shiftKey === 'C2')?.minStaff ?? 0;
  const requiredNight = defs.find((d) => d.shiftKey === 'C3')?.minStaff ?? 0;
  const shiftByKey = new Map(
    getShiftDefinitionsForRole(role, config).map((s) => [s.shiftKey, s])
  );
  const map = new Map<number, SessionSummary>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const summary: SessionSummary = {
      morning: 0,
      afternoon: 0,
      night: 0,
      requiredMorning,
      requiredAfternoon,
      requiredNight,
      shortageMorning: 0,
      shortageAfternoon: 0,
      shortageNight: 0,
    };
    employees.forEach((emp) => {
      const shiftRaw = emp.assignments[day];
      if (!shiftRaw) return;
      const keys = shiftRaw.split('+').map((s) => s.trim()).filter(Boolean);
      keys.forEach((shiftKey) => {
        const session = getSessionByShiftKey(shiftKey);
        if (!session) return;
        const shift = shiftByKey.get(shiftKey);
        if (!shift || shift.isOvertime) return;
        const weight = shift.type === 'SPLIT' ? 0.5 : 1;
        summary[session] += weight;
      });
    });
    summary.shortageMorning = Math.max(0, summary.requiredMorning - summary.morning);
    summary.shortageAfternoon = Math.max(0, summary.requiredAfternoon - summary.afternoon);
    summary.shortageNight = Math.max(0, summary.requiredNight - summary.night);
    map.set(day, summary);
  }
  return map;
}

export const MOCK_EXCEL_IMPORT_PREVIEW: Record<ShiftRole, MonthlyEmployee[]> = {
  OSA: [
    { id: 'imp-1', code: 'OSA-010', name: 'Import — Nguyễn Test', isNewEmployee: false, assignments: buildAssignments((d) => (d % 3 === 0 ? 'CG1' : 'C1'), 31) },
    { id: 'imp-2', code: 'OSA-011', name: 'Import — Trần Test', isNewEmployee: true, assignments: buildAssignments((d) => (d % 4 === 0 ? 'CG3' : 'C2'), 31) },
  ],
  CSKH: [
    { id: 'imp-3', code: 'CSKH-010', name: 'Import — Phạm Test', isNewEmployee: false, assignments: buildAssignments((d) => (d % 2 === 0 ? 'C1' : 'CG1'), 31) },
    { id: 'imp-4', code: 'CSKH-011', name: 'Import — Lê Test', isNewEmployee: true, assignments: buildAssignments((d) => 'C2', 31) },
  ],
  DRIVER: [
    { id: 'imp-5', code: 'DRV-010', name: 'Import — Nguyễn Tài Xế', isNewEmployee: false, assignments: buildAssignments((d) => (d % 3 === 0 ? null : 'C1'), 31) },
  ],
};

export const EXCEL_TEMPLATE_COLUMNS = [
  'Mã NV', 'Họ tên', 'Role', 'Ngày 1', 'Ngày 2', '...', 'Ngày 31', 'Ghi chú',
];

export const EXCEL_TEMPLATE_NOTE =
  'Cột ca làm dùng KEY ca (CG1–CG6, C1–C3, OT). Cảnh báo thiếu/thừa tính theo từng KEY ca chính — không gộp khung giờ chồng lấn.';
