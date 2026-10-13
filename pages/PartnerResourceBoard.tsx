/**
 * PartnerResourceBoard.tsx
 * FL-M1-11 — Bảng nguồn lực đội xe (Provider SCR-02 & Admin SCR-01)
 * Route: /partner/resource-board
 * Persona: Trưởng trạm / Đối tác (chỉ thấy trạm trực thuộc) / Admin (toàn hệ thống)
 * Cập nhật 02/10/2026: Tích hợp đầy đủ §11 Mở rộng năng lực trạm (UI-R10..R30)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Truck,
  User,
  Users,
  MapPin,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Radio,
  ShieldAlert,
  Layers,
  Check,
  Eye,
  X,
  Phone,
} from 'lucide-react';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import { type PartnerPersona } from '../data/partnerRescueMockData';

// ─── Types ────────────────────────────────────────────────────────────────────

type BoardStatus = 'ON_JOB' | 'AVAILABLE' | 'IDLE_NO_DRIVER' | 'UNAVAILABLE' | 'INACTIVE';
type Freshness = 'FRESH' | 'STALE' | 'UNKNOWN';
type GpsMatchState = 'MATCHED' | 'UNMATCHED' | 'NONE';

type DriverState = 'IDLE_READY' | 'ON_ORDER' | 'NO_VEHICLE' | 'OFF_SHIFT' | 'OFFLINE';

interface ToolStatus {
  eligible: boolean;
  missingTools: string[];
}

interface ResourceBoardItem {
  id: string;
  plate: string;
  brand: string;
  model: string;
  type: string;
  stationId: string;
  stationName: string;
  boardStatus: BoardStatus;
  activeOrderCode?: string;
  services: string[];
  tools: ToolStatus;
  location?: {
    lat: number;
    lng: number;
    address?: string;
    source: 'MID' | 'APP' | 'MANUAL';
    freshness: Freshness;
    lastSeenAt: string;
    ageSeconds: number;
  };
  driver?: {
    staffId: string;
    fullname: string;
    phone: string;
    online: boolean;
    inShift: boolean;
    pairingSource: 'RESPONSIBLE' | 'PAIRING';
    driverState?: DriverState;
  };
  gps?: {
    imei: string;
    matchState: GpsMatchState;
    signalLost: boolean;
    signalLostMinutes?: number;
  };
}

interface DriverResourceItem {
  staffId: string;
  fullname: string;
  phone: string;
  stationId: string;
  stationName: string;
  online: boolean;
  inShift: boolean;
  driverState: DriverState;
  currentShift: string;
  vehiclePlate?: string;
  freshness: Freshness;
  signalLost: boolean;
  lastSeenAt: string;
}

interface ShiftCoverageItem {
  name: string;
  start: string;
  end: string;
  present: number;
  minStaff: number;
  state: 'SHORTAGE' | 'SUFFICIENT';
}

interface ServiceCapacityItem {
  serviceId: string;
  serviceName: string;
  readyVehicleCount: number;
  vehiclePlates: string[];
}

interface ShortageItem {
  type: 'TOOL' | 'STAFF' | 'SERVICE';
  refId: string;
  text: string;
  detail: string;
}

interface BoardSummary {
  total: number;
  byStatus: Record<BoardStatus, number>;
  signalLost: number;
  unmatched: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const makeMockItems = (): ResourceBoardItem[] => [
  {
    id: 'sv-001',
    plate: '29C-123.45',
    brand: 'Ford',
    model: 'Ranger',
    type: 'CẨU',
    stationId: 'stn-hn1',
    stationName: 'Trạm HN - Hoàng Mai',
    boardStatus: 'AVAILABLE',
    services: ['CẨU', 'KÉO', 'CÂU BÌNH'],
    tools: { eligible: true, missingTools: [] },
    location: { lat: 21.00123, lng: 105.84567, source: 'MID', freshness: 'FRESH', lastSeenAt: '08:30:12', ageSeconds: 18 },
    driver: { staffId: 'st-01', fullname: 'NGÔ ĐỨC AMINH', phone: '0988 123 456', online: true, inShift: true, pairingSource: 'RESPONSIBLE', driverState: 'IDLE_READY' },
    gps: { imei: '861200034567345', matchState: 'MATCHED', signalLost: false },
  },
  {
    id: 'sv-002',
    plate: '15B-333.44',
    brand: 'Toyota',
    model: 'Hilux',
    type: 'CẨU',
    stationId: 'stn-hp1',
    stationName: 'Trạm Hải Phòng',
    boardStatus: 'ON_JOB',
    activeOrderCode: 'RO-001234',
    services: ['CẨU', 'KÉO'],
    tools: { eligible: true, missingTools: [] },
    location: { lat: 20.84512, lng: 106.68839, source: 'MID', freshness: 'STALE', lastSeenAt: '08:07:45', ageSeconds: 1380 },
    driver: { staffId: 'st-02', fullname: 'TRẦN VĂN BÌNH', phone: '0977 234 567', online: false, inShift: true, pairingSource: 'RESPONSIBLE', driverState: 'ON_ORDER' },
    gps: { imei: '861200098761234', matchState: 'MATCHED', signalLost: true, signalLostMinutes: 23 },
  },
  {
    id: 'sv-003',
    plate: '30A-555.66',
    brand: 'Mitsubishi',
    model: 'L200',
    type: 'CẨU',
    stationId: 'stn-hn1',
    stationName: 'Trạm HN - Hoàng Mai',
    boardStatus: 'IDLE_NO_DRIVER',
    services: ['CẨU', 'SỬA CHỮA'],
    tools: { eligible: false, missingTools: ['Kích thủy lực 5T'] },
    location: undefined,
    driver: undefined,
    gps: { imei: '', matchState: 'UNMATCHED', signalLost: false },
  },
  {
    id: 'sv-004',
    plate: '51F-111.22',
    brand: 'Ford',
    model: 'Ranger',
    type: 'SỬA CHỮA',
    stationId: 'stn-hcm1',
    stationName: 'Trạm HCM - Bình Thạnh',
    boardStatus: 'UNAVAILABLE',
    services: ['SỬA CHỮA', 'CÂU BÌNH', 'THAY LỐP'],
    tools: { eligible: false, missingTools: ['Máy kiểm tra ắc quy'] },
    location: { lat: 10.80231, lng: 106.70156, source: 'MID', freshness: 'STALE', lastSeenAt: '07:15:00', ageSeconds: 4500 },
    driver: { staffId: 'st-03', fullname: 'LÊ HOÀNG CƯỜNG', phone: '0966 345 678', online: false, inShift: false, pairingSource: 'RESPONSIBLE', driverState: 'OFFLINE' },
    gps: { imei: '861200055512345', matchState: 'MATCHED', signalLost: false },
  },
  {
    id: 'sv-005',
    plate: '43A-789.01',
    brand: 'Isuzu',
    model: 'D-Max',
    type: 'KÉO',
    stationId: 'stn-dn1',
    stationName: 'Trạm Đà Nẵng',
    boardStatus: 'AVAILABLE',
    services: ['KÉO', 'CÂU BÌNH'],
    tools: { eligible: true, missingTools: [] },
    location: { lat: 16.06778, lng: 108.22083, source: 'MID', freshness: 'FRESH', lastSeenAt: '08:29:55', ageSeconds: 35 },
    driver: { staffId: 'st-04', fullname: 'PHAN THỊ DUYÊN', phone: '0933 456 789', online: true, inShift: true, pairingSource: 'RESPONSIBLE', driverState: 'IDLE_READY' },
    gps: { imei: '861200022234567', matchState: 'MATCHED', signalLost: false },
  },
  {
    id: 'sv-006',
    plate: '29H-456.78',
    brand: 'Toyota',
    model: 'Hilux',
    type: 'CẨU',
    stationId: 'stn-hn2',
    stationName: 'Trạm HN - Cầu Giấy',
    boardStatus: 'ON_JOB',
    activeOrderCode: 'RO-001235',
    services: ['CẨU', 'KÉO'],
    tools: { eligible: true, missingTools: [] },
    location: { lat: 21.03123, lng: 105.79012, source: 'MID', freshness: 'FRESH', lastSeenAt: '08:28:00', ageSeconds: 120 },
    driver: { staffId: 'st-05', fullname: 'HOÀNG MINH ĐĂNG', phone: '0944 567 890', online: true, inShift: true, pairingSource: 'RESPONSIBLE', driverState: 'ON_ORDER' },
    gps: { imei: '861200011145678', matchState: 'MATCHED', signalLost: false },
  },
  {
    id: 'sv-007',
    plate: '30E-888.99',
    brand: 'Hyundai',
    model: 'Mighty',
    type: 'KÉO',
    stationId: 'stn-hn1',
    stationName: 'Trạm HN - Hoàng Mai',
    boardStatus: 'AVAILABLE',
    services: ['KÉO'],
    tools: { eligible: true, missingTools: [] },
    location: { lat: 20.98541, lng: 105.85211, source: 'MID', freshness: 'FRESH', lastSeenAt: '08:30:00', ageSeconds: 30 },
    driver: { staffId: 'st-06', fullname: 'NGUYỄN VĂN AN', phone: '0912 345 678', online: true, inShift: true, pairingSource: 'PAIRING', driverState: 'IDLE_READY' },
    gps: { imei: '861200077788990', matchState: 'MATCHED', signalLost: false },
  },
];

const makeMockDrivers = (): DriverResourceItem[] => [
  { staffId: 'st-01', fullname: 'NGÔ ĐỨC AMINH', phone: '0988 123 456', stationId: 'stn-hn1', stationName: 'Trạm HN - Hoàng Mai', online: true, inShift: true, driverState: 'IDLE_READY', currentShift: 'Ca sáng (06:00 - 14:00)', vehiclePlate: '29C-123.45', freshness: 'FRESH', signalLost: false, lastSeenAt: '08:30:12' },
  { staffId: 'st-02', fullname: 'TRẦN VĂN BÌNH', phone: '0977 234 567', stationId: 'stn-hp1', stationName: 'Trạm Hải Phòng', online: false, inShift: true, driverState: 'ON_ORDER', currentShift: 'Ca sáng (06:00 - 14:00)', vehiclePlate: '15B-333.44', freshness: 'STALE', signalLost: true, lastSeenAt: '08:07:45' },
  { staffId: 'st-03', fullname: 'LÊ HOÀNG CƯỜNG', phone: '0966 345 678', stationId: 'stn-hcm1', stationName: 'Trạm HCM - Bình Thạnh', online: false, inShift: false, driverState: 'OFFLINE', currentShift: 'Ngoài ca', vehiclePlate: '51F-111.22', freshness: 'UNKNOWN', signalLost: false, lastSeenAt: '07:15:00' },
  { staffId: 'st-04', fullname: 'PHAN THỊ DUYÊN', phone: '0933 456 789', stationId: 'stn-dn1', stationName: 'Trạm Đà Nẵng', online: true, inShift: true, driverState: 'IDLE_READY', currentShift: 'Ca sáng (06:00 - 14:00)', vehiclePlate: '43A-789.01', freshness: 'FRESH', signalLost: false, lastSeenAt: '08:29:55' },
  { staffId: 'st-05', fullname: 'HOÀNG MINH ĐĂNG', phone: '0944 567 890', stationId: 'stn-hn2', stationName: 'Trạm HN - Cầu Giấy', online: true, inShift: true, driverState: 'ON_ORDER', currentShift: 'Ca sáng (06:00 - 14:00)', vehiclePlate: '29H-456.78', freshness: 'FRESH', signalLost: false, lastSeenAt: '08:28:00' },
  { staffId: 'st-06', fullname: 'NGUYỄN VĂN AN', phone: '0912 345 678', stationId: 'stn-hn1', stationName: 'Trạm HN - Hoàng Mai', online: true, inShift: true, driverState: 'IDLE_READY', currentShift: 'Ca sáng (06:00 - 14:00)', vehiclePlate: '30E-888.99', freshness: 'FRESH', signalLost: false, lastSeenAt: '08:30:00' },
  { staffId: 'st-07', fullname: 'VŨ QUỐC VIỆT', phone: '0903 112 233', stationId: 'stn-hn1', stationName: 'Trạm HN - Hoàng Mai', online: true, inShift: true, driverState: 'NO_VEHICLE', currentShift: 'Ca sáng (06:00 - 14:00)', vehiclePlate: undefined, freshness: 'FRESH', signalLost: false, lastSeenAt: '08:25:10' },
  { staffId: 'st-08', fullname: 'ĐẶNG TIẾN DŨNG', phone: '0904 998 877', stationId: 'stn-hn1', stationName: 'Trạm HN - Hoàng Mai', online: false, inShift: false, driverState: 'OFF_SHIFT', currentShift: 'Ca chiều (14:00 - 22:00)', vehiclePlate: undefined, freshness: 'UNKNOWN', signalLost: false, lastSeenAt: 'Hôm qua' },
];

const mockShiftCoverage: ShiftCoverageItem[] = [
  { name: 'Ca sáng', start: '06:00', end: '14:00', present: 5, minStaff: 6, state: 'SHORTAGE' },
  { name: 'Ca chiều', start: '14:00', end: '22:00', present: 6, minStaff: 6, state: 'SUFFICIENT' },
  { name: 'Ca đêm', start: '22:00', end: '06:00', present: 3, minStaff: 3, state: 'SUFFICIENT' },
];

const mockServices: ServiceCapacityItem[] = [
  { serviceId: 'srv-keo', serviceName: 'Kéo xe', readyVehicleCount: 3, vehiclePlates: ['29C-123.45', '43A-789.01', '30E-888.99'] },
  { serviceId: 'srv-cau', serviceName: 'Cẩu xe', readyVehicleCount: 1, vehiclePlates: ['29C-123.45'] },
  { serviceId: 'srv-caubinh', serviceName: 'Câu bình', readyVehicleCount: 2, vehiclePlates: ['29C-123.45', '43A-789.01'] },
  { serviceId: 'srv-suachua', serviceName: 'Sửa chữa tại chỗ', readyVehicleCount: 0, vehiclePlates: [] },
];

const mockShortages: ShortageItem[] = [
  { type: 'TOOL', refId: 'sv-003', text: 'Xe 30A-555.66 thiếu công cụ', detail: 'Thiếu Kích thủy lực 5T theo định mức cẩu' },
  { type: 'TOOL', refId: 'sv-004', text: 'Xe 51F-111.22 thiếu công cụ', detail: 'Thiếu Máy kiểm tra ắc quy' },
  { type: 'STAFF', refId: 'shift-1', text: 'Ca sáng (06:00 - 14:00) thiếu 1 tài xế', detail: 'Có mặt 5/6 người so với định mức min_staff' },
  { type: 'SERVICE', refId: 'srv-suachua', text: 'Sửa chữa tại chỗ: 0 xe đáp ứng ngay', detail: 'Tất cả xe sửa chữa đang bận hoặc thiếu công cụ' },
];

const calcSummary = (items: ResourceBoardItem[]): BoardSummary => {
  const byStatus: Record<BoardStatus, number> = { ON_JOB: 0, AVAILABLE: 0, IDLE_NO_DRIVER: 0, UNAVAILABLE: 0, INACTIVE: 0 };
  let signalLost = 0;
  let unmatched = 0;
  items.forEach(i => {
    byStatus[i.boardStatus]++;
    if (i.gps?.signalLost) signalLost++;
    if (i.gps?.matchState === 'UNMATCHED') unmatched++;
  });
  return { total: items.length, byStatus, signalLost, unmatched };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<BoardStatus, { label: string; color: string; bg: string; dot: string }> = {
  AVAILABLE:      { label: 'Sẵn sàng',         color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   dot: 'bg-green-500' },
  ON_JOB:         { label: 'Đang làm đơn',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500' },
  IDLE_NO_DRIVER: { label: 'Rảnh — chưa TX',    color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     dot: 'bg-gray-400' },
  UNAVAILABLE:    { label: 'Dừng / Sửa chữa',   color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  INACTIVE:       { label: 'Ngừng hoạt động',   color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500' },
};

const freshnessConfig: Record<Freshness, { label: string; color: string; bg: string }> = {
  FRESH:   { label: 'Mới',     color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  STALE:   { label: 'Cũ',      color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  UNKNOWN: { label: 'Không rõ', color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200' },
};

const driverStateConfig: Record<DriverState, { label: string; color: string; bg: string; dot: string }> = {
  IDLE_READY: { label: 'Rảnh (Sẵn sàng)', color: 'text-green-700', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  ON_ORDER:   { label: 'Đang làm đơn',    color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',  dot: 'bg-blue-500' },
  NO_VEHICLE: { label: 'Chưa có xe',      color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  OFF_SHIFT:  { label: 'Ngoài ca',        color: 'text-purple-700',bg: 'bg-purple-50 border-purple-200',dot: 'bg-purple-400' },
  OFFLINE:    { label: 'Offline',         color: 'text-gray-600',  bg: 'bg-gray-50 border-gray-200',  dot: 'bg-gray-400' },
};

const fmtAge = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
};

const maskImei = (imei: string) => {
  if (!imei) return '—';
  if (imei.length <= 8) return imei;
  return `${imei.slice(0, 4)}…${imei.slice(-4)}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const PartnerResourceBoard: React.FC = () => {
  const navigate = useNavigate();
  const [persona, setPersona] = React.useState<PartnerPersona>(getStoredPersona);

  const ALL_ITEMS = useMemo(() => makeMockItems(), []);
  const ALL_DRIVERS = useMemo(() => makeMockDrivers(), []);

  const [searchPlate, setSearchPlate] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [filterStatus, setFilterStatus] = useState<BoardStatus | ''>('');
  const [filterFreshness, setFilterFreshness] = useState<Freshness | ''>('');
  const [filterSignalLost, setFilterSignalLost] = useState(false);
  const [filterUnmatched, setFilterUnmatched] = useState(false);
  const [filterService, setFilterService] = useState<string>('');
  const [filterToolEligible, setFilterToolEligible] = useState<string>('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [lastUpdatedSec, setLastUpdatedSec] = useState(0);
  const [degradedSources] = useState<string[]>([]);

  // Modal danh sách tài xế UI-R11
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverFilterState, setDriverFilterState] = useState<DriverState | ''>('');

  // Polling mô phỏng: cập nhật bộ đếm giây
  useEffect(() => {
    const id = setInterval(() => setLastUpdatedSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => setLastUpdatedSec(0), []);

  // Auto-refresh 30 s
  useEffect(() => {
    if (lastUpdatedSec >= 30) handleRefresh();
  }, [lastUpdatedSec, handleRefresh]);

  // Filter
  const filtered = ALL_ITEMS.filter(item => {
    if (!includeInactive && item.boardStatus === 'INACTIVE') return false;
    if (searchPlate && !item.plate.toLowerCase().includes(searchPlate.toLowerCase())) return false;
    if (filterStation && item.stationId !== filterStation) return false;
    if (filterStatus && item.boardStatus !== filterStatus) return false;
    if (filterFreshness && item.location?.freshness !== filterFreshness) return false;
    if (filterSignalLost && !item.gps?.signalLost) return false;
    if (filterUnmatched && item.gps?.matchState !== 'UNMATCHED') return false;
    if (filterService && !item.services.includes(filterService)) return false;
    if (filterToolEligible === 'ELIGIBLE' && !item.tools.eligible) return false;
    if (filterToolEligible === 'MISSING' && item.tools.eligible) return false;
    return true;
  });

  const summary = calcSummary(ALL_ITEMS.filter(i => includeInactive || i.boardStatus !== 'INACTIVE'));
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Sort: signal lost first, then boardStatus order, then plate
  const sortOrder: Record<BoardStatus, number> = { AVAILABLE: 1, ON_JOB: 2, IDLE_NO_DRIVER: 3, UNAVAILABLE: 4, INACTIVE: 5 };
  pageItems.sort((a, b) => {
    const lost = (b.gps?.signalLost ? 1 : 0) - (a.gps?.signalLost ? 1 : 0);
    if (lost) return lost;
    const st = sortOrder[a.boardStatus] - sortOrder[b.boardStatus];
    if (st) return st;
    return a.plate.localeCompare(b.plate);
  });

  const updatedLabel = lastUpdatedSec === 0 ? 'Vừa cập nhật' : `Cập nhật ${lastUpdatedSec} giây trước`;
  const updatedColor = lastUpdatedSec <= 60 ? 'text-green-600' : 'text-orange-500';

  const stations = Array.from(new Set(ALL_ITEMS.map(i => ({ id: i.stationId, name: i.stationName })).map(s => JSON.stringify(s))))
    .map(s => JSON.parse(s) as { id: string; name: string });

  // Tính toán số liệu UI-R10 (Năng lực tài xế)
  const driversScope = filterStation ? ALL_DRIVERS.filter(d => d.stationId === filterStation) : ALL_DRIVERS;
  const driverOnlineCount = driversScope.filter(d => d.online).length;
  const driverOfflineCount = driversScope.filter(d => !d.online).length;
  const driverStateCounts = {
    ON_ORDER: driversScope.filter(d => d.driverState === 'ON_ORDER').length,
    IDLE_READY: driversScope.filter(d => d.driverState === 'IDLE_READY').length,
    NO_VEHICLE: driversScope.filter(d => d.driverState === 'NO_VEHICLE').length,
    OFF_SHIFT: driversScope.filter(d => d.driverState === 'OFF_SHIFT').length,
    OFFLINE: driversScope.filter(d => d.driverState === 'OFFLINE').length,
  };

  const currentShiftItem = mockShiftCoverage[0]; // Ca sáng hiện tại
  const onJobCount = summary.byStatus.ON_JOB;

  return (
    <div className="flex flex-col h-full bg-gray-50 min-w-0">
      <PartnerScopeBar persona={persona} onChange={setPersona} />
      {/* Header */}
      <div className="bg-white border-b px-6 py-3.5 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-gray-900 uppercase tracking-tight">Năng lực trạm & Bảng nguồn lực</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
              Realtime T10
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Theo dõi tức thời phương tiện, tài xế, độ phủ ca và năng lực cung cấp dịch vụ cứu hộ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${updatedColor}`}>
            <Activity size={13} className="animate-pulse" />
            {updatedLabel}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm transition-all"
          >
            <RefreshCw size={13} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Degraded banner */}
      {degradedSources.length > 0 && (
        <div className="mx-6 mt-3 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 text-orange-700 text-xs">
          <AlertTriangle size={14} />
          Chưa lấy được dữ liệu từ: {degradedSources.join(', ')} — đang hiển thị dữ liệu còn lại
        </div>
      )}

      {/* ─── FILTERS BAR ─── */}
      <div className="px-6 py-2.5 bg-white border-b flex items-center gap-2.5 flex-wrap shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchPlate}
            onChange={e => { setSearchPlate(e.target.value); setPage(1); }}
            placeholder="Tìm biển số xe..."
            className="pl-8 pr-3 py-1.5 text-xs border rounded-lg outline-none focus:border-[#00A859] w-40 bg-white shadow-sm"
          />
        </div>

        <select
          value={filterStation}
          onChange={e => { setFilterStation(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 text-xs border rounded-lg outline-none focus:border-[#00A859] bg-white font-medium shadow-sm"
        >
          <option value="">Tất cả trạm</option>
          {stations.map(st => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </select>

        <select
          value={filterFreshness}
          onChange={e => { setFilterFreshness(e.target.value as Freshness | ''); setPage(1); }}
          className="px-2.5 py-1.5 text-xs border rounded-lg outline-none focus:border-[#00A859] bg-white font-medium shadow-sm"
        >
          <option value="">Độ mới GPS</option>
          <option value="FRESH">Mới (≤ 120s)</option>
          <option value="STALE">Cũ ({'>'} 120s)</option>
          <option value="UNKNOWN">Không rõ ({'>'} 30 phút)</option>
        </select>

        <select
          value={filterToolEligible}
          onChange={e => { setFilterToolEligible(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 text-xs border rounded-lg outline-none focus:border-[#00A859] bg-white font-medium shadow-sm"
        >
          <option value="">Tình trạng công cụ</option>
          <option value="ELIGIBLE">Đủ định mức cứu hộ</option>
          <option value="MISSING">Thiếu công cụ bắt buộc</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none ml-auto">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
            className="rounded text-[#00A859] focus:ring-[#00A859]"
          />
          <span>Gồm ngừng hoạt động</span>
        </label>
      </div>

      {/* ─── §11 MỞ RỘNG NĂNG LỰC TRẠM (UI-R10, UI-R20, UI-R30) ─── */}
      <div className="px-6 pt-4 pb-2 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* UI-R10: Khối Năng lực tài xế */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Users size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Năng lực tài xế (UI-R10)</h3>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-green-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Online: {driverOnlineCount}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Offline: {driverOfflineCount}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setDriverFilterState(''); setDriverModalOpen(true); }}
                className="text-[11px] font-bold text-[#00A859] hover:text-[#008f4c] flex items-center gap-1 hover:underline"
              >
                <Eye size={12} />
                Danh sách ({driversScope.length})
              </button>
            </div>

            {/* Chi tiết phân bố trạng thái */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => { setDriverFilterState('IDLE_READY'); setDriverModalOpen(true); }}
                className="p-2 rounded-lg bg-green-50/60 border border-green-100 hover:border-green-300 text-left transition-all"
              >
                <div className="text-[10px] text-green-800 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Rảnh (Sẵn sàng)</span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="text-base font-black text-green-700 mt-0.5">{driverStateCounts.IDLE_READY} tài xế</div>
              </button>

              <button
                onClick={() => { setDriverFilterState('ON_ORDER'); setDriverModalOpen(true); }}
                className="p-2 rounded-lg bg-blue-50/60 border border-blue-100 hover:border-blue-300 text-left transition-all"
              >
                <div className="text-[10px] text-blue-800 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Đang làm đơn</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div className="text-base font-black text-blue-700 mt-0.5">{driverStateCounts.ON_ORDER} tài xế</div>
              </button>

              <button
                onClick={() => { setDriverFilterState('NO_VEHICLE'); setDriverModalOpen(true); }}
                className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 hover:border-amber-300 text-left transition-all"
              >
                <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Chưa có xe</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <div className="text-base font-black text-amber-700 mt-0.5">{driverStateCounts.NO_VEHICLE} tài xế</div>
              </button>

              <button
                onClick={() => { setDriverFilterState('OFF_SHIFT'); setDriverModalOpen(true); }}
                className="p-2 rounded-lg bg-purple-50/60 border border-purple-100 hover:border-purple-300 text-left transition-all"
              >
                <div className="text-[10px] text-purple-800 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Ngoài ca làm</span>
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                </div>
                <div className="text-base font-black text-purple-700 mt-0.5">{driverStateCounts.OFF_SHIFT} tài xế</div>
              </button>
            </div>
          </div>

          {/* UI-R12: Ca hiện tại */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Clock size={13} className="text-gray-400" />
              <span className="font-semibold">{currentShiftItem.name} ({currentShiftItem.start}–{currentShiftItem.end}):</span>
              <span className="font-bold">{currentShiftItem.present}/{currentShiftItem.minStaff} người</span>
            </div>
            {currentShiftItem.state === 'SHORTAGE' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                Thiếu 1 người
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                Đủ định mức
              </span>
            )}
          </div>
        </div>

        {/* UI-R20: Khối Dịch vụ đáp ứng ngay */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Dịch vụ đáp ứng ngay (UI-R20)</h3>
                  <p className="text-[11px] text-gray-500">Xe sẵn sàng + TX trong ca + đủ công cụ</p>
                </div>
              </div>
              {filterService && (
                <button
                  onClick={() => setFilterService('')}
                  className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-0.5"
                >
                  <X size={11} /> Bỏ lọc ({filterService})
                </button>
              )}
            </div>

            {/* Danh sách dịch vụ và số xe sẵn sàng */}
            <div className="space-y-2 mt-3">
              {mockServices.map(srv => {
                const isSelected = filterService === srv.serviceName.toUpperCase();
                const isZero = srv.readyVehicleCount === 0;
                return (
                  <button
                    key={srv.serviceId}
                    onClick={() => {
                      const tag = srv.serviceName.toUpperCase();
                      setFilterService(prev => prev === tag ? '' : tag);
                      setPage(1);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-[#00A859] bg-green-50/80 font-bold shadow-sm'
                        : isZero
                        ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                        : 'border-gray-200/80 bg-gray-50/40 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isZero ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="font-semibold text-gray-800">{srv.serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isZero ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          0 xe · Không đáp ứng
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {srv.readyVehicleCount} xe sẵn sàng
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* UI-R21: Đơn đang xử lý (không quản lý sức chứa đơn — HuanTV 04/10) */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-600">Đơn đang xử lý:</span>
            <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {onJobCount} đơn
            </span>
          </div>
        </div>

        {/* UI-R30: Khối Cảnh báo thiếu hụt nguồn lực */}
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Cảnh báo thiếu hụt (UI-R30)</h3>
                  <p className="text-[11px] text-gray-500">Xe thiếu công cụ · ca thiếu người · dịch vụ 0 xe</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {mockShortages.length} cảnh báo
              </span>
            </div>

            {/* Danh sách thiếu hụt */}
            <div className="space-y-2 mt-3 max-h-[175px] overflow-y-auto pr-1">
              {mockShortages.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start gap-2 text-xs"
                >
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 leading-snug">{item.text}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{item.detail}</div>
                  </div>
                  {item.type === 'TOOL' && (
                    <button
                      onClick={() => {
                        setFilterToolEligible('MISSING');
                        setPage(1);
                      }}
                      className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded"
                    >
                      Xem xe
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Đồng bộ từ FL-M1-02 (API-T06) & FL-M2-03</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Check size={12} /> Tự động tính toán
            </span>
          </div>
        </div>
      </div>

      {/* ─── STATUS CHIPS & QUICK FILTERS ─── */}
      <div className="px-6 pt-2 pb-2 flex items-center gap-2 flex-wrap shrink-0">
        {/* Tất cả */}
        <button
          onClick={() => {
            setFilterStatus('');
            setFilterSignalLost(false);
            setFilterUnmatched(false);
            setFilterService('');
            setFilterToolEligible('');
            setPage(1);
          }}
          className={`px-3 py-1 text-xs rounded-full border font-bold transition-all shadow-sm ${
            filterStatus === '' && !filterSignalLost && !filterUnmatched && !filterService && !filterToolEligible
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          Tất cả xe ({summary.total})
        </button>

        {(['AVAILABLE', 'ON_JOB', 'IDLE_NO_DRIVER', 'UNAVAILABLE'] as BoardStatus[]).map(s => {
          const cfg = statusConfig[s];
          const count = summary.byStatus[s];
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => { setFilterStatus(active ? '' : s); setPage(1); }}
              className={`px-3 py-1 text-xs rounded-full border font-bold transition-all shadow-sm ${
                active ? `${cfg.bg} ${cfg.color} border-current ring-1 ring-current` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${cfg.dot}`} />
              {cfg.label} ({count})
            </button>
          );
        })}

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          onClick={() => { setFilterSignalLost(v => !v); setPage(1); }}
          className={`px-3 py-1 text-xs rounded-full border font-bold transition-all flex items-center gap-1.5 shadow-sm ${
            filterSignalLost ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          <WifiOff size={12} className={filterSignalLost ? 'text-red-600' : 'text-gray-400'} />
          Mất tín hiệu GPS ({summary.signalLost})
        </button>

        <button
          onClick={() => { setFilterUnmatched(v => !v); setPage(1); }}
          className={`px-3 py-1 text-xs rounded-full border font-bold transition-all flex items-center gap-1.5 shadow-sm ${
            filterUnmatched ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          <AlertCircle size={12} className={filterUnmatched ? 'text-amber-600' : 'text-gray-400'} />
          Chưa khớp IMEI ({summary.unmatched})
        </button>

        {filterService && (
          <span className="px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
            Dịch vụ: {filterService}
            <button onClick={() => setFilterService('')} className="hover:text-black">
              <X size={12} />
            </button>
          </span>
        )}

        {filterToolEligible && (
          <span className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 flex items-center gap-1">
            Công cụ: {filterToolEligible === 'ELIGIBLE' ? 'Đủ định mức' : 'Thiếu công cụ'}
            <button onClick={() => setFilterToolEligible('')} className="hover:text-black">
              <X size={12} />
            </button>
          </span>
        )}
      </div>

      {/* ─── MAIN VEHICLE TABLE ─── */}
      <div className="flex-1 overflow-auto px-6 pb-6 min-h-0">
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Xe</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Trạm trực thuộc</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Trạng thái (BR-03)</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Dịch vụ đáp ứng</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Công cụ (API-T06)</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Vị trí gần nhất</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Độ mới GPS</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">Tài xế phụ trách</th>
                  <th className="px-3.5 py-3 text-left whitespace-nowrap">GPS / IMEI (MID)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                      <Truck size={36} className="mx-auto mb-2 opacity-30 text-gray-500" />
                      <div className="font-semibold text-gray-600">Không có xe phù hợp với bộ lọc hiện tại</div>
                      <div className="text-[11px] text-gray-400 mt-1">Thử thay đổi bộ lọc trạm, trạng thái hoặc từ khóa biển số</div>
                    </td>
                  </tr>
                )}
                {pageItems.map(item => {
                  const cfg = statusConfig[item.boardStatus];
                  const signalLost = item.gps?.signalLost;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-gray-50/90 ${signalLost ? 'bg-red-50/40' : ''}`}
                    >
                      {/* Xe */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-start gap-1.5">
                          {signalLost && <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />}
                          <div>
                            <button
                              onClick={() => navigate(`/partner/vehicles/${item.id}`)}
                              className="font-black text-[#00A859] hover:underline tracking-wide text-xs"
                            >
                              {item.plate}
                            </button>
                            <div className="text-gray-500 text-[11px] font-medium">{item.brand} {item.model} · {item.type}</div>
                          </div>
                        </div>
                      </td>

                      {/* Trạm */}
                      <td className="px-3.5 py-3 text-gray-800 font-medium whitespace-nowrap">{item.stationName}</td>

                      {/* Trạng thái */}
                      <td className="px-3.5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {item.activeOrderCode && (
                          <div className="text-[11px] text-blue-600 font-bold font-mono mt-1 flex items-center gap-1">
                            <Activity size={11} /> {item.activeOrderCode}
                          </div>
                        )}
                      </td>

                      {/* Dịch vụ đáp ứng */}
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {item.services.map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Công cụ (API-T06) */}
                      <td className="px-3.5 py-3">
                        {item.tools.eligible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                            <CheckCircle2 size={11} /> Đủ định mức
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              <AlertTriangle size={11} /> Thiếu {item.tools.missingTools.length} món
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5 max-w-[120px] truncate" title={item.tools.missingTools.join(', ')}>
                              {item.tools.missingTools.join(', ')}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Vị trí */}
                      <td className="px-3.5 py-3">
                        {item.location ? (
                          <div className="flex items-start gap-1">
                            <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-mono text-gray-800 text-[11px] font-medium">{item.location.lat.toFixed(5)}, {item.location.lng.toFixed(5)}</div>
                              <div className="text-gray-400 text-[10px]">{item.location.source}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Không có GPS</span>
                        )}
                      </td>

                      {/* Độ mới */}
                      <td className="px-3.5 py-3">
                        {item.location ? (
                          <div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${freshnessConfig[item.location.freshness].bg} ${freshnessConfig[item.location.freshness].color}`}>
                              {freshnessConfig[item.location.freshness].label}
                            </span>
                            <span className="text-gray-500 ml-1 font-medium">{fmtAge(item.location.ageSeconds)}</span>
                            <div className="text-[10px] text-gray-400 mt-0.5">{item.location.lastSeenAt}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Tài xế */}
                      <td className="px-3.5 py-3">
                        {item.driver ? (
                          <div>
                            <div className="flex items-center gap-1 font-bold text-gray-800">
                              <User size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate max-w-[130px]">{item.driver.fullname}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.driver.online ? (
                                <span className="flex items-center gap-0.5 text-green-600 text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                  Online
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-gray-400 text-[10px] font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                                  Offline
                                </span>
                              )}
                              {item.driver.inShift ? (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-200">Trong ca</span>
                              ) : (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">Ngoài ca</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">— Chưa ghép tài xế</span>
                        )}
                      </td>

                      {/* GPS / IMEI */}
                      <td className="px-3.5 py-3">
                        {item.gps && item.gps.matchState !== 'NONE' ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <Radio size={12} className="text-gray-400 shrink-0" />
                              <span className="font-mono text-[11px] text-gray-800 font-semibold">{maskImei(item.gps.imei)}</span>
                            </div>
                            <div className="mt-0.5">
                              {item.gps.matchState === 'MATCHED' && !item.gps.signalLost && (
                                <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                                  <Wifi size={11} /> Đã khớp MID
                                </span>
                              )}
                              {item.gps.matchState === 'MATCHED' && item.gps.signalLost && (
                                <span className="flex items-center gap-1 text-red-600 text-[10px] font-bold">
                                  <WifiOff size={11} /> Mất tín hiệu {item.gps.signalLostMinutes}′
                                </span>
                              )}
                              {item.gps.matchState === 'UNMATCHED' && (
                                <span className="flex items-center gap-1 text-amber-600 text-[10px] font-bold">
                                  <AlertCircle size={11} /> Chưa khớp IMEI
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <span>Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trong tổng {total} xe</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-lg border hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 5).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg border text-xs font-bold ${p === page ? 'bg-[#00A859] text-white border-[#00A859]' : 'bg-white hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                className="p-1 rounded-lg border hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL UI-R11: DANH SÁCH TÀI XẾ CHI TIẾT ─── */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#00A859]" />
                <h3 className="font-black text-gray-900 uppercase text-sm">
                  Danh sách tài xế theo trạng thái realtime (UI-R11)
                </h3>
              </div>
              <button
                onClick={() => setDriverModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter chips inside modal */}
            <div className="px-6 py-2.5 border-b bg-white flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-gray-600 mr-1">Lọc trạng thái:</span>
              <button
                onClick={() => setDriverFilterState('')}
                className={`px-2.5 py-1 rounded-full font-bold ${
                  driverFilterState === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả ({driversScope.length})
              </button>
              {(Object.keys(driverStateConfig) as DriverState[]).map(st => {
                const cfg = driverStateConfig[st];
                const active = driverFilterState === st;
                return (
                  <button
                    key={st}
                    onClick={() => setDriverFilterState(active ? '' : st)}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all ${
                      active ? `${cfg.bg} ${cfg.color} ring-1 ring-current` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cfg.label} ({driversScope.filter(d => d.driverState === st).length})
                  </button>
                );
              })}
            </div>

            {/* Driver Table */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b text-[11px]">
                    <th className="px-3 py-2 text-left">Họ và tên</th>
                    <th className="px-3 py-2 text-left">SĐT</th>
                    <th className="px-3 py-2 text-left">Trạm</th>
                    <th className="px-3 py-2 text-left">Trạng thái (BR-R01)</th>
                    <th className="px-3 py-2 text-left">Ca hiện tại</th>
                    <th className="px-3 py-2 text-left">Xe đang gán</th>
                    <th className="px-3 py-2 text-left">Độ mới GPS (BR-R04)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {driversScope
                    .filter(d => !driverFilterState || d.driverState === driverFilterState)
                    .map(d => {
                      const cfg = driverStateConfig[d.driverState];
                      const fresh = freshnessConfig[d.freshness];
                      return (
                        <tr key={d.staffId} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2.5 font-bold text-gray-900">{d.fullname}</td>
                          <td className="px-3 py-2.5 text-gray-700 font-mono">{d.phone}</td>
                          <td className="px-3 py-2.5 text-gray-600">{d.stationName}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-700">{d.currentShift}</td>
                          <td className="px-3 py-2.5">
                            {d.vehiclePlate ? (
                              <span className="font-bold text-[#00A859]">{d.vehiclePlate}</span>
                            ) : (
                              <span className="text-gray-400 italic">Chưa ghép</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {d.signalLost ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                <WifiOff size={10} /> Mất tín hiệu
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className={`text-[10px] font-bold ${fresh.color}`}>[{fresh.label}]</span>
                                <span className="text-gray-400 text-[10px]">{d.lastSeenAt}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setDriverModalOpen(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerResourceBoard;
