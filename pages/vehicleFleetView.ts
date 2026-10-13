import {
  ACCEPTED_VEHICLE_LABEL,
  MAINTENANCE_STATUS_LABEL,
  RESCUE_CAPABILITY_LABEL,
  driverName,
  type AcceptedVehicleKind,
  type RescueCapability,
  toolReady,
  type VehicleRecord,
} from '../data/partnerRescueMockData';

export type QuickKey = 'all' | 'ok' | 'blocked' | 'due' | 'maint' | 'tools';

export const QUICK_FILTERS: { key: QuickKey; label: string; hint: string; color: string }[] = [
  { key: 'all', label: 'Tổng phương tiện', hint: 'Tất cả xe trong phạm vi', color: '#1F2933' },
  { key: 'ok', label: 'Đủ điều kiện nhận đơn', hint: 'Sẵn sàng và đủ hồ sơ', color: '#0B6B37' },
  { key: 'blocked', label: 'Bị chặn nhận đơn', hint: 'Báo sẵn sàng nhưng thiếu điều kiện', color: '#B42318' },
  { key: 'due', label: 'Giấy tờ quá / sắp hạn', hint: 'Trong 30 ngày', color: '#8A4B06' },
  { key: 'maint', label: 'Bảo dưỡng đến hạn', hint: 'Theo km hoặc ngày', color: '#8A4B06' },
  { key: 'tools', label: 'Công cụ lỗi', hint: 'Hỏng hoặc thiếu', color: '#B42318' },
];

export const LOAD_OPTIONS = [
  { kg: 0, label: 'Bất kỳ' },
  { kg: 2500, label: '≥ 2,5 t' },
  { kg: 3500, label: '≥ 3,5 t' },
  { kg: 5000, label: '≥ 5 t' },
];

export const statusLabelOf = (v: VehicleRecord) =>
  v.status === 'READY' || (!v.status && v.runStatus === 'active')
    ? 'Sẵn sàng'
    : v.status === 'MAINTENANCE' || (!v.status && v.runStatus === 'repair')
      ? 'Sửa chữa'
      : v.status === 'STOPPED'
        ? 'Tạm dừng'
        : v.status === 'WORKING'
          ? 'Đang làm đơn'
          : 'Ngừng hoạt động';

export const kgToTon = (kg?: string) => {
  const n = Number(kg);
  if (!n) return '—';
  return `${(n / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tấn`;
};

export type FleetRow = {
  statusLabel: string;
  cargoT: string;
  towT: string;
  craneT: string;
  bed: string;
  caps: string[];
  accepts: string[];
  docsDue: boolean;
  docsLabel: string;
  docsSub: string;
  maintDue: boolean;
  maintLabel: string;
  maintSub: string;
  toolBad: boolean;
  toolLabel: string;
  toolSub: string;
  eligible: boolean;
  blocked: boolean;
  eligText: string;
  reasons: string[];
  primaryName: string;
  secondaryNames: string;
};

export const fleetRowOf = (v: VehicleRecord, gpsLost: boolean): FleetRow => {
  const statusLabel = statusLabelOf(v);
  const worstDue = Math.min(v.inspectionDueDays, v.gplhDueDays, v.tndsDueDays);
  const docsOver = worstDue < 0;
  const docsSoon = worstDue >= 0 && worstDue <= 30;
  const broken = v.tools.filter((t) => !toolReady(t));
  const maintOver = v.maintenanceStatus === 'OVERDUE';
  const maintSoon = v.maintenanceStatus === 'DUE_SOON';
  const noDriver = !v.driverId;
  const reasons: string[] = [];
  if (v.inspectionDueDays < 0) reasons.push('Hết đăng kiểm');
  if (v.tndsDueDays < 0) reasons.push('Hết BH TNDS');
  if (v.gplhDueDays < 0) reasons.push('Hết giấy phép lưu hành');
  if (broken.length) reasons.push(`Công cụ hỏng: ${broken.map((t) => t.name).join(', ')}`);
  if (noDriver) reasons.push('Chưa gán tài xế chính');
  if (gpsLost) reasons.push('Mất tín hiệu GPS');
  if (maintOver) reasons.push('Quá hạn bảo dưỡng');
  const operable = statusLabel === 'Sẵn sàng' || statusLabel === 'Đang làm đơn';
  const blocked = operable && reasons.length > 0;
  const eligible = operable && reasons.length === 0;
  const secondary = (v.driverIds ?? []).filter((id) => id !== v.driverId);

  return {
    statusLabel,
    cargoT: kgToTon(v.cargoCpKg),
    towT: kgToTon(v.towCpKg),
    craneT: (v.rescueCapabilities ?? []).includes('crane') ? v.loadCrane || '—' : '—',
    bed: v.deckLengthMm && v.deckWidthMm ? `${v.deckLengthMm} × ${v.deckWidthMm}` : '—',
    caps: (v.rescueCapabilities ?? []).map((key) => RESCUE_CAPABILITY_LABEL[key as RescueCapability] ?? key),
    accepts: (v.acceptedVehicles ?? []).map((key) => ACCEPTED_VEHICLE_LABEL[key as AcceptedVehicleKind] ?? key),
    docsDue: docsOver || docsSoon,
    docsLabel: docsOver ? 'Quá hạn' : docsSoon ? 'Sắp hạn' : 'Đầy đủ',
    docsSub: docsOver || docsSoon ? `Gần nhất còn ${worstDue} ngày` : 'Trong hạn',
    maintDue: maintOver || maintSoon,
    maintLabel: MAINTENANCE_STATUS_LABEL[v.maintenanceStatus ?? 'NORMAL'],
    maintSub: v.maintenanceNextAt ? `Tiếp theo ${v.maintenanceNextAt}` : '',
    toolBad: broken.length > 0,
    toolLabel: broken.length ? `${broken.length} hỏng` : `Đủ ${v.tools.length}/${v.tools.length}`,
    toolSub: broken.length ? broken.map((t) => t.name).join(', ') : 'Đủ định mức',
    eligible,
    blocked,
    eligText: eligible ? 'Đủ điều kiện nhận đơn' : blocked ? 'Chặn nhận đơn' : 'Không nhận đơn',
    reasons: blocked ? reasons : [],
    primaryName: v.driverId ? driverName(v.driverId) : '',
    secondaryNames: secondary.map((id) => driverName(id)).filter((name) => name !== 'Chưa gán').join(', '),
  };
};

export const matchQuick = (key: QuickKey, row: FleetRow) => {
  if (key === 'ok') return row.eligible;
  if (key === 'blocked') return row.blocked;
  if (key === 'due') return row.docsDue;
  if (key === 'maint') return row.maintDue;
  if (key === 'tools') return row.toolBad;
  return true;
};
