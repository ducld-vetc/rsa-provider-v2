import {
  ACCEPTED_VEHICLE_LABEL,
  MAINTENANCE_STATUS_LABEL,
  PARTNER_STAFF,
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

export type BlockTagKey = 'docs' | 'tools' | 'driver' | 'gps' | 'maint';
export type ShiftPresence = 'Online' | 'Nghỉ' | 'Hết ca';

export type BlockTag = {
  key: BlockTagKey;
  label: string;
  detail: string;
  level: 'hard' | 'warn';
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
  maintKmText: string;
  showDue: boolean;
  toolBad: boolean;
  toolLabel: string;
  toolSub: string;
  eligible: boolean;
  blocked: boolean;
  warned: boolean;
  eligText: string;
  gateTitle: string;
  blockTags: BlockTag[];
  reasons: string[];
  primaryName: string;
  secondaryNames: string;
  leadName: string;
  deputyName: string;
  onDutyName: string;
  onDutyPresence: ShiftPresence | '';
};

const formatKm = (value?: string) => {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '';
  return n.toLocaleString('vi-VN');
};

const presenceOf = (staffId?: string | null): ShiftPresence | '' => {
  if (!staffId) return '';
  const staff = PARTNER_STAFF.find((s) => s.id === staffId);
  if (!staff) return '';
  if (staff.workStatus === 'paused' || staff.workStatus === 'left') return 'Nghỉ';
  if (staff.dutyStatus === 'on_duty' || staff.dutyStatus === 'on_order') return 'Online';
  return 'Hết ca';
};

export const fleetRowOf = (v: VehicleRecord, gpsLost: boolean): FleetRow => {
  const statusLabel = statusLabelOf(v);
  const worstDue = Math.min(v.inspectionDueDays, v.gplhDueDays, v.tndsDueDays);
  const docsOver = worstDue < 0;
  const docsSoon = worstDue >= 0 && worstDue <= 30;
  const broken = v.tools.filter((t) => !toolReady(t));
  const odo = Number(v.odoKm) || 0;
  const toKm = Number(v.maintenanceToKm) || 0;
  const kmOver = toKm > 0 && odo >= toKm;
  const kmSoon = toKm > 0 && !kmOver && toKm - odo <= 500;
  const maintOver = v.maintenanceStatus === 'OVERDUE' || kmOver || v.maintenanceDueDays < 0;
  const maintSoon = !maintOver && (v.maintenanceStatus === 'DUE_SOON' || kmSoon || (v.maintenanceDueDays >= 0 && v.maintenanceDueDays <= 7));
  const leadId = v.leadDriverId || v.driverId;
  const noDriver = !leadId;
  const assignedIds = Array.from(new Set([...(v.driverIds ?? []), leadId, v.deputyDriverId].filter(Boolean) as string[]));
  const onlineId = assignedIds.find((id) => presenceOf(id) === 'Online');
  const onDutyId = onlineId || leadId || '';
  const onDutyPresence = presenceOf(onDutyId);
  const driverOffShift = !noDriver && !onlineId;
  const docDetails = [
    v.inspectionDueDays < 0 ? `Hết đăng kiểm ${Math.abs(v.inspectionDueDays)} ngày` : v.inspectionDueDays <= 30 ? `Đăng kiểm còn ${v.inspectionDueDays} ngày` : '',
    v.tndsDueDays < 0 ? `Hết BH TNDS ${Math.abs(v.tndsDueDays)} ngày` : v.tndsDueDays <= 30 ? `BH TNDS còn ${v.tndsDueDays} ngày` : '',
    v.gplhDueDays < 0 ? `Hết giấy phép lưu hành ${Math.abs(v.gplhDueDays)} ngày` : v.gplhDueDays <= 30 ? `Giấy phép lưu hành còn ${v.gplhDueDays} ngày` : '',
  ].filter(Boolean);
  const maintKmText = v.maintenanceFromKm && v.maintenanceToKm
    ? `${formatKm(v.maintenanceFromKm)} → ${formatKm(v.maintenanceToKm)} km${odo ? ` · ODO ${odo.toLocaleString('vi-VN')}` : ''}`
    : '';
  const blockTags: BlockTag[] = [];
  if (docsOver) blockTags.push({ key: 'docs', label: 'Giấy tờ', detail: docDetails.join(' · '), level: 'hard' });
  else if (docsSoon) blockTags.push({ key: 'docs', label: 'Giấy tờ', detail: docDetails.join(' · '), level: 'warn' });
  if (broken.length) blockTags.push({ key: 'tools', label: 'Công cụ', detail: `Hỏng hoặc thiếu: ${broken.map((t) => t.name).join(', ')}`, level: 'hard' });
  if (noDriver) blockTags.push({ key: 'driver', label: 'Tài xế', detail: 'Chưa gán tài xế quản lý', level: 'hard' });
  else if (driverOffShift) blockTags.push({ key: 'driver', label: 'Tài xế', detail: `${driverName(onDutyId)} đang ${onDutyPresence || 'Hết ca'}, không có tài xế Online trong ca`, level: 'warn' });
  if (gpsLost) blockTags.push({ key: 'gps', label: 'GPS', detail: 'Mất tín hiệu GPS', level: 'hard' });
  if (maintOver) blockTags.push({ key: 'maint', label: 'Bảo dưỡng', detail: [kmOver ? `ODO đã qua mốc ${formatKm(v.maintenanceToKm)} km` : '', maintKmText, v.maintenanceNextAt ? `Hạn ngày ${v.maintenanceNextAt}` : ''].filter(Boolean).join(' · '), level: 'hard' });
  else if (maintSoon) blockTags.push({ key: 'maint', label: 'Bảo dưỡng', detail: [kmSoon ? `Còn ${toKm - odo} km tới mốc` : '', maintKmText, v.maintenanceNextAt ? `Hạn ngày ${v.maintenanceNextAt}` : ''].filter(Boolean).join(' · '), level: 'warn' });
  const reasons = blockTags.filter((tag) => tag.level === 'hard').map((tag) => tag.detail);
  const statusBlocks = statusLabel !== 'Sẵn sàng';
  const blocked = statusBlocks || blockTags.some((tag) => tag.level === 'hard');
  const warned = !blocked && blockTags.some((tag) => tag.level === 'warn');
  const eligible = !blocked && !warned;
  const secondary = (v.driverIds ?? []).filter((id) => id !== v.driverId);
  const gateTitle = statusLabel === 'Đang làm đơn' && v.activeOrderCode
    ? `${v.activeOrderCode} · ${v.activeOrderStage || 'Đang thực hiện'}${v.activeOrderEta ? ` · xong dự kiến ${v.activeOrderEta}` : ''}`
    : statusBlocks
      ? [statusLabel, v.statusReason, v.statusStartedAt ? `từ ${v.statusStartedAt}` : '', v.expectedReturnAt ? `về ${v.expectedReturnAt}` : ''].filter(Boolean).join(' · ')
      : blockTags.map((tag) => tag.detail).join(' · ') || 'Đủ giấy tờ, công cụ, tài xế trực, GPS và bảo dưỡng';

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
    maintKmText,
    showDue: statusLabel !== 'Ngừng hoạt động',
    toolBad: broken.length > 0,
    toolLabel: broken.length ? `${broken.length} hỏng` : `Đủ ${v.tools.length}/${v.tools.length}`,
    toolSub: broken.length ? broken.map((t) => t.name).join(', ') : 'Đủ định mức',
    eligible,
    blocked,
    warned,
    eligText: eligible ? 'Đủ điều kiện' : warned ? 'Cảnh báo' : 'Bị chặn',
    gateTitle,
    blockTags,
    reasons,
    primaryName: v.driverId ? driverName(v.driverId) : '',
    secondaryNames: secondary.map((id) => driverName(id)).filter((name) => name !== 'Chưa gán').join(', '),
    leadName: leadId ? driverName(leadId) : '',
    deputyName: v.deputyDriverId ? driverName(v.deputyDriverId) : '',
    onDutyName: onDutyId ? driverName(onDutyId) : '',
    onDutyPresence,
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
