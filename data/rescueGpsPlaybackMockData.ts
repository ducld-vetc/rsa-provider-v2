export type GpsPlaybackSegmentType = 'stop' | 'route';
export type GpsProviderId = 'MID_VIETNAM';

export interface GpsTrailPoint {
  lat: number;
  lng: number;
  recordedAt: string;
  speedKmh: number;
}

export interface GpsPlaybackLayer {
  provider: GpsProviderId;
  label: string;
  color: string;
  points: GpsTrailPoint[];
}

export interface GpsPlaybackSegment {
  id: string;
  type: GpsPlaybackSegmentType;
  totalDistanceKm: number;
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  startAddress: string;
  endAddress: string;
  statusDuration: string;
}

export interface RescueGpsPlaybackBundle {
  orderId: string;
  deviceId: number;
  vehiclePlate: string;
  driverDepartAt: string;
  windowStart: string;
  windowEnd: string;
  windowStartIso: string;
  windowEndIso: string;
  bufferMinutes: number;
  segments: GpsPlaybackSegment[];
  layers: GpsPlaybackLayer[];
  syncMessage: string;
}

const WINDOW_START = '2026-02-02T13:49:12+07:00';
const WINDOW_END = '2026-02-02T14:21:40+07:00';

const MID_POINTS: GpsTrailPoint[] = [
  { lat: 21.0168, lng: 105.8019, recordedAt: '2026-02-02T13:49:12+07:00', speedKmh: 0 },
  { lat: 21.0169, lng: 105.8020, recordedAt: '2026-02-02T13:52:00+07:00', speedKmh: 0 },
  { lat: 21.0171, lng: 105.8022, recordedAt: '2026-02-02T13:54:40+07:00', speedKmh: 2 },
  { lat: 21.0184, lng: 105.8085, recordedAt: '2026-02-02T13:56:20+07:00', speedKmh: 28 },
  { lat: 21.0202, lng: 105.8168, recordedAt: '2026-02-02T13:58:10+07:00', speedKmh: 32 },
  { lat: 21.0221, lng: 105.8254, recordedAt: '2026-02-02T14:00:00+07:00', speedKmh: 35 },
  { lat: 21.0244, lng: 105.8336, recordedAt: '2026-02-02T14:02:20+07:00', speedKmh: 30 },
  { lat: 21.0266, lng: 105.8402, recordedAt: '2026-02-02T14:04:10+07:00', speedKmh: 22 },
  { lat: 21.0285, lng: 105.8452, recordedAt: '2026-02-02T14:05:30+07:00', speedKmh: 8 },
  { lat: 21.0286, lng: 105.8453, recordedAt: '2026-02-02T14:10:00+07:00', speedKmh: 0 },
  { lat: 21.0287, lng: 105.8454, recordedAt: '2026-02-02T14:15:40+07:00', speedKmh: 0 },
  { lat: 21.0288, lng: 105.8455, recordedAt: '2026-02-02T14:21:40+07:00', speedKmh: 0 },
];

const SEGMENTS_WITH_DATA: GpsPlaybackSegment[] = [
  {
    id: 'seg-1',
    type: 'stop',
    totalDistanceKm: 0.05,
    startAt: '2026-02-02T13:49:12+07:00',
    endAt: '2026-02-02T13:55:00+07:00',
    startTime: '02/02/2026 13:49:12',
    endTime: '02/02/2026 13:55:00',
    startAddress: 'Trạm cứu hộ Hà Nội',
    endAddress: 'Trạm cứu hộ Hà Nội',
    statusDuration: '00:05:48',
  },
  {
    id: 'seg-2',
    type: 'route',
    totalDistanceKm: 2.15,
    startAt: '2026-02-02T13:55:00+07:00',
    endAt: '2026-02-02T14:05:30+07:00',
    startTime: '02/02/2026 13:55:00',
    endTime: '02/02/2026 14:05:30',
    startAddress: 'Trạm cứu hộ Hà Nội',
    endAddress: 'Đường Nguyễn Trãi, Hà Nội',
    statusDuration: '00:10:30',
  },
  {
    id: 'seg-3',
    type: 'stop',
    totalDistanceKm: 0.02,
    startAt: '2026-02-02T14:05:30+07:00',
    endAt: '2026-02-02T14:15:40+07:00',
    startTime: '02/02/2026 14:05:30',
    endTime: '02/02/2026 14:15:40',
    startAddress: 'Hiện trường sự cố — Phường Nam Hoa Lư',
    endAddress: 'Hiện trường sự cố — Phường Nam Hoa Lư',
    statusDuration: '00:10:10',
  },
];

export const GPS_PROVIDER_LABEL: Record<GpsProviderId, string> = {
  MID_VIETNAM: 'Mid Vietnam',
};

export const RESCUE_GPS_PLAYBACK_MOCK: RescueGpsPlaybackBundle = {
  orderId: 'RS12605010004',
  deviceId: 5157040,
  vehiclePlate: '30H-12345',
  driverDepartAt: '02/02/2026 13:55:12',
  windowStart: '02/02/2026 13:49:12',
  windowEnd: '02/02/2026 14:21:40',
  windowStartIso: WINDOW_START,
  windowEndIso: WINDOW_END,
  bufferMinutes: 6,
  segments: SEGMENTS_WITH_DATA,
  layers: [
    { provider: 'MID_VIETNAM', label: GPS_PROVIDER_LABEL.MID_VIETNAM, color: '#2563EB', points: MID_POINTS },
  ],
  syncMessage: 'Đã lấy hành trình GPS Mid Vietnam. Chọn khoảng thời gian để xem lại trên bản đồ.',
};

export const RESCUE_GPS_PLAYBACK_MOCK_EMPTY: RescueGpsPlaybackBundle = {
  ...RESCUE_GPS_PLAYBACK_MOCK,
  segments: [],
  layers: [
    { provider: 'MID_VIETNAM', label: GPS_PROVIDER_LABEL.MID_VIETNAM, color: '#2563EB', points: [] },
  ],
  syncMessage: 'Đã đồng bộ xong. Không có điểm GPS trong cửa sổ thời gian.',
};

export type GpsPlaybackDemoCaseId = 'with_data' | 'empty';

export const GPS_PLAYBACK_DEMO_CASES: { id: GpsPlaybackDemoCaseId; label: string }[] = [
  { id: 'with_data', label: 'Có hành trình' },
];

export function getRescueGpsPlaybackMock(caseId: GpsPlaybackDemoCaseId): RescueGpsPlaybackBundle {
  return caseId === 'empty' ? RESCUE_GPS_PLAYBACK_MOCK_EMPTY : RESCUE_GPS_PLAYBACK_MOCK;
}

export const GPS_SEGMENT_TYPE_LABELS: Record<GpsPlaybackSegmentType, string> = {
  stop: 'Dừng',
  route: 'Đi',
};

export function toDatetimeLocalValueFromDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDatetimeLocalValue(iso: string): string {
  return toDatetimeLocalValueFromDate(new Date(iso));
}

export function fromDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function clampRangeToWindow(
  from: Date,
  to: Date,
  windowStart: Date,
  windowEnd: Date
): { from: Date; to: Date } {
  const start = from < windowStart ? windowStart : from;
  const end = to > windowEnd ? windowEnd : to;
  return { from: start, to: end };
}

export function filterPointsInRange(points: GpsTrailPoint[], from: Date, to: Date): GpsTrailPoint[] {
  return points.filter((p) => {
    const t = new Date(p.recordedAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

export function segmentOverlapsRange(segment: GpsPlaybackSegment, from: Date, to: Date): boolean {
  const start = new Date(segment.startAt).getTime();
  const end = new Date(segment.endAt).getTime();
  return start <= to.getTime() && end >= from.getTime();
}

export function sortSegmentsByTime(segments: GpsPlaybackSegment[]): GpsPlaybackSegment[] {
  return [...segments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatClockRange(startIso: string, endIso: string): string {
  return `${formatClock(startIso)}–${formatClock(endIso)}`;
}

export function formatSegmentNarrative(segment: GpsPlaybackSegment): string {
  if (segment.type === 'stop') {
    return `Dừng xe${segment.startAddress ? ` · ${segment.startAddress}` : ''}`;
  }
  const from = segment.startAddress || 'A';
  const to = segment.endAddress || 'B';
  const km = segment.totalDistanceKm.toFixed(2).replace(/\.00$/, '');
  return `Di chuyển từ ${from} đến ${to} (${km} km)`;
}
