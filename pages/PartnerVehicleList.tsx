import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  History,
  Info,
  Layers,
  Plus,
  Radio,
  UserPlus,
  RotateCcw,
  Search,
  Trash2,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import { QUICK_FILTERS, fleetRowOf, matchQuick, statusLabelOf, type QuickKey } from './vehicleFleetView';
import {
  PartnerModal,
  partnerBtnBrand,
  partnerBtnNeutral,
  partnerInputClass as inputClass,
  partnerLabelClass,
} from '../components/PartnerModal';
import {
  IMEI_OPTIONS,
  PARTNER_STAFF,
  STATION_OPTIONS,
  VEHICLES,
  RESCUE_CAPABILITY_LABEL,
  VEHICLE_TYPE_LABEL,
  driverName,
  driverNames,
  inScope,
  nextHnl,
  normalizePlate,
  orgName,
  registerTransfer,
  registerVehicle,
  toolsFor,
  updateVehicle,
  type PartnerPersona,
  type VehicleRecord,
  type RescueCapability,
  type VehicleType,
  toolReady,
  toolQtyOf,
  standardQtyOf,
  toolConditionOf,
} from '../data/partnerRescueMockData';

import {
  INITIAL_GPS_HISTORY,
  INITIAL_UNMATCHED_DEVICES,
  INITIAL_VEHICLE_GPS_DATA,
  type GpsMappingAudit,
  type GpsMappingPeriod,
  type GpsMatchState,
  type UnmatchedDeviceRecord,
  type VehicleGpsStatus,
} from '../data/gpsTrackingMockData';

import {
  GpsSignalDisplay,
} from '../components/gps/GpsSignalBadge';

type ListTab = 'all' | 'due' | 'idle' | 'tools' | 'signal_lost';

const SectionHeader = ({
  title,
  icon,
  rightNode,
}: {
  title: string;
  icon?: React.ReactNode;
  rightNode?: React.ReactNode;
}) => (
  <div className="bg-[#00A859] text-white px-4 py-2 flex items-center justify-between font-bold text-sm uppercase tracking-wide">
    <div className="flex items-center space-x-2">
      {icon}
      <span>{title}</span>
    </div>
    {rightNode}
  </div>
);

const filterBtnClass = (active: boolean) =>
  `px-4 py-1.5 rounded text-xs font-bold border transition-all ${
    active
      ? 'bg-[#00A859] text-white border-[#00A859] shadow-sm'
      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00A859] hover:text-[#00A859]'
  }`;

const fieldClass = 'flex-1 border rounded px-3 py-1.5 text-xs outline-none focus:border-[#00A859] bg-white text-gray-800';

type ImportPreviewRow = {
  plate: string;
  brand: VehicleRecord['brand'];
  modelLine: string;
  chassis: string;
  engineNo: string;
  year: number;
  type: VehicleType;
  stationId: string;
  driverId: string | null;
  loadCarry: string;
  loadCrane: string;
  loadLift: string;
  seats: string;
  runStatus: VehicleRecord['runStatus'];
  error?: string;
};

const TYPE_BY_LABEL: Record<string, VehicleType> = Object.fromEntries(
  (Object.entries(VEHICLE_TYPE_LABEL) as [VehicleType, string][]).map(([k, v]) => [v.toLowerCase(), k])
);

const cell = (row: Record<string, unknown>, ...keys: string[]) => {
  const map = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
  );
  for (const key of keys) {
    const v = map[key.toLowerCase()];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const isBlankImportRow = (row: Record<string, unknown>) =>
  Object.values(row).every((v) => String(v ?? '').trim() === '');

const parseBrand = (raw: string): VehicleRecord['brand'] => {
  const v = raw.toLowerCase();
  if (v.includes('hino')) return 'Hino';
  if (v.includes('dongfeng')) return 'Dongfeng';
  return 'Isuzu';
};

const parseType = (raw: string): VehicleType | null => {
  const v = raw.trim().toLowerCase();
  if (!v) return 'san_truot';
  if (TYPE_BY_LABEL[v]) return TYPE_BY_LABEL[v];
  if (v === 'san_truot' || v === 'san_nang_truot' || v === 'san_truot_cau') return v;
  return null;
};

const parseStation = (raw: string): string | null => {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  const hit = STATION_OPTIONS.find(
    (s) => s.id === raw.trim() || s.name.toLowerCase() === v || s.name.toLowerCase().includes(v)
  );
  return hit?.id ?? null;
};

const parseDriver = (raw: string, stationId: string): string | null => {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return (
    PARTNER_STAFF.find(
      (s) => s.role === 'NVCH' && s.stationId === stationId && s.fullname.toLowerCase() === v
    )?.id ?? null
  );
};

const parseImportRows = (rows: Record<string, unknown>[], existingPlates: Set<string>): ImportPreviewRow[] =>
  rows
    .filter((row) => !isBlankImportRow(row))
    .map((row) => {
      const plate = normalizePlate(cell(row, 'Biển số', 'Bien so', 'plate'));
      const type = parseType(cell(row, 'Loại xe', 'Loai xe'));
      const stationId = parseStation(cell(row, 'Trạm', 'Tram'));
      const runRaw = cell(row, 'Tình trạng', 'Tinh trang').toLowerCase();
      const runStatus: VehicleRecord['runStatus'] =
        runRaw.includes('sửa') || runRaw === 'repair' ? 'repair' : 'active';
      const year = Number(cell(row, 'Năm SX', 'Nam SX')) || new Date().getFullYear();
      let error = '';
      if (!plate) error = 'Thiếu biển số';
      else if (existingPlates.has(plate)) error = 'Biển số đã tồn tại';
      else if (!type) error = 'Loại xe không hợp lệ';
      else if (!stationId) error = 'Không khớp trạm';
      return {
        plate,
        brand: parseBrand(cell(row, 'Hãng', 'Hang xe', 'Hãng xe')),
        modelLine: cell(row, 'Dòng xe', 'Dong xe') || '—',
        chassis: cell(row, 'Số khung', 'So khung') || '—',
        engineNo: cell(row, 'Số máy', 'So may') || '—',
        year,
        type: type ?? 'san_truot',
        stationId: stationId ?? '',
        driverId: stationId ? parseDriver(cell(row, 'Tài xế', 'Tai xe'), stationId) : null,
        loadCarry: cell(row, 'Trọng tải', 'Tai trọng chở', 'Tải trọng chở') || '—',
        loadCrane: cell(row, 'Trọng tải cẩu kéo tối đa', 'Tải trọng cẩu', 'Tai trọng cẩu') || '—',
        loadLift: cell(row, 'Tải trọng cầu nâng') || '—',
        seats: cell(row, 'Số chỗ', 'So cho') || '—',
        runStatus,
        error: error || undefined,
      };
    });

const PartnerVehicleList: React.FC = () => {
  const navigate = useNavigate();
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const [listTab, setListTab] = useState<ListTab>('all');
  const [plate, setPlate] = useState('');
  const [hnlCode, setHnlCode] = useState('');
  const [modelLine, setModelLine] = useState('');
  const [stationId, setStationId] = useState('');
  const [type, setType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('');
  const [quick, setQuick] = useState<QuickKey>('all');
  const [rescueCap, setRescueCap] = useState('');

  // Bộ lọc đã áp dụng (chỉ kích hoạt tìm kiếm khi ấn nút "Tìm kiếm" hoặc nhấn Enter)
  const [appliedFilters, setAppliedFilters] = useState({
    plate: '',
    hnlCode: '',
    modelLine: '',
    stationId: '',
    type: '',
    statusFilter: '',
  });

  const handleSearch = () => {
    setAppliedFilters({
      plate,
      hnlCode,
      modelLine,
      stationId,
      type,
      statusFilter,
    });
  };

  const handleResetFilters = () => {
    setPlate('');
    setHnlCode('');
    setModelLine('');
    setStationId('');
    setType('');
    setStatusFilter('');
    setListTab('all');
    setAppliedFilters({
      plate: '',
      hnlCode: '',
      modelLine: '',
      stationId: '',
      type: '',
      statusFilter: '',
    });
  };

  // GPS tracking integration (Story 1.2)
  const [gpsData, setGpsData] = useState<Record<string, VehicleGpsStatus>>(INITIAL_VEHICLE_GPS_DATA);
  const [gpsHistory, setGpsHistory] = useState<
    Record<string, { periods: GpsMappingPeriod[]; audits: GpsMappingAudit[] }>
  >(INITIAL_GPS_HISTORY);
  const [unmatchedDevices, setUnmatchedDevices] = useState<UnmatchedDeviceRecord[]>(INITIAL_UNMATCHED_DEVICES);

  // Modals GPS
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVehicleForAssign, setSelectedVehicleForAssign] = useState<VehicleGpsStatus | null>(null);
  const [assignInitialImei, setAssignInitialImei] = useState('');
  const [assignUnmatchedId, setAssignUnmatchedId] = useState<string | undefined>(undefined);
  const [unassignModalOpen, setUnassignModalOpen] = useState(false);
  const [selectedVehicleForUnassign, setSelectedVehicleForUnassign] = useState<VehicleGpsStatus | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedVehicleForHistory, setSelectedVehicleForHistory] = useState<VehicleGpsStatus | null>(null);
  const [unmatchedModalOpen, setUnmatchedModalOpen] = useState(false);
  const [signalLostModalOpen, setSignalLostModalOpen] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleRecord[]>(VEHICLES);

  const inPersona = useMemo(() => {
    let rows = vehicles.filter((v) => inScope(persona, v.stationId));
    if (persona.role === 'NVCH') rows = rows.filter((v) => v.id === 'v1');
    return rows;
  }, [vehicles, persona]);

  const selectVehicleType = (next: string) => {
    setType(next);
    setAppliedFilters((prev) => ({ ...prev, type: next }));
  };

  // DLG-02: Điều chuyển xe
  const [transferOf, setTransferOf] = useState<VehicleRecord | null>(null);
  const [transferTargets, setTransferTargets] = useState<VehicleRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reasonTip, setReasonTip] = useState<{ x: number; y: number; lines: { key: string; label: string; detail: string }[] } | null>(null);
  const [bulkStopOpen, setBulkStopOpen] = useState(false);
  const [assignOf, setAssignOf] = useState<VehicleRecord | null>(null);
  const [assignLead, setAssignLead] = useState('');
  const [assignDeputy, setAssignDeputy] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferReturnAt, setTransferReturnAt] = useState('');
  const [transferServices, setTransferServices] = useState<string[]>([
    'Xe hết pin',
    'Kích bình ắc quy',
  ]);

  // DLG-11: Đổi trạng thái xe
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedVehicleForStatus, setSelectedVehicleForStatus] = useState<VehicleRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<'READY' | 'STOPPED' | 'MAINTENANCE'>('READY');
  const [targetReasonCode, setTargetReasonCode] = useState('');
  const [targetReasonNote, setTargetReasonNote] = useState('');
  const [targetReturnAt, setTargetReturnAt] = useState('');
  // VAL-S01..S03 (FDD FL-M1-05)
  const statusFormValid = (() => {
    if (targetStatus === 'READY') return true;
    if (!targetReasonCode || !targetReturnAt) return false;
    const t = new Date(targetReturnAt).getTime();
    if (Number.isNaN(t) || t <= Date.now() || t > Date.now() + 90 * 86400000) return false;
    if (targetReasonCode === 'OTHER' && targetReasonNote.trim().length < 5) return false;
    return true;
  })();
  // VAL-16 (FDD FL-M1-01): ngày về dự kiến > hôm nay
  const transferReturnValid = !transferReturnAt || new Date(transferReturnAt).getTime() > new Date().setHours(23, 59, 59, 999);

  // Import Excel modal
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // FDD FL-M1-01 A4.1: có quyền sửa xe = Trưởng trạm / Đối tác (không phải tài xế, kế toán)
  const canEditVehicle = persona.role !== 'NVCH' && persona.role !== 'KT';
  // Điều chuyển cần phạm vi ≥ 2 trạm
  const multiStation = persona.stationIds.length !== 1;
  const canTransferVehicle = (v: VehicleRecord) => canEditVehicle && multiStation && (v.status ?? 'READY') !== 'INACTIVE';
  const canChangeStatusOf = (v: VehicleRecord) => canEditVehicle && (v.status ?? 'READY') !== 'WORKING';
  const canManageGps =
    persona.role === 'BDH' ||
    persona.role === 'GDM' ||
    persona.role === 'GDCN' ||
    persona.role === 'QLVUNG';

  // Counts
  const openUnmatchedCount = useMemo(
    () => unmatchedDevices.filter((d) => d.state === 'OPEN').length,
    [unmatchedDevices]
  );
  const signalLostCount = useMemo(
    () => Object.values(gpsData).filter((g) => g.signal.signalLost).length,
    [gpsData]
  );

  const scoped = useMemo(() => {
    let rows = vehicles.filter((v) => inScope(persona, v.stationId));
    if (persona.role === 'NVCH') rows = rows.filter((v) => v.id === 'v1');

    const query = q.trim().toLowerCase();
    if (query) {
      const plateQuery = normalizePlate(query);
      rows = rows.filter(
        (v) =>
          (plateQuery && normalizePlate(v.plate).includes(plateQuery)) ||
          String(v.hnl).toLowerCase().includes(query) ||
          v.chassis.toLowerCase().includes(query)
      );
    }
    if (stationId) rows = rows.filter((v) => v.stationId === stationId);
    if (rescueCap) rows = rows.filter((v) => (v.rescueCapabilities ?? []).includes(rescueCap as RescueCapability));
    if (owner) rows = rows.filter((v) => (v.ownership ?? 'Công ty') === owner);
    if (statusFilter) rows = rows.filter((v) => statusLabelOf(v) === statusFilter);

    return rows;
  }, [persona, vehicles, q, stationId, rescueCap, owner, statusFilter]);

  const gpsLostOf = (v: VehicleRecord) => Boolean((gpsData[v.id] as { signal?: { signalLost?: boolean } } | undefined)?.signal?.signalLost);
  const visible = useMemo(
    () => scoped.filter((v) => matchQuick(quick, fleetRowOf(v, gpsLostOf(v)))),
    [scoped, quick, gpsData]
  );

  const openDetail = (id: string) => navigate(`/partner/vehicles/${id}`);

  // Helper lấy status GPS cho xe
  const getGpsStatusForVehicle = (v: VehicleRecord): VehicleGpsStatus => {
    if (gpsData[v.id]) return gpsData[v.id];
    return {
      vehicleId: v.id,
      plate: v.plate,
      plateNormalized: v.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
      stationId: v.stationId,
      stationName: orgName(v.stationId),
      imei: v.imei ?? null,
      mappingId: null,
      mappingVersion: 1,
      validFrom: v.imei ? 'Vừa tạo' : null,
      matchState: v.imei ? 'MATCHED' : 'UNMATCHED',
      matchStateLabel: v.imei ? 'Đã khớp' : 'Chưa khớp',
      signal: {
        freshness: v.imei ? 'FRESH' : 'UNKNOWN',
        freshnessLabel: v.imei ? 'Mới' : 'Không rõ',
        signalLost: false,
        lastSeenAt: v.imei ? 'Vừa xong' : '—',
        reasonCode: v.imei ? '2' : 'NO_DEVICE',
        reason: v.imei ? 'Đang dừng' : 'Chưa gắn thiết bị',
        lat: 21.0,
        lng: 105.8,
        address: v.parkAddress || orgName(v.stationId),
      },
    };
  };

  // DLG-02 Handlers
  const openTransfer = (list: VehicleRecord[]) => {
    const targets = list.filter((v) => canTransferVehicle(v));
    if (targets.length === 0) return;
    setTransferTargets(targets);
    setTransferOf(targets[0]);
    setTransferTo('');
    setTransferReason('');
    setTransferReturnAt('');
    setTransferServices(['Xe hết pin', 'Kích bình ắc quy']);
  };

  const closeTransfer = () => {
    setTransferOf(null);
    setTransferTargets([]);
    setTransferTo('');
    setTransferReason('');
  };

  const confirmTransfer = () => {
    const targets = transferTargets.length ? transferTargets : transferOf ? [transferOf] : [];
    if (targets.length === 0 || !transferTo || !transferReturnValid) return;
    const returnNote = transferReturnAt ? ` · về dự kiến ${new Date(transferReturnAt).toLocaleDateString('vi-VN')}` : '';
    const cleared = { stationId: transferTo, driverId: null, driverIds: [] as string[], leadDriverId: null, deputyDriverId: null };
    targets.forEach((vehicle) => {
      registerTransfer({
        id: `t-${Date.now()}-${vehicle.id}`,
        vehicleId: vehicle.id,
        fromStationId: vehicle.stationId,
        toStationId: transferTo,
        transferredAt: new Date().toLocaleString('vi-VN'),
        byName: persona.title,
        reason: (transferReason || 'Điều chuyển trạm') + returnNote,
      });
      updateVehicle(vehicle.id, cleared);
    });
    const ids = new Set(targets.map((v) => v.id));
    setVehicles((prev) => prev.map((v) => (ids.has(v.id) ? { ...v, ...cleared } : v)));
    setSelectedIds((prev) => prev.filter((id) => !ids.has(id)));
    triggerToast(`Đã điều chuyển ${targets.length} xe tới ${orgName(transferTo)}`);
    closeTransfer();
  };

  const confirmBulkStop = () => {
    const targets = visible.filter((v) => selectedIds.includes(v.id) && v.status !== 'WORKING' && v.status !== 'INACTIVE');
    const started = new Date().toLocaleDateString('vi-VN');
    const patch: Partial<VehicleRecord> = {
      status: 'INACTIVE',
      runStatus: 'active',
      statusReason: 'Ngừng hàng loạt',
      statusStartedAt: started,
      statusChangedAt: new Date().toLocaleString('vi-VN'),
      statusChangedBy: persona.title,
    };
    targets.forEach((vehicle) => updateVehicle(vehicle.id, patch));
    const ids = new Set(targets.map((v) => v.id));
    setVehicles((prev) => prev.map((v) => (ids.has(v.id) ? { ...v, ...patch } : v)));
    setSelectedIds([]);
    setBulkStopOpen(false);
    triggerToast(`Đã ngừng ${targets.length} xe`);
  };

  const openAssign = (v: VehicleRecord) => {
    setAssignOf(v);
    setAssignLead(v.leadDriverId || v.driverId || '');
    setAssignDeputy(v.deputyDriverId || '');
  };

  const confirmAssign = () => {
    if (!assignOf || !assignLead) return;
    const driverIds = Array.from(new Set([assignLead, assignDeputy].filter(Boolean)));
    const patch: Partial<VehicleRecord> = {
      leadDriverId: assignLead,
      deputyDriverId: assignDeputy || null,
      driverId: assignLead,
      driverIds,
    };
    updateVehicle(assignOf.id, patch);
    setVehicles((prev) => prev.map((v) => (v.id === assignOf.id ? { ...v, ...patch } : v)));
    setAssignOf(null);
    triggerToast(`Đã gán tài xế cho xe ${assignOf.plate}`);
  };

  // DLG-11 Handlers
  const handleOpenStatusModal = (v: VehicleRecord) => {
    setSelectedVehicleForStatus(v);
    const eff = (v.status ?? (v.runStatus === 'repair' ? 'MAINTENANCE' : 'READY')) as
      | 'READY'
      | 'STOPPED'
      | 'MAINTENANCE';
    setTargetStatus(eff);
    setTargetReasonCode(v.statusReasonCode ?? '');
    setTargetReasonNote(v.statusReason ?? '');
    setTargetReturnAt(v.expectedReturnAt ?? '');
    setStatusModalOpen(true);
  };

  const handleSaveStatusModal = () => {
    if (!selectedVehicleForStatus) return;
    const patch: Partial<VehicleRecord> = {
      status: targetStatus,
      runStatus: targetStatus === 'MAINTENANCE' ? 'repair' : 'active',
      statusReasonCode: targetStatus !== 'READY' ? targetReasonCode : undefined,
      statusReason: targetStatus !== 'READY' ? targetReasonNote : undefined,
      expectedReturnAt: targetStatus !== 'READY' ? targetReturnAt : undefined,
      statusChangedAt: new Date().toLocaleString('vi-VN'),
      statusChangedBy: persona.title,
    };
    updateVehicle(selectedVehicleForStatus.id, patch);
    setVehicles((prev) =>
      prev.map((v) => (v.id === selectedVehicleForStatus.id ? { ...v, ...patch } : v))
    );
    setStatusModalOpen(false);
    triggerToast(`Đã đổi trạng thái xe ${selectedVehicleForStatus.plate}`);
  };

  // Export Excel
  const handleExportExcel = (rows: VehicleRecord[] = scoped) => {
    const data = rows.map((v, i) => ({
      STT: i + 1,
      'Biển số': v.plate,
      'Mã xe': v.hnl,
      Hãng: v.brand,
      'Dòng xe': v.modelLine,
      Trạm: orgName(v.stationId),
      'Loại xe': VEHICLE_TYPE_LABEL[v.type],
      'Tải trọng': v.loadCarry || '—',
      'Ngày đăng ký': v.registrationDate || '—',
      'Tài xế': driverNames(v.driverIds, v.driverId),
      'Tình trạng':
        v.status === 'READY' || v.runStatus === 'active'
          ? 'Sẵn sàng'
          : v.status === 'STOPPED'
          ? 'Tạm dừng'
          : 'Đang sửa chữa',
      'Nhắc hạn gần nhất': `${Math.min(
        v.inspectionDueDays,
        v.maintenanceDueDays,
        v.gplhDueDays,
        v.tndsDueDays,
        v.physicalInsDueDays
      )} ngày`,
      'Không chạy': `${v.idleHours}h`,
      'Công cụ lỗi': v.tools.filter((t) => t.status === 0).length,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach_xe');
    XLSX.writeFile(wb, `Danh_sach_phuong_tien_${Date.now()}.xlsx`);
  };

  // Import Excel parse
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        const existingPlates = new Set(vehicles.map((v) => normalizePlate(v.plate)));
        const parsed = parseImportRows(json, existingPlates);
        setImportRows(parsed);
      } catch (err) {
        setImportError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    const validRows = importRows.filter((r) => !r.error);
    if (validRows.length === 0) return;
    const newVehicles: VehicleRecord[] = validRows.map((r, i) => ({
      id: `v-imp-${Date.now()}-${i}`,
      plate: r.plate,
      hnl: nextHnl(vehicles) + i,
      brand: r.brand,
      modelLine: r.modelLine,
      chassis: r.chassis,
      engineNo: r.engineNo,
      year: r.year,
      stationId: r.stationId,
      driverId: r.driverId,
      type: r.type,
      loadCarry: r.loadCarry,
      loadCrane: r.loadCrane,
      loadLift: r.loadLift,
      seats: r.seats,
      runStatus: r.runStatus,
      status: r.runStatus === 'repair' ? 'MAINTENANCE' : 'READY',
      idleHours: 0,
      inspectionDueDays: 365,
      maintenanceDueDays: 30,
      gplhDueDays: 365,
      tndsDueDays: 365,
      physicalInsDueDays: 365,
      tools: toolsFor(r.type),
      revenueMonth: 0,
    }));
    newVehicles.forEach((v) => registerVehicle(v));
    setVehicles((prev) => [...newVehicles, ...prev]);
    setImportOpen(false);
    setImportRows([]);
    setImportFile(null);
    triggerToast(`Đã import thành công ${newVehicles.length} phương tiện`);
  };

  if (persona.role === 'NVCH') {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
        <PartnerScopeBar persona={persona} onChange={setPersona} />
        <div className="p-8 bg-white border border-amber-200 rounded-lg text-center shadow-sm my-6">
          <AlertTriangle size={44} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-base font-bold text-gray-800">Không có quyền truy cập</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Nhân viên cứu hộ / Tài xế (NVCH) không có quyền xem danh sách phương tiện theo quy định BR-01 (FDD FL-M1-01). Vui lòng chuyển vai trò khác ở thanh trên để kiểm tra hoặc liên hệ quản trị viên.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom-2">
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Danh sách phương tiện</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Phạm vi: {persona.label} · Trạng thái nhận đơn được tính theo giấy tờ, công cụ, tài xế, GPS và bảo dưỡng
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handleExportExcel()} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50">
            <Download size={15} />
            Xuất Excel
          </button>
          {canEditVehicle && (
            <button type="button" onClick={() => navigate('/partner/vehicles/new')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E8F47] px-3 py-2 text-xs font-bold text-white hover:bg-green-700">
              <Plus size={15} />
              Thêm xe
            </button>
          )}
        </div>
      </div>

      <PartnerScopeBar persona={persona} onChange={setPersona} />

      <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <label className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              Biển số / Mã xe / Số khung
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="VD: 29C12345 hoặc 21" className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[12px] font-semibold normal-case tracking-normal text-gray-800 outline-none focus:border-[#0E8F47]" />
            </label>
            <FilterSelect label="Trạm" value={stationId} onChange={setStationId}>
              <option value="">Tất cả trạm</option>
              {STATION_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FilterSelect>
            <FilterSelect label="Loại cứu hộ" value={rescueCap} onChange={setRescueCap}>
              <option value="">Tất cả</option>
              {(Object.keys(RESCUE_CAPABILITY_LABEL) as RescueCapability[]).map((key) => (
                <option key={key} value={key}>{RESCUE_CAPABILITY_LABEL[key]}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Tình trạng" value={statusFilter} onChange={setStatusFilter}>
              <option value="">Tất cả</option>
              {['Sẵn sàng', 'Đang làm đơn', 'Sửa chữa', 'Tạm dừng', 'Ngừng hoạt động'].map((s) => <option key={s}>{s}</option>)}
            </FilterSelect>
            <FilterSelect label="Sở hữu" value={owner} onChange={setOwner}>
              <option value="">Tất cả</option>
              {['Công ty', 'Thuê', 'Đối tác vệ tinh'].map((s) => <option key={s}>{s}</option>)}
            </FilterSelect>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((item) => {
              const active = quick === item.key;
              const value = scoped.filter((v) => matchQuick(item.key, fleetRowOf(v, gpsLostOf(v)))).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setQuick(item.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${active ? 'border-[#0E8F47] bg-emerald-50 text-[#0B6B37]' : 'border-gray-300 bg-white text-gray-600'}`}
                >
                  {item.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-[#0E8F47] text-white' : 'bg-gray-100 text-gray-600'}`}>{value}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setStationId('');
              setRescueCap('');
              setStatusFilter('');
              setOwner('');
              setQuick('all');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold"
          >
            <RotateCcw size={14} />
            Xóa bộ lọc
          </button>
        </div>
      </section>

      <div className="border rounded-lg shadow-sm bg-white w-full min-w-0 overflow-hidden">
        <SectionHeader
          title={`KẾT QUẢ TÌM KIẾM (${visible.length})`}
          rightNode={
            selectedIds.length > 0 ? (
              <span className="flex flex-wrap items-center gap-1.5 normal-case tracking-normal">
                <span className="text-[11px] font-semibold text-gray-600">Đã chọn {selectedIds.length}</span>
                <button type="button" onClick={() => openTransfer(visible.filter((v) => selectedIds.includes(v.id)))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800">Điều chuyển trạm</button>
                <button type="button" onClick={() => handleExportExcel(visible.filter((v) => selectedIds.includes(v.id)))} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800">Xuất Excel</button>
                <button type="button" onClick={() => setBulkStopOpen(true)} className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">Ngừng hàng loạt</button>
              </span>
            ) : (
              <span className="text-[11px] font-normal lowercase tracking-normal">Chọn nhiều xe để điều chuyển, xuất Excel hoặc ngừng</span>
            )
          }
        />
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1480px]">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="px-2 py-2.5 text-center w-8 font-bold border-r">
                  <input
                    type="checkbox"
                    checked={visible.length > 0 && visible.every((v) => selectedIds.includes(v.id))}
                    onChange={(e) => setSelectedIds(e.target.checked ? visible.map((v) => v.id) : [])}
                    className="accent-[#00A859]"
                    aria-label="Chọn tất cả xe"
                  />
                </th>
                <th className="px-2.5 py-2.5 text-center w-10 font-bold border-r">STT</th>
                <th className="px-2.5 py-2.5 text-center w-28 font-bold border-r">Thao tác</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Xe</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Vị trí gần nhất</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Trạm</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Loại</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Tải trọng</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Tài xế</th>
                <th className="px-2.5 py-2.5 text-center font-bold border-r">Tình trạng</th>
                <th className="px-2.5 py-2.5 text-left font-bold border-r">Nhắc hạn</th>
                <th className="px-2.5 py-2.5 text-left font-bold">Công cụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((v, index) => {
                const worstDue = Math.min(v.inspectionDueDays, v.gplhDueDays, v.tndsDueDays);
                const brokenTools = v.tools.filter((t) => !toolReady(t));
                const brokenCount = brokenTools.length;
                const gps = getGpsStatusForVehicle(v);
                const locationAddress = gps.signal.address?.trim() ?? '';
                const locationUnknown = !locationAddress || locationAddress === '—';
                const row = fleetRowOf(v, gps.signal.signalLost);
                const statusLabel = row.statusLabel;
                const ownerTone = v.ownership === 'Thuê'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : v.ownership === 'Đối tác vệ tinh'
                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
                const dutyTone = row.onDutyPresence === 'Online'
                  ? 'text-emerald-700'
                  : row.onDutyPresence === 'Nghỉ'
                    ? 'text-gray-500'
                    : 'text-amber-700';
                const statusBadgeStyle =
                  statusLabel === 'Sẵn sàng'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : statusLabel === 'Sửa chữa'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : statusLabel === 'Tạm dừng'
                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                    : statusLabel === 'Đang làm đơn'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';

                return (
                  <tr key={v.id} className="hover:bg-gray-50/80 align-top transition-colors">
                    <td className="px-2 py-3 text-center border-r">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(v.id)}
                        onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id))}
                        className="accent-[#00A859]"
                        aria-label={`Chọn xe ${v.plate}`}
                      />
                    </td>
                    <td className="px-2.5 py-3 text-center border-r text-gray-500 font-medium">{index + 1}</td>
                    <td className="px-2.5 py-3 border-r">
                      <div className="flex items-center justify-center gap-2">
                        {canTransferVehicle(v) && (
                          <button type="button" onClick={() => openTransfer([v])} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition" title="Điều chuyển xe">
                            <ArrowRightLeft size={16} />
                          </button>
                        )}
                        {canEditVehicle && (
                          <button type="button" onClick={() => openAssign(v)} className="text-[#00A859] hover:bg-emerald-50 p-1 rounded transition" title="Gán tài xế">
                            <UserPlus size={16} />
                          </button>
                        )}
                        <button type="button" onClick={() => openDetail(v.id)} className="text-amber-500 hover:bg-amber-50 p-1 rounded transition" title="Xem chi tiết xe">
                          <Info size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r">
                      <button type="button" onClick={() => openDetail(v.id)} className="font-bold text-gray-900 hover:text-[#00A859] transition-colors text-xs text-left">
                        {v.plate}
                      </button>
                      <div className="mt-0.5 text-[11px] text-gray-400">Mã {v.hnl} · {v.brand} {v.modelLine}</div>
                      <span className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold ${ownerTone}`}>{v.ownership || 'Công ty'}</span>
                    </td>
                    <td className="px-3 py-3 border-r">
                      <div
                        className={`font-medium text-[11px] truncate max-w-[170px] ${locationUnknown ? 'text-red-600' : 'text-gray-800'}`}
                        title={locationUnknown ? 'Không xác định' : locationAddress}
                      >
                        {locationUnknown ? 'Không xác định' : locationAddress}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${gps.signal.signalLost ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] text-gray-500">{gps.signal.signalLost ? 'Mất tín hiệu' : 'Cập nhật 5 phút trước'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r font-medium text-gray-700">{orgName(v.stationId)}</td>
                    <td className="px-3 py-3 border-r text-gray-600">{VEHICLE_TYPE_LABEL[v.type]}</td>
                    <td className="px-3 py-3 border-r text-gray-700">
                      <div className="font-semibold">{v.loadCarry || '—'}</div>
                      {v.loadCrane && v.loadCrane !== '—' && <div className="text-[10px] text-gray-400">Cẩu: {v.loadCrane}</div>}
                    </td>
                    <td className="px-3 py-3 border-r text-[11px] text-gray-700">
                      <div>Quản lý: <span className="font-semibold text-gray-900">{row.leadName || 'Chưa gán'}</span></div>
                      <div>Phụ: <span className="font-semibold text-gray-900">{row.deputyName || '—'}</span></div>
                      <div className="mt-1">
                        Đang trực: <span className="font-semibold text-gray-900">{row.onDutyName || 'Không có'}</span>
                        {row.onDutyPresence && <span className={`ml-1 font-bold ${dutyTone}`}>{row.onDutyPresence}</span>}
                      </div>
                    </td>
                    <td className="px-2.5 py-3 border-r text-center">
                      <button
                        type="button"
                        disabled={!canChangeStatusOf(v)}
                        onClick={() => canChangeStatusOf(v) && handleOpenStatusModal(v)}
                        className={`inline-flex flex-col items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${statusBadgeStyle}`}
                        onMouseEnter={(e) => {
                          const box = e.currentTarget.getBoundingClientRect();
                          const lines = [
                            ...(v.status === 'WORKING'
                              ? [
                                  { key: 'order', label: 'Mã đơn', detail: v.activeOrderCode || 'Chưa gắn' },
                                  { key: 'stage', label: 'Chặng', detail: v.activeOrderStage || 'Chưa có' },
                                  { key: 'eta', label: 'Xong dự kiến', detail: v.activeOrderEta || '—' },
                                ]
                              : []),
                            ...(v.status === 'MAINTENANCE' || v.status === 'STOPPED'
                              ? [
                                  { key: 'reason', label: 'Lý do', detail: v.statusReason || 'Chưa có lý do' },
                                  { key: 'from', label: 'Từ', detail: v.statusStartedAt || '—' },
                                  { key: 'back', label: 'Về', detail: v.expectedReturnAt || '—' },
                                ]
                              : []),
                            ...row.blockTags.map((tag) => ({ key: tag.key, label: tag.label, detail: tag.detail })),
                          ];
                          setReasonTip({ x: box.left + box.width / 2, y: box.bottom + 6, lines });
                        }}
                        onMouseLeave={() => setReasonTip(null)}
                      >
                        <span>{statusLabel}</span>
                      </button>
                    </td>
                    <td className="px-2.5 py-3 border-r">
                      {!row.showDue ? (
                        <span className="text-gray-400">—</span>
                      ) : worstDue < 0 ? (
                        <span className="font-bold text-red-600">Quá hạn {Math.abs(worstDue)} ngày</span>
                      ) : worstDue <= 30 ? (
                        <span className="font-bold text-amber-600">Còn {worstDue} ngày</span>
                      ) : (
                        <span className="text-gray-600 font-medium">Còn {worstDue} ngày</span>
                      )}
                      {row.showDue && row.maintKmText && (
                        <div className="mt-1 text-[10px] font-medium text-gray-500">{row.maintKmText}</div>
                      )}
                    </td>
                    <td className="px-2.5 py-3 font-bold">
                      {brokenCount > 0 ? (
                        <span
                          className="text-red-600 cursor-help underline decoration-dotted"
                          title={`Công cụ chưa đạt: ${brokenTools.map((t) => `${t.name} (${toolQtyOf(t)}/${standardQtyOf(t.name)} · ${toolConditionOf(t) === 'BROKEN' ? 'Hỏng' : 'Thiếu'})`).join(', ')}`}
                        >
                          {brokenCount} món lỗi
                        </span>
                      ) : (
                        <span className="text-[#00A859]">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-gray-400">Không tìm thấy phương tiện nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reasonTip && (
        <div
          className="pointer-events-none fixed z-[80] w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-lg"
          style={{ left: reasonTip.x, top: reasonTip.y }}
        >
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Lý do</div>
          {reasonTip.lines.length === 0 ? (
            <p className="text-[11px] text-gray-500">Không có lý do chặn</p>
          ) : (
            <ul className="space-y-1">
              {reasonTip.lines.map((line) => (
                <li key={line.key} className="text-[11px] leading-4 text-gray-700">
                  <span className="font-bold text-gray-900">{line.label}: </span>
                  {line.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* DLG-02: MODAL ĐIỀU CHUYỂN XE */}
      <PartnerModal
        open={!!transferOf}
        title={transferTargets.length > 1 ? `Điều chuyển ${transferTargets.length} xe` : `Điều chuyển xe — ${transferOf?.plate ?? ''}`}
        icon={<ArrowRightLeft size={20} />}
        onClose={closeTransfer}
        footer={(
          <>
            <button type="button" onClick={closeTransfer} className={partnerBtnNeutral}>
              Hủy
            </button>
            <button
              type="button"
              disabled={!transferTo || !transferReturnValid}
              onClick={confirmTransfer}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Xác nhận điều chuyển
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
            <div>
              <span className="text-gray-500 block text-[11px]">Phương tiện:</span>
              <strong className="text-gray-900 font-bold text-sm">
                {transferTargets.length > 1 ? transferTargets.map((v) => v.plate).join(', ') : `${transferOf?.plate} (Mã ${transferOf?.hnl})`}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block text-[11px]">Trạm hiện tại:</span>
              <span className="font-semibold text-gray-800">
                {transferOf ? orgName(transferOf.stationId) : ''}
              </span>
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>
              Trạm tiếp nhận (Trạm đích) <span className="text-red-500">*</span>
            </label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn trạm tiếp nhận --</option>
              {STATION_OPTIONS.filter((s) => s.id !== transferOf?.stationId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dịch vụ giữ lại tại trạm đích (UI-58 = dịch vụ của xe ∩ dịch vụ trạm đích) */}
          {transferTo && (
            <div>
              <label className={partnerLabelClass}>Dịch vụ giữ lại (Dịch vụ xe ∩ Trạm đích — UI-58)</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  'Xe hết pin',
                  'Kích bình ắc quy',
                  'Cẩu kéo xe tai nạn',
                  'Kéo xe ngập nước',
                  'Thay lốp dự phòng',
                ].map((srv) => (
                  <label key={srv} className="flex items-center gap-1.5 text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferServices.includes(srv)}
                      onChange={(e) => {
                        if (e.target.checked) setTransferServices([...transferServices, srv]);
                        else setTransferServices(transferServices.filter((s) => s !== srv));
                      }}
                      className="accent-[#00A859]"
                    />
                    <span>{srv}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                Chỉ các dịch vụ cả xe và trạm đích cùng hỗ trợ mới được giữ lại khi điều chuyển.
              </p>
            </div>
          )}

          {/* Cảnh báo tài xế (BR-15, FL-M2-05 BR-G06) */}
          {(transferOf?.driverIds?.length || transferOf?.driverId) && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <strong>Cảnh báo tài xế:</strong> Xe đang được ghép với tài xế ({driverNames(transferOf?.driverIds, transferOf?.driverId)}). Khi điều chuyển sang trạm mới, tất cả tài xế này sẽ <strong>tự động bị hủy ghép</strong> theo quy định BR-15.
              </div>
            </div>
          )}

          <div>
            <label className={partnerLabelClass}>Ngày về dự kiến (điều chuyển tạm, tùy chọn)</label>
            <input
              type="date"
              value={transferReturnAt}
              onChange={(e) => setTransferReturnAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-gray-400">Tới ngày về chỉ hiện cảnh báo, không tự chuyển xe về trạm gốc.</p>
          </div>
          <div>
            <label className={partnerLabelClass}>
              Lý do điều chuyển <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="VD: Cân đối nguồn lực theo yêu cầu cao điểm cứu hộ..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </PartnerModal>

      {/* DLG-11: MODAL ĐỔI TRẠNG THÁI XE */}
      <PartnerModal
        open={statusModalOpen}
        title={`Đổi trạng thái xe — ${selectedVehicleForStatus?.plate ?? ''}`}
        icon={<Clock size={20} />}
        onClose={() => setStatusModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveStatusModal}
              disabled={!statusFormValid}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Xác nhận đổi
            </button>
          </>
        )}
      >
        <div className="space-y-4 text-xs">
          <div>
            <span className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Trạng thái hiện tại:
            </span>
            <span className="font-bold text-gray-800 text-sm">
              {(() => {
                const s = selectedVehicleForStatus?.status ?? (selectedVehicleForStatus?.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
                if (s === 'READY') return 'Sẵn sàng';
                if (s === 'MAINTENANCE') return 'Đang sửa chữa';
                if (s === 'STOPPED') return 'Tạm dừng';
                if (s === 'WORKING') return 'Đang làm đơn';
                return 'Ngừng hoạt động';
              })()}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-gray-700 uppercase mb-2">
              Chọn trạng thái mới <span className="text-red-500">*</span>:
            </span>

            {/* Nếu xe đang Ngừng hoạt động (INACTIVE), chỉ hiện 1 thẻ Mở lại -> Sẵn sàng (UI-S10) */}
            {selectedVehicleForStatus?.status === 'INACTIVE' ? (
              <div className="max-w-xs">
                <label
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition ${
                    targetStatus === 'READY'
                      ? 'border-[#00A859] bg-green-50 text-[#00A859] font-bold shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetStatus"
                    value="READY"
                    checked={targetStatus === 'READY'}
                    onChange={() => setTargetStatus('READY')}
                    className="sr-only"
                  />
                  <span className="text-xs">Mở lại → Sẵn sàng</span>
                  <span className="text-[10px] font-normal text-gray-500">Khôi phục hoạt động cho phương tiện</span>
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {/* Sẵn sàng */}
                {(() => {
                  const currentEff = selectedVehicleForStatus?.status ?? (selectedVehicleForStatus?.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
                  const isCurrentReady = currentEff === 'READY';
                  return (
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                        isCurrentReady
                          ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-60 cursor-not-allowed'
                          : targetStatus === 'READY'
                          ? 'border-[#00A859] bg-green-50 text-[#00A859] font-bold shadow-sm cursor-pointer'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetStatus"
                        value="READY"
                        disabled={isCurrentReady}
                        checked={targetStatus === 'READY'}
                        onChange={() => setTargetStatus('READY')}
                        className="sr-only"
                      />
                      <span className="text-xs">Sẵn sàng</span>
                      <span className="text-[10px] font-normal text-gray-500 text-center mt-0.5">Sẵn sàng nhận cuốc cứu hộ</span>
                    </label>
                  );
                })()}

                {/* Tạm dừng */}
                {(() => {
                  const currentEff = selectedVehicleForStatus?.status ?? (selectedVehicleForStatus?.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
                  const isCurrentStopped = currentEff === 'STOPPED';
                  return (
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                        isCurrentStopped
                          ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-60 cursor-not-allowed'
                          : targetStatus === 'STOPPED'
                          ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold shadow-sm cursor-pointer'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetStatus"
                        value="STOPPED"
                        disabled={isCurrentStopped}
                        checked={targetStatus === 'STOPPED'}
                        onChange={() => setTargetStatus('STOPPED')}
                        className="sr-only"
                      />
                      <span className="text-xs">Tạm dừng</span>
                      <span className="text-[10px] font-normal text-gray-500 text-center mt-0.5">Tạm dừng nhận cuốc điều phối</span>
                    </label>
                  );
                })()}

                {/* Đang sửa chữa */}
                {(() => {
                  const currentEff = selectedVehicleForStatus?.status ?? (selectedVehicleForStatus?.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
                  const isCurrentMaint = currentEff === 'MAINTENANCE';
                  return (
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                        isCurrentMaint
                          ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-60 cursor-not-allowed'
                          : targetStatus === 'MAINTENANCE'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold shadow-sm cursor-pointer'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetStatus"
                        value="MAINTENANCE"
                        disabled={isCurrentMaint}
                        checked={targetStatus === 'MAINTENANCE'}
                        onChange={() => setTargetStatus('MAINTENANCE')}
                        className="sr-only"
                      />
                      <span className="text-xs">Đang sửa chữa</span>
                      <span className="text-[10px] font-normal text-gray-500 text-center mt-0.5">Đang bảo dưỡng, hỏng hóc</span>
                    </label>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Lý do khi Tạm dừng hoặc Sửa chữa */}
          {targetStatus !== 'READY' && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className={partnerLabelClass}>
                  Nhóm lý do <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetReasonCode}
                  onChange={(e) => setTargetReasonCode(e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Chọn nhóm lý do --</option>
                  {targetStatus === 'STOPPED' ? (
                    <>
                      <option value="NO_DRIVER">Thiếu tài xế</option>
                      <option value="SCHEDULED_REST">Nghỉ theo lịch</option>
                      <option value="DOC_EXPIRED">Hết hạn giấy tờ</option>
                      <option value="OTHER">Khác</option>
                    </>
                  ) : (
                    <>
                      <option value="ENGINE">Hỏng động cơ</option>
                      <option value="CRANE_SLIDE">Hỏng cẩu / sàn trượt</option>
                      <option value="TIRE">Hỏng lốp xe</option>
                      <option value="MAINTENANCE">Bảo dưỡng định kỳ</option>
                      <option value="ACCIDENT">Tai nạn va chạm</option>
                      <option value="OTHER">Khác</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={partnerLabelClass}>
                  Ghi chú chi tiết {targetReasonCode === 'OTHER' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={2}
                  value={targetReasonNote}
                  onChange={(e) => setTargetReasonNote(e.target.value)}
                  placeholder="Mô tả hiện trạng hoặc lý do cụ thể..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={partnerLabelClass}>
                  Thời gian dự kiến quay lại <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={targetReturnAt}
                  onChange={(e) => setTargetReturnAt(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </PartnerModal>

      {/* MODAL IMPORT EXCEL */}
      <PartnerModal
        open={importOpen}
        title="Import danh sách xe từ Excel"
        icon={<Download size={20} />}
        onClose={() => setImportOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={importRows.length === 0 || importRows.every((r) => r.error)}
              onClick={handleConfirmImport}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Nhập {importRows.filter((r) => !r.error).length} xe hợp lệ
            </button>
          </>
        )}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
              Chọn tệp Excel (.xlsx, .xls)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFileChange}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-[#00A859] hover:file:bg-green-100"
            />
            {importError && <p className="mt-1 text-red-500">{importError}</p>}
          </div>

          {importRows.length > 0 && (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Biển số</th>
                    <th className="p-2 text-left">Loại</th>
                    <th className="p-2 text-left">Trạm</th>
                    <th className="p-2 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importRows.map((r, i) => (
                    <tr key={i} className={r.error ? 'bg-red-50/50' : ''}>
                      <td className="p-2 font-bold">{r.plate}</td>
                      <td className="p-2">{VEHICLE_TYPE_LABEL[r.type]}</td>
                      <td className="p-2">{orgName(r.stationId) || '—'}</td>
                      <td className="p-2">
                        {r.error ? (
                          <span className="text-red-600 font-bold">{r.error}</span>
                        ) : (
                          <span className="text-[#00A859] font-bold">Hợp lệ</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PartnerModal>

      <PartnerModal
        open={!!assignOf}
        title={`Gán tài xế — ${assignOf?.plate ?? ''}`}
        icon={<UserPlus size={20} />}
        onClose={() => setAssignOf(null)}
        footer={(
          <>
            <button type="button" onClick={() => setAssignOf(null)} className={partnerBtnNeutral}>Hủy</button>
            <button type="button" disabled={!assignLead} onClick={confirmAssign} className={`${partnerBtnBrand} disabled:opacity-50`}>Lưu gán tài xế</button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className={partnerLabelClass}>Tài xế quản lý</label>
            <select value={assignLead} onChange={(e) => setAssignLead(e.target.value)} className={inputClass}>
              <option value="">Chọn tài xế</option>
              {PARTNER_STAFF.filter((s) => (s.role === 'NVCH' || s.role === 'GDTT') && (!assignOf || s.stationId === assignOf.stationId)).map((s) => (
                <option key={s.id} value={s.id}>{s.fullname}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={partnerLabelClass}>Tài xế quản lý phụ</label>
            <select value={assignDeputy} onChange={(e) => setAssignDeputy(e.target.value)} className={inputClass}>
              <option value="">Không chọn</option>
              {PARTNER_STAFF.filter((s) => (s.role === 'NVCH' || s.role === 'GDTT') && s.id !== assignLead && (!assignOf || s.stationId === assignOf.stationId)).map((s) => (
                <option key={s.id} value={s.id}>{s.fullname}</option>
              ))}
            </select>
          </div>
        </div>
      </PartnerModal>

      <PartnerModal
        open={bulkStopOpen}
        title="Ngừng hàng loạt"
        icon={<AlertTriangle size={20} className="text-red-500" />}
        onClose={() => setBulkStopOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setBulkStopOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button type="button" onClick={confirmBulkStop} className="flex-1 inline-flex items-center justify-center min-h-12 px-4 rounded-xl border-0 bg-[#da2c39] text-base font-semibold text-white">Ngừng hoạt động</button>
          </>
        )}
      >
        <p className="text-sm text-gray-700">
          Ngừng {visible.filter((v) => selectedIds.includes(v.id) && v.status !== 'WORKING' && v.status !== 'INACTIVE').length} xe đã chọn. Xe đang làm đơn được giữ nguyên.
        </p>
      </PartnerModal>
    </div>
  );
};

export default PartnerVehicleList;

const FilterSelect: React.FC<{ label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <label className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
    {label}
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 truncate rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[12px] font-semibold normal-case tracking-normal text-gray-800 outline-none focus:border-[#0E8F47]">
      {children}
    </select>
  </label>
);
