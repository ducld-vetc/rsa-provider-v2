import { fleetRowOf, statusLabelOf } from './vehicleFleetView';
import type { VehicleRecord } from '../data/partnerRescueMockData';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export const RADIUS_OPTIONS = [5, 10, 20, 30];

export const LOOKUP_CENTERS: { id: string; label: string; point: GeoPoint }[] = [
  { id: 'tt-hm', label: 'Trạm Hoàng Mai', point: { lat: 20.9752, lng: 105.8548 } },
  { id: 'tt-hd', label: 'Trạm Hà Đông', point: { lat: 20.9714, lng: 105.7782 } },
  { id: 'tt-hp', label: 'Trạm Hải Phòng', point: { lat: 20.8449, lng: 106.6881 } },
  { id: 'tt-bt', label: 'Trạm Bình Thạnh', point: { lat: 10.8112, lng: 106.7098 } },
];

const STATION_POINT: Record<string, GeoPoint> = Object.fromEntries(
  LOOKUP_CENTERS.map((item) => [item.id, item.point]),
);

/** Lệch quanh trạm để bán kính 5 km và 10 km ra số xe khác nhau. */
const PARK_NUDGE: Record<string, GeoPoint> = {
  v6: { lat: 0.002, lng: 0.0012 },
  v18: { lat: -0.035, lng: 0.001 },
  v11: { lat: -0.004, lng: 0.006 },
  v19: { lat: 0.012, lng: 0.018 },
  v23: { lat: -0.016, lng: -0.008 },
  v7: { lat: 0.008, lng: 0.012 },
};

/** Đơn demo gán biển, khung giờ bận. Đơn đang làm lấy thêm từ activeOrderEta. */
const DEMO_BUSY: { plate: string; from: string; to: string }[] = [
  { plate: '29H24680', from: '2026-10-14T08:00', to: '2026-10-14T12:00' },
  { plate: '29M88990', from: '2026-10-14T13:00', to: '2026-10-14T17:00' },
];

export interface VehicleLookupQuery {
  from: number;
  to: number;
  radiusKm: number;
  center: GeoPoint;
  centerLabel: string;
}

export interface FreeVehicleHit {
  vehicle: VehicleRecord;
  distanceKm: number;
  point: GeoPoint;
  track: GeoPoint[];
}

const plateKey = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function toDateTimeLocal(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function defaultLookupRange(): { from: string; to: string } {
  return {
    from: toDateTimeLocal(new Date(2026, 9, 14, 10, 0)),
    to: toDateTimeLocal(new Date(2026, 9, 14, 12, 0)),
  };
}

export function formatLookupWhen(value: number): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDistanceKm(km: number): string {
  const text = km >= 10 ? Math.round(km).toString() : km.toFixed(1);
  return `${text.replace('.', ',')} km`;
}

function parseWhen(raw: string): number | null {
  const local = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (local) {
    return new Date(
      Number(local[1]),
      Number(local[2]) - 1,
      Number(local[3]),
      Number(local[4]),
      Number(local[5]),
    ).getTime();
  }
  const vn = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!vn) return null;
  return new Date(
    Number(vn[3]),
    Number(vn[2]) - 1,
    Number(vn[1]),
    Number(vn[4] ?? 0),
    Number(vn[5] ?? 0),
  ).getTime();
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function recentTrack(id: string, end: GeoPoint): GeoPoint[] {
  let seed = 0;
  for (const char of id) seed = (seed * 33 + char.charCodeAt(0)) % 360;
  const rad = (seed * Math.PI) / 180;
  const points: GeoPoint[] = [];
  for (let step = 5; step >= 0; step -= 1) {
    const t = step / 5;
    const bend = Math.sin(t * Math.PI) * 0.003;
    points.push({
      lat: Number((end.lat + Math.cos(rad) * 0.014 * t + bend * Math.sin(rad)).toFixed(6)),
      lng: Number((end.lng + Math.sin(rad) * 0.014 * t - bend * Math.cos(rad)).toFixed(6)),
    });
  }
  return points;
}

function parkOf(vehicle: VehicleRecord, gpsPoint: GeoPoint | null): GeoPoint | null {
  if (gpsPoint && Number.isFinite(gpsPoint.lat) && Number.isFinite(gpsPoint.lng)) return gpsPoint;
  const base = STATION_POINT[vehicle.stationId];
  if (!base) return null;
  const nudge = PARK_NUDGE[vehicle.id] ?? { lat: 0, lng: 0 };
  return { lat: base.lat + nudge.lat, lng: base.lng + nudge.lng };
}

function busyWindows(vehicle: VehicleRecord): { from: number; to: number }[] {
  const windows: { from: number; to: number }[] = [];
  if (vehicle.activeOrderEta) {
    const to = parseWhen(vehicle.activeOrderEta);
    if (to != null) windows.push({ from: to - 6 * 60 * 60 * 1000, to });
  }
  const key = plateKey(vehicle.plate);
  DEMO_BUSY.forEach((item) => {
    if (plateKey(item.plate) !== key) return;
    const from = parseWhen(item.from);
    const to = parseWhen(item.to);
    if (from != null && to != null) windows.push({ from, to });
  });
  return windows;
}

function hardBlocked(vehicle: VehicleRecord, gpsLost: boolean): boolean {
  return fleetRowOf(vehicle, gpsLost).blockTags.some((tag) => tag.level === 'hard');
}

export function findFreeVehicles(
  vehicles: VehicleRecord[],
  query: VehicleLookupQuery,
  gpsOf: (vehicle: VehicleRecord) => { lost: boolean; point: GeoPoint | null },
): FreeVehicleHit[] {
  const hits: FreeVehicleHit[] = [];
  vehicles.forEach((vehicle) => {
    const label = statusLabelOf(vehicle);
    if (label === 'Sửa chữa' || label === 'Tạm dừng' || label === 'Ngừng hoạt động') return;
    const gps = gpsOf(vehicle);
    if (hardBlocked(vehicle, gps.lost)) return;
    const overlaps = busyWindows(vehicle).some((window) => window.from < query.to && window.to > query.from);
    if (overlaps) return;
    if (label !== 'Sẵn sàng' && label !== 'Đang làm đơn') return;
    const park = parkOf(vehicle, gps.point);
    if (!park) return;
    const distanceKm = haversineKm(park, query.center);
    if (distanceKm > query.radiusKm) return;
    hits.push({ vehicle, distanceKm, point: park, track: recentTrack(vehicle.id, park) });
  });
  hits.sort((a, b) => a.distanceKm - b.distanceKm);
  return hits;
}
