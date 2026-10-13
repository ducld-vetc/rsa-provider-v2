export type PartnerRole = 'BDH' | 'GDM' | 'GDCN' | 'QLVUNG' | 'GDTT' | 'NVCH' | 'KT';

export type OrgLevel = 1 | 2 | 3 | 4 | 5;

export interface OrgNode {
  id: string;
  name: string;
  level: OrgLevel;
  parentId: string | null;
  /** Level 5 = trạm = trung tâm = xưởng */
  isStation: boolean;
}

export interface PartnerPersona {
  id: string;
  role: PartnerRole;
  label: string;
  title: string;
  orgNodeId: string;
  /** Station ids in scope (empty = all) */
  stationIds: string[];
}

export type VehicleType = 'san_truot' | 'san_nang_truot' | 'san_truot_cau';

export type RescueCapability = 'slide' | 'tow' | 'crane' | 'fork';

export type AcceptedVehicleKind = 'car' | 'suv' | 'pickup' | 'ev' | 'light_truck' | 'van';

export type MaintenancePlanStatus = 'NORMAL' | 'DUE_SOON' | 'OVERDUE';

export interface VehicleMaintenanceOrder {
  id: string;
  createdAt: string;
  content: string;
  status: 'OPEN' | 'DONE';
}

export interface VehicleMaintenanceHistory {
  id: string;
  at: string;
  odoKm: string;
  content: string;
  costVnd?: string;
}

export type VehicleToolCondition = 'GOOD' | 'BROKEN' | 'MISSING';

export interface VehicleToolItem {
  id: string;
  name: string;
  /** 1 = sẵn sàng (Tốt, SL ≥ 1); 0 = chưa sẵn sàng — giữ cho màn cũ, tính từ condition + quantity */
  status: 0 | 1;
  quantity?: number;
  condition?: VehicleToolCondition;
  unit?: string;
  note?: string;
  assetCode?: string;
  required?: boolean;
  expiryAt?: string;
}

export const TOOL_CONDITION_LABEL: Record<VehicleToolCondition, string> = {
  GOOD: 'Tốt',
  BROKEN: 'Hỏng',
  MISSING: 'Thiếu',
};

/** Định mức số lượng tiêu chuẩn trang bị trên phương tiện cứu hộ */
export const STANDARD_TOOL_QUANTITY: Record<string, number> = {
  'Dây tăng bánh': 2,
  'Dây cáp vải': 2,
  'Ma ní': 4,
  'Xích': 2,
  'Móc cẩu': 2,
  'Cọc phản quang': 4,
  'Dây câu bình': 1,
  'Đèn pin': 1,
  'Gông cẩu': 1,
  'Gỗ kê chân': 2,
  'Bình chữa cháy': 1,
  'Con đội thủy lực': 1,
};

export interface MasterToolItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  standardQty: number;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  assignedVehiclesCount: number;
}

export const MASTER_TOOL_CATALOG: MasterToolItem[] = [
  { id: 'mt-1', code: 'TB-DTB', name: 'Dây tăng bánh', unit: 'Sợi', standardQty: 2, sortOrder: 1, status: 'ACTIVE', assignedVehiclesCount: 15 },
  { id: 'mt-2', code: 'TB-DCV', name: 'Dây cáp vải', unit: 'Sợi', standardQty: 2, sortOrder: 2, status: 'ACTIVE', assignedVehiclesCount: 18 },
  { id: 'mt-3', code: 'TB-MN', name: 'Ma ní', unit: 'Cái', standardQty: 4, sortOrder: 3, status: 'ACTIVE', assignedVehiclesCount: 22 },
  { id: 'mt-4', code: 'TB-XICH', name: 'Xích', unit: 'Bộ', standardQty: 2, sortOrder: 4, status: 'ACTIVE', assignedVehiclesCount: 12 },
  { id: 'mt-5', code: 'TB-MC', name: 'Móc cẩu', unit: 'Cái', standardQty: 2, sortOrder: 5, status: 'ACTIVE', assignedVehiclesCount: 16 },
  { id: 'mt-6', code: 'TB-CPQ', name: 'Cọc phản quang', unit: 'Cái', standardQty: 4, sortOrder: 6, status: 'ACTIVE', assignedVehiclesCount: 25 },
  { id: 'mt-7', code: 'TB-DCB', name: 'Dây câu bình', unit: 'Bộ', standardQty: 1, sortOrder: 7, status: 'ACTIVE', assignedVehiclesCount: 28 },
  { id: 'mt-8', code: 'TB-DP', name: 'Đèn pin', unit: 'Cái', standardQty: 1, sortOrder: 8, status: 'ACTIVE', assignedVehiclesCount: 30 },
  { id: 'mt-9', code: 'TB-GC', name: 'Gông cẩu', unit: 'Bộ', standardQty: 1, sortOrder: 9, status: 'ACTIVE', assignedVehiclesCount: 10 },
  { id: 'mt-10', code: 'TB-GKC', name: 'Gỗ kê chân', unit: 'Khối', standardQty: 2, sortOrder: 10, status: 'ACTIVE', assignedVehiclesCount: 14 },
  { id: 'mt-11', code: 'TB-BCC', name: 'Bình chữa cháy', unit: 'Bình', standardQty: 1, sortOrder: 11, status: 'ACTIVE', assignedVehiclesCount: 32 },
  { id: 'mt-12', code: 'TB-CON', name: 'Con đội thủy lực', unit: 'Cái', standardQty: 1, sortOrder: 12, status: 'ACTIVE', assignedVehiclesCount: 8 },
];

export const standardQtyOf = (toolName: string): number => {
  if (typeof MASTER_TOOL_CATALOG !== 'undefined' && Array.isArray(MASTER_TOOL_CATALOG)) {
    const catalogItem = MASTER_TOOL_CATALOG.find((t) => t.name === toolName);
    if (catalogItem && catalogItem.standardQty !== undefined) return catalogItem.standardQty;
  }
  return STANDARD_TOOL_QUANTITY[toolName] ?? 1;
};

export const toolQtyOf = (t: VehicleToolItem): number => {
  if (t.quantity !== undefined && t.quantity !== null) return t.quantity;
  return t.status === 1 ? standardQtyOf(t.name) : 0;
};

/**
 * Tình trạng công cụ trên xe:
 * - Dựa trên số lượng hiện tại (toolQtyOf) và số lượng tiêu chuẩn (standardQtyOf):
 *   + Nếu bị đánh dấu 'BROKEN' -> 'BROKEN' (Hỏng)
 *   + Nếu số lượng hiện tại < số lượng tiêu chuẩn (kể cả = 0) -> 'MISSING' (Thiếu)
 *   + Nếu số lượng hiện tại >= số lượng tiêu chuẩn và không hỏng -> 'GOOD' (Tốt / Đủ tiêu chuẩn)
 */
export const toolConditionOf = (t: VehicleToolItem): VehicleToolCondition => {
  if (t.condition === 'BROKEN') return 'BROKEN';
  const qty = toolQtyOf(t);
  const std = standardQtyOf(t.name);
  if (qty < std) return 'MISSING';
  return t.condition ?? 'GOOD';
};

/**
 * Công cụ được tính là sẵn sàng khi:
 * - Tình trạng là 'GOOD' (Tốt)
 * - VÀ số lượng hiện tại >= số lượng tiêu chuẩn quy định
 */
export const toolReady = (t: VehicleToolItem): boolean =>
  toolConditionOf(t) === 'GOOD' && toolQtyOf(t) >= standardQtyOf(t.name);

export const IMEI_OPTIONS = [
  '00BD000954',
  '00BD000A3B',
  '01BD000C12',
  '01BD000D45',
  '02BD000E78',
  '02BD000F99',
  '03BD001011',
  '03BD001122',
];

/** Biển số chỉ giữ chữ và số, viết hoa, bỏ ký tự đặc biệt và khoảng trắng. */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface VehicleRecord {
  id: string;
  plate: string;
  /** Mã xe do hệ thống tự sinh, không cho nhập tay */
  hnl: number | string;
  /** Vị trí đỗ xe, chọn trên bản đồ */
  parkAddress?: string;
  parkCoords?: string;
  imei?: string;
  brand: 'Isuzu' | 'Hino' | 'Dongfeng';
  modelLine: string;
  chassis: string;
  engineNo: string;
  year: number;
  stationId: string;
  driverId: string | null;
  driverIds?: string[];
  driverAssignedAt?: Record<string, string>;
  type: VehicleType;
  loadCarry: string;
  loadCrane: string;
  loadLift: string;
  seats: string;
  registrationDate?: string;
  runStatus: 'active' | 'repair';
  status?: 'READY' | 'WORKING' | 'STOPPED' | 'MAINTENANCE' | 'INACTIVE';
  statusReasonCode?: string;
  statusReason?: string;
  expectedReturnAt?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  services?: string[];
  idleHours: number;
  inspectionDueDays: number;
  maintenanceDueDays: number;
  gplhDueDays: number;
  tndsDueDays: number;
  physicalInsDueDays: number;
  tools: VehicleToolItem[];
  revenueMonth: number;
  ownership?: 'Công ty' | 'Thuê' | 'Đối tác vệ tinh';
  fuel?: string;
  mgmtNo?: string;
  legalType?: string;
  inspectionValidUntil?: string;
  country?: string;
  nienHan?: string;
  caiTao?: string;
  caiHoan?: boolean;
  caiHoanGcn?: string;
  kdvt?: string;
  kdvtYes?: boolean;
  outerSize?: string;
  outerLengthMm?: string;
  outerWidthMm?: string;
  outerHeightMm?: string;
  wheelFormula?: string;
  cargoTkKg?: string;
  towTkKg?: string;
  totalTkKg?: string;
  lowClearance?: boolean;
  rescueCapabilities?: RescueCapability[];
  acceptedVehicles?: AcceptedVehicleKind[];
  /** Khối lượng theo đăng kiểm, kg */
  weightTkKg?: string;
  weightCpKg?: string;
  cargoCpKg?: string;
  towCpKg?: string;
  totalCpKg?: string;
  deckLengthMm?: string;
  deckWidthMm?: string;
  maintenanceCycleKm?: string;
  maintenanceLastAt?: string;
  maintenanceNextAt?: string;
  maintenanceStatus?: MaintenancePlanStatus;
  odoKm?: string;
  maintenanceOrders?: VehicleMaintenanceOrder[];
  maintenanceHistory?: VehicleMaintenanceHistory[];
}

export interface VehiclePhoto {
  id: string;
  label: string;
  url: string;
}

export interface VehicleDocument {
  id: string;
  name: string;
  type: string;
  /** Số giấy tờ / số bằng */
  number?: string;
  /** Hạng bằng lái (chỉ giấy tờ Bằng lái) */
  docClass?: string;
  issuedAt: string;
  expiryAt: string;
  fileName: string;
  fileUrl?: string;
}

export interface VehicleTransferHistory {
  id: string;
  vehicleId: string;
  fromStationId: string;
  toStationId: string;
  transferredAt: string;
  byName: string;
  reason: string;
}

export type StaffWorkStatus = 'active' | 'paused' | 'left';
export type StaffDutyStatus = 'on_duty' | 'on_order' | 'offline';

export interface PartnerStaffRecord {
  id: string;
  code: string;
  fullname: string;
  username?: string;
  phone: string;
  cccd: string;
  address: string;
  role: PartnerRole;
  orgNodeId: string;
  stationId: string | null;
  licenseType: string;
  licenseIssued: string;
  licenseExpiry: string;
  craneCert: boolean;
  hasAccount: boolean;
  canQuote: boolean;
  canRescue: boolean;
  email?: string;
  mfaEnabled?: boolean;
  accountLocked?: boolean;
  /** Gọi SSO/Keycloak tạo TK thất bại — cho phép retry */
  accountCreateFailed?: boolean;
  workStatus?: StaffWorkStatus;
  dutyStatus?: StaffDutyStatus;
  contractType?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  lastLoginDevice?: string;
  /** Không còn dùng — mật khẩu ở EIM, hệ thống không có dữ liệu */
  passwordChangedAt?: string;
  lockedAt?: string;
  lockedReason?: string;
  unlockedAt?: string;
  /** Loại nhân viên: tài xế / văn phòng (staff.staff_type) */
  staffType?: 'driver' | 'office';
  /** Quyền như trạm trưởng (staff.is_station) */
  stationManagerRight?: boolean;
  /** Kỹ năng: dịch vụ làm được + cấp độ */
  skills?: StaffSkill[];
}

export type SkillLevel = 1 | 2 | 3;

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  1: 'Cơ bản',
  2: 'Thành thạo',
  3: 'Chuyên gia',
};

export interface StaffSkill {
  service: string;
  level: SkillLevel;
}

export const staffTypeOf = (s: Pick<PartnerStaffRecord, 'staffType' | 'role'>) =>
  s.staffType ?? (s.role === 'NVCH' ? 'driver' : 'office');

export const STAFF_TYPE_LABEL = { driver: 'Tài xế', office: 'Văn phòng' } as const;

/** CCCD dạng che cho người không có quyền quản lý */
export const maskCccd = (v: string) => (v && v.length >= 7 ? `${v.slice(0, 3)}******${v.slice(-3)}` : v || '—');

export const STAFF_WORK_STATUS_LABEL: Record<StaffWorkStatus, string> = {
  active: 'Hoạt động',
  paused: 'Không hoạt động',
  left: 'Ngừng vĩnh viễn',
};

export const STAFF_DUTY_STATUS_LABEL: Record<StaffDutyStatus, string> = {
  on_duty: 'Sẵn sàng',
  on_order: 'Đang nhận đơn',
  offline: 'Offline',
};

export const staffWorkStatusOf = (s: Pick<PartnerStaffRecord, 'workStatus'>) => s.workStatus ?? 'active';

export const staffDutyStatusOf = (s: Pick<PartnerStaffRecord, 'dutyStatus' | 'role'>) =>
  s.role === 'NVCH' ? (s.dutyStatus ?? 'offline') : undefined;

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  san_truot: 'Sàn trượt',
  san_nang_truot: 'Sàn nâng trượt',
  san_truot_cau: 'Sàn trượt, cẩu',
};

export const RESCUE_CAPABILITY_LABEL: Record<RescueCapability, string> = {
  slide: 'Sàn trượt',
  tow: 'Kéo',
  crane: 'Cẩu',
  fork: 'Càng nâng',
};

export const ACCEPTED_VEHICLE_LABEL: Record<AcceptedVehicleKind, string> = {
  car: 'Xe con',
  suv: 'SUV',
  pickup: 'Bán tải',
  ev: 'Xe điện',
  light_truck: 'Tải nhẹ',
  van: 'Xe van',
};

export const MAINTENANCE_STATUS_LABEL: Record<MaintenancePlanStatus, string> = {
  NORMAL: 'Đúng hạn',
  DUE_SOON: 'Sắp đến hạn',
  OVERDUE: 'Quá hạn',
};

export const ROLE_LABEL: Record<PartnerRole, string> = {
  BDH: 'Ban điều hành',
  GDM: 'Giám đốc Miền',
  GDCN: 'Giám đốc Chi nhánh',
  QLVUNG: 'Quản lý Vùng chi nhánh',
  GDTT: 'Giám đốc Trung tâm (Điều phối)',
  NVCH: 'Nhân viên cứu hộ',
  KT: 'Kế toán',
};

// Vai trò nhân viên trên màn Quản lý nhân viên (FL-M2-01): 4 vai trò, map từ persona mock
export type StaffRole = 'UNIT_MANAGER' | 'BRANCH_STAFF' | 'STATION_MANAGER' | 'DRIVER';
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  UNIT_MANAGER: 'Quản lý đơn vị',
  BRANCH_STAFF: 'Nhân viên chi nhánh',
  STATION_MANAGER: 'Quản lý trạm',
  DRIVER: 'Tài xế',
};
export const STAFF_ROLE_OF: Record<PartnerRole, StaffRole> = {
  BDH: 'UNIT_MANAGER',
  GDM: 'UNIT_MANAGER',
  GDCN: 'BRANCH_STAFF',
  QLVUNG: 'BRANCH_STAFF',
  KT: 'BRANCH_STAFF',
  GDTT: 'STATION_MANAGER',
  NVCH: 'DRIVER',
};
/** Persona đại diện khi chọn vai trò ở form thêm mới */
export const STAFF_ROLE_TO_PARTNER: Record<StaffRole, PartnerRole> = {
  UNIT_MANAGER: 'GDM',
  BRANCH_STAFF: 'GDCN',
  STATION_MANAGER: 'GDTT',
  DRIVER: 'NVCH',
};
export const staffRoleLabel = (r: PartnerRole) => STAFF_ROLE_LABEL[STAFF_ROLE_OF[r]];
/** Khối Kỹ năng & giấy tờ, Xe đang gán chỉ dành cho Quản lý trạm và Tài xế (FL-M2-01 BR-21) */
export const hasFieldBlocks = (r: PartnerRole) => r === 'GDTT' || r === 'NVCH';

export const CRANE_TOOLS = [
  'Dây tăng bánh',
  'Dây cáp vải',
  'Ma ní',
  'Xích',
  'Móc cẩu',
  'Cọc phản quang',
  'Dây câu bình',
  'Đèn pin',
  'Gòng cẩu',
  'Gỗ kê chân',
  'Bình chữa cháy',
];

export const SLIDE_TOOLS = CRANE_TOOLS.filter((n) => n !== 'Gòng cẩu' && n !== 'Gỗ kê chân');

export const TOOL_CATALOG: Record<VehicleType, string[]> = {
  san_truot: SLIDE_TOOLS,
  san_nang_truot: SLIDE_TOOLS,
  san_truot_cau: CRANE_TOOLS,
};

export const ORG_NODES: OrgNode[] = [
  { id: 'bdh', name: 'Ban điều hành Carpla', level: 1, parentId: null, isStation: false },
  { id: 'mien-bac', name: 'Miền Bắc', level: 2, parentId: 'bdh', isStation: false },
  { id: 'mien-nam', name: 'Miền Nam', level: 2, parentId: 'bdh', isStation: false },
  { id: 'cn-hn', name: 'Chi nhánh Hà Nội', level: 3, parentId: 'mien-bac', isStation: false },
  { id: 'cn-hp', name: 'Chi nhánh Hải Phòng', level: 3, parentId: 'mien-bac', isStation: false },
  { id: 'cn-hcm', name: 'Chi nhánh TP.HCM', level: 3, parentId: 'mien-nam', isStation: false },
  { id: 'vung-hn', name: 'Vùng Hà Nội', level: 4, parentId: 'cn-hn', isStation: false },
  { id: 'vung-hp', name: 'Vùng Hải Phòng', level: 4, parentId: 'cn-hp', isStation: false },
  { id: 'vung-hcm', name: 'Vùng TP.HCM', level: 4, parentId: 'cn-hcm', isStation: false },
  { id: 'tt-hm', name: 'Trạm Hoàng Mai', level: 5, parentId: 'vung-hn', isStation: true },
  { id: 'tt-hd', name: 'Trạm Hà Đông', level: 5, parentId: 'vung-hn', isStation: true },
  { id: 'tt-hp', name: 'Trạm Hải Phòng', level: 5, parentId: 'vung-hp', isStation: true },
  { id: 'tt-bt', name: 'Trạm Bình Thạnh', level: 5, parentId: 'vung-hcm', isStation: true },
];

export const stationIdsUnder = (nodeId: string): string[] => {
  const collect = (id: string): string[] => {
    const node = ORG_NODES.find((n) => n.id === id);
    if (!node) return [];
    if (node.isStation) return [node.id];
    return ORG_NODES.filter((n) => n.parentId === id).flatMap((n) => collect(n.id));
  };
  return collect(nodeId);
};

export const STATIONS = ORG_NODES.filter((n) => n.isStation);

export const getStationsForOrg = (orgNodeId: string): OrgNode[] => {
  if (!orgNodeId) return STATIONS;
  const org = ORG_NODES.find((n) => n.id === orgNodeId);
  if (org?.isStation) return [org];
  const under = stationIdsUnder(orgNodeId);
  if (under.length > 0) {
    const filtered = ORG_NODES.filter((n) => n.isStation && under.includes(n.id));
    if (filtered.length > 0) return filtered;
  }
  return STATIONS;
};

/** Chuyển tiếng Việt có dấu sang không dấu */
export const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
};

/**
 * Sinh username theo dạng tên + họ đệm (chữ cái đầu):
 * VD: "Trần Văn Huấn" -> tên "huan" + họ đệm "tv" => "huantv"
 * Nếu trùng -> "huantv1", "huantv2", ...
 */
export const generateStaffUsername = (fullname: string, existingUsernames: string[] = []): string => {
  const cleaned = removeVietnameseTones(fullname).toLowerCase();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const firstName = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map((p) => p[0]).join('');
  const base = `${firstName}${initials}`;
  const existingSet = new Set(existingUsernames.map((u) => u.toLowerCase()));
  if (!existingSet.has(base)) {
    return base;
  }
  let counter = 1;
  while (existingSet.has(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
};

export const PERSONAS: PartnerPersona[] = [
  { id: 'p-bdh', role: 'BDH', label: 'BDH — toàn quốc', title: 'Nguyễn Văn Bình', orgNodeId: 'bdh', stationIds: [] },
  { id: 'p-gdm', role: 'GDM', label: 'GĐ Miền Bắc', title: 'Trần Minh Đức', orgNodeId: 'mien-bac', stationIds: stationIdsUnder('mien-bac') },
  { id: 'p-gdcn', role: 'GDCN', label: 'GĐ CN Hà Nội', title: 'Lê Thị Hoa', orgNodeId: 'cn-hn', stationIds: stationIdsUnder('cn-hn') },
  { id: 'p-qlv', role: 'QLVUNG', label: 'QL Vùng Hà Nội', title: 'Phạm Quốc Huy', orgNodeId: 'vung-hn', stationIds: stationIdsUnder('cn-hn') },
  { id: 'p-gdtt', role: 'GDTT', label: 'GĐTT Hoàng Mai', title: 'Đỗ Văn Long', orgNodeId: 'tt-hm', stationIds: ['tt-hm'] },
  { id: 'p-nv', role: 'NVCH', label: 'NV cứu hộ — Hoàng Mai', title: 'Ngô Đức Anh', orgNodeId: 'tt-hm', stationIds: ['tt-hm'] },
  { id: 'p-kt', role: 'KT', label: 'KT — Hoàng Mai', title: 'Vũ Thanh Hà', orgNodeId: 'tt-hm', stationIds: ['tt-hm'] },
];

export const toolsFor = (type: VehicleType, broken?: string[]): VehicleToolItem[] =>
  (TOOL_CATALOG[type] || []).map((name, i) => {
    const isBroken = broken?.includes(name);
    const std = standardQtyOf(name);
    return {
      id: `${type}-${i}`,
      name,
      quantity: isBroken ? 0 : std,
      condition: isBroken ? 'BROKEN' : 'GOOD',
      status: isBroken ? 0 : 1,
      required: std > 0,
      assetCode: `CC-${String(i + 1).padStart(3, '0')}`,
    };
  });

const demoFleet = (
  rows: Array<{
    id: string;
    plate: string;
    hnl: number;
    brand: VehicleRecord['brand'];
    modelLine: string;
    stationId: string;
    driverId: string | null;
    type: VehicleType;
    loadCarry: string;
    loadCrane?: string;
    status: NonNullable<VehicleRecord['status']>;
    ownership: NonNullable<VehicleRecord['ownership']>;
    year: number;
    registrationDate: string;
    address: string;
    inspectionDueDays: number;
    gplhDueDays: number;
    tndsDueDays: number;
    broken?: string[];
    maintenanceStatus?: MaintenancePlanStatus;
  }>,
): VehicleRecord[] =>
  rows.map((row) => ({
    id: row.id,
    plate: row.plate,
    hnl: row.hnl,
    imei: `86${String(row.hnl).padStart(4, '0')}000001`,
    brand: row.brand,
    modelLine: row.modelLine,
    chassis: `CH${row.plate}${row.hnl}`,
    engineNo: `ENG-${row.hnl}`,
    year: row.year,
    registrationDate: row.registrationDate,
    stationId: row.stationId,
    driverId: row.driverId,
    driverIds: row.driverId ? [row.driverId] : [],
    type: row.type,
    loadCarry: row.loadCarry,
    loadCrane: row.loadCrane ?? '—',
    loadLift: row.type === 'san_nang_truot' ? '3 tấn' : '—',
    seats: '3',
    runStatus: row.status === 'MAINTENANCE' ? 'repair' : 'active',
    status: row.status,
    services: ['Xe hết pin', 'Kích bình ắc quy'],
    idleHours: 6 + (row.hnl % 20),
    inspectionDueDays: row.inspectionDueDays,
    maintenanceDueDays: 18,
    gplhDueDays: row.gplhDueDays,
    tndsDueDays: row.tndsDueDays,
    physicalInsDueDays: 40,
    tools: toolsFor(row.type, row.broken),
    revenueMonth: 8_000_000 + row.hnl * 100_000,
    ownership: row.ownership,
    fuel: 'Diesel',
    parkAddress: row.address,
    rescueCapabilities:
      row.type === 'san_truot_cau'
        ? ['slide', 'tow', 'crane']
        : row.type === 'san_nang_truot'
          ? ['slide', 'fork']
          : ['slide', 'tow'],
    acceptedVehicles: ['car', 'suv', 'pickup'],
    cargoCpKg: '2500',
    towCpKg: '4000',
    totalCpKg: '8500',
    maintenanceStatus: row.maintenanceStatus ?? 'NORMAL',
    odoKm: String(8000 + row.hnl * 120),
  }));

export const VEHICLES: VehicleRecord[] = [
  {
    id: 'v1', plate: '29C12345', hnl: 21, imei: '00BD000954', brand: 'Isuzu', modelLine: 'NPR 400', chassis: 'JALC4B16X07001234', engineNo: '4HK1-123456',
    year: 2022, registrationDate: '15/03/2022', stationId: 'tt-hm', driverId: 's6', driverIds: ['s6', 's7'],
    driverAssignedAt: { s6: '01/06/2026', s7: '15/07/2026' },
    type: 'san_truot_cau', loadCarry: '5 tấn', loadCrane: '8 tấn', loadLift: '—', seats: '3', runStatus: 'active',
    status: 'STOPPED',
    services: ['Xe hết pin', 'Kích bình ắc quy', 'Cẩu kéo xe tai nạn', 'Kéo xe ngập nước'],
    idleHours: 6, inspectionDueDays: 22, maintenanceDueDays: 12, gplhDueDays: 40, tndsDueDays: -15, physicalInsDueDays: 9,
    tools: toolsFor('san_truot_cau', ['Xích']), revenueMonth: 48_500_000, ownership: 'Công ty', fuel: 'Diesel',
    mgmtNo: '2903V-012345', legalType: 'Ô tô cứu hộ giao thông', inspectionValidUntil: '11/09/2026', country: 'Nhật Bản',     nienHan: '2047', caiHoan: true, caiHoanGcn: 'GCN-2903-2022', caiTao: 'Có · GCN-2903-2022', kdvtYes: true, kdvt: 'Có',
    outerLengthMm: '7450', outerWidthMm: '2250', outerHeightMm: '2950', outerSize: '7450 × 2250 × 2950', wheelFormula: '4x2',
    cargoTkKg: '5500', towTkKg: '4000', totalTkKg: '10645', lowClearance: true,
    rescueCapabilities: ['slide', 'tow', 'crane'],
    acceptedVehicles: ['car', 'suv', 'pickup', 'ev'],
    weightTkKg: '4500', weightCpKg: '8000', cargoCpKg: '3500', towCpKg: '8000', totalCpKg: '11500',
    deckLengthMm: '5600', deckWidthMm: '2100',
    maintenanceCycleKm: '5000', maintenanceLastAt: '2026-07-15', maintenanceNextAt: '2026-10-15',
    maintenanceStatus: 'DUE_SOON', odoKm: '14280',
    maintenanceOrders: [],
    maintenanceHistory: [{ id: 'mh-v1', at: '15/07/2026', odoKm: '10120', content: 'Bảo dưỡng cấp 1', costVnd: '4.200.000' }],
  },
  {
    id: 'v2', plate: '29C67890', hnl: 22, imei: '00BD000A3B', brand: 'Hino', modelLine: 'XZU 720', chassis: 'JHHFC2J5XK0002211', engineNo: 'N04C-778899',
    year: 2021, registrationDate: '20/07/2021', stationId: 'tt-hm', driverId: 's7', driverIds: ['s7'],
    driverAssignedAt: { s7: '20/07/2026' },
    type: 'san_truot', loadCarry: '3.5 tấn', loadCrane: '—', loadLift: '—', seats: '3', runStatus: 'active',
    status: 'READY',
    services: ['Xe hết pin', 'Kích bình ắc quy', 'Thay lốp dự phòng'],
    idleHours: 80, inspectionDueDays: 45, maintenanceDueDays: 4, gplhDueDays: 5, tndsDueDays: 60, physicalInsDueDays: 20,
    tools: toolsFor('san_truot'), revenueMonth: 12_200_000, ownership: 'Công ty', fuel: 'Diesel',
    rescueCapabilities: ['slide', 'tow'],
    acceptedVehicles: ['car', 'suv', 'ev'],
    weightTkKg: '3200', weightCpKg: '5500', cargoCpKg: '2000', towCpKg: '3500', totalCpKg: '7500',
    deckLengthMm: '4800', deckWidthMm: '2000',
    maintenanceCycleKm: '5000', maintenanceLastAt: '2026-06-10', maintenanceNextAt: '2026-10-01',
    maintenanceStatus: 'OVERDUE', odoKm: '10050',
    maintenanceHistory: [{ id: 'mh-v2', at: '10/06/2026', odoKm: '5200', content: 'Bảo dưỡng cấp 2' }],
  },
  {
    id: 'v3', plate: '30F11122', hnl: 31, imei: '01BD000C12', brand: 'Dongfeng', modelLine: 'Captain C', chassis: 'LGAX4B123D0003311', engineNo: 'CY4102-331122',
    year: 2023, registrationDate: '10/01/2023', stationId: 'tt-hd', driverId: 's9', driverIds: ['s9'],
    driverAssignedAt: { s9: '10/02/2026' },
    type: 'san_nang_truot', loadCarry: '4 tấn', loadCrane: '—', loadLift: '3 tấn', seats: '2', runStatus: 'repair',
    status: 'MAINTENANCE',
    statusReasonCode: 'ENGINE_HYDRAULIC',
    statusReason: 'Hỏng bơm thủy lực sàn nâng',
    expectedReturnAt: '05/03/2026 17:00',
    services: ['Cứu hộ xe ngập nước', 'Kéo xe sự cố'],
    idleHours: 200, inspectionDueDays: 8, maintenanceDueDays: 2, gplhDueDays: 90, tndsDueDays: 3, physicalInsDueDays: 50,
    tools: toolsFor('san_nang_truot', ['Dây tăng bánh', 'Đèn pin']), revenueMonth: 0, ownership: 'Công ty', fuel: 'Diesel',
    rescueCapabilities: ['slide', 'fork'],
    acceptedVehicles: ['car', 'pickup', 'light_truck'],
    weightTkKg: '4100', weightCpKg: '7000', cargoCpKg: '2800', towCpKg: '4000', totalCpKg: '9800',
    deckLengthMm: '5200', deckWidthMm: '2050',
    maintenanceCycleKm: '5000', maintenanceLastAt: '2026-04-12', maintenanceNextAt: '2026-11-25',
    maintenanceStatus: 'NORMAL', odoKm: '18400',
  },
  {
    id: 'v4', plate: '15B33344', hnl: 41, imei: '01BD000D45', brand: 'Isuzu', modelLine: 'FRR 90', chassis: 'JALC4B16X07004411', engineNo: '4HK1-441122',
    year: 2020, registrationDate: '05/11/2020', stationId: 'tt-hp', driverId: null, driverIds: [],
    type: 'san_truot_cau', loadCarry: '5 tấn', loadCrane: '8 tấn', loadLift: '—', seats: '3', runStatus: 'active',
    status: 'READY',
    services: ['Cẩu kéo xe tải', 'Xe hết pin', 'Cẩu kéo xe tai nạn'],
    idleHours: 10, inspectionDueDays: 70, maintenanceDueDays: 20, gplhDueDays: 15, tndsDueDays: 25, physicalInsDueDays: 40,
    tools: toolsFor('san_truot_cau'), revenueMonth: 31_000_000, ownership: 'Thuê', fuel: 'Diesel',
    rescueCapabilities: ['slide', 'crane', 'tow'],
    acceptedVehicles: ['car', 'suv', 'pickup', 'light_truck'],
    weightTkKg: '4800', weightCpKg: '8500', cargoCpKg: '3700', towCpKg: '8000', totalCpKg: '12200',
    deckLengthMm: '5800', deckWidthMm: '2200',
    maintenanceCycleKm: '5000', maintenanceLastAt: '2026-02-20', maintenanceNextAt: '2026-10-10',
    maintenanceStatus: 'DUE_SOON', odoKm: '4890',
  },
  {
    id: 'v5', plate: '51C55566', hnl: 51, imei: '02BD000E78', brand: 'Hino', modelLine: 'XZU 650', chassis: 'JHHFC2J5XK0005511', engineNo: 'N04C-551133',
    year: 2024, registrationDate: '18/02/2024', stationId: 'tt-bt', driverId: null, driverIds: [],
    type: 'san_truot', loadCarry: '3.5 tấn', loadCrane: '—', loadLift: '—', seats: '2', runStatus: 'active',
    status: 'READY',
    services: ['Kích bình ắc quy', 'Thay lốp dự phòng', 'Tiếp nhiên liệu'],
    idleHours: 4, inspectionDueDays: 100, maintenanceDueDays: 30, gplhDueDays: 80, tndsDueDays: 40, physicalInsDueDays: 12,
    tools: toolsFor('san_truot'), revenueMonth: 55_800_000, ownership: 'Đối tác vệ tinh', fuel: 'Diesel',
    rescueCapabilities: ['slide'],
    acceptedVehicles: ['car', 'suv', 'van'],
    weightTkKg: '3000', weightCpKg: '5200', cargoCpKg: '1800', towCpKg: '2500', totalCpKg: '7000',
    deckLengthMm: '4500', deckWidthMm: '1900',
    maintenanceCycleKm: '5000', maintenanceLastAt: '2026-08-18', maintenanceNextAt: '2026-12-15',
    maintenanceStatus: 'NORMAL', odoKm: '22100',
  },
  ...demoFleet([
    { id: 'v6', plate: '29H24680', hnl: 23, brand: 'Isuzu', modelLine: 'NPR 85', stationId: 'tt-hm', driverId: 's6', type: 'san_truot', loadCarry: '3.5 tấn', status: 'READY', ownership: 'Công ty', year: 2023, registrationDate: '12/04/2023', address: 'Ngã tư Giải Phóng - Kim Đồng, Hoàng Mai', inspectionDueDays: 60, gplhDueDays: 90, tndsDueDays: 48 },
    { id: 'v7', plate: '30A13579', hnl: 32, brand: 'Hino', modelLine: '500 Series', stationId: 'tt-hd', driverId: 's9', type: 'san_truot_cau', loadCarry: '8 tấn', loadCrane: '10 tấn', status: 'WORKING', ownership: 'Công ty', year: 2021, registrationDate: '03/08/2021', address: 'Quang Trung, Hà Đông, Hà Nội', inspectionDueDays: 40, gplhDueDays: 55, tndsDueDays: 33 },
    { id: 'v8', plate: '15C86420', hnl: 42, brand: 'Dongfeng', modelLine: 'Hoàng Huy', stationId: 'tt-hp', driverId: null, type: 'san_truot', loadCarry: '2.5 tấn', status: 'STOPPED', ownership: 'Thuê', year: 2019, registrationDate: '19/01/2019', address: 'Cầu Niệm, Lê Chân, Hải Phòng', inspectionDueDays: -12, gplhDueDays: 20, tndsDueDays: 14 },
    { id: 'v9', plate: '51G97531', hnl: 52, brand: 'Isuzu', modelLine: 'QKR 270', stationId: 'tt-bt', driverId: null, type: 'san_nang_truot', loadCarry: '4 tấn', status: 'READY', ownership: 'Đối tác vệ tinh', year: 2022, registrationDate: '28/05/2022', address: 'Xô Viết Nghệ Tĩnh, Bình Thạnh', inspectionDueDays: 18, gplhDueDays: 26, tndsDueDays: -8 },
    { id: 'v10', plate: '29K11223', hnl: 24, brand: 'Hino', modelLine: '300 Dutro', stationId: 'tt-hm', driverId: 's7', type: 'san_truot_cau', loadCarry: '5 tấn', loadCrane: '6 tấn', status: 'MAINTENANCE', ownership: 'Công ty', year: 2020, registrationDate: '07/09/2020', address: 'Xưởng Hoàng Mai, Tam Trinh', inspectionDueDays: 75, gplhDueDays: 40, tndsDueDays: 22, maintenanceStatus: 'OVERDUE' },
    { id: 'v11', plate: '30E33445', hnl: 33, brand: 'Isuzu', modelLine: 'NMR 85', stationId: 'tt-hd', driverId: 's9', type: 'san_truot', loadCarry: '3 tấn', status: 'READY', ownership: 'Công ty', year: 2024, registrationDate: '14/02/2024', address: 'Tô Hiệu, Hà Đông', inspectionDueDays: 9, gplhDueDays: 70, tndsDueDays: 16 },
    { id: 'v12', plate: '15H55667', hnl: 43, brand: 'Dongfeng', modelLine: 'Captain', stationId: 'tt-hp', driverId: null, type: 'san_truot', loadCarry: '3.5 tấn', status: 'INACTIVE', ownership: 'Thuê', year: 2018, registrationDate: '22/11/2018', address: 'Lạch Tray, Ngô Quyền, Hải Phòng', inspectionDueDays: 120, gplhDueDays: 80, tndsDueDays: 50 },
    { id: 'v13', plate: '51K77889', hnl: 53, brand: 'Hino', modelLine: 'FC9J', stationId: 'tt-bt', driverId: null, type: 'san_truot_cau', loadCarry: '6 tấn', loadCrane: '8 tấn', status: 'WORKING', ownership: 'Công ty', year: 2023, registrationDate: '01/06/2023', address: 'Điện Biên Phủ, Bình Thạnh', inspectionDueDays: 55, gplhDueDays: 44, tndsDueDays: 61 },
    { id: 'v14', plate: '29L99001', hnl: 25, brand: 'Isuzu', modelLine: 'FRR 650', stationId: 'tt-hm', driverId: 's6', type: 'san_nang_truot', loadCarry: '4 tấn', status: 'READY', ownership: 'Công ty', year: 2021, registrationDate: '16/10/2021', address: 'Định Công, Hoàng Mai', inspectionDueDays: 35, gplhDueDays: 28, tndsDueDays: 42, broken: ['Xích', 'Đèn pin'] },
    { id: 'v15', plate: '30H22334', hnl: 34, brand: 'Dongfeng', modelLine: 'B180', stationId: 'tt-hd', driverId: 's9', type: 'san_truot', loadCarry: '5 tấn', status: 'STOPPED', ownership: 'Thuê', year: 2020, registrationDate: '09/03/2020', address: 'Vạn Phúc, Hà Đông', inspectionDueDays: 50, gplhDueDays: -6, tndsDueDays: 19 },
    { id: 'v16', plate: '15K44556', hnl: 44, brand: 'Hino', modelLine: 'XZU 730', stationId: 'tt-hp', driverId: null, type: 'san_truot_cau', loadCarry: '5 tấn', loadCrane: '7 tấn', status: 'READY', ownership: 'Công ty', year: 2022, registrationDate: '30/07/2022', address: 'Tô Hiệu, Lê Chân, Hải Phòng', inspectionDueDays: 88, gplhDueDays: 64, tndsDueDays: 27 },
    { id: 'v17', plate: '51D66778', hnl: 54, brand: 'Isuzu', modelLine: 'NQR 550', stationId: 'tt-bt', driverId: null, type: 'san_truot', loadCarry: '4 tấn', status: 'MAINTENANCE', ownership: 'Đối tác vệ tinh', year: 2019, registrationDate: '11/12/2019', address: 'Nguyễn Xí, Bình Thạnh', inspectionDueDays: 14, gplhDueDays: 33, tndsDueDays: 8, maintenanceStatus: 'DUE_SOON' },
    { id: 'v18', plate: '29M88990', hnl: 26, brand: 'Hino', modelLine: 'XZU 342', stationId: 'tt-hm', driverId: 's7', type: 'san_truot', loadCarry: '2.5 tấn', status: 'READY', ownership: 'Công ty', year: 2025, registrationDate: '04/01/2025', address: 'Giáp Bát, Hoàng Mai', inspectionDueDays: 140, gplhDueDays: 200, tndsDueDays: 110 },
    { id: 'v19', plate: '30K10112', hnl: 35, brand: 'Isuzu', modelLine: 'FVR 900', stationId: 'tt-hd', driverId: null, type: 'san_truot_cau', loadCarry: '9 tấn', loadCrane: '12 tấn', status: 'READY', ownership: 'Công ty', year: 2018, registrationDate: '25/06/2018', address: 'Mỗ Lao, Hà Đông', inspectionDueDays: 4, gplhDueDays: 12, tndsDueDays: 7 },
    { id: 'v20', plate: '15L12131', hnl: 45, brand: 'Dongfeng', modelLine: 'KR 230', stationId: 'tt-hp', driverId: null, type: 'san_nang_truot', loadCarry: '3.5 tấn', status: 'WORKING', ownership: 'Thuê', year: 2024, registrationDate: '17/09/2024', address: 'Cảng Hải Phòng, Ngô Quyền', inspectionDueDays: 95, gplhDueDays: 70, tndsDueDays: 36 },
    { id: 'v21', plate: '51H14151', hnl: 55, brand: 'Hino', modelLine: '300 Wide', stationId: 'tt-bt', driverId: null, type: 'san_truot', loadCarry: '4.5 tấn', status: 'READY', ownership: 'Thuê', year: 2022, registrationDate: '08/08/2022', address: 'Ung Văn Khiêm, Bình Thạnh', inspectionDueDays: 62, gplhDueDays: 41, tndsDueDays: 29 },
    { id: 'v22', plate: '29N16171', hnl: 27, brand: 'Dongfeng', modelLine: 'Captain C', stationId: 'tt-hm', driverId: 's6', type: 'san_truot_cau', loadCarry: '6 tấn', loadCrane: '8 tấn', status: 'INACTIVE', ownership: 'Công ty', year: 2017, registrationDate: '02/02/2017', address: 'Lĩnh Nam, Hoàng Mai', inspectionDueDays: -30, gplhDueDays: -4, tndsDueDays: 5, broken: ['Ma ní'] },
    { id: 'v23', plate: '30L18191', hnl: 36, brand: 'Isuzu', modelLine: 'QKR 230', stationId: 'tt-hd', driverId: 's9', type: 'san_truot', loadCarry: '2.5 tấn', status: 'READY', ownership: 'Đối tác vệ tinh', year: 2023, registrationDate: '21/03/2023', address: 'Dương Nội, Hà Đông', inspectionDueDays: 47, gplhDueDays: 58, tndsDueDays: 21 },
    { id: 'v24', plate: '15M20212', hnl: 46, brand: 'Hino', modelLine: 'FG8J', stationId: 'tt-hp', driverId: null, type: 'san_truot_cau', loadCarry: '7 tấn', loadCrane: '9 tấn', status: 'STOPPED', ownership: 'Công ty', year: 2020, registrationDate: '13/05/2020', address: 'Đình Vũ, Hải An, Hải Phòng', inspectionDueDays: -3, gplhDueDays: 15, tndsDueDays: -20 },
    { id: 'v25', plate: '51L22232', hnl: 56, brand: 'Dongfeng', modelLine: 'B190', stationId: 'tt-bt', driverId: null, type: 'san_nang_truot', loadCarry: '5 tấn', status: 'READY', ownership: 'Công ty', year: 2024, registrationDate: '29/11/2024', address: 'Nơ Trang Long, Bình Thạnh', inspectionDueDays: 110, gplhDueDays: 86, tndsDueDays: 73, broken: ['Dây cáp vải'] },
  ]),
];

export const PARTNER_STAFF: PartnerStaffRecord[] = [
  { id: 's1', code: 'CP-0001', username: 'binhnv', fullname: 'Nguyễn Văn Bình', phone: '0901 111 111', cccd: '001080011111', address: 'Hà Nội', role: 'BDH', orgNodeId: 'bdh', stationId: null, licenseType: '—', licenseIssued: '—', licenseExpiry: '—', craneCert: false, hasAccount: true, canQuote: false, canRescue: false, workStatus: 'active', contractType: 'Toàn thời gian', joinedAt: '01/01/2018', mfaEnabled: true, lastLoginAt: '20/08/2026 09:02', lastLoginDevice: 'Web Portal', passwordChangedAt: '12/01/2026' },
  { id: 's2', code: 'CP-0010', username: 'ductm', fullname: 'Trần Minh Đức', phone: '0902 222 222', cccd: '001080022222', address: 'Hà Nội', role: 'GDM', orgNodeId: 'mien-bac', stationId: null, licenseType: '—', licenseIssued: '—', licenseExpiry: '—', craneCert: false, hasAccount: true, canQuote: false, canRescue: false, workStatus: 'active', contractType: 'Toàn thời gian', joinedAt: '01/03/2019', mfaEnabled: true, lastLoginAt: '20/08/2026 08:40', lastLoginDevice: 'Web Portal', passwordChangedAt: '03/02/2026' },
  { id: 's3', code: 'CP-0020', username: 'hoalt', fullname: 'Lê Thị Hoa', phone: '0903 333 333', cccd: '001080033333', address: 'Hà Nội', role: 'GDCN', orgNodeId: 'cn-hn', stationId: null, licenseType: '—', licenseIssued: '—', licenseExpiry: '—', craneCert: false, hasAccount: true, canQuote: false, canRescue: false, workStatus: 'active', contractType: 'Toàn thời gian', joinedAt: '15/06/2020', mfaEnabled: true, lastLoginAt: '20/08/2026 08:45', lastLoginDevice: 'App iOS · Chi nhánh Hà Nội', passwordChangedAt: '18/04/2026' },
  { id: 's4', code: 'CP-0021', username: 'huypq', fullname: 'Phạm Quốc Huy', phone: '0904 444 444', cccd: '001080044444', address: 'Hà Nội', role: 'QLVUNG', orgNodeId: 'vung-hn', stationId: null, licenseType: '—', licenseIssued: '—', licenseExpiry: '—', craneCert: false, hasAccount: true, canQuote: false, canRescue: false, workStatus: 'active', contractType: 'Toàn thời gian', joinedAt: '01/09/2021', mfaEnabled: false, lastLoginAt: '19/08/2026 17:20', lastLoginDevice: 'Web Portal', passwordChangedAt: '01/08/2026' },
  { id: 's5', code: 'CP-0101', username: 'longdv', fullname: 'Đỗ Văn Long', phone: '0905 555 555', cccd: '001080055555', address: 'Hoàng Mai', role: 'GDTT', orgNodeId: 'tt-hm', stationId: 'tt-hm', licenseType: 'C', licenseIssued: '12/03/2020', licenseExpiry: '12/03/2030', craneCert: true, hasAccount: true, canQuote: true, canRescue: true, workStatus: 'active', contractType: 'Toàn thời gian', joinedAt: '12/03/2020', mfaEnabled: true, lastLoginAt: '20/08/2026 08:01', lastLoginDevice: 'App Android · Trạm Hoàng Mai', passwordChangedAt: '10/05/2026' },
  { id: 's6', code: 'CP-0201', username: 'anhnd', fullname: 'Ngô Đức Anh', phone: '0906 666 666', cccd: '001080066666', address: 'Hoàng Mai', role: 'NVCH', orgNodeId: 'tt-hm', stationId: 'tt-hm', licenseType: 'C', licenseIssued: '01/06/2019', licenseExpiry: '01/06/2029', craneCert: true, hasAccount: true, canQuote: false, canRescue: true, workStatus: 'active', dutyStatus: 'on_duty', contractType: 'Toàn thời gian', joinedAt: '01/06/2019', mfaEnabled: true, lastLoginAt: '20/08/2026 07:12', lastLoginDevice: 'App iOS · Trạm Hoàng Mai', passwordChangedAt: '01/07/2026' },
  { id: 's7', code: 'CP-0202', username: 'tambv', fullname: 'Bùi Văn Tâm', phone: '0907 777 777', cccd: '001080077777', address: 'Hoàng Mai', role: 'NVCH', orgNodeId: 'tt-hm', stationId: 'tt-hm', licenseType: 'C', licenseIssued: '08/01/2021', licenseExpiry: '08/01/2031', craneCert: false, hasAccount: false, canQuote: false, canRescue: true, workStatus: 'active', dutyStatus: 'offline', contractType: 'Toàn thời gian', joinedAt: '08/01/2021' },
  { id: 's8', code: 'CP-0301', username: 'havt', fullname: 'Vũ Thanh Hà', phone: '0908 888 888', cccd: '001080088888', address: 'Hoàng Mai', role: 'KT', orgNodeId: 'tt-hm', stationId: 'tt-hm', licenseType: '—', licenseIssued: '—', licenseExpiry: '—', craneCert: false, hasAccount: true, canQuote: false, canRescue: false, workStatus: 'active', contractType: 'Toàn thời gian', joinedAt: '02/02/2022', mfaEnabled: true, lastLoginAt: '20/08/2026 09:10', lastLoginDevice: 'App Android · Trạm Hoàng Mai', passwordChangedAt: '20/03/2026' },
  { id: 's9', code: 'CP-0210', username: 'baohg', fullname: 'Hoàng Gia Bảo', phone: '0909 999 999', cccd: '001080099999', address: 'Hà Đông', role: 'NVCH', orgNodeId: 'tt-hd', stationId: 'tt-hd', licenseType: 'C', licenseIssued: '03/11/2018', licenseExpiry: '03/11/2028', craneCert: false, hasAccount: true, canQuote: false, canRescue: true, workStatus: 'active', dutyStatus: 'on_order', contractType: 'Toàn thời gian', joinedAt: '03/11/2018', mfaEnabled: false, lastLoginAt: '20/08/2026 06:40', lastLoginDevice: 'App Android · Trạm Hà Đông', passwordChangedAt: '11/11/2025' },
  { id: 's10', code: 'CP-0401', username: 'lanmt', fullname: 'Mai Thị Lan', phone: '0910 101 010', cccd: '001080010101', address: 'Bình Thạnh', role: 'KT', orgNodeId: 'tt-bt', stationId: 'tt-bt', licenseType: '—', licenseIssued: '—', licenseExpiry: '—', craneCert: false, hasAccount: true, canQuote: false, canRescue: false, accountLocked: true, workStatus: 'paused', contractType: 'Thời vụ', joinedAt: '01/04/2025', mfaEnabled: false, lastLoginAt: '14/08/2026 16:02', lastLoginDevice: 'Web Portal', lockedAt: '15/08/2026 09:00', lockedReason: 'Sai mật khẩu quá số lần cho phép' },
  { id: 's11', code: 'CP-0203', username: 'thangdv', fullname: 'Đặng Văn Thắng', phone: '0911 222 333', cccd: '001080033344', address: 'Hoàng Mai', role: 'NVCH', orgNodeId: 'tt-hm', stationId: 'tt-hm', licenseType: 'B2', licenseIssued: '10/05/2018', licenseExpiry: '10/05/2028', craneCert: false, hasAccount: true, canQuote: false, canRescue: true, accountLocked: true, workStatus: 'paused', dutyStatus: 'offline', contractType: 'Toàn thời gian', joinedAt: '10/05/2018', mfaEnabled: false, lastLoginAt: '10/08/2026 11:20', lastLoginDevice: 'App Android', lockedAt: '11/08/2026 08:30', lockedReason: 'Tạm đình chỉ công tác (tài xế không còn hiệu lực)' },
];

export const driverName = (driverId: string | null) =>
  PARTNER_STAFF.find((s) => s.id === driverId)?.fullname ?? 'Chưa gán';

export const driverNames = (driverIds?: string[] | null, fallbackId?: string | null) => {
  const ids = driverIds && driverIds.length > 0 ? driverIds : (fallbackId ? [fallbackId] : []);
  if (ids.length === 0) return 'Chưa gán';
  return ids.map((id) => PARTNER_STAFF.find((s) => s.id === id)?.fullname ?? id).join(', ');
};

export const driversAtStation = (stationId: string) =>
  // Tài xế và Quản lý trạm đều giao xe được (FL-M2-05 BR-G02)
  PARTNER_STAFF.filter((s) => (s.role === 'NVCH' || s.role === 'GDTT') && s.stationId === stationId);

export const nextHnl = (list: { hnl: number | string }[]) =>
  (list.reduce((max, v) => Math.max(max, typeof v.hnl === 'number' && !isNaN(v.hnl) ? v.hnl : 0), 0) || 0) + 1;

/** Giữ xe mới trên mock để màn chi tiết tìm được sau khi Thêm xe. */
export const registerVehicle = (v: VehicleRecord) => {
  VEHICLES.unshift(v);
};

export const saveVehicleMedia = (id: string, photos: VehiclePhoto[], docs: VehicleDocument[]) => {
  VEHICLE_PHOTOS[id] = photos;
  VEHICLE_DOCUMENTS[id] = docs;
};

export const updateVehicle = (id: string, patch: Partial<VehicleRecord>) => {
  const row = VEHICLES.find((v) => v.id === id);
  if (row) Object.assign(row, patch);
};

export const nextStaffCode = () => {
  const max = PARTNER_STAFF.reduce((acc, s) => {
    const n = Number(s.code.replace(/\D/g, '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return `CP-${String(max + 1).padStart(4, '0')}`;
};

export const registerStaff = (s: PartnerStaffRecord) => {
  PARTNER_STAFF.unshift(s);
};

export const updateStaff = (id: string, patch: Partial<PartnerStaffRecord>) => {
  const row = PARTNER_STAFF.find((s) => s.id === id);
  if (row) Object.assign(row, patch);
};

export const vehiclesOfDriver = (staffId: string) =>
  VEHICLES.filter((v) => v.driverIds?.includes(staffId) || v.driverId === staffId);

export const assignDriverToVehicle = (staffId: string, vehicleId: string | null) => {
  if (!vehicleId) {
    VEHICLES.forEach((v) => {
      if (v.driverIds) v.driverIds = v.driverIds.filter((id) => id !== staffId);
      if (v.driverId === staffId) v.driverId = v.driverIds?.[0] ?? null;
    });
    return;
  }
  const target = VEHICLES.find((v) => v.id === vehicleId);
  if (target) {
    target.driverIds = Array.from(new Set([...(target.driverIds ?? (target.driverId ? [target.driverId] : [])), staffId]));
    target.driverId = target.driverIds[0] ?? staffId;
  }
};

export const assignDriversToVehicle = (vehicleId: string, staffIds: string[]) => {
  const target = VEHICLES.find((v) => v.id === vehicleId);
  if (target) {
    target.driverIds = staffIds;
    target.driverId = staffIds[0] ?? null;
  }
};

export interface StaffTransferHistory {
  id: string;
  staffId: string;
  fromStationId: string;
  toStationId: string;
  transferredAt: string;
  byName: string;
  reason: string;
}

export const STAFF_TRANSFER_HISTORY: StaffTransferHistory[] = [
  { id: 'st1', staffId: 's6', fromStationId: 'tt-hd', toStationId: 'tt-hm', transferredAt: '01/03/2026 09:15', byName: 'Lê Thị Hoa', reason: 'Bổ sung tài xế xe cẩu cho Trạm Hoàng Mai' },
  { id: 'st2', staffId: 's9', fromStationId: 'tt-hm', toStationId: 'tt-hd', transferredAt: '12/01/2026 10:20', byName: 'Phạm Quốc Huy', reason: 'Điều chuyển theo nhu cầu phủ sóng Hà Đông' },
  { id: 'st3', staffId: 's5', fromStationId: 'tt-hd', toStationId: 'tt-hm', transferredAt: '20/06/2026 08:00', byName: 'Lê Thị Hoa', reason: 'Bổ nhiệm GĐTT Hoàng Mai' },
];

export const registerStaffTransfer = (t: StaffTransferHistory) => {
  STAFF_TRANSFER_HISTORY.unshift(t);
};

export interface StaffKpiSummary {
  staffId: string;
  completed: number;
  cancelled: number;
  rejected: number;
  avgResponseMin: number;
  avgApproachMin: number;
  revenue: number;
  rating: number;
}

export const STAFF_KPI: StaffKpiSummary[] = [
  { staffId: 's6', completed: 42, cancelled: 3, rejected: 1, avgResponseMin: 4.2, avgApproachMin: 18, revenue: 48_500_000, rating: 4.7 },
  { staffId: 's7', completed: 28, cancelled: 2, rejected: 0, avgResponseMin: 6.1, avgApproachMin: 22, revenue: 12_200_000, rating: 4.4 },
  { staffId: 's9', completed: 15, cancelled: 5, rejected: 2, avgResponseMin: 8.0, avgApproachMin: 25, revenue: 7_800_000, rating: 4.1 },
];

export const staffKpiOf = (id: string) => STAFF_KPI.find((k) => k.staffId === id);

export const staffUsername = (s: PartnerStaffRecord | string): string => {
  if (typeof s === 'string') {
    const found = PARTNER_STAFF.find((p) => p.code === s || p.id === s || p.username === s);
    if (found?.username) return found.username;
    if (found) return generateStaffUsername(found.fullname, PARTNER_STAFF.filter((x) => x.id !== found.id).map((x) => x.username || ''));
    return s.toLowerCase().replace('-', '.');
  }
  if (s.username) return s.username;
  return generateStaffUsername(s.fullname, PARTNER_STAFF.filter((x) => x.id !== s.id).map((x) => x.username || ''));
};

export const staffAccountLabel = (s: Pick<PartnerStaffRecord, 'hasAccount' | 'accountLocked'>) => {
  if (!s.hasAccount) return 'Không có tài khoản';
  if (s.accountLocked) return 'Bị khóa';
  return 'Hoạt động';
};

export const registerTransfer = (t: VehicleTransferHistory) => {
  VEHICLE_TRANSFER_HISTORY.unshift(t);
};

export const orgName = (id: string) => ORG_NODES.find((n) => n.id === id)?.name ?? id;

export const stationName = (id: string) => orgName(id);

export const inScope = (persona: PartnerPersona, stationId: string | null) => {
  if (persona.stationIds.length === 0) return true;
  if (!stationId) return persona.role === 'BDH' || persona.role === 'GDM' || persona.role === 'GDCN' || persona.role === 'QLVUNG';
  return persona.stationIds.includes(stationId);
};

export const dueBadge = (days: number, warn: number) => {
  if (days < 0) return { text: `Quá hạn ${Math.abs(days)} ngày`, tone: 'red' as const };
  if (days <= warn) return { text: `Còn ${days} ngày`, tone: 'amber' as const };
  return { text: `Còn ${days} ngày`, tone: 'green' as const };
};

export type StaffDocument = VehicleDocument;

/** Chỉ giấy tờ phục vụ cứu hộ (HuanTV 04/10, #41) */
export const STAFF_DOC_TYPES = ['Bằng lái', 'Chứng chỉ vận hành cẩu'] as const;

export const LICENSE_CLASSES = ['B1', 'B2', 'B', 'C1', 'C', 'D1', 'D2', 'D', 'BE', 'C1E', 'CE', 'D1E', 'D2E', 'DE', 'FB2', 'FC'] as const;

export const STAFF_DOCUMENTS: Record<string, StaffDocument[]> = {
  s5: [
    { id: 'sd-s5-1', name: 'Bằng lái hạng C', type: 'Bằng lái', number: '010100000005', docClass: 'C', issuedAt: '12/03/2020', expiryAt: '12/03/2030', fileName: 'bang-lai-cp0101.pdf', fileUrl: 'https://picsum.photos/seed/sd-s5-1/800/1100' },
    { id: 'sd-s5-2', name: 'Chứng chỉ vận hành cẩu', type: 'Chứng chỉ vận hành cẩu', number: 'CC-0005', issuedAt: '20/04/2021', expiryAt: '20/04/2027', fileName: 'chung-chi-cau-cp0101.pdf', fileUrl: 'https://picsum.photos/seed/sd-s5-2/800/1100' },
  ],
  s6: [
    { id: 'sd-s6-1', name: 'Bằng lái hạng C', type: 'Bằng lái', number: '010100000006', docClass: 'C', issuedAt: '01/06/2019', expiryAt: '01/06/2029', fileName: 'bang-lai-cp0201.pdf', fileUrl: 'https://picsum.photos/seed/sd-s6-1/800/1100' },
    { id: 'sd-s6-2', name: 'Chứng chỉ vận hành cẩu', type: 'Chứng chỉ vận hành cẩu', number: 'CC-0006', issuedAt: '15/08/2020', expiryAt: '15/08/2026', fileName: 'chung-chi-cau-cp0201.pdf', fileUrl: 'https://picsum.photos/seed/sd-s6-2/800/1100' },
  ],
  s7: [
    { id: 'sd-s7-1', name: 'Bằng lái hạng C', type: 'Bằng lái', number: '010100000007', docClass: 'C', issuedAt: '08/01/2021', expiryAt: '08/01/2031', fileName: 'bang-lai-cp0202.pdf' },
  ],
  s9: [
    { id: 'sd-s9-1', name: 'Bằng lái hạng C', type: 'Bằng lái', number: '010100000009', docClass: 'C', issuedAt: '03/11/2018', expiryAt: '03/11/2028', fileName: 'bang-lai-cp0210.pdf' },
  ],
};

export const saveStaffDocs = (id: string, docs: StaffDocument[]) => {
  STAFF_DOCUMENTS[id] = docs;
};

export const staffDocsOf = (id: string) => STAFF_DOCUMENTS[id] ?? [];

export type StaffLogKind = 'transfer' | 'rescue' | 'vehicle' | 'profile' | 'lock' | 'account';

export interface StaffUserLog {
  id: string;
  staffId: string;
  kind: StaffLogKind;
  at: string;
  summary: string;
  byName?: string;
  field?: string;
  before?: string;
  after?: string;
}

export const STAFF_LOG_KIND_LABEL: Record<StaffLogKind, string> = {
  transfer: 'Điều chuyển',
  rescue: 'Cứu hộ',
  vehicle: 'Gán xe',
  profile: 'Thay đổi hồ sơ',
  lock: 'Khóa / mở khóa',
  account: 'Tài khoản',
};

export const STAFF_USER_LOGS: StaffUserLog[] = [
  { id: 'lg-s6-1', staffId: 's6', kind: 'rescue', at: '20/08/2026 07:40', summary: 'RS-29C123-260820-0712 · Kéo xe · Xe 29C12345 · Hoàn thành', byName: 'Hệ thống' },
  { id: 'lg-s6-2', staffId: 's6', kind: 'rescue', at: '19/08/2026 16:40', summary: 'RS-29C123-260819-4412 · Cứu hộ lốp · Xe 29C12345 · Hoàn thành', byName: 'Hệ thống' },
  { id: 'lg-s6-3', staffId: 's6', kind: 'vehicle', at: '01/06/2026 08:00', summary: 'Ghép xe 29C12345 · Người thực hiện: Lê Thị Hoa', byName: 'Lê Thị Hoa (GDCN)' },
  { id: 'lg-s6-4', staffId: 's6', kind: 'profile', at: '18/08/2026 11:05', summary: 'Cập nhật bằng lái: hết hạn 01/06/2027 → 01/06/2029', byName: 'Đỗ Văn Long (GDTT)', field: 'Bằng lái xe', before: 'Hết hạn: 01/06/2027', after: 'Hết hạn: 01/06/2029' },
  { id: 'lg-s6-5', staffId: 's6', kind: 'transfer', at: '01/03/2026 09:15', summary: 'Trạm Hà Đông → Trạm Hoàng Mai · Duyệt: Lê Thị Hoa', byName: 'Lê Thị Hoa (GDCN)' },
  { id: 'lg-s5-1', staffId: 's5', kind: 'rescue', at: '20/08/2026 09:22', summary: 'RS-29C678-260820-1188 · Kéo xe · Xe 29C67890 · Đang thực hiện', byName: 'Hệ thống' },
  { id: 'lg-s5-2', staffId: 's5', kind: 'profile', at: '19/08/2026 14:10', summary: 'Đổi loại hợp đồng: Bán thời gian → Toàn thời gian', byName: 'Nguyễn Văn Bình (BDH)', field: 'Loại hợp đồng', before: 'Bán thời gian', after: 'Toàn thời gian' },
  { id: 'lg-s5-3', staffId: 's5', kind: 'transfer', at: '20/06/2026 08:00', summary: 'Trạm Hà Đông → Trạm Hoàng Mai', byName: 'Lê Thị Hoa (GDCN)' },
  { id: 'lg-s9-1', staffId: 's9', kind: 'rescue', at: '17/08/2026 15:33', summary: 'RS-29C999-260817-5510 · Kích bình · Xe 30F11122 · Hoàn thành', byName: 'Hệ thống' },
  { id: 'lg-s9-2', staffId: 's9', kind: 'vehicle', at: '10/02/2026 08:00', summary: 'Ghép xe 30F11122 · Người thực hiện: Phạm Quốc Huy', byName: 'Phạm Quốc Huy (QLVUNG)' },
  { id: 'lg-s9-3', staffId: 's9', kind: 'transfer', at: '12/01/2026 10:20', summary: 'Trạm Hoàng Mai → Trạm Hà Đông · Duyệt: Phạm Quốc Huy', byName: 'Phạm Quốc Huy (QLVUNG)' },
  { id: 'lg-s10-1', staffId: 's10', kind: 'lock', at: '05/08/2026 10:00', summary: 'Khóa tài khoản · Nghỉ việc, tạm hoãn hợp đồng', byName: 'Trần Minh Đức (GDM)' },
  { id: 'lg-s7-1', staffId: 's7', kind: 'account', at: '08/01/2021 09:00', summary: 'Tạo hồ sơ, chưa cấp tài khoản', byName: 'Đỗ Văn Long (GDTT)' },
];

export const staffLogsOf = (id: string) => STAFF_USER_LOGS.filter((l) => l.staffId === id);

export const registerStaffLog = (log: StaffUserLog) => {
  STAFF_USER_LOGS.unshift(log);
};

export const formatVnd = (n: number) =>
  n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const PHOTO = (seed: string, label: string): VehiclePhoto => ({
  id: seed,
  label,
  url: `https://picsum.photos/seed/${seed}/480/320`,
});

export const VEHICLE_PHOTOS: Record<string, VehiclePhoto[]> = {
  v1: [
    PHOTO('v1-front', 'Góc trước'),
    PHOTO('v1-rear', 'Góc sau'),
    PHOTO('v1-left', 'Bên trái'),
    PHOTO('v1-right', 'Bên phải'),
  ],
  v2: [
    PHOTO('v2-front', 'Góc trước'),
    PHOTO('v2-rear', 'Góc sau'),
    PHOTO('v2-left', 'Bên trái'),
  ],
  v3: [
    PHOTO('v3-front', 'Góc trước'),
    PHOTO('v3-cabin', 'Cabin'),
  ],
  v4: [
    PHOTO('v4-front', 'Góc trước'),
    PHOTO('v4-rear', 'Góc sau'),
    PHOTO('v4-left', 'Bên trái'),
    PHOTO('v4-right', 'Bên phải'),
  ],
  v5: [
    PHOTO('v5-front', 'Góc trước'),
    PHOTO('v5-rear', 'Góc sau'),
  ],
};

const expiryFromDays = (days: number) => {
  const d = new Date(2026, 7, 20);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('vi-VN');
};

export const VEHICLE_DOCUMENTS: Record<string, VehicleDocument[]> = {
  v1: [
    { id: 'd1', name: 'Giấy đăng kiểm', type: 'Đăng kiểm', number: 'GT-00001', issuedAt: '20/08/2025', expiryAt: expiryFromDays(22), fileName: 'dang-kiem-29C12345.pdf', fileUrl: 'https://picsum.photos/seed/doc-d1/800/1100' },
    { id: 'd2', name: 'BH TNDS bắt buộc', type: 'BH TNDS', number: 'GT-00002', issuedAt: '20/08/2025', expiryAt: expiryFromDays(-15), fileName: 'tnds-29C12345.pdf', fileUrl: 'https://picsum.photos/seed/doc-d2/800/1100' },
    { id: 'd3', name: 'BH vật chất xe', type: 'BH vật chất', number: 'GT-00003', issuedAt: '05/09/2025', expiryAt: expiryFromDays(9), fileName: 'vat-chat-29C12345.pdf', fileUrl: 'https://picsum.photos/seed/doc-d3/800/1100' },
    { id: 'd4', name: 'Giấy phép lưu hành', type: 'GPLH', number: 'GT-00004', issuedAt: '01/01/2026', expiryAt: expiryFromDays(40), fileName: 'gplh-29C12345.pdf', fileUrl: 'https://picsum.photos/seed/doc-d4/800/1100' },
  ],
  v2: [
    { id: 'd5', name: 'Giấy đăng kiểm', type: 'Đăng kiểm', number: 'GT-00005', issuedAt: '01/02/2026', expiryAt: expiryFromDays(45), fileName: 'dang-kiem-29C67890.pdf' },
    { id: 'd6', name: 'BH TNDS bắt buộc', type: 'BH TNDS', number: 'GT-00006', issuedAt: '01/02/2026', expiryAt: expiryFromDays(60), fileName: 'tnds-29C67890.pdf' },
    { id: 'd7', name: 'Giấy phép lưu hành', type: 'GPLH', number: 'GT-00007', issuedAt: '15/01/2026', expiryAt: expiryFromDays(5), fileName: 'gplh-29C67890.pdf' },
  ],
  v3: [
    { id: 'd8', name: 'Giấy đăng kiểm', type: 'Đăng kiểm', number: 'GT-00008', issuedAt: '10/03/2026', expiryAt: expiryFromDays(8), fileName: 'dang-kiem-30F11122.pdf' },
    { id: 'd9', name: 'BH TNDS bắt buộc', type: 'BH TNDS', number: 'GT-00009', issuedAt: '10/03/2026', expiryAt: expiryFromDays(3), fileName: 'tnds-30F11122.pdf' },
  ],
  v4: [
    { id: 'd10', name: 'Giấy đăng kiểm', type: 'Đăng kiểm', number: 'GT-00010', issuedAt: '12/12/2025', expiryAt: expiryFromDays(70), fileName: 'dang-kiem-15B33344.pdf' },
    { id: 'd11', name: 'BH vật chất xe', type: 'BH vật chất', number: 'GT-00011', issuedAt: '12/12/2025', expiryAt: expiryFromDays(40), fileName: 'vat-chat-15B33344.pdf' },
  ],
  v5: [
    { id: 'd12', name: 'Giấy đăng kiểm', type: 'Đăng kiểm', number: 'GT-00012', issuedAt: '01/06/2026', expiryAt: expiryFromDays(100), fileName: 'dang-kiem-51C55566.pdf' },
    { id: 'd13', name: 'BH vật chất xe', type: 'BH vật chất', number: 'GT-00013', issuedAt: '01/06/2026', expiryAt: expiryFromDays(12), fileName: 'vat-chat-51C55566.pdf' },
  ],
};

export const VEHICLE_TRANSFER_HISTORY: VehicleTransferHistory[] = [
  { id: 't1', vehicleId: 'v1', fromStationId: 'tt-hd', toStationId: 'tt-hm', transferredAt: '01/03/2026 09:15', byName: 'Lê Thị Hoa', reason: 'Bổ sung xe cẩu cho Trạm Hoàng Mai' },
  { id: 't2', vehicleId: 'v1', fromStationId: 'tt-hp', toStationId: 'tt-hd', transferredAt: '12/11/2025 14:40', byName: 'Trần Minh Đức', reason: 'Điều chỉnh phủ sóng Miền Bắc' },
  { id: 't3', vehicleId: 'v2', fromStationId: 'tt-hd', toStationId: 'tt-hm', transferredAt: '20/06/2026 08:00', byName: 'Đỗ Văn Long', reason: 'Xe sàn trượt hỗ trợ nội thành' },
  { id: 't4', vehicleId: 'v3', fromStationId: 'tt-hm', toStationId: 'tt-hd', transferredAt: '05/07/2026 11:20', byName: 'Lê Thị Hoa', reason: 'Xe đang sửa chữa, chuyển về xưởng Hà Đông' },
];

export const STATION_OPTIONS = [
  { id: 'tt-hm', name: 'Trạm Hoàng Mai' },
  { id: 'tt-hd', name: 'Trạm Hà Đông' },
  { id: 'tt-hp', name: 'Trạm Hải Phòng' },
  { id: 'tt-bt', name: 'Trạm Bình Thạnh' },
];

export const vehicleReminders = (v: VehicleRecord) =>
  [
    // Chỉ giấy tờ bắt buộc (FL-M1-01 BR-18); BH vật chất tùy chọn không nhắc; bảo dưỡng quản lý ở T12
    { label: 'Đăng kiểm', days: v.inspectionDueDays, warn: 30 },
    { label: 'GPLH', days: v.gplhDueDays, warn: 30 },
    { label: 'BH TNDS', days: v.tndsDueDays, warn: 30 },
  ] as const;

export interface VehicleAuditLog {
  id: string;
  vehicleId: string;
  actedAt: string;
  actorName: string;
  actionCode: string;
  actionLabel: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export const VEHICLE_AUDIT_LOGS: Record<string, VehicleAuditLog[]> = {
  v1: [
    {
      id: 'va-r1',
      vehicleId: 'v1',
      actedAt: '20/08/2026 07:40',
      actorName: 'Ngô Đức Anh (tài xế)',
      actionCode: 'RESCUE',
      actionLabel: 'Cứu hộ',
      oldValue: 'Nhận đơn 07:40',
      newValue: 'Hoàn thành 09:05',
      reason: 'Đơn RS-29C123-260820-0712 · Kéo xe',
    },
    {
      id: 'va-r2',
      vehicleId: 'v1',
      actedAt: '19/08/2026 16:40',
      actorName: 'Ngô Đức Anh (tài xế)',
      actionCode: 'RESCUE',
      actionLabel: 'Cứu hộ',
      oldValue: 'Nhận đơn 16:40',
      newValue: 'Hoàn thành 17:55',
      reason: 'Đơn RS-29C123-260819-4412 · Cứu hộ lốp',
    },
    {
      id: 'va-1',
      vehicleId: 'v1',
      actedAt: '20/08/2026 14:10',
      actorName: 'Nguyễn Văn Bình (BDH)',
      actionCode: 'STATUS',
      actionLabel: 'Đổi trạng thái',
      oldValue: 'Đang sửa chữa',
      newValue: 'Sẵn sàng',
      reason: 'Hoàn thành sửa chữa lốp và cân vành',
    },
    {
      id: 'va-2',
      vehicleId: 'v1',
      actedAt: '15/08/2026 09:30',
      actorName: 'Đỗ Văn Long (GDTT)',
      actionCode: 'UPDATE_DOC',
      actionLabel: 'Cập nhật giấy tờ',
      oldValue: 'Đăng kiểm cũ hết hạn',
      newValue: 'Đăng kiểm mới: 11/09/2026',
      reason: 'Đã khám đăng kiểm kỳ 2026 tại Trạm 29-01V',
    },
    {
      id: 'va-3',
      vehicleId: 'v1',
      actedAt: '01/03/2026 09:15',
      actorName: 'Lê Thị Hoa (GDCN)',
      actionCode: 'TRANSFER',
      actionLabel: 'Điều chuyển trạm',
      oldValue: 'Trạm Hà Đông',
      newValue: 'Trạm Hoàng Mai',
      reason: 'Bổ sung xe cẩu cho Trạm Hoàng Mai',
    },
    {
      id: 'va-4',
      vehicleId: 'v1',
      actedAt: '15/01/2026 10:00',
      actorName: 'Trần Minh Đức (GDM)',
      actionCode: 'TOOLS',
      actionLabel: 'Cập nhật công cụ',
      oldValue: 'Xích: 1 · Sẵn sàng',
      newValue: 'Xích: 0 · Chưa sẵn sàng',
      reason: 'Xích bị đứt trong ca cứu hộ tại Vành đai 3',
    },
  ],
  v2: [
    {
      id: 'va-5',
      vehicleId: 'v2',
      actedAt: '20/06/2026 08:00',
      actorName: 'Đỗ Văn Long (GDTT)',
      actionCode: 'TRANSFER',
      actionLabel: 'Điều chuyển trạm',
      oldValue: 'Trạm Hà Đông',
      newValue: 'Trạm Hoàng Mai',
      reason: 'Xe sàn trượt hỗ trợ nội thành',
    },
  ],
  v3: [
    {
      id: 'va-6',
      vehicleId: 'v3',
      actedAt: '18/08/2026 11:20',
      actorName: 'Phạm Quốc Huy (QLVUNG)',
      actionCode: 'STATUS',
      actionLabel: 'Đổi trạng thái',
      oldValue: 'Sẵn sàng',
      newValue: 'Đang sửa chữa',
      reason: 'Hỏng bơm thủy lực sàn nâng',
    },
  ],
};

export interface VehicleDriverPairing {
  id: string;
  vehicleId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  validFrom: string;
  validTo: string | null;
  pairedBy: string;
  endReason?: string;
  endNote?: string;
}

export const VEHICLE_PAIRING_HISTORY: Record<string, VehicleDriverPairing[]> = {
  v1: [
    {
      id: 'vp-1',
      vehicleId: 'v1',
      driverId: 's6',
      driverName: 'Ngô Đức Anh',
      driverPhone: '0906 666 666',
      validFrom: '01/06/2026 08:00',
      validTo: null,
      pairedBy: 'Lê Thị Hoa (GDCN)',
    },
    {
      id: 'vp-0',
      vehicleId: 'v1',
      driverId: 's7',
      driverName: 'Bùi Văn Tâm',
      driverPhone: '0907 777 777',
      validFrom: '15/01/2026 08:00',
      validTo: '01/06/2026 07:30',
      pairedBy: 'Đỗ Văn Long (GDTT)',
      endReason: 'Chuyển xe khác / đổi ca trực',
      endNote: 'Chuyển sang xe 29C67890',
    },
  ],
  v2: [
    {
      id: 'vp-2',
      vehicleId: 'v2',
      driverId: 's7',
      driverName: 'Bùi Văn Tâm',
      driverPhone: '0907 777 777',
      validFrom: '01/06/2026 08:00',
      validTo: null,
      pairedBy: 'Đỗ Văn Long (GDTT)',
    },
  ],
  v3: [
    {
      id: 'vp-3',
      vehicleId: 'v3',
      driverId: 's9',
      driverName: 'Hoàng Gia Bảo',
      driverPhone: '0909 999 999',
      validFrom: '10/02/2026 08:00',
      validTo: null,
      pairedBy: 'Phạm Quốc Huy (QLVUNG)',
    },
  ],
};


// Kho công cụ theo trạm, dùng chung tab Kho và công cụ trên xe (FL-M1-02 BR-K01, BR-K05). Khóa theo tên công cụ.
export type ToolStockTxType = 'IN' | 'OUT' | 'ISSUE';
export interface ToolStockTx {
  id: string;
  toolName: string;
  stationId: string;
  type: ToolStockTxType; // IN nhập kho, OUT loại bỏ, ISSUE xuất cho xe
  qty: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export const TOOL_STOCK: Record<string, Record<string, number>> = Object.fromEntries(
  STATION_OPTIONS.map((s, si) => [
    s.id,
    Object.fromEntries(MASTER_TOOL_CATALOG.map((t, ti) => [t.name, ((ti * 3 + si * 5) % 8) + 2])),
  ])
);

export const TOOL_STOCK_TX: ToolStockTx[] = [];

export const stockOf = (stationId: string, toolName: string) => TOOL_STOCK[stationId]?.[toolName] ?? 0;

export const setStock = (stationId: string, toolName: string, qty: number) => {
  TOOL_STOCK[stationId] = { ...(TOOL_STOCK[stationId] ?? {}), [toolName]: qty };
};

export const logStockTx = (tx: Omit<ToolStockTx, 'id' | 'createdAt'>) => {
  TOOL_STOCK_TX.unshift({ ...tx, id: `tx-${Date.now()}-${TOOL_STOCK_TX.length}`, createdAt: new Date().toLocaleString('vi-VN') });
};

export interface ServiceRequiredTool {
  serviceId: string;
  serviceName: string;
  specialEquipment: string;
  requiredTools: { toolId: string; minQuantity: number }[];
}

export const SERVICE_REQUIRED_TOOLS: ServiceRequiredTool[] = [
  {
    serviceId: 'srv-1',
    serviceName: 'Cứu hộ ắc quy / Xe hết pin',
    specialEquipment: 'Máy kích bình di động, ampe kìm',
    requiredTools: [
      { toolId: 'mt-7', minQuantity: 1 },
      { toolId: 'mt-8', minQuantity: 1 },
      { toolId: 'mt-11', minQuantity: 1 },
    ],
  },
  {
    serviceId: 'srv-2',
    serviceName: 'Cẩu kéo xe tai nạn',
    specialEquipment: 'Cần cẩu xoay 360 độ, cáp tời phụ tải 5T',
    requiredTools: [
      { toolId: 'mt-1', minQuantity: 2 },
      { toolId: 'mt-2', minQuantity: 2 },
      { toolId: 'mt-3', minQuantity: 4 },
      { toolId: 'mt-4', minQuantity: 2 },
      { toolId: 'mt-5', minQuantity: 2 },
      { toolId: 'mt-6', minQuantity: 4 },
      { toolId: 'mt-9', minQuantity: 1 },
      { toolId: 'mt-10', minQuantity: 2 },
    ],
  },
  {
    serviceId: 'srv-3',
    serviceName: 'Kéo xe ngập nước / sa lầy',
    specialEquipment: 'Tời kéo cáp điện 12V 10.000 lbs',
    requiredTools: [
      { toolId: 'mt-2', minQuantity: 2 },
      { toolId: 'mt-3', minQuantity: 2 },
      { toolId: 'mt-6', minQuantity: 2 },
      { toolId: 'mt-10', minQuantity: 4 },
    ],
  },
  {
    serviceId: 'srv-4',
    serviceName: 'Thay lốp dự phòng',
    specialEquipment: 'Súng xiết bu-lông khí nén, máy nén khí mini',
    requiredTools: [
      { toolId: 'mt-6', minQuantity: 2 },
      { toolId: 'mt-8', minQuantity: 1 },
      { toolId: 'mt-12', minQuantity: 1 },
    ],
  },
];


