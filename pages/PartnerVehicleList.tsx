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
  RotateCcw,
  Search,
  Trash2,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
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
  VEHICLE_TYPE_LABEL,
  driverName,
  driverNames,
  inScope,
  nextHnl,
  orgName,
  registerTransfer,
  registerVehicle,
  toolsFor,
  updateVehicle,
  type PartnerPersona,
  type VehicleRecord,
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
      const plate = cell(row, 'Biển số', 'Bien so', 'plate');
      const type = parseType(cell(row, 'Loại xe', 'Loai xe'));
      const stationId = parseStation(cell(row, 'Trạm', 'Tram'));
      const runRaw = cell(row, 'Tình trạng', 'Tinh trang').toLowerCase();
      const runStatus: VehicleRecord['runStatus'] =
        runRaw.includes('sửa') || runRaw === 'repair' ? 'repair' : 'active';
      const year = Number(cell(row, 'Năm SX', 'Nam SX')) || new Date().getFullYear();
      let error = '';
      if (!plate) error = 'Thiếu biển số';
      else if (existingPlates.has(plate.toLowerCase())) error = 'Biển số đã tồn tại';
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

  // DLG-02: Điều chuyển xe
  const [transferOf, setTransferOf] = useState<VehicleRecord | null>(null);
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

    if (appliedFilters.plate.trim()) {
      rows = rows.filter((v) => v.plate.toLowerCase().includes(appliedFilters.plate.trim().toLowerCase()));
    }
    if (appliedFilters.hnlCode.trim()) {
      rows = rows.filter((v) => String(v.hnl).toUpperCase().includes(appliedFilters.hnlCode.trim().toUpperCase()));
    }
    if (appliedFilters.modelLine.trim()) {
      rows = rows.filter(
        (v) =>
          v.modelLine.toLowerCase().includes(appliedFilters.modelLine.trim().toLowerCase()) ||
          v.brand.toLowerCase().includes(appliedFilters.modelLine.trim().toLowerCase())
      );
    }
    if (appliedFilters.stationId) {
      rows = rows.filter((v) => v.stationId === appliedFilters.stationId);
    }
    if (appliedFilters.type) {
      rows = rows.filter((v) => v.type === appliedFilters.type);
    }
    if (appliedFilters.statusFilter) {
      rows = rows.filter((v) => {
        const effectiveStatus = v.status ?? (v.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
        if (appliedFilters.statusFilter === 'READY') return effectiveStatus === 'READY';
        if (appliedFilters.statusFilter === 'MAINTENANCE') return effectiveStatus === 'MAINTENANCE';
        if (appliedFilters.statusFilter === 'STOPPED') return effectiveStatus === 'STOPPED';
        if (appliedFilters.statusFilter === 'WORKING') return effectiveStatus === 'WORKING';
        if (appliedFilters.statusFilter === 'INACTIVE') return effectiveStatus === 'INACTIVE';
        return true;
      });
    }

    if (listTab === 'due') {
      rows = rows.filter(
        (v) =>
          v.inspectionDueDays <= 30 ||
          v.gplhDueDays <= 30 ||
          v.tndsDueDays <= 30
      );
    }
    if (listTab === 'tools') rows = rows.filter((v) => v.tools.some((t) => !toolReady(t)));
    if (listTab === 'signal_lost') {
      rows = rows.filter((v) => {
        const gps = gpsData[v.id];
        return !!gps?.signal.signalLost;
      });
    }

    return rows;
  }, [persona, appliedFilters, listTab, vehicles, gpsData]);

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
        address: orgName(v.stationId),
      },
    };
  };

  // DLG-02 Handlers
  const handleOpenTransfer = (v: VehicleRecord) => {
    setTransferOf(v);
    setTransferTo('');
    setTransferReason('');
    setTransferReturnAt('');
    setTransferServices(['Xe hết pin', 'Kích bình ắc quy']);
  };

  const closeTransfer = () => {
    setTransferOf(null);
    setTransferTo('');
    setTransferReason('');
  };

  const confirmTransfer = () => {
    if (!transferOf || !transferTo || !transferReturnValid) return;
    const returnNote = transferReturnAt ? ` · về dự kiến ${new Date(transferReturnAt).toLocaleDateString('vi-VN')}` : '';
    registerTransfer({
      id: `t-${Date.now()}`,
      vehicleId: transferOf.id,
      fromStationId: transferOf.stationId,
      toStationId: transferTo,
      transferredAt: new Date().toLocaleString('vi-VN'),
      byName: persona.title,
      reason: (transferReason || 'Điều chuyển trạm') + returnNote,
    });
    // BR-15: mọi tài xế đang ghép tự gỡ
    updateVehicle(transferOf.id, { stationId: transferTo, driverId: null, driverIds: [] });
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === transferOf.id ? { ...v, stationId: transferTo, driverId: null, driverIds: [] } : v
      )
    );
    triggerToast(`Đã điều chuyển xe ${transferOf.plate} tới ${orgName(transferTo)}`);
    closeTransfer();
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
  const handleExportExcel = () => {
    const data = scoped.map((v, i) => ({
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
        const existingPlates = new Set(vehicles.map((v) => v.plate.toLowerCase()));
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

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-black text-gray-800 uppercase tracking-tight">
          Danh sách phương tiện
        </h1>
      </div>

      <PartnerScopeBar persona={persona} onChange={setPersona} />
      {/* KHỐI 1: TRA CỨU (Khớp ảnh 1.1) */}
      <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
        <SectionHeader title="Tra cứu" icon={<Search size={16} />} />
        <div className="p-4 sm:p-5">
          {/* Row 1: Biển số, Mã xe, Trạm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs font-semibold text-gray-600">Biển số</label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="29C-123.45"
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs font-semibold text-gray-600">Mã xe</label>
              <input
                type="text"
                value={hnlCode}
                onChange={(e) => setHnlCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="21"
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs font-semibold text-gray-600">Trạm</label>
              <select value={stationId} onChange={(e) => setStationId(e.target.value)} className={fieldClass}>
                <option value="">Tất cả</option>
                {STATION_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Loại xe, Tình trạng, Dòng xe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs font-semibold text-gray-600">Loại xe</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
                <option value="">Tất cả</option>
                {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((t) => (
                  <option key={t} value={t}>
                    {VEHICLE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs font-semibold text-gray-600">Tình trạng</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={fieldClass}
              >
                <option value="">Tất cả</option>
                <option value="READY">Sẵn sàng</option>
                <option value="WORKING">Đang làm đơn</option>
                <option value="STOPPED">Tạm dừng</option>
                <option value="MAINTENANCE">Đang sửa chữa</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 shrink-0 text-xs font-semibold text-gray-600">Dòng xe</label>
              <input
                type="text"
                value={modelLine}
                onChange={(e) => setModelLine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="NPR 400"
                className={fieldClass}
              />
            </div>
          </div>

          {/* Action Row: Left buttons (Xuất Excel, Import Excel, + Thêm xe), Right chips & Đặt lại / Tìm kiếm */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 w-full lg:w-auto">
              {/* Xuất / Import Excel ẩn ở T10 (DR-53) */}
              {canEditVehicle && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/partner/vehicles/new')}
                    className="flex items-center gap-1.5 bg-[#00A859] text-white px-3.5 py-2 rounded font-bold text-xs hover:bg-green-700 transition shadow-sm"
                  >
                    <Plus size={15} />
                    <span>+ Thêm xe</span>
                  </button>
                </>
              )}
            </div>

            {/* Chips & Nút Đặt lại & Nút Tìm kiếm */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setListTab('all')}
                className={filterBtnClass(listTab === 'all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setListTab(listTab === 'due' ? 'all' : 'due')}
                className={filterBtnClass(listTab === 'due')}
              >
                Nhắc hạn
              </button>
              <button
                type="button"
                onClick={() => setListTab(listTab === 'tools' ? 'all' : 'tools')}
                className={filterBtnClass(listTab === 'tools')}
              >
                Công cụ lỗi
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3.5 py-1.5 rounded font-bold text-xs transition shadow-sm ml-1"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw size={14} />
                <span>Đặt lại</span>
              </button>

              <button
                type="button"
                onClick={handleSearch}
                className="flex items-center gap-1.5 bg-[#00A859] text-white px-4 py-1.5 rounded font-bold text-xs hover:bg-green-700 transition shadow-sm"
              >
                <Search size={14} />
                <span>Tìm kiếm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KHỐI 2: KẾT QUẢ TÌM KIẾM (Khớp ảnh 1.1) */}
      <div className="border rounded-lg shadow-sm bg-white w-full min-w-0 overflow-hidden">
        <SectionHeader
          title={`KẾT QUẢ TÌM KIẾM (${scoped.length})`}
          rightNode={
            <span className="text-[11px] font-normal lowercase tracking-normal">
              Hiển thị phân trang 10 / 20 / 50 xe
            </span>
          }
        />
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1080px]">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="px-2.5 py-2.5 text-center w-10 font-bold border-r">STT</th>
                <th className="px-2.5 py-2.5 text-center w-24 font-bold border-r">Thao tác</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Xe</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Vị trí gần nhất</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Trạm</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Loại</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Tải trọng</th>
                <th className="px-3 py-2.5 text-center font-bold border-r">Ngày đăng ký</th>
                <th className="px-3 py-2.5 text-left font-bold border-r">Tài xế</th>
                <th className="px-2.5 py-2.5 text-center font-bold border-r">Tình trạng</th>
                <th className="px-2.5 py-2.5 text-left font-bold border-r">Nhắc hạn</th>
                <th className="px-2.5 py-2.5 text-left font-bold">Công cụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scoped.map((v, index) => {
                // Chỉ giấy tờ bắt buộc (FL-M1-01 BR-18)
                const worstDue = Math.min(v.inspectionDueDays, v.gplhDueDays, v.tndsDueDays);
                const brokenTools = v.tools.filter((t) => !toolReady(t));
                const brokenCount = brokenTools.length;
                const gps = getGpsStatusForVehicle(v);

                const statusLabel =
                  v.status === 'READY' || (!v.status && v.runStatus === 'active')
                    ? 'Sẵn sàng'
                    : v.status === 'MAINTENANCE' || (!v.status && v.runStatus === 'repair')
                    ? 'Đang sửa chữa'
                    : v.status === 'STOPPED'
                    ? 'Tạm dừng'
                    : v.status === 'WORKING'
                    ? 'Đang làm đơn'
                    : 'Ngừng hoạt động';

                const statusBadgeStyle =
                  statusLabel === 'Sẵn sàng'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : statusLabel === 'Đang sửa chữa'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : statusLabel === 'Tạm dừng'
                    ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                    : statusLabel === 'Đang làm đơn'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';

                return (
                  <tr key={v.id} className="hover:bg-gray-50/80 align-top transition-colors">
                    {/* STT */}
                    <td className="px-2.5 py-3 text-center border-r text-gray-500 font-medium">
                      {index + 1}
                    </td>

                    {/* Thao tác: ⇄ Điều chuyển, ⓘ Chi tiết (Khớp ảnh 1.1) */}
                    <td className="px-2.5 py-3 border-r">
                      <div className="flex items-center justify-center gap-2">
                        {canTransferVehicle(v) && (
                          <button
                            type="button"
                            onClick={() => handleOpenTransfer(v)}
                            className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition"
                            title="Điều chuyển xe (DLG-02)"
                          >
                            <ArrowRightLeft size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDetail(v.id)}
                          className="text-amber-500 hover:bg-amber-50 p-1 rounded transition"
                          title="Xem chi tiết xe (SCR-02)"
                        >
                          <Info size={16} />
                        </button>
                      </div>
                    </td>

                    {/* Xe: Biển số (click mở chi tiết) & Mã xe · Hãng Dòng */}
                    <td className="px-3 py-3 border-r">
                      <button
                        type="button"
                        onClick={() => openDetail(v.id)}
                        className="font-bold text-gray-900 hover:text-[#00A859] transition-colors text-xs text-left"
                      >
                        {v.plate}
                      </button>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Mã {v.hnl} · {v.brand} {v.modelLine}
                      </div>
                    </td>

                    {/* Vị trí gần nhất (UI-09.6, BR-17: luôn hiển thị, Cập nhật N phút trước) */}
                    <td className="px-3 py-3 border-r">
                      <div className="font-medium text-gray-800 text-[11px] truncate max-w-[170px]" title={gps.signal.address || orgName(v.stationId)}>
                        {gps.signal.address || orgName(v.stationId)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${gps.signal.signalLost ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] text-gray-500">
                          {gps.signal.signalLost ? 'Mất tín hiệu' : 'Cập nhật 5 phút trước'}
                        </span>
                      </div>
                    </td>

                    {/* Trạm (UI-09.4: nếu có điều chuyển tạm thì hiện "từ {trạm gốc}, về dd/mm") */}
                    <td className="px-3 py-3 border-r font-medium text-gray-700">
                      <div>{orgName(v.stationId)}</div>
                      {v.expectedReturnAt && (
                        <div className="text-[10px] text-amber-600 mt-0.5 font-normal">
                          về {new Date(v.expectedReturnAt).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>

                    {/* Loại xe */}
                    <td className="px-3 py-3 border-r text-gray-600">
                      {VEHICLE_TYPE_LABEL[v.type]}
                    </td>

                    {/* Tải trọng */}
                    <td className="px-3 py-3 border-r text-gray-700">
                      <div className="font-semibold">{v.loadCarry || '—'}</div>
                      {v.loadCrane && v.loadCrane !== '—' && (
                        <div className="text-[10px] text-gray-400">Cẩu: {v.loadCrane}</div>
                      )}
                    </td>

                    {/* Ngày đăng ký */}
                    <td className="px-3 py-3 border-r text-center font-mono text-gray-700">
                      {v.registrationDate || '—'}
                    </td>

                    {/* Tài xế */}
                    <td className="px-3 py-3 border-r text-gray-800 font-medium">
                      {driverNames(v.driverIds, v.driverId)}
                    </td>

                    {/* Tình trạng: Badge click mở DLG-11 + Cảnh báo quá hạn dự kiến */}
                    <td className="px-2.5 py-3 border-r text-center">
                      <button
                        type="button"
                        disabled={!canChangeStatusOf(v)}
                        onClick={() => canChangeStatusOf(v) && handleOpenStatusModal(v)}
                        className={`inline-flex flex-col items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${statusBadgeStyle}`}
                        title={canChangeStatusOf(v) ? 'Bấm để đổi trạng thái xe (DLG-11)' : 'Chỉ xem'}
                      >
                        <span>{statusLabel}</span>
                      </button>
                      {v.expectedReturnAt && (
                        <div className="text-[9px] text-gray-400 mt-0.5">
                          Dự kiến: {v.expectedReturnAt.split(' ')[0]}
                        </div>
                      )}
                    </td>

                    {/* Nhắc hạn (UI-09.9, BR-18: Quá hạn màu đỏ, Sắp hết hạn màu cam, Thiếu màu xám) */}
                    <td className="px-2.5 py-3 border-r">
                      {worstDue < 0 ? (
                        <span className="font-bold text-red-600">
                          Quá hạn {Math.abs(worstDue)} ngày
                        </span>
                      ) : worstDue <= 30 ? (
                        <span className="font-bold text-amber-600">
                          Còn {worstDue} ngày
                        </span>
                      ) : (
                        <span className="text-gray-600 font-medium">
                          Còn {worstDue} ngày
                        </span>
                      )}
                    </td>

                    {/* Công cụ: OK hoặc {n} món lỗi có tooltip */}
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
              {scoped.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-gray-400">
                    Không tìm thấy phương tiện nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DLG-02: MODAL ĐIỀU CHUYỂN XE */}
      <PartnerModal
        open={!!transferOf}
        title={`Điều chuyển xe — ${transferOf?.plate ?? ''}`}
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
                {transferOf?.plate} (Mã {transferOf?.hnl})
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
    </div>
  );
};

export default PartnerVehicleList;
