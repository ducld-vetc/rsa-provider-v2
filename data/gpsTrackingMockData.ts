/**
 * Mock data & types for Story 1.2 (FL-M1-03)
 * Admin gắn thiết bị Xanh GPS với xe, xử lý thiết bị chưa khớp, xe mất tín hiệu
 */

export type GpsMatchState = 'MATCHED' | 'UNMATCHED' | 'DUPLICATED' | 'CORRECTING';

export type GpsFreshness = 'FRESH' | 'STALE' | 'UNKNOWN';

export interface GpsSignalInfo {
  freshness: GpsFreshness;
  freshnessLabel: string;
  signalLost: boolean;
  lastSeenAt: string;
  reasonCode: string | null;
  reason: string;
  lat?: number | null;
  lng?: number | null;
  address?: string;
  lostSeconds?: number;
  lostDuration?: string;
  inShiftBasis?: string;
}

export interface VehicleGpsStatus {
  vehicleId: string;
  plate: string;
  plateNormalized: string;
  stationId: string;
  stationName: string;
  imei: string | null;
  mappingId: number | null;
  mappingVersion: number;
  validFrom: string | null;
  matchState: GpsMatchState;
  matchStateLabel: string;
  signal: GpsSignalInfo;
  correctingSince?: string | null;
}

export interface GpsMappingPeriod {
  id: string;
  vehicleId: string;
  plate: string;
  imei: string;
  validFrom: string;
  validTo: string | null;
  source: 'AUTO' | 'MANUAL' | 'CORRECTION' | 'MIGRATED';
  sourceLabel: string;
  status: 'ACTIVE' | 'SUPERSEDED';
  createdByName: string;
  reason: string;
  version: number;
}

export interface GpsMappingAudit {
  id: string;
  vehicleId: string;
  imei: string;
  actedAt: string;
  actorName: string;
  action: 'AUTO_ASSIGN' | 'ASSIGN' | 'REPLACE_CLOSE' | 'UNASSIGN' | 'CORRECT' | 'IGNORE' | 'UNIGNORE';
  actionLabel: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
}

export type UnmatchedReasonCode =
  | 'NO_PLATE_MATCH'
  | 'MULTI_VEHICLE'
  | 'MULTI_IMEI'
  | 'VEHICLE_ALREADY_MAPPED'
  | 'EMPTY_PLATE';

export interface UnmatchedDeviceRecord {
  id: string;
  imei: string;
  midPlate: string;
  reason: UnmatchedReasonCode;
  reasonLabel: string;
  candidateVehicles?: { id: string; plate: string; stationName: string }[];
  suggestions: { id: string; plate: string; stationName: string }[];
  firstSeenAt: string;
  lastSeenAt: string;
  signalReason: string;
  state: 'OPEN' | 'IGNORED' | 'RESOLVED';
  ignoreReason?: string;
  version: number;
}

export const MATCH_STATE_LABELS: Record<GpsMatchState, { label: string; color: string; bg: string; border: string }> = {
  MATCHED: { label: 'Đã khớp', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  UNMATCHED: { label: 'Chưa khớp', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
  DUPLICATED: { label: 'Trùng', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  CORRECTING: { label: 'Đang sửa', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
};

export const UNMATCHED_REASON_LABELS: Record<UnmatchedReasonCode, string> = {
  NO_PLATE_MATCH: 'Biển không khớp xe nào',
  MULTI_VEHICLE: 'Biển khớp nhiều xe',
  MULTI_IMEI: 'Nhiều thiết bị cùng biển (2)',
  VEHICLE_ALREADY_MAPPED: 'Xe đã gắn thiết bị khác',
  EMPTY_PLATE: 'Xanh GPS không có biển',
};

/** Mock danh sách trạng thái GPS của từng xe */
export let INITIAL_VEHICLE_GPS_DATA: Record<string, VehicleGpsStatus> = {
  v1: {
    vehicleId: 'v1',
    plate: '29C-123.45',
    plateNormalized: '29C12345',
    stationId: 'tt-hm',
    stationName: 'Trạm Hoàng Mai',
    imei: '8612345678901',
    mappingId: 101,
    mappingVersion: 2,
    validFrom: '01/09/2026 08:00',
    matchState: 'MATCHED',
    matchStateLabel: 'Đã khớp',
    signal: {
      freshness: 'FRESH',
      freshnessLabel: 'Mới',
      signalLost: false,
      lastSeenAt: '10:21:05',
      reasonCode: '3',
      reason: 'Đang chạy',
      lat: 21.0012,
      lng: 105.8412,
      address: '12 Giải Phóng, Hoàng Mai, Hà Nội',
      inShiftBasis: 'Tài xế Ngô Đức Anh (ca 06:00 - 18:00)',
    },
  },
  v2: {
    vehicleId: 'v2',
    plate: '29C-678.90',
    plateNormalized: '29C67890',
    stationId: 'tt-hm',
    stationName: 'Trạm Hoàng Mai',
    imei: '8612345678902',
    mappingId: 102,
    mappingVersion: 1,
    validFrom: '15/08/2026 09:00',
    matchState: 'MATCHED',
    matchStateLabel: 'Đã khớp',
    signal: {
      freshness: 'FRESH',
      freshnessLabel: 'Mới',
      signalLost: false,
      lastSeenAt: '10:20:40',
      reasonCode: '2',
      reason: 'Đang dừng',
      lat: 20.9856,
      lng: 105.8523,
      address: 'Bến xe Nước Ngầm, Hoàng Mai, Hà Nội',
      inShiftBasis: 'Tài xế Bùi Văn Tâm (ca 06:00 - 18:00)',
    },
  },
  v3: {
    vehicleId: 'v3',
    plate: '30F-111.22',
    plateNormalized: '30F11122',
    stationId: 'tt-hd',
    stationName: 'Trạm Hà Đông',
    imei: null,
    mappingId: null,
    mappingVersion: 0,
    validFrom: null,
    matchState: 'UNMATCHED',
    matchStateLabel: 'Chưa khớp',
    signal: {
      freshness: 'UNKNOWN',
      freshnessLabel: 'Không rõ',
      signalLost: false,
      lastSeenAt: '—',
      reasonCode: 'NO_DEVICE',
      reason: 'Chưa gắn thiết bị',
      lat: null,
      lng: null,
      address: '—',
      inShiftBasis: '—',
    },
  },
  v4: {
    vehicleId: 'v4',
    plate: '15B-333.44',
    plateNormalized: '15B33344',
    stationId: 'tt-hp',
    stationName: 'Trạm Hải Phòng',
    imei: '8612345678222',
    mappingId: 104,
    mappingVersion: 3,
    validFrom: '20/09/2026 14:00',
    matchState: 'CORRECTING',
    matchStateLabel: 'Đang sửa',
    correctingSince: '27/09/2026 07:15',
    signal: {
      freshness: 'STALE',
      freshnessLabel: 'Mất tín hiệu',
      signalLost: true,
      lastSeenAt: '27/09 07:10:02',
      reasonCode: '1',
      reason: 'Mất định vị GPS',
      lostSeconds: 11700,
      lostDuration: '3 giờ 15p',
      lat: 20.8449,
      lng: 106.6881,
      address: 'Ngã tư Lê Hồng Phong, Hải Phòng',
      inShiftBasis: 'Tài xế Ngô Đức A (ca 06:00 - 18:00)',
    },
  },
  v5: {
    vehicleId: 'v5',
    plate: '51C-555.66',
    plateNormalized: '51C55566',
    stationId: 'tt-bt',
    stationName: 'Trạm Bình Thạnh',
    imei: '8612345678333',
    mappingId: 105,
    mappingVersion: 1,
    validFrom: '05/09/2026 10:00',
    matchState: 'MATCHED',
    matchStateLabel: 'Đã khớp',
    signal: {
      freshness: 'STALE',
      freshnessLabel: 'Mất tín hiệu',
      signalLost: true,
      lastSeenAt: '27/09 10:05:40',
      reasonCode: '0',
      reason: 'Thiết bị mất kết nối',
      lostSeconds: 1140,
      lostDuration: '19 phút',
      lat: 10.8012,
      lng: 106.7112,
      address: 'Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM',
      inShiftBasis: 'Đơn RO-2609-001',
    },
  },
};

/** Lịch sử mapping theo xe */
export let INITIAL_GPS_HISTORY: Record<string, { periods: GpsMappingPeriod[]; audits: GpsMappingAudit[] }> = {
  v1: {
    periods: [
      {
        id: 'p-101-b',
        vehicleId: 'v1',
        plate: '29C-123.45',
        imei: '8612345678901',
        validFrom: '01/09/2026 08:00',
        validTo: null,
        source: 'MANUAL',
        sourceLabel: 'Admin',
        status: 'ACTIVE',
        createdByName: 'Nguyễn Văn Bình (BDH)',
        reason: 'Thay thiết bị mới sau bảo dưỡng định kỳ',
        version: 2,
      },
      {
        id: 'p-101-a',
        vehicleId: 'v1',
        plate: '29C-123.45',
        imei: '8612000954000',
        validFrom: '15/06/2026 10:00',
        validTo: '01/09/2026 08:00',
        source: 'AUTO',
        sourceLabel: 'Tự khớp',
        status: 'ACTIVE',
        createdByName: 'Hệ thống (SYSTEM)',
        reason: 'Tự khớp theo biển số 29C-123.45',
        version: 1,
      },
    ],
    audits: [
      {
        id: 'a-1',
        vehicleId: 'v1',
        imei: '8612345678901',
        actedAt: '01/09/2026 08:00',
        actorName: 'Nguyễn Văn Bình (BDH)',
        action: 'ASSIGN',
        actionLabel: 'Đổi thiết bị',
        oldValue: 'IMEI: 8612000954000',
        newValue: 'IMEI: 8612345678901',
        reason: 'Thay thiết bị mới sau bảo dưỡng định kỳ',
      },
      {
        id: 'a-2',
        vehicleId: 'v1',
        imei: '8612000954000',
        actedAt: '15/06/2026 10:00',
        actorName: 'Hệ thống (SYSTEM)',
        action: 'AUTO_ASSIGN',
        actionLabel: 'Tự động khớp',
        oldValue: '—',
        newValue: 'IMEI: 8612000954000',
        reason: 'Khớp 1-1 với biển số Xanh GPS 29C-123.45',
      },
    ],
  },
  v4: {
    periods: [
      {
        id: 'p-104-b',
        vehicleId: 'v4',
        plate: '15B-333.44',
        imei: '8612345678222',
        validFrom: '20/09/2026 14:00',
        validTo: null,
        source: 'CORRECTION',
        sourceLabel: 'Hiệu chỉnh',
        status: 'ACTIVE',
        createdByName: 'Đỗ Văn Long (GĐTT)',
        reason: 'Hiệu chỉnh hồi tố do lắp nhầm hộp GPS của xe Hải Phòng',
        version: 3,
      },
      {
        id: 'p-104-a',
        vehicleId: 'v4',
        plate: '15B-333.44',
        imei: '8612000111222',
        validFrom: '01/08/2026 09:00',
        validTo: '20/09/2026 14:00',
        source: 'MANUAL',
        sourceLabel: 'Admin',
        status: 'SUPERSEDED',
        createdByName: 'Trần Minh Đức',
        reason: 'Gắn ban đầu',
        version: 1,
      },
    ],
    audits: [
      {
        id: 'a-4-1',
        vehicleId: 'v4',
        imei: '8612345678222',
        actedAt: '27/09/2026 07:15',
        actorName: 'Đỗ Văn Long (GĐTT)',
        action: 'CORRECT',
        actionLabel: 'Hiệu chỉnh hồi tố',
        oldValue: 'IMEI: 8612000111222',
        newValue: 'IMEI: 8612345678222',
        reason: 'Hiệu chỉnh hồi tố do phát hiện gắn nhầm số IMEI',
      },
    ],
  },
};

/** Mock danh sách thiết bị chưa khớp (SCR-02) */
export let INITIAL_UNMATCHED_DEVICES: UnmatchedDeviceRecord[] = [
  {
    id: 'ud-1',
    imei: '861200055501',
    midPlate: '29C-555.01',
    reason: 'NO_PLATE_MATCH',
    reasonLabel: 'Biển không khớp xe nào',
    suggestions: [{ id: 'v1', plate: '29C-123.45', stationName: 'Trạm Hoàng Mai' }],
    firstSeenAt: '27/09/2026 08:10:00',
    lastSeenAt: '10:20:40',
    signalReason: 'Đang dừng',
    state: 'OPEN',
    version: 1,
  },
  {
    id: 'ud-2',
    imei: '861200077777',
    midPlate: '30A-777.77',
    reason: 'MULTI_IMEI',
    reasonLabel: 'Nhiều thiết bị cùng biển (2)',
    suggestions: [{ id: 'v3', plate: '30F-111.22', stationName: 'Trạm Hà Đông' }],
    firstSeenAt: '27/09/2026 07:30:00',
    lastSeenAt: '10:19:10',
    signalReason: 'Mất định vị GPS',
    state: 'OPEN',
    version: 1,
  },
  {
    id: 'ud-3',
    imei: '861200088888',
    midPlate: '',
    reason: 'EMPTY_PLATE',
    reasonLabel: 'Xanh GPS không có biển',
    suggestions: [],
    firstSeenAt: '26/09/2026 15:00:00',
    lastSeenAt: '09:00:00',
    signalReason: 'Thiết bị mất kết nối',
    state: 'OPEN',
    version: 1,
  },
  {
    id: 'ud-4',
    imei: '861200099999',
    midPlate: '15B-333.44',
    reason: 'VEHICLE_ALREADY_MAPPED',
    reasonLabel: 'Xe đã gắn thiết bị khác',
    suggestions: [{ id: 'v4', plate: '15B-333.44', stationName: 'Trạm Hải Phòng' }],
    firstSeenAt: '27/09/2026 06:00:00',
    lastSeenAt: '08:30:15',
    signalReason: 'Đang chạy',
    state: 'OPEN',
    version: 1,
  },
  {
    id: 'ud-5',
    imei: '861200066666',
    midPlate: '51A-999.99',
    reason: 'NO_PLATE_MATCH',
    reasonLabel: 'Biển không khớp xe nào',
    suggestions: [],
    firstSeenAt: '25/09/2026 11:00:00',
    lastSeenAt: '26/09 17:00:00',
    signalReason: 'Mất kết nối',
    state: 'IGNORED',
    ignoreReason: 'Thiết bị không thuộc xe cứu hộ (Xe bảo trì ngoại vi)',
    version: 1,
  },
];
