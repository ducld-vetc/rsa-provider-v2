import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Copy,
  DollarSign,
  Download,
  Eye,
  FileText,
  History,
  Image as ImageIcon,
  Info,
  Layers,
  Lock,
  MapPin,
  Navigation,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  Trash2,
  Truck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import {
  FileDrop,
  PartnerModal,
  partnerBtnBrand,
  partnerBtnDanger,
  partnerBtnNeutral,
  partnerInputClass as inputClass,
  partnerLabelClass,
} from '../components/PartnerModal';
import {
  IMEI_OPTIONS,
  PARTNER_STAFF,
  STATION_OPTIONS,
  TOOL_CATALOG,
  MASTER_TOOL_CATALOG,
  SERVICE_REQUIRED_TOOLS,
  VEHICLES,
  VEHICLE_AUDIT_LOGS,
  VEHICLE_DOCUMENTS,
  VEHICLE_PAIRING_HISTORY,
  VEHICLE_PHOTOS,
  VEHICLE_TRANSFER_HISTORY,
  VEHICLE_TYPE_LABEL,
  driverName,
  driverNames,
  driversAtStation,
  dueBadge,
  formatVnd,
  inScope,
  nextHnl,
  orgName,
  registerTransfer,
  registerVehicle,
  saveVehicleMedia,
  toolsFor,
  updateVehicle,
  standardQtyOf,
  type PartnerPersona,
  type VehicleAuditLog,
  type VehicleDocument,
  type VehicleDriverPairing,
  type VehiclePhoto,
  type VehicleRecord,
  type VehicleToolItem,
  type VehicleTransferHistory,
  TOOL_CONDITION_LABEL,
  toolConditionOf,
  toolQtyOf,
  toolReady,
} from '../data/partnerRescueMockData';
import RescueOrderGpsJourney from '../shared/RescueOrderGpsJourney';
import MapSelectionModal from '../shared/MapSelectionModal';
import { INITIAL_VEHICLE_GPS_DATA, type VehicleGpsStatus } from '../data/gpsTrackingMockData';

const Section: React.FC<{
  title: string;
  number: number;
  icon?: React.ReactNode;
  rightNode?: React.ReactNode;
  flush?: boolean;
  children: React.ReactNode;
}> = ({ title, number, icon, rightNode, flush, children }) => (
  <section className="relative rounded-lg border bg-white shadow-sm mb-4">
    <div className="flex items-center justify-between rounded-t-lg bg-[#00A859] px-4 py-2.5 text-sm font-bold text-white">
      <div className="flex items-center space-x-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">
          {number}
        </span>
        <span>{title}</span>
      </div>
      {rightNode || (icon && <div className="opacity-80">{icon}</div>)}
    </div>
    <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
  </section>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-3 text-[11px] font-bold uppercase text-gray-600">
    {children}
  </h3>
);

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({
  children,
  required,
}) => (
  <label className="mb-1 flex items-center text-[11px] font-bold uppercase text-gray-600">
    {children}
    {required && <span className="ml-0.5 text-red-500">*</span>}
  </label>
);

const fieldControlClass = (locked: boolean) =>
  `w-full border rounded px-3 py-1.5 text-xs outline-none focus:border-[#00A859] transition-all placeholder:text-gray-400 disabled:cursor-not-allowed ${
    locked ? 'bg-gray-50 text-gray-600 cursor-default border-gray-200' : 'bg-white text-gray-800'
  }`;

const VEHICLE_SERVICES = [
  'Xe hết pin',
  'Kích bình ắc quy',
  'Cẩu kéo xe tai nạn',
  'Kéo xe ngập nước',
  'Thay lốp dự phòng',
  'Cẩu xe kẹt số P',
  'Tiếp nhiên liệu',
];

const emptyDoc = { name: '', type: 'Đăng kiểm', number: '', issuedAt: '', expiryAt: '', fileName: '', fileUrl: '' };

/** Giấy tờ bắt buộc có nhắc hạn (FL-M1-01 BR-13, BR-18); BH vật chất tùy chọn */
const REQUIRED_VEHICLE_DOCS = ['Đăng kiểm', 'BH TNDS', 'GPLH'];

const docDaysLeft = (expiryAt: string) => {
  const m = expiryAt?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

/** Loại lịch sử xe để lọc (FL-M1-01 khối ④, UI-26, UI-26.1) */
const AUDIT_FILTERS: { key: string; label: string; codes: string[] }[] = [
  { key: 'ALL', label: 'Tất cả', codes: [] },
  { key: 'RESCUE', label: 'Cứu hộ', codes: ['RESCUE'] },
  { key: 'STATUS', label: 'Đổi trạng thái', codes: ['STATUS'] },
  { key: 'LIFECYCLE', label: 'Tạo / Vô hiệu', codes: ['INACTIVE', 'CREATE'] },
  { key: 'TRANSFER', label: 'Điều chuyển', codes: ['TRANSFER'] },
  { key: 'DRIVER', label: 'Ghép tài xế', codes: ['DRIVER', 'PAIR', 'UNPAIR'] },
  { key: 'DOC', label: 'Giấy tờ', codes: ['UPDATE_DOC', 'FILE'] },
  { key: 'TOOLS', label: 'Công cụ', codes: ['TOOLS', 'TOOL'] },
  { key: 'UPDATE', label: 'Hồ sơ', codes: ['UPDATE'] },
];

const PartnerVehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreate = id === 'new' || location.pathname === '/partner/vehicles/new' || location.pathname.endsWith('/vehicles/new');
  const isEditRoute = location.pathname.endsWith('/edit');
  const [editing, setEditing] = useState(isCreate || isEditRoute);

  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const [record, setRecord] = useState(() => (isCreate ? undefined : VEHICLES.find((v) => v.id === id)));

  // Tools, Documents, Photos, History
  const [tools, setTools] = useState<VehicleToolItem[]>(
    isCreate ? toolsFor('san_truot') : record?.tools ?? toolsFor('san_truot')
  );
  const [docs, setDocs] = useState<VehicleDocument[]>(
    isCreate ? [] : VEHICLE_DOCUMENTS[id ?? ''] ?? []
  );
  const [photos, setPhotos] = useState<VehiclePhoto[]>(
    isCreate ? [] : VEHICLE_PHOTOS[id ?? ''] ?? []
  );
  const [history, setHistory] = useState<VehicleTransferHistory[]>(
    isCreate ? [] : VEHICLE_TRANSFER_HISTORY.filter((t) => t.vehicleId === id)
  );
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditLogs, setAuditLogs] = useState<VehicleAuditLog[]>(
    isCreate ? [] : VEHICLE_AUDIT_LOGS[id ?? ''] ?? []
  );
  const [pairings, setPairings] = useState<VehicleDriverPairing[]>(
    isCreate ? [] : VEHICLE_PAIRING_HISTORY[id ?? ''] ?? []
  );

  // Form edit fields
  const [editForm, setEditForm] = useState({
    plate: isCreate ? '' : (record?.plate ?? ''),
    hnl: isCreate ? String(nextHnl(VEHICLES)) : String(record?.hnl ?? ''),
    brand: (isCreate ? 'Isuzu' : (record?.brand ?? 'Isuzu')) as VehicleRecord['brand'],
    modelLine: isCreate ? '' : (record?.modelLine ?? ''),
    chassis: isCreate ? '' : (record?.chassis ?? ''),
    engineNo: isCreate ? '' : (record?.engineNo ?? ''),
    year: isCreate ? '' : String(record?.year ?? ''),
    registrationDate: isCreate ? '' : (record?.registrationDate ?? ''),
    driverId: isCreate ? '' : (record?.driverId ?? ''),
    driverIds: isCreate ? [] : (record?.driverIds ?? (record?.driverId ? [record.driverId] : [])),
    stationId: isCreate ? 'tt-hm' : (record?.stationId ?? 'tt-hm'),
    type: (isCreate ? 'san_truot_cau' : (record?.type ?? 'san_truot_cau')) as VehicleRecord['type'],
    loadCarry: isCreate ? '' : (record?.loadCarry ?? ''),
    loadCrane: isCreate ? '' : (record?.loadCrane ?? ''),
    loadLift: isCreate ? '' : (record?.loadLift ?? ''),
    seats: isCreate ? '' : (record?.seats ?? ''),
    status: (isCreate ? 'READY' : (record?.status ?? (record?.runStatus === 'repair' ? 'MAINTENANCE' : 'READY'))) as VehicleRecord['status'],
    revenueMonth: isCreate ? 0 : (record?.revenueMonth ?? 48_500_000),
    services: isCreate ? [] : (record?.services ?? []),
  });
  const [parkAddress, setParkAddress] = useState(isCreate ? '' : (record?.parkAddress ?? ''));
  const [parkCoords, setParkCoords] = useState(isCreate ? '' : (record?.parkCoords ?? ''));
  const [parkCopied, setParkCopied] = useState(false);
  const [parkMapOpen, setParkMapOpen] = useState(false);
  const [driverDropOpen, setDriverDropOpen] = useState(false);
  const driverBtnRef = useRef<HTMLButtonElement>(null);
  const [driverMenuPos, setDriverMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Modals state
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferReturnAt, setTransferReturnAt] = useState('');

  const [inactivateOpen, setInactivateOpen] = useState(false);
  const [inactivateReason, setInactivateReason] = useState('Thanh lý xe');
  const [inactivateNote, setInactivateNote] = useState('');

  const [statusOpen, setStatusOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'READY' | 'STOPPED' | 'MAINTENANCE'>('READY');
  const [statusReasonCode, setStatusReasonCode] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusReturnAt, setStatusReturnAt] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const STATUS_TEXT: Record<string, string> = { READY: 'Sẵn sàng', WORKING: 'Đang làm đơn', STOPPED: 'Tạm dừng', MAINTENANCE: 'Đang sửa chữa', INACTIVE: 'Ngừng hoạt động' };
  // VAL-S01..S03: lý do, dự kiến quay lại (> hiện tại, ≤ 90 ngày), ghi chú khi Khác
  const statusFormValid = (() => {
    if (targetStatus === 'READY') return true;
    if (!statusReasonCode || !statusReturnAt) return false;
    const t = new Date(statusReturnAt).getTime();
    if (Number.isNaN(t) || t <= Date.now() || t > Date.now() + 90 * 86400000) return false;
    if (statusReasonCode === 'OTHER' && statusNote.trim().length < 5) return false;
    return true;
  })();
  // VAL-16: ngày về dự kiến > hôm nay (nếu nhập)
  const transferReturnValid = !transferReturnAt || new Date(transferReturnAt).getTime() > new Date().setHours(23, 59, 59, 999);

  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [selectedDriverIdsForPair, setSelectedDriverIdsForPair] = useState<string[]>([]);
  const [pairConfirmWarning, setPairConfirmWarning] = useState(false);

  const [unpairModalOpen, setUnpairModalOpen] = useState(false);
  const [selectedDriverIdsToUnpair, setSelectedDriverIdsToUnpair] = useState<string[]>([]);
  const [unpairReason, setUnpairReason] = useState('Chuyển xe khác / đổi ca trực');
  const [unpairNote, setUnpairNote] = useState('');

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [docFile, setDocFile] = useState<File | null>(null);

  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [tempTools, setTempTools] = useState<VehicleToolItem[]>([]);
  const [selectedToolToAdd, setSelectedToolToAdd] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VehicleDocument | null>(null);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoLabel, setPhotoLabel] = useState('Góc trước');

  // Camera hành trình & Clip theo chuyến (FL-M6-06 UI-C01, UI-C10)
  const [journeyTab, setJourneyTab] = useState<'gps' | 'camera'>('gps');
  const [selectedCameraClip, setSelectedCameraClip] = useState<{
    id: string;
    title: string;
    orderCode: string;
    startTime: string;
    endTime: string;
    duration: string;
    fileSize: string;
    status: 'AVAILABLE' | 'DISCONNECTED';
  } | null>(null);
  const [isClipPlaying, setIsClipPlaying] = useState(true);
  const [clipSpeed, setClipSpeed] = useState(1);
  const [cameraConnStatus, setCameraConnStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('CONNECTED');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (isCreate) {
      setEditing(true);
      setRecord(undefined);
      setEditForm({
        plate: '',
        hnl: String(nextHnl(VEHICLES)),
        brand: 'Isuzu',
        modelLine: '',
        chassis: '',
        engineNo: '',
        year: '',
        registrationDate: '',
        driverId: '',
        driverIds: [],
        stationId: 'tt-hm',
        type: 'san_truot_cau',
        loadCarry: '',
        loadCrane: '',
        loadLift: '',
        seats: '',
        status: 'READY',
        revenueMonth: 0,
        services: [],
      });
      setParkAddress('');
      setParkCoords('');
      setDriverDropOpen(false);
      setTools(toolsFor('san_truot_cau'));
      setDocs([]);
      setPhotos([]);
    } else {
      const found = VEHICLES.find((v) => v.id === id);
      setRecord(found);
      setEditing(isEditRoute);
      if (found) {
        setEditForm({
          plate: found.plate,
          hnl: String(found.hnl ?? ''),
          brand: found.brand,
          modelLine: found.modelLine,
          chassis: found.chassis,
          engineNo: found.engineNo,
          year: String(found.year),
          registrationDate: found.registrationDate ?? '',
          driverId: found.driverId ?? '',
          driverIds: found.driverIds ?? (found.driverId ? [found.driverId] : []),
          stationId: found.stationId,
          type: found.type,
          loadCarry: found.loadCarry,
          loadCrane: found.loadCrane,
          loadLift: found.loadLift,
          seats: found.seats,
          status: found.status ?? (found.runStatus === 'repair' ? 'MAINTENANCE' : 'READY'),
          revenueMonth: found.revenueMonth,
          services: found.services ?? ['Xe hết pin', 'Kích bình ắc quy', 'Cẩu kéo xe tai nạn', 'Kéo xe ngập nước'],
        });
        setTools(found.tools ?? toolsFor(found.type));
        setDocs(VEHICLE_DOCUMENTS[found.id] ?? []);
        setPhotos(VEHICLE_PHOTOS[found.id] ?? []);
        setHistory(VEHICLE_TRANSFER_HISTORY.filter((t) => t.vehicleId === found.id));
        setAuditLogs(VEHICLE_AUDIT_LOGS[found.id] ?? []);
        setPairings(VEHICLE_PAIRING_HISTORY[found.id] ?? []);
        setParkAddress(found.parkAddress ?? '');
        setParkCoords(found.parkCoords ?? '');
      }
    }
  }, [id, isCreate, isEditRoute]);

  useEffect(() => {
    if (!driverDropOpen) return;
    const close = () => setDriverDropOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [driverDropOpen]);

  const vehicle: VehicleRecord = record ?? {
    id: 'new',
    plate: editForm.plate || 'Chưa đặt biển số',
    hnl: isCreate ? 0 : nextHnl(VEHICLES),
    brand: editForm.brand,
    modelLine: editForm.modelLine,
    chassis: editForm.chassis,
    engineNo: editForm.engineNo,
    year: Number(editForm.year) || new Date().getFullYear(),
    registrationDate: editForm.registrationDate || undefined,
    stationId: editForm.stationId,
    driverId: editForm.driverIds[0] ?? editForm.driverId ?? null,
    driverIds: editForm.driverIds,
    type: editForm.type,
    loadCarry: editForm.loadCarry,
    loadCrane: editForm.loadCrane,
    loadLift: editForm.loadLift,
    seats: editForm.seats,
    runStatus: editForm.status === 'MAINTENANCE' ? 'repair' : 'active',
    status: editForm.status,
    services: editForm.services,
    idleHours: 0,
    inspectionDueDays: 365,
    maintenanceDueDays: 30,
    gplhDueDays: 365,
    tndsDueDays: 365,
    physicalInsDueDays: 365,
    tools,
    revenueMonth: isCreate ? 0 : editForm.revenueMonth,
  };

  const brokenTools = tools.filter((t) => !toolReady(t));

  // BR-T05 & UI-T21: Xét xe đủ công cụ cho các dịch vụ xe đã đăng ký
  const missingForServices = useMemo(() => {
    const list: string[] = [];
    const vehicleServices = vehicle.services || [];
    vehicleServices.forEach((srvId) => {
      const rule = SERVICE_REQUIRED_TOOLS.find((r) => r.serviceId === srvId);
      if (!rule || rule.requiredTools.length === 0) return;
      const missingDetails: string[] = [];
      rule.requiredTools.forEach((req) => {
        const cat = MASTER_TOOL_CATALOG.find((c) => c.id === req.toolId);
        const toolName = cat?.name;
        if (!toolName) return;
        const vehicleTool = tools.find((t) => t.name.toLowerCase() === toolName.toLowerCase());
        if (!vehicleTool) {
          missingDetails.push(`thiếu ${toolName}`);
        } else if (!toolReady(vehicleTool)) {
          missingDetails.push(`${toolName} (${toolConditionOf(vehicleTool) === 'BROKEN' ? 'hỏng' : 'thiếu'})`);
        } else if (toolQtyOf(vehicleTool) < req.minQuantity) {
          missingDetails.push(`${toolName} có ${toolQtyOf(vehicleTool)}/${req.minQuantity}`);
        }
      });
      if (missingDetails.length > 0) {
        list.push(`${rule.serviceName} (${missingDetails.join(', ')})`);
      }
    });
    return list;
  }, [vehicle.services, tools]);
  // FDD FL-M1-01 A4.1/A4.2: ẩn hiện hành động theo quyền + trạng thái xe
  const shownAuditLogs = auditFilter === 'ALL'
    ? auditLogs
    : auditLogs.filter((l) => (AUDIT_FILTERS.find((x) => x.key === auditFilter)?.codes ?? []).includes(l.actionCode));
  const effStatus = vehicle.status ?? (vehicle.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
  const editableRole = persona.role !== 'NVCH' && persona.role !== 'KT';
  const isInactive = effStatus === 'INACTIVE';
  const canEditVehicle = editableRole && !isInactive;
  const canTransferVehicle = canEditVehicle && persona.stationIds.length !== 1;
  const canChangeStatus = editableRole && effStatus !== 'WORKING';
  const canPair = canEditVehicle;

  const assignedDriverIds = useMemo(() => {
    if (vehicle.driverIds && vehicle.driverIds.length > 0) return vehicle.driverIds;
    return vehicle.driverId ? [vehicle.driverId] : [];
  }, [vehicle.driverIds, vehicle.driverId]);

  const currentDrivers = useMemo(() => {
    return PARTNER_STAFF.filter((s) => assignedDriverIds.includes(s.id));
  }, [assignedDriverIds]);

  const currentDriver = currentDrivers[0];

  const gpsStatus: VehicleGpsStatus | undefined = useMemo(() => {
    if (isCreate || !id) return undefined;
    return (
      INITIAL_VEHICLE_GPS_DATA[id] || {
        vehicleId: id,
        plate: vehicle.plate,
        plateNormalized: vehicle.plate.replace(/[^a-zA-Z0-9]/g, ''),
        stationId: vehicle.stationId,
        stationName: orgName(vehicle.stationId),
        imei: '861200034567345',
        mappingId: 101,
        mappingVersion: 1,
        validFrom: '01/01/2026 08:00',
        matchState: 'MATCHED',
        matchStateLabel: 'Đã khớp',
        signal: {
          freshness: 'FRESH',
          freshnessLabel: 'Mới',
          signalLost: false,
          lastSeenAt: 'Vừa xong',
          reasonCode: '3',
          reason: 'Đang hoạt động',
          lat: 21.0285,
          lng: 105.8542,
          address: 'Phường Phúc Đồng, Long Biên, Hà Nội',
          inShiftBasis: currentDrivers.length > 0
            ? `Tài xế: ${currentDrivers.map((d) => d.fullname).join(', ')}`
            : 'Chưa phân ca trực',
        },
      }
    );
  }, [id, isCreate, vehicle.plate, vehicle.stationId, currentDrivers]);

  const gpsSignal = gpsStatus?.signal;

  // Switch to Edit mode
  const handleStartEdit = () => {
    navigate(`/partner/vehicles/${vehicle.id}/edit`);
    setEditing(true);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    if (isCreate) {
      navigate('/partner/vehicles');
    } else {
      navigate(`/partner/vehicles/${vehicle.id}`);
      setEditing(false);
    }
  };

  // Save changes
  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // VAL-01..11 (FDD FL-M1-01)
    const errs: string[] = [];
    const plateNorm = editForm.plate.trim().toUpperCase().replace(/[\s.\-]/g, '');
    if (!plateNorm) errs.push('Vui lòng nhập biển số xe');
    else if (VEHICLES.some((v) => v.id !== vehicle.id && v.plate.toUpperCase().replace(/[\s.\-]/g, '') === plateNorm)) errs.push('Biển số đã tồn tại');
    const codeNorm = editForm.hnl.trim().toUpperCase().replace(/\s+/g, '');
    if (codeNorm && VEHICLES.some((v) => v.id !== vehicle.id && String(v.hnl).toUpperCase().replace(/\s+/g, '') === codeNorm)) errs.push('Mã xe đã tồn tại');
    if (!editForm.type) errs.push('Vui lòng chọn loại xe');
    if (!editForm.loadCarry.trim() || editForm.loadCarry.trim() === '—') errs.push('Vui lòng nhập trọng tải');
    if (!editForm.loadCrane.trim() || editForm.loadCrane.trim() === '—') errs.push('Vui lòng nhập trọng tải cẩu kéo tối đa');
    if (!editForm.services || editForm.services.length === 0) errs.push('Chọn ít nhất một dịch vụ');
    // VAL-17: Ngày đăng ký dd/mm/yyyy, ≤ hôm nay (không bắt buộc)
    const reg = editForm.registrationDate.trim();
    if (reg) {
      const m = reg.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const d = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
      if (!d || d.getDate() !== Number(m![1]) || d > new Date()) errs.push('Ngày đăng ký không hợp lệ');
    }
    setFormErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const patch: Partial<VehicleRecord> = {
      plate: editForm.plate.trim(),
      hnl: editForm.hnl.trim().toUpperCase() || String(vehicle.hnl ?? ''),
      parkAddress: parkAddress.trim() || undefined,
      parkCoords: parkCoords.trim() || undefined,
      brand: editForm.brand,
      modelLine: editForm.modelLine.trim() || '—',
      chassis: editForm.chassis.trim() || '—',
      engineNo: editForm.engineNo.trim() || '—',
      year: Number(editForm.year) || vehicle.year,
      registrationDate: editForm.registrationDate.trim() || undefined,
      stationId: editForm.stationId,
      driverId: isCreate ?(editForm.driverIds[0] ?? editForm.driverId ?? null) : vehicle.driverId,
      driverIds: isCreate ? editForm.driverIds : (vehicle.driverIds ?? []),
      type: editForm.type,
      loadCarry: editForm.loadCarry.trim() || '—',
      loadCrane: editForm.loadCrane.trim() || '—',
      loadLift: editForm.loadLift.trim() || '—',
      seats: editForm.seats.trim() || '—',
      services: editForm.services,
      status: editForm.status,
      runStatus: editForm.status === 'MAINTENANCE' ? 'repair' : 'active',
      tools,
    };

    if (isCreate) {
      const newId = `v-${Date.now()}`;
      const newVeh: VehicleRecord = {
        ...vehicle,
        ...patch,
        id: newId,
      };
      registerVehicle(newVeh);
      saveVehicleMedia(newId, photos, docs);
      triggerToast('Đã thêm mới phương tiện thành công');
      navigate(`/partner/vehicles/${newId}`);
    } else {
      updateVehicle(vehicle.id, patch);
      setRecord({ ...vehicle, ...patch });
      saveVehicleMedia(vehicle.id, photos, docs);

      // Audit log entry
      const audit: VehicleAuditLog = {
        id: `va-${Date.now()}`,
        vehicleId: vehicle.id,
        actedAt: new Date().toLocaleString('vi-VN'),
        actorName: persona.title,
        actionCode: 'UPDATE_INFO',
        actionLabel: 'Cập nhật thông tin',
        oldValue: vehicle.plate,
        newValue: editForm.plate.trim(),
        reason: 'Chỉnh sửa hồ sơ xe',
      };
      setAuditLogs((prev) => [audit, ...prev]);

      triggerToast('Cập nhật thông tin phương tiện thành công');
      navigate(`/partner/vehicles/${vehicle.id}`);
      setEditing(false);
    }
  };

  // DLG-01: Ngừng hoạt động
  const handleConfirmInactivate = () => {
    updateVehicle(vehicle.id, {
      status: 'INACTIVE',
      statusReason: `${inactivateReason} - ${inactivateNote}`,
      driverId: null,
      driverIds: [],
    });
    setRecord((prev) => (prev ? { ...prev, status: 'INACTIVE', driverId: null, driverIds: [] } : prev));
    setPairings((prev) => prev.map((p) => (!p.validTo ? { ...p, validTo: new Date().toLocaleString('vi-VN'), endReason: 'Xe ngừng hoạt động' } : p)));
    setAuditLogs((prev) => [
      {
        id: `va-${Date.now()}`,
        vehicleId: vehicle.id,
        actedAt: new Date().toLocaleString('vi-VN'),
        actorName: persona.title,
        actionCode: 'INACTIVATE',
        actionLabel: 'Ngừng hoạt động',
        oldValue: 'Đang hoạt động',
        newValue: 'Ngừng hoạt động',
        reason: `${inactivateReason}: ${inactivateNote}`,
      },
      ...prev,
    ]);
    setInactivateOpen(false);
    triggerToast(`Đã ngừng hoạt động phương tiện ${vehicle.plate}`);
  };

  // DLG-02: Điều chuyển
  const handleConfirmTransfer = () => {
    if (!transferTo || !transferReturnValid) return;
    const returnNote = transferReturnAt ? ` · về dự kiến ${new Date(transferReturnAt).toLocaleDateString('vi-VN')}` : '';
    const entry: VehicleTransferHistory = {
      id: `t-${Date.now()}`,
      vehicleId: vehicle.id,
      fromStationId: vehicle.stationId,
      toStationId: transferTo,
      transferredAt: new Date().toLocaleString('vi-VN'),
      byName: persona.title,
      reason: (transferReason || 'Điều chuyển trạm') + returnNote,
    };
    registerTransfer(entry);
    updateVehicle(vehicle.id, { stationId: transferTo, driverId: null, driverIds: [] });
    setRecord((prev) => (prev ? { ...prev, stationId: transferTo, driverId: null, driverIds: [] } : prev));
    setPairings((prev) => prev.map((p) => (!p.validTo ? { ...p, validTo: new Date().toLocaleString('vi-VN'), endReason: 'Xe chuyển trạm' } : p)));
    setHistory((prev) => [entry, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        actedAt: new Date().toLocaleString('vi-VN'),
        actorName: persona.title,
        actionCode: 'TRANSFER',
        actionLabel: 'Điều chuyển trạm',
        oldValue: orgName(vehicle.stationId),
        newValue: orgName(transferTo),
        reason: (transferReason || 'Điều chuyển trạm') + returnNote,
      },
      ...prev,
    ]);
    setTransferOpen(false);
    setTransferReturnAt('');
    setTransferTo('');
    setTransferReason('');
    triggerToast(`Đã điều chuyển xe sang ${orgName(transferTo)}`);
  };

  // DLG-11: Đổi trạng thái
  const handleConfirmStatus = () => {
    const patch: Partial<VehicleRecord> = {
      status: targetStatus,
      runStatus: targetStatus === 'MAINTENANCE' ? 'repair' : 'active',
      statusReasonCode: targetStatus !== 'READY' ? statusReasonCode : undefined,
      statusReason: targetStatus !== 'READY' ? statusNote : undefined,
      expectedReturnAt: targetStatus !== 'READY' ? statusReturnAt : undefined,
      statusChangedAt: new Date().toLocaleString('vi-VN'),
      statusChangedBy: persona.title,
    };
    updateVehicle(vehicle.id, patch);
    setRecord((prev) => (prev ? { ...prev, ...patch } : prev));
    setAuditLogs((prev) => [
      {
        id: `va-${Date.now()}`,
        vehicleId: vehicle.id,
        actedAt: new Date().toLocaleString('vi-VN'),
        actorName: persona.title,
        actionCode: 'STATUS',
        actionLabel: 'Đổi trạng thái',
        oldValue: STATUS_TEXT[vehicle.status ?? 'READY'],
        newValue: STATUS_TEXT[targetStatus],
        reason: statusNote || 'Đổi trạng thái theo yêu cầu vận hành',
      },
      ...prev,
    ]);
    setStatusOpen(false);
    triggerToast(`Đã cập nhật trạng thái xe thành ${STATUS_TEXT[targetStatus]}`);
  };

  // DLG-G01: Ghép / Đổi tài xế (Quan hệ N - N: cho phép chọn nhiều tài xế)
  const handleConfirmPair = () => {
    if (selectedDriverIdsForPair.length === 0) return;
    const staffList = PARTNER_STAFF.filter((s) => selectedDriverIdsForPair.includes(s.id));
    if (staffList.length === 0) return;

    const newDriverIds = selectedDriverIdsForPair;
    const primaryId = newDriverIds[0] ?? null;

    updateVehicle(vehicle.id, { driverIds: newDriverIds, driverId: primaryId });
    setRecord((prev) => (prev ? { ...prev, driverIds: newDriverIds, driverId: primaryId } : prev));
    setEditForm((prev) => ({ ...prev, driverIds: newDriverIds, driverId: primaryId ?? '' }));

    const newPairings: VehicleDriverPairing[] = staffList.map((drv) => ({
      id: `vp-${Date.now()}-${drv.id}`,
      vehicleId: vehicle.id,
      driverId: drv.id,
      driverName: drv.fullname,
      driverPhone: drv.phone,
      validFrom: new Date().toLocaleString('vi-VN'),
      validTo: null,
      pairedBy: persona.title,
    }));
    setPairings((prev) => [...newPairings, ...prev]);

    // Audit log entry
    const audit: VehicleAuditLog = {
      id: `va-${Date.now()}`,
      vehicleId: vehicle.id,
      actedAt: new Date().toLocaleString('vi-VN'),
      actorName: persona.title,
      actionCode: 'PAIR_DRIVER',
      actionLabel: 'Ghép tài xế (N-N)',
      oldValue: driverNames(vehicle.driverIds, vehicle.driverId),
      newValue: staffList.map((d) => d.fullname).join(', '),
      reason: 'Cập nhật danh sách tài xế phụ trách phương tiện (N:N)',
    };
    setAuditLogs((prev) => [audit, ...prev]);

    setPairModalOpen(false);
    setPairConfirmWarning(false);
    triggerToast(`Đã gán ${staffList.length} tài xế cho xe ${vehicle.plate}`);
  };

  // DLG-G02: Kết thúc ghép tài xế
  const handleConfirmUnpair = () => {
    const toRemove = selectedDriverIdsToUnpair.length > 0 ? selectedDriverIdsToUnpair : assignedDriverIds;
    const remainingIds = assignedDriverIds.filter((id) => !toRemove.includes(id));
    const primaryId = remainingIds[0] ?? null;

    updateVehicle(vehicle.id, { driverIds: remainingIds, driverId: primaryId });
    setRecord((prev) => (prev ? { ...prev, driverIds: remainingIds, driverId: primaryId } : prev));
    setEditForm((prev) => ({ ...prev, driverIds: remainingIds, driverId: primaryId ?? '' }));

    setPairings((prev) =>
      prev.map((p) =>
        toRemove.includes(p.driverId) && !p.validTo
          ? {
              ...p,
              validTo: new Date().toLocaleString('vi-VN'),
              endReason: unpairReason,
              endNote: unpairNote,
            }
          : p
      )
    );

    const audit: VehicleAuditLog = {
      id: `va-${Date.now()}`,
      vehicleId: vehicle.id,
      actedAt: new Date().toLocaleString('vi-VN'),
      actorName: persona.title,
      actionCode: 'UNPAIR_DRIVER',
      actionLabel: 'Hủy ghép tài xế',
      oldValue: toRemove.map((id) => PARTNER_STAFF.find((s) => s.id === id)?.fullname ?? id).join(', '),
      newValue: remainingIds.length > 0 ? remainingIds.map((id) => PARTNER_STAFF.find((s) => s.id === id)?.fullname ?? id).join(', ') : 'Chưa gán',
      reason: unpairReason + (unpairNote ? ` · ${unpairNote}` : ''),
    };
    setAuditLogs((prev) => [audit, ...prev]);

    setUnpairModalOpen(false);
    setSelectedDriverIdsToUnpair([]);
    setUnpairReason('Chuyển xe khác / đổi ca trực');
    setUnpairNote('');
    triggerToast(`Đã hủy ghép ${toRemove.length} tài xế khỏi xe ${vehicle.plate}`);
  };

  const handleRemoveSingleDriver = (driverIdToRemove: string) => {
    setSelectedDriverIdsToUnpair([driverIdToRemove]);
    setUnpairModalOpen(true);
  };

  // DLG-03: Thêm / sửa giấy tờ
  const handleOpenAddDoc = () => {
    setEditingDocId(null);
    setDocForm(emptyDoc);
    setDocFile(null);
    setDocModalOpen(true);
  };

  const handleOpenEditDoc = (d: VehicleDocument) => {
    setEditingDocId(d.id);
    setDocForm({
      name: d.name,
      type: d.type,
      number: d.number ?? '',
      issuedAt: d.issuedAt,
      expiryAt: d.expiryAt,
      fileName: d.fileName,
      fileUrl: d.fileUrl ?? '',
    });
    setDocFile(null);
    setDocModalOpen(true);
  };

  const handleSaveDoc = () => {
    if (!docForm.name.trim() || !docForm.expiryAt) {
      alert('Vui lòng nhập tên giấy tờ và ngày hết hạn.');
      return;
    }
    const fileName = docFile ? docFile.name : docForm.fileName || 'tai-lieu.pdf';
    const fileUrl = docFile ? URL.createObjectURL(docFile) : docForm.fileUrl;

    if (editingDocId) {
      setDocs((prev) =>
        prev.map((d) =>
          d.id === editingDocId
            ? { ...d, ...docForm, fileName, fileUrl }
            : d
        )
      );
      triggerToast('Đã cập nhật giấy tờ');
    } else {
      const newD: VehicleDocument = {
        id: `d-${Date.now()}`,
        name: docForm.name,
        type: docForm.type,
        number: docForm.number,
        issuedAt: docForm.issuedAt,
        expiryAt: docForm.expiryAt,
        fileName,
        fileUrl,
      };
      // Mỗi loại một bản hiệu lực (FL-M1-01 BR-13)
      setDocs((prev) => [...prev.filter((d) => d.type !== newD.type), newD]);
      triggerToast('Đã đính kèm giấy tờ mới');
    }
    setDocModalOpen(false);
  };

  const handleDeleteDoc = (dId: string) => {
    if (confirm('Bạn có chắc muốn xóa giấy tờ này?')) {
      setDocs((prev) => prev.filter((d) => d.id !== dId));
      triggerToast('Đã xóa giấy tờ');
    }
  };

  // DLG-T02: Cập nhật công cụ xe (FDD DLG-T02)
  const [toolModalError, setToolModalError] = useState('');

  const handleOpenToolModal = () => {
    setTempTools(JSON.parse(JSON.stringify(tools)));
    setSelectedToolToAdd('');
    setToolModalError('');
    setToolModalOpen(true);
  };

  const handleSaveToolModal = () => {
    // VAL-T04 & BR-T03: Kiểm tra ghi chú bắt buộc (tối thiểu 5 ký tự) khi có công cụ Hỏng hoặc Thiếu
    const invalidItem = tempTools.find((t) => {
      const cond = toolConditionOf(t);
      if (cond === 'BROKEN' || cond === 'MISSING') {
        const note = (t.note || '').trim();
        return note.length < 5;
      }
      return false;
    });

    if (invalidItem) {
      setToolModalError(
        `Vui lòng nhập ghi chú (tối thiểu 5 ký tự) cho công cụ "${invalidItem.name}" đang ở tình trạng ${
          toolConditionOf(invalidItem) === 'BROKEN' ? 'Hỏng' : 'Thiếu'
        }`
      );
      return;
    }

    if (!isCreate) {
      updateVehicle(vehicle.id, { tools: tempTools });
      // BR-T16, AC-T01: Ghi lịch sử xe (loại Công cụ)
      const beforeCount = tools.length;
      const beforeReady = tools.filter(toolReady).length;
      const afterCount = tempTools.length;
      const afterReady = tempTools.filter(toolReady).length;
      const beforeSummary = `${beforeCount} món (${beforeReady} sẵn sàng)`;
      const afterSummary = `${afterCount} món (${afterReady} sẵn sàng)`;

      setAuditLogs((prev) => [
        {
          id: `audit-${Date.now()}`,
          actedAt: new Date().toLocaleString('vi-VN'),
          actorName: persona.label,
          actionCode: 'TOOL',
          actionLabel: 'Công cụ',
          oldValue: beforeSummary,
          newValue: afterSummary,
          reason: 'Cập nhật công cụ thực tế trên xe',
        },
        ...prev,
      ]);
    }
    setTools(tempTools);
    setToolModalOpen(false);
    triggerToast('Đã cập nhật danh mục công cụ theo xe');
  };

  const handleAddToolRow = () => {
    if (!selectedToolToAdd) return;
    const catItem = MASTER_TOOL_CATALOG.find((c) => c.name === selectedToolToAdd);
    const toolName = catItem?.name ?? selectedToolToAdd;
    if (tempTools.some((t) => t.name.toLowerCase() === toolName.toLowerCase())) {
      setToolModalError('Thiết bị này đã có trên xe.');
      return;
    }
    const std = catItem?.standardQty ?? standardQtyOf(toolName);
    setTempTools((prev) => [
      ...prev,
      {
        id: `tool-${Date.now()}`,
        name: toolName,
        status: 1,
        quantity: std,
        condition: 'GOOD',
        unit: catItem?.unit ?? 'Cái',
        note: '',
      },
    ]);
    setSelectedToolToAdd('');
    setToolModalError('');
  };

  if (persona.role === 'NVCH') {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-0 max-w-full pb-10">
        <PartnerScopeBar persona={persona} onChange={setPersona} />
        <div className="p-8 bg-white border border-amber-200 rounded-lg text-center shadow-sm my-6">
          <AlertTriangle size={44} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-base font-bold text-gray-800">Không có quyền truy cập</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Nhân viên cứu hộ / Tài xế (NVCH) không có quyền xem thông tin chi tiết phương tiện theo quy định BR-01 (FDD FL-M1-01). Vui lòng chuyển vai trò khác ở thanh trên để kiểm tra hoặc liên hệ quản trị viên.
          </p>
          <button
            type="button"
            onClick={() => navigate('/partner/vehicles')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A859] text-white font-bold text-xs rounded-lg"
          >
            Quay lại danh sách xe
          </button>
        </div>
      </div>
    );
  }

  if (!isCreate && !record) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200 m-4">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-gray-800 mb-1">Không tìm thấy phương tiện</h3>
        <p className="text-xs text-gray-500 mb-4">Phương tiện với mã "{id}" không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
        <button
          type="button"
          onClick={() => navigate('/partner/vehicles')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A859] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-green-700"
        >
          <ArrowLeft size={14} />
          <span>Quay lại danh sách xe</span>
        </button>
      </div>
    );
  }


  return (
    <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-0 max-w-full pb-10">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom-2">
          <Check size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP BAR ACTION (Khớp ảnh 1.2 & 1.3 & SCR-04) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate('/partner/vehicles')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-[#00A859] transition"
          >
            <ArrowLeft size={13} />
            <span>Danh sách phương tiện</span>
          </button>
          <h1 className="mt-0.5 text-base font-black leading-tight text-gray-900">
            {isCreate ? 'Thêm mới xe cứu hộ' : editing ? `Cập nhật ${vehicle.plate}` : `Chi tiết ${vehicle.plate}`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isCreate && (
            <button
              type="button"
              disabled={!canChangeStatus}
              onClick={() => {
                if (!canChangeStatus) return;
                setTargetStatus(
                  (vehicle.status ?? (vehicle.runStatus === 'repair' ? 'MAINTENANCE' : 'READY')) as
                    | 'READY'
                    | 'STOPPED'
                    | 'MAINTENANCE'
                );
                setStatusOpen(true);
              }}
              title={canChangeStatus ? 'Đổi trạng thái' : undefined}
              className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm text-xs ${
                canChangeStatus ? 'hover:border-[#00A859] hover:bg-emerald-50/40 cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="text-gray-500 text-[11px] font-bold">Tình trạng:</span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                  vehicle.status === 'READY'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : vehicle.status === 'MAINTENANCE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : vehicle.status === 'STOPPED'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : vehicle.status === 'WORKING'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {vehicle.status === 'READY'
                  ? 'Sẵn sàng'
                  : vehicle.status === 'MAINTENANCE'
                  ? 'Đang sửa chữa'
                  : vehicle.status === 'STOPPED'
                  ? 'Tạm dừng'
                  : vehicle.status === 'WORKING'
                  ? 'Đang làm đơn'
                  : 'Ngừng hoạt động'}
              </span>
            </button>
          )}

          {/* Các nút hành động */}
          {!editing ? (
            /* Chế độ xem: SCR-02 */
            <div className="flex items-center gap-2">
              {canEditVehicle && (
              <button
                type="button"
                onClick={handleStartEdit}
                title="Cập nhật"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#00A859] bg-white text-[#00A859] hover:bg-green-50 transition shadow-sm"
              >
                <Pencil size={15} />
              </button>
              )}

              {canTransferVehicle && (
              <button
                type="button"
                onClick={() => setTransferOpen(true)}
                title="Điều chuyển"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#00A859] text-white hover:bg-green-700 transition shadow-sm"
              >
                <ArrowRightLeft size={15} />
              </button>
              )}

              {editableRole && !isInactive && (
                <button
                  type="button"
                  onClick={() => setInactivateOpen(true)}
                  title="Ngừng hoạt động"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 transition shadow-sm"
                >
                  <Ban size={15} />
                </button>
              )}
            </div>
          ) : (
            /* Chế độ sửa hoặc thêm mới: SCR-03 / SCR-04 */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-50 transition shadow-sm uppercase"
              >
                <X size={14} />
                <span>Hủy</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveForm()}
                className="flex items-center gap-1.5 bg-[#00A859] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-green-700 transition shadow-sm uppercase"
              >
                <Check size={14} />
                <span>{isCreate ? 'Thêm mới' : 'Lưu'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <PartnerScopeBar persona={persona} onChange={setPersona} />
      {editing && formErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <p className="font-bold mb-1">Chưa lưu được, vui lòng kiểm tra:</p>
          <ul className="list-disc pl-5 space-y-0.5">{formErrors.map((er) => <li key={er}>{er}</li>)}</ul>
        </div>
      )}
      {editing && !isCreate && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-2 text-xs text-blue-900 flex items-center gap-2">
            <Info size={15} className="text-blue-600 shrink-0" />
            <span>
              Đang sửa trên màn chi tiết. Trạm không đổi tại đây — đổi trạm dùng Điều chuyển.
            </span>
          </div>
        )}

      <Section
        title="Thông tin xe"
        number={1}
        icon={<Truck size={16} />}
        rightNode={
          !editing && !isCreate && canEditVehicle && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="text-white hover:text-white/80 p-1 rounded"
              title="Chỉnh sửa thông tin xe"
            >
              <Pencil size={15} />
            </button>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label required={editing}>Biển số</Label>
            <input
              type="text"
              value={editing ? editForm.plate : vehicle.plate}
              readOnly={!editing}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  plate: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                })
              }
              className={`${fieldControlClass(!editing)} uppercase`}
              placeholder="VD 29C12345"
            />
          </div>
          {/* CỘT 2 */}
          <div>
            <Label>Mã xe</Label>
            <input
              type="text"
              value={editing ? editForm.hnl : String(vehicle.hnl ?? '—')}
              readOnly
              disabled
              placeholder="Hệ thống tự sinh"
              className={fieldControlClass(true)}
            />
          </div>
          {/* CỘT 4 */}
          <div>
            <Label>Hãng</Label>
            {editing ? (
              <select
                value={editForm.brand}
                onChange={(e) =>
                  setEditForm({ ...editForm, brand: e.target.value as VehicleRecord['brand'] })
                }
                className={fieldControlClass(false)}
              >
                <option value="Isuzu">Isuzu</option>
                <option value="Hino">Hino</option>
                <option value="Dongfeng">Dongfeng</option>
              </select>
            ) : (
              <input type="text" value={vehicle.brand} readOnly className={fieldControlClass(true)} />
            )}
          </div>

          {/* DÒNG 2 */}
          {/* CỘT 1 */}
          <div>
            <Label>Dòng xe</Label>
            <input
              type="text"
              value={editing ? editForm.modelLine : vehicle.modelLine}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, modelLine: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: NPR 400"
            />
          </div>
          {/* CỘT 2 */}
          <div>
            <Label>Năm SX</Label>
            <input
              type="text"
              value={editing ? editForm.year : String(vehicle.year)}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: 2022"
            />
          </div>
          {/* Ngày đăng ký (FL-M1-01 UI-47, VAL-17) */}
          <div>
            <Label>Ngày đăng ký</Label>
            {editing ? (
              <input
                type="date"
                value={(() => {
                  const m = editForm.registrationDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
                })()}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  const m = e.target.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                  setEditForm({
                    ...editForm,
                    registrationDate: m ? `${m[3]}/${m[2]}/${m[1]}` : '',
                  });
                }}
                className={fieldControlClass(false)}
              />
            ) : (
              <input
                type="text"
                value={vehicle.registrationDate || '—'}
                readOnly
                className={fieldControlClass(true)}
              />
            )}
          </div>
          {/* CỘT 3 */}
          <div>
            <Label>Số khung</Label>
            <input
              type="text"
              value={editing ? editForm.chassis : vehicle.chassis}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, chassis: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: JALC4B16X07001234"
            />
          </div>
          {/* CỘT 4 */}
          <div>
            <Label>Số máy</Label>
            <input
              type="text"
              value={editing ? editForm.engineNo : vehicle.engineNo}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, engineNo: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: 4HK1-123456"
            />
          </div>
        </div>
      </Section>

      <Section title="Thông số kỹ thuật" number={2} icon={<Wrench size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label required={editing}>Loại xe</Label>
            {editing ? (
              <select
                value={editForm.type}
                onChange={(e) => {
                  const nt = e.target.value as VehicleRecord['type'];
                  setEditForm({ ...editForm, type: nt });
                  if (isCreate) setTools(toolsFor(nt));
                }}
                className={fieldControlClass(false)}
              >
                {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleRecord['type'][]).map((t) => (
                  <option key={t} value={t}>
                    {VEHICLE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={VEHICLE_TYPE_LABEL[vehicle.type]}
                readOnly
                className={fieldControlClass(true)}
              />
            )}
          </div>
          {/* CỘT 3 */}
          <div>
            <Label required={editing}>Trọng tải</Label>
            <input
              type="text"
              value={editing ? editForm.loadCarry : vehicle.loadCarry}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, loadCarry: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: 5 tấn"
            />
          </div>
          {/* CỘT 4 */}
          <div>
            <Label>Số chỗ</Label>
            <input
              type="text"
              value={editing ? editForm.seats : vehicle.seats}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, seats: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: 3"
            />
          </div>

          {/* DÒNG 4 */}
          {/* CỘT 1 */}
          <div>
            <Label required={editing}>Cẩu kéo tối đa</Label>
            <input
              type="text"
              value={editing ? editForm.loadCrane : vehicle.loadCrane}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, loadCrane: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: 8 tấn"
            />
          </div>
          {/* CỘT 2 */}
          <div>
            <Label>Tải trọng cẩu nâng</Label>
            <input
              type="text"
              value={editing ? editForm.loadLift : vehicle.loadLift}
              readOnly={!editing}
              onChange={(e) => setEditForm({ ...editForm, loadLift: e.target.value })}
              className={fieldControlClass(!editing)}
              placeholder="VD: 3 tấn"
            />
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100">
          <SubTitle>Dịch vụ đáp ứng</SubTitle>
          {editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VEHICLE_SERVICES.map((srv) => {
                const checked = editForm.services?.includes(srv);
                return (
                  <label
                    key={srv}
                    className={`flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm cursor-pointer transition ${
                      checked ? 'border-[#00A859] bg-emerald-50/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checked}
                      onChange={(e) => {
                        const cur = editForm.services ?? [];
                        if (e.target.checked) setEditForm({ ...editForm, services: [...cur, srv] });
                        else setEditForm({ ...editForm, services: cur.filter((s) => s !== srv) });
                      }}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[#00A859]"
                    />
                    <span className="text-gray-800">{srv}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vehicle.services && vehicle.services.length > 0 ? (
                vehicle.services.map((srv) => (
                  <span
                    key={srv}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {srv}
                  </span>
                ))
              ) : (
                <span className="text-xs text-red-500 font-medium">Chưa khai báo dịch vụ</span>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Trạm quản lý" number={3} icon={<Users size={16} />}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <Label required={isCreate}>Trạm</Label>
            {isCreate ? (
              <select
                value={editForm.stationId}
                onChange={(e) => {
                  const stationId = e.target.value;
                  const allowed = new Set(driversAtStation(stationId).map((d) => d.id));
                  const driverIds = editForm.driverIds.filter((driverId) => allowed.has(driverId));
                  setDriverDropOpen(false);
                  setEditForm({ ...editForm, stationId, driverIds, driverId: driverIds[0] ?? '' });
                }}
                className={`${fieldControlClass(false)} h-[34px]`}
              >
                {STATION_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={orgName(vehicle.stationId)}
                  readOnly
                  className={fieldControlClass(true)}
                />
                {!editing && canTransferVehicle && (
                  <button
                    type="button"
                    onClick={() => setTransferOpen(true)}
                    className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-md border border-[#00A859] bg-white px-2.5 text-[11px] font-bold text-[#00A859] hover:bg-emerald-50"
                  >
                    <ArrowRightLeft size={12} />
                    Điều chuyển
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="lg:col-span-3">
            <Label>Tài xế chịu trách nhiệm</Label>

            {editing && isCreate ? (
              <div>
                <button
                  ref={driverBtnRef}
                  type="button"
                  onClick={() => {
                    if (driverDropOpen) {
                      setDriverDropOpen(false);
                      return;
                    }
                    const rect = driverBtnRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setDriverMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                    setDriverDropOpen(true);
                  }}
                  className={`${fieldControlClass(false)} flex h-[34px] items-center justify-between gap-2 text-left`}
                >
                  <span className="flex min-w-0 flex-wrap gap-1">
                    {editForm.driverIds.length === 0 ? (
                      <span className="text-gray-400">Chọn tài xế</span>
                    ) : (
                      driversAtStation(editForm.stationId)
                        .filter((d) => editForm.driverIds.includes(d.id))
                        .map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800"
                          >
                            {d.fullname}
                          </span>
                        ))
                    )}
                  </span>
                  <ChevronDown size={14} className={`shrink-0 text-gray-400 transition ${driverDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {driverDropOpen && driverMenuPos && (
                  <>
                    <button
                      type="button"
                      aria-label="Đóng danh sách tài xế"
                      className="fixed inset-0 z-[70] cursor-default"
                      onClick={() => setDriverDropOpen(false)}
                    />
                    <div
                      className="fixed z-[80] max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                      style={{ top: driverMenuPos.top, left: driverMenuPos.left, width: driverMenuPos.width }}
                    >
                      {driversAtStation(editForm.stationId).length === 0 ? (
                        <p className="px-2 py-2 text-xs italic text-gray-400">Trạm này chưa có tài xế nào</p>
                      ) : (
                        driversAtStation(editForm.stationId).map((d) => {
                          const checked = editForm.driverIds.includes(d.id);
                          return (
                            <label key={d.id} className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-gray-50">
                              <span className="flex min-w-0 items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextIds = e.target.checked
                                      ? [...editForm.driverIds, d.id]
                                      : editForm.driverIds.filter((driverId) => driverId !== d.id);
                                    setEditForm({ ...editForm, driverIds: nextIds, driverId: nextIds[0] ?? '' });
                                  }}
                                  className="h-4 w-4 shrink-0 rounded accent-[#00A859]"
                                />
                                <span className="font-medium text-gray-800">{d.fullname}</span>
                                <span className="tabular-nums text-[11px] text-gray-500">{d.phone}</span>
                              </span>
                              <span className="shrink-0 text-[10px] text-gray-400">
                                Bằng {d.licenseType}{d.craneCert ? ' · Cẩu' : ''}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Khi xem chi tiết hoặc khi cập nhật (editing && !isCreate): Read-only danh sách tài xế */
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  {currentDrivers.length === 0 ? (
                    <p className="text-xs italic text-gray-400">Chưa gán tài xế nào</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {currentDrivers.map((d) => (
                        <span
                          key={d.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          <span>{d.fullname}</span>
                          <span className="font-medium tabular-nums text-emerald-700/80">{d.phone}</span>
                          {!editing && canPair && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSingleDriver(d.id)}
                              className="text-emerald-700/70 hover:text-red-500"
                              title={`Hủy ghép tài xế ${d.fullname}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {editing && !isCreate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 font-medium">
                      <Lock size={12} className="shrink-0 text-amber-600" />
                      <span>Không cho phép sửa tài xế chịu trách nhiệm khi cập nhật xe.</span>
                    </div>
                  )}
                </div>
                {!editing && canPair && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDriverIdsForPair([...assignedDriverIds]);
                      setPairModalOpen(true);
                    }}
                    className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded-md border border-[#00A859] bg-white px-2.5 text-[11px] font-bold text-[#00A859] hover:bg-emerald-50"
                  >
                    <Pencil size={12} />
                    Cập nhật
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Hình ảnh" number={4} icon={<ImageIcon size={16} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(['Góc trước', 'Góc sau', 'Bên trái', 'Bên phải'] as const).map((slotLabel) => {
              const photo = photos.find((p) => p.label === slotLabel);
              return (
                <div
                  key={slotLabel}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex flex-col justify-between"
                >
                  {photo ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(photo.url)}
                        className="block w-full overflow-hidden"
                      >
                        <img
                          src={photo.url}
                          alt={photo.label}
                          className="h-28 w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-[11px] font-bold text-gray-700 border-t border-gray-100">
                        <ImageIcon size={12} className="text-[#00A859]" />
                        <span>{photo.label}</span>
                      </div>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                          className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition"
                          title="Xóa ảnh"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="h-36 flex flex-col items-center justify-center p-3 text-center">
                      <ImageIcon size={22} className="text-gray-300 mb-1" />
                      <span className="text-[11px] font-semibold text-gray-400">{slotLabel}</span>
                      {editing && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoLabel(slotLabel);
                            setPhotoOpen(true);
                          }}
                          className="mt-2 text-[10px] font-bold text-[#00A859] hover:underline"
                        >
                          + Tải ảnh
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thẻ thêm ảnh thứ 5 ở chế độ sửa */}
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setPhotoLabel('Ảnh khác');
                  setPhotoOpen(true);
                }}
                className="h-36 rounded-lg border-2 border-dashed border-gray-200 hover:border-[#00A859] flex flex-col items-center justify-center p-3 text-gray-500 hover:text-[#00A859] transition"
              >
                <Plus size={20} className="mb-1" />
                <span className="text-xs font-bold">Thêm ảnh</span>
              </button>
            )}
        </div>
      </Section>

      <Section
        title="Giấy tờ"
        number={5}
        icon={<FileText size={16} />}
      >
        <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-gray-600">
                      <th className="px-3 py-2.5 text-left font-bold border-r">Loại giấy tờ</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r w-32">Số</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r w-32">Ngày cấp</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r w-32">Hết hạn</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r w-36">Cảnh báo</th>
                      <th className="px-3 py-2.5 text-left font-bold border-r">File</th>
                      {editing && <th className="px-3 py-2.5 text-center font-bold w-24">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {docs.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-2.5 border-r">
                          <div className="font-bold text-gray-800">{d.name}</div>
                          <div className="text-[10px] text-gray-400">{d.type}{REQUIRED_VEHICLE_DOCS.includes(d.type) ? ' · bắt buộc' : ' · tùy chọn'}</div>
                        </td>
                        <td className="px-3 py-2.5 border-r tabular-nums text-gray-700">{d.number || '—'}</td>
                        <td className="px-3 py-2.5 border-r text-gray-700 font-medium">
                          {d.issuedAt || '—'}
                        </td>
                        <td className="px-3 py-2.5 border-r text-gray-800 font-medium">
                          {d.expiryAt || '—'}
                        </td>
                        <td className="px-3 py-2.5 border-r">
                          {(() => {
                            const days = docDaysLeft(d.expiryAt);
                            if (days == null) return <span className="text-gray-400">—</span>;
                            if (!REQUIRED_VEHICLE_DOCS.includes(d.type)) return <span className="text-gray-500">Còn {days} ngày</span>;
                            if (days < 0) return <span className="font-bold text-red-600">⚠ Quá hạn {Math.abs(days)} ngày</span>;
                            if (days <= 30) return <span className="font-bold text-amber-600">⚠ Còn {days} ngày</span>;
                            return <span className="text-gray-500">Còn {days} ngày</span>;
                          })()}
                        </td>
                        <td className="px-3 py-2.5 border-r">
                          {d.fileName ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(d)}
                              className="inline-flex items-center gap-1.5 text-[#00A859] font-medium hover:underline"
                            >
                              <FileText size={13} />
                              <span>{d.fileName}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">Không đính kèm</span>
                          )}
                        </td>
                        {editing && (
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(d)}
                                className="p-1 text-gray-500 hover:text-blue-600 rounded"
                                title="Xem trước"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditDoc(d)}
                                className="p-1 text-gray-500 hover:text-[#00A859] rounded"
                                title="Sửa giấy tờ"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(d.id)}
                                className="p-1 text-gray-500 hover:text-red-500 rounded"
                                title="Xóa giấy tờ"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}

                    {/* Dòng thiếu giấy tờ bắt buộc theo BR-18 */}
                    {REQUIRED_VEHICLE_DOCS.filter((reqType) => !docs.some((d) => d.type === reqType)).map((mType) => (
                      <tr key={`missing-${mType}`} className="bg-gray-50">
                        <td className="px-3 py-2.5 border-r">
                          <div className="font-semibold text-gray-500">{mType}</div>
                          <div className="text-[10px] text-gray-400">Chưa có giấy tờ</div>
                        </td>
                        <td className="px-3 py-2.5 border-r text-gray-400 tabular-nums">—</td>
                        <td className="px-3 py-2.5 border-r text-gray-400">—</td>
                        <td className="px-3 py-2.5 border-r text-gray-400">—</td>
                        <td className="px-3 py-2.5 border-r">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                            Chưa có
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-r text-gray-400">—</td>
                        {editing && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setDocForm({ ...emptyDoc, name: `Giấy ${mType}`, type: mType });
                                setDocFile(null);
                                setEditingDocId(null);
                                setDocModalOpen(true);
                              }}
                              className="text-xs font-bold text-[#00A859] hover:underline"
                            >
                              + Bổ sung
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        </div>
      </Section>

      <Section title="Thiết bị theo dõi" number={6} icon={<Radio size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Thiết bị GPS (IMEI)</Label>
            <input
              type="text"
              value={isCreate ? '' : '861200034567345'}
              readOnly
              disabled
              placeholder="Tự nhận sau khi liên kết"
              className={`${fieldControlClass(true)} tabular-nums`}
            />
          </div>
          <div>
            <Label>Số km đã chạy (MID)</Label>
            <input
              type="text"
              value={isCreate ? '' : '14.280 km'}
              readOnly
              disabled
              placeholder="Chưa có dữ liệu"
              className={fieldControlClass(true)}
            />
          </div>
          <div>
            <Label>Camera hành trình</Label>
            <input
              type="text"
              value={isCreate ? '' : (cameraConnStatus === 'CONNECTED' ? 'CAM-F012 · Full HD 1080p' : 'CAM-F012 (Mất tín hiệu)')}
              readOnly
              disabled
              placeholder="Chưa cấu hình"
              className={`${fieldControlClass(true)} ${!isCreate && cameraConnStatus !== 'CONNECTED' ? 'text-red-500' : ''}`}
            />
          </div>
          <div>
            <Label>Vị trí đặt xe</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={parkAddress}
                readOnly
                placeholder="Chọn vị trí trên bản đồ"
                className={fieldControlClass(true)}
              />
              <button
                type="button"
                title={parkCopied ? 'Đã sao chép' : 'Sao chép vị trí'}
                disabled={!parkCoords}
                onClick={() => {
                  if (!parkCoords) return;
                  navigator.clipboard.writeText(parkCoords);
                  setParkCopied(true);
                  window.setTimeout(() => setParkCopied(false), 1500);
                }}
                className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:border-[#00A859] hover:text-[#00A859] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {parkCopied ? <Check size={14} className="text-[#00A859]" /> : <Copy size={14} />}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => setParkMapOpen(true)}
                  className="inline-flex h-[30px] shrink-0 items-center gap-1 rounded border border-[#00A859] bg-white px-2.5 text-[11px] font-bold text-[#00A859] hover:bg-emerald-50"
                >
                  <MapPin size={13} />
                  Bản đồ
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* KHỐI 2: LỊCH SỬ HÀNH TRÌNH & CAMERA TRƯỚC XE (Khớp ảnh 1.2 & FDD FL-M6-06 UI-C10) */}
      {!isCreate && (
        <Section
          title="Lịch sử hành trình & Camera trước xe"
          number={7}
          icon={<MapPin size={16} />}
          rightNode={(
            <div className="flex items-center gap-1.5 bg-white/20 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setJourneyTab('gps')}
                className={`px-3 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                  journeyTab === 'gps'
                    ? 'bg-white text-[#00A859] shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <MapPin size={13} />
                <span>Vị trí</span>
              </button>
              <button
                type="button"
                onClick={() => setJourneyTab('camera')}
                className={`px-3 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                  journeyTab === 'camera'
                    ? 'bg-white text-[#00A859] shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Camera size={13} />
                <span>Camera</span>
              </button>
            </div>
          )}
          flush={journeyTab === 'gps'}
        >
          {journeyTab === 'gps' ? (
            <RescueOrderGpsJourney plate={vehicle.plate} gpsStatus={gpsStatus} />
          ) : (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Camera Status & Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border bg-gray-50 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-semibold">Thiết bị:</span>
                    <strong className="text-gray-800 tabular-nums">CAM-F012 (VietMap MDVR)</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-semibold">Tình trạng:</span>
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                      cameraConnStatus === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {cameraConnStatus === 'CONNECTED' ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Trực tuyến · Đang ghi hình
                        </>
                      ) : (
                        <>
                          <WifiOff size={11} /> Mất kết nối camera
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    Độ phân giải: <strong className="text-gray-700">1080p @ 30fps</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraConnStatus(prev => prev === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED')}
                    className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-white text-[11px] font-semibold transition"
                    title="Mô phỏng đổi trạng thái kết nối camera (AC-C03)"
                  >
                    Mô phỏng: {cameraConnStatus === 'CONNECTED' ? 'Ngắt kết nối' : 'Kết nối lại'}
                  </button>
                </div>
              </div>

              {cameraConnStatus === 'DISCONNECTED' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-xs text-red-700 space-y-2">
                  <AlertCircle size={28} className="mx-auto text-red-500" />
                  <div className="font-bold text-sm">Không thể kết nối với thiết bị camera trước (CAM-F012)</div>
                  <p className="text-red-600 max-w-md mx-auto">
                    Thiết bị camera trên xe hiện đang mất kết nối hoặc tắt nguồn. Các video clip trong chuyến cứu hộ tạm thời không thể phát lại từ đám mây.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Danh sách Video Clip theo chuyến cứu hộ (Gắn với Đơn)</span>
                    <span className="text-gray-400 font-normal lowercase">Nhấn "Xem clip" để mở trình phát</span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b text-gray-600">
                          <th className="px-3 py-2.5 text-center w-10 font-bold border-r">STT</th>
                          <th className="px-3 py-2.5 text-left font-bold border-r">Tiêu đề đoạn clip</th>
                          <th className="px-3 py-2.5 text-left font-bold border-r w-32">Gắn đơn cứu hộ</th>
                          <th className="px-3 py-2.5 text-left font-bold border-r w-36">Thời gian ghi</th>
                          <th className="px-3 py-2.5 text-center font-bold border-r w-24">Thời lượng</th>
                          <th className="px-3 py-2.5 text-center font-bold border-r w-24">Dung lượng</th>
                          <th className="px-3 py-2.5 text-center font-bold w-36">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          {
                            id: 'c-01',
                            title: 'Khởi hành tiếp cận hiện trường cứu hộ',
                            orderCode: 'RO-001234',
                            startTime: '08:15:20',
                            endTime: '08:32:45',
                            duration: '17 phút 25 giây',
                            fileSize: '185 MB',
                            status: 'AVAILABLE' as const,
                          },
                          {
                            id: 'c-02',
                            title: 'Quá trình cẩu kéo phương tiện về xưởng',
                            orderCode: 'RO-001234',
                            startTime: '08:35:10',
                            endTime: '09:10:00',
                            duration: '34 phút 50 giây',
                            fileSize: '370 MB',
                            status: 'AVAILABLE' as const,
                          },
                          {
                            id: 'c-03',
                            title: 'Hành trình di chuyển tuần tra trên tuyến',
                            orderCode: '—',
                            startTime: '07:05:00',
                            endTime: '07:40:15',
                            duration: '35 phút 15 giây',
                            fileSize: '380 MB',
                            status: 'AVAILABLE' as const,
                          },
                        ].map((clip, idx) => (
                          <tr key={clip.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-3 py-2.5 text-center border-r text-gray-500">{idx + 1}</td>
                            <td className="px-3 py-2.5 border-r font-semibold text-gray-800">
                              <div className="flex items-center gap-2">
                                <Video size={14} className="text-[#00A859] shrink-0" />
                                <span>{clip.title}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 border-r tabular-nums font-bold text-blue-600">
                              {clip.orderCode !== '—' ? (
                                <span className="hover:underline cursor-pointer">{clip.orderCode}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 border-r tabular-nums text-gray-600">
                              {clip.startTime} – {clip.endTime}
                            </td>
                            <td className="px-3 py-2.5 border-r text-center text-gray-700 font-medium">
                              {clip.duration}
                            </td>
                            <td className="px-3 py-2.5 border-r text-center text-gray-600">
                              {clip.fileSize}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCameraClip(clip)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#00A859] text-white hover:bg-green-700 font-bold text-[11px] transition shadow-sm"
                                >
                                  <Play size={11} className="fill-white" />
                                  <span>Xem clip</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alert(`Bắt đầu tải xuống clip ${clip.title} (.MP4)`)}
                                  className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                                  title="Tải video clip (.MP4)"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {/* Modal Trình phát Video Camera hành trình (UI-C10) */}
      {selectedCameraClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-xl bg-gray-900 text-white shadow-2xl overflow-hidden border border-gray-700">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-[#00A859]" />
                <span className="font-bold text-sm">{selectedCameraClip.title}</span>
                {selectedCameraClip.orderCode !== '—' && (
                  <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700">
                    Đơn: {selectedCameraClip.orderCode}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCameraClip(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Player Display Container */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
              {/* Mock Road View Canvas */}
              <div className="absolute inset-0 bg-gradient-to-b from-sky-900/40 via-gray-900 to-gray-950 flex flex-col justify-between p-6">
                {/* On-screen Watermark HUD (Khớp camera thực tế) */}
                <div className="flex items-start justify-between tabular-nums text-[11px] text-green-400 drop-shadow-md">
                  <div>
                    <div className="font-bold text-white tracking-wider">CAM-F012 · {vehicle.plate}</div>
                    <div>2026-10-03 08:22:15 UTC+7</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-amber-400">42 km/h · HƯỚNG BẮC (350°)</div>
                    <div>LAT: 21.02852 · LNG: 105.85421</div>
                  </div>
                </div>

                {/* Road illustration in center */}
                <div className="flex flex-col items-center justify-center opacity-85">
                  <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center mb-2">
                    <Truck size={30} className="text-[#00A859]" />
                  </div>
                  <div className="text-xs text-gray-300 font-medium">Đang phát lại video hành trình thực tế</div>
                  <div className="text-[10px] text-gray-500 tabular-nums mt-1">Độ phân giải 1920x1080 @ 30fps · H.264 Audio AAC</div>
                </div>

                {/* Bottom on-screen tags */}
                <div className="flex items-center justify-between text-[11px] tabular-nums text-gray-300">
                  <span className="bg-black/60 px-2 py-0.5 rounded text-emerald-400">REC ● [GPS MATCHED]</span>
                  <span className="bg-black/60 px-2 py-0.5 rounded">Tốc độ phát: {clipSpeed}x</span>
                </div>
              </div>

              {/* Central play overlay when paused */}
              {!isClipPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsClipPlaying(true)}
                    className="w-16 h-16 rounded-full bg-[#00A859] hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition transform hover:scale-105"
                  >
                    <Play size={28} className="fill-white ml-1" />
                  </button>
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div className="p-3.5 bg-gray-800 space-y-2 border-t border-gray-700">
              {/* Progress Scrubber */}
              <div className="flex items-center gap-3 text-xs tabular-nums text-gray-300">
                <span>06:48</span>
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full relative cursor-pointer overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 bg-[#00A859] w-[38%]" />
                </div>
                <span>17:25</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClipPlaying(p => !p)}
                    className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                  >
                    {isClipPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />}
                  </button>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-400 mr-1 text-[11px]">Tốc độ:</span>
                    {[1, 2, 4].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setClipSpeed(s)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${clipSpeed === s ? 'bg-[#00A859] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alert(`Tải xuống clip "${selectedCameraClip.title}.mp4"`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition"
                  >
                    <Download size={13} />
                    <span>Tải video (.MP4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCameraClip(null)}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs font-bold text-gray-300 transition"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KHỐI 3: CÔNG CỤ THEO XE VÀ TÌNH TRẠNG (Khớp ảnh 1.2 & 1.3 - Ẩn ở SCR-04 theo FDD) */}
      {!isCreate && (
        <Section title="Công cụ theo xe và tình trạng" number={8} icon={<Wrench size={16} />}>
          {/* Badges đếm */}
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              {tools.filter((t) => toolReady(t)).length} sẵn sàng (đủ tiêu chuẩn)
            </span>
            {brokenTools.length > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
                {brokenTools.length} chưa sẵn sàng ({tools.filter((t) => toolConditionOf(t) === 'BROKEN').length} hỏng, {tools.filter((t) => toolConditionOf(t) === 'MISSING').length} thiếu)
              </span>
            )}
          </div>

          {/* Alert cảnh báo công cụ chưa đạt & thiếu cho dịch vụ (UI-T21, BR-T05) */}
          {missingForServices.length > 0 && (
            <div className="mb-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  Thiếu cho dịch vụ: {missingForServices.join('; ')}
                </span>
              </div>
            </div>
          )}

          {/* Lưới 4 cột các thẻ công cụ (UI-T22) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {tools.map((t) => {
              const ready = toolReady(t);
              const cond = toolConditionOf(t);
              const qty = toolQtyOf(t);
              const std = standardQtyOf(t.name);
              return (
                <div
                  key={t.id}
                  title={t.note ? `Ghi chú: ${t.note}` : undefined}
                  className={`flex flex-col justify-between p-2.5 rounded-lg border transition ${
                    ready
                      ? 'border-gray-200 bg-white'
                      : cond === 'BROKEN'
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench
                        size={14}
                        className={`shrink-0 ${ready ? 'text-gray-400' : cond === 'BROKEN' ? 'text-red-500' : 'text-amber-500'}`}
                      />
                      <span className="text-xs font-semibold text-gray-800 truncate" title={t.name}>{t.name}</span>
                    </div>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        ready
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : cond === 'BROKEN'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {qty}/{std} {t.unit ?? 'cái'} · {cond === 'GOOD' ? 'Tốt' : cond === 'BROKEN' ? 'Hỏng' : 'Thiếu'}
                    </span>
                  </div>
                  {t.note && (
                    <div className="mt-1 text-[10px] text-gray-500 italic truncate" title={t.note}>
                      💬 {t.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nút thay thế / bổ sung thiết bị DLG-T02 */}
          {canEditVehicle && (
          <button
            type="button"
            onClick={handleOpenToolModal}
            className="mt-4 w-full rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-bold text-gray-500 hover:border-[#00A859] hover:text-[#00A859] transition"
          >
            + Thay thế / bổ sung công cụ
          </button>
          )}
        </Section>
      )}

      {/* KHỐI 4: LỊCH SỬ THAY ĐỔI & NHẬT KÝ HOẠT ĐỘNG (B-HISTORY - Khớp FDD FL-M1-01) */}
      {!isCreate && (
        <Section title="Lịch sử thay đổi & Nhật ký hoạt động (Audit Log)" number={9} icon={<History size={16} />}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {AUDIT_FILTERS.map((ft) => (
              <button
                key={ft.key}
                type="button"
                onClick={() => setAuditFilter(ft.key)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${auditFilter === ft.key ? 'border-[#00A859] bg-[#00A859] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {ft.label}
              </button>
            ))}
          </div>
          {shownAuditLogs.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có dữ liệu.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600">
                    <th className="px-3 py-2.5 text-left font-bold border-r w-36">Thời gian</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r w-28">Loại</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r w-40">Người thực hiện</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r w-36">Nội dung</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r">Trước</th>
                    <th className="px-3 py-2.5 text-left font-bold border-r">Sau</th>
                    <th className="px-3 py-2.5 text-left font-bold">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shownAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-3 py-2.5 border-r text-gray-600 tabular-nums">{log.actedAt}</td>
                      <td className="px-3 py-2.5 border-r">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          {log.actionCode === 'RESCUE'
                            ? 'Cứu hộ'
                            : log.actionCode === 'TRANSFER'
                            ? 'Điều chuyển'
                            : log.actionCode === 'STATUS'
                            ? 'Trạng thái'
                            : log.actionCode === 'INACTIVE' || log.actionCode === 'CREATE'
                            ? 'Tạo / Vô hiệu'
                            : log.actionCode === 'DRIVER' || log.actionCode === 'PAIR' || log.actionCode === 'UNPAIR'
                            ? 'Ghép tài xế'
                            : log.actionCode === 'UPDATE_DOC' || log.actionCode === 'FILE'
                            ? 'Giấy tờ'
                            : log.actionCode === 'TOOLS' || log.actionCode === 'TOOL'
                            ? 'Công cụ'
                            : 'Hồ sơ'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-r font-medium text-gray-800">{log.actorName}</td>
                      <td className="px-3 py-2.5 border-r font-semibold text-gray-700">
                        <span className={log.actionCode === 'RESCUE' ? 'rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700' : ''}>{log.actionLabel}</span>
                      </td>
                      <td className="px-3 py-2.5 border-r text-gray-600">{log.oldValue}</td>
                      <td className="px-3 py-2.5 border-r font-semibold text-gray-800">
                        {log.newValue}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* CÁC MODAL THAO TÁC XE ĐÃ CÓ (ẨN HOÀN TOÀN TRÊN MÀN THÊM MỚI XE SCR-04) */}
      {!isCreate && (
        <>
          {/* DLG-01: NGỪNG HOẠT ĐỘNG */}
      <PartnerModal
        open={inactivateOpen}
        title={`Ngừng hoạt động xe — ${vehicle.plate}`}
        icon={<Ban size={20} className="text-red-500" />}
        onClose={() => setInactivateOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setInactivateOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmInactivate}
              disabled={inactivateReason === 'Khác' && inactivateNote.trim().length < 5}
              className={`${partnerBtnDanger} disabled:opacity-50`}
            >
              Xác nhận ngừng hoạt động
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-900 font-medium">
            Ngừng hoạt động xe <strong>{vehicle.plate}</strong>? Xe sẽ không được đề xuất cho các đơn
            cứu hộ mới trong toàn hệ thống.
          </div>

          {/* Cảnh báo hủy ghép tài xế (BR-15, UI-50, UI-52) */}
          {assignedDriverIds.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800 text-[11px] flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Cảnh báo tài xế:</strong> Xe đang được ghép với tài xế ({driverNames(vehicle.driverIds, vehicle.driverId)}). Khi xe ngừng hoạt động, tất cả tài xế này sẽ <strong>tự động bị hủy ghép</strong> theo quy định BR-15.
              </div>
            </div>
          )}

          <div>
            <label className={partnerLabelClass}>
              Lý do ngừng hoạt động <span className="text-red-500">*</span>
            </label>
            <select
              value={inactivateReason}
              onChange={(e) => setInactivateReason(e.target.value)}
              className={inputClass}
            >
              <option value="Thanh lý xe">Thanh lý xe</option>
              <option value="Bán xe sang nhượng">Bán xe sang nhượng</option>
              <option value="Hỏng nặng không phục hồi">Hỏng nặng không phục hồi</option>
              <option value="Chuyển mục đích sử dụng">Chuyển mục đích sử dụng</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className={partnerLabelClass}>
              Ghi chú {inactivateReason === 'Khác' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={inactivateNote}
              onChange={(e) => setInactivateNote(e.target.value)}
              placeholder="Nhập thông tin quyết định ngừng hoạt động..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </PartnerModal>

      {/* DLG-02: ĐIỀU CHUYỂN XE */}
      <PartnerModal
        open={transferOpen}
        title={`Điều chuyển xe — ${vehicle.plate}`}
        icon={<ArrowRightLeft size={20} />}
        onClose={() => setTransferOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setTransferOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!transferTo || !transferReturnValid}
              onClick={handleConfirmTransfer}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Xác nhận điều chuyển
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className={partnerLabelClass}>Từ trạm</label>
            <input
              type="text"
              readOnly
              value={orgName(vehicle.stationId)}
              className={`${inputClass} bg-gray-50 text-gray-500`}
            />
          </div>

          <div>
            <label className={partnerLabelClass}>
              Đến trạm tiếp nhận <span className="text-red-500">*</span>
            </label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn trạm tiếp nhận --</option>
              {STATION_OPTIONS.filter((s) => s.id !== vehicle.stationId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dịch vụ giữ lại tại trạm đích (UI-58) */}
          {transferTo && (
            <div>
              <label className={partnerLabelClass}>Dịch vụ giữ lại (Dịch vụ xe ∩ Trạm đích — UI-58)</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(vehicle.services ?? ['Xe hết pin', 'Kích bình ắc quy', 'Cẩu kéo xe tai nạn']).map((srv) => (
                  <span
                    key={srv}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    ✓ {srv}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                Chỉ các dịch vụ cả xe và trạm đích cùng hỗ trợ mới được giữ lại khi chuyển trạm.
              </p>
            </div>
          )}

          {/* Cảnh báo tài xế (BR-15, FL-M2-05 BR-G06) */}
          {assignedDriverIds.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800 text-[11px] flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Cảnh báo tài xế:</strong> Xe đang được ghép với {assignedDriverIds.length} tài xế ({driverNames(vehicle.driverIds, vehicle.driverId)}). Khi điều chuyển sang trạm mới, tất cả tài xế này sẽ <strong>tự động bị hủy ghép</strong> theo quy định BR-15.
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
            <label className={partnerLabelClass}>Lý do điều chuyển</label>
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="Nhập lý do điều chuyển..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </PartnerModal>

      {/* DLG-11: ĐỔI TRẠNG THÁI XE */}
      <PartnerModal
        open={statusOpen}
        title={`Đổi trạng thái xe — ${vehicle.plate}`}
        icon={<Clock size={20} />}
        onClose={() => setStatusOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setStatusOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmStatus}
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
                const s = vehicle.status ?? (vehicle.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
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
            {isInactive ? (
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
                    name="statusDetail"
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
                  const currentEff = vehicle.status ?? (vehicle.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
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
                        name="statusDetail"
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
                  const currentEff = vehicle.status ?? (vehicle.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
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
                        name="statusDetail"
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
                  const currentEff = vehicle.status ?? (vehicle.runStatus === 'repair' ? 'MAINTENANCE' : 'READY');
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
                        name="statusDetail"
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

          {targetStatus !== 'READY' && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className={partnerLabelClass}>
                  Nhóm lý do <span className="text-red-500">*</span>
                </label>
                <select
                  value={statusReasonCode}
                  onChange={(e) => setStatusReasonCode(e.target.value)}
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
                  Ghi chú chi tiết {statusReasonCode === 'OTHER' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={2}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Mô tả nguyên nhân cụ thể..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className={partnerLabelClass}>
                  Thời gian dự kiến quay lại <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={statusReturnAt}
                  onChange={(e) => setStatusReturnAt(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>
      </PartnerModal>

      {/* DLG-G01: GHÉP TÀI XẾ (QUAN HỆ N - N: CHỌN ĐƯỢC NHIỀU TÀI XẾ, BỎ TÍCH HẾT ĐƯỢC - UI-G14) */}
      <PartnerModal
        open={pairModalOpen}
        title={`Ghép tài xế chịu trách nhiệm — ${vehicle.plate}`}
        icon={<UserCheck size={20} />}
        onClose={() => setPairModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setPairModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={
                // Nút Lưu bật khi có thay đổi danh sách tài xế (UI-G14)
                JSON.stringify([...selectedDriverIdsForPair].sort()) === JSON.stringify([...assignedDriverIds].sort())
              }
              onClick={handleConfirmPair}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Lưu thay đổi ({selectedDriverIdsForPair.length} tài xế)
            </button>
          </>
        )}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Phương tiện:</span>
              <strong className="text-gray-800">{vehicle.plate} ({VEHICLE_TYPE_LABEL[vehicle.type]})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tài xế hiện tại:</span>
              <span className="font-semibold text-gray-700">
                {driverNames(vehicle.driverIds, vehicle.driverId) || 'Chưa gán tài xế'}
              </span>
            </div>
          </div>

          {/* Ghi chú quan hệ N - N */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-blue-900 flex items-start gap-2">
            <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Quan hệ N:N:</strong> Một phương tiện có thể được phân công cho nhiều tài xế phụ trách (theo ca, kíp hoặc dự phòng), và một tài xế cũng có thể được phân công cho nhiều xe. Có thể bỏ chọn tất cả để hủy ghép toàn bộ (UI-G14).
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={partnerLabelClass}>
                Chọn các tài xế thuộc {orgName(vehicle.stationId)}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDriverIdsForPair(driversAtStation(vehicle.stationId).map((d) => d.id))}
                  className="text-[11px] text-[#00A859] font-bold hover:underline"
                >
                  Chọn tất cả
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedDriverIdsForPair([])}
                  className="text-[11px] text-gray-500 font-bold hover:underline"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Danh sách tài xế dạng Checkbox List + Tài xế không đủ điều kiện (UI-G11, UI-G12) */}
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {driversAtStation(vehicle.stationId).length === 0 ? (
                <div className="p-4 text-center text-gray-400 italic">Trạm này chưa có tài xế nào</div>
              ) : (
                driversAtStation(vehicle.stationId).map((d) => {
                  const isSelected = selectedDriverIdsForPair.includes(d.id);
                  const otherVehicles = VEHICLES.filter(
                    (v) => v.id !== vehicle.id && ((v.driverIds?.includes(d.id)) || v.driverId === d.id)
                  );
                  // Kiểm tra tài xế đủ điều kiện: ví dụ tài xế bị khóa bằng lái hoặc không đủ bằng lái xe cẩu
                  const isEligible = !d.fullname.includes('(Bị khóa)');

                  if (!isEligible) {
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 bg-gray-50/70 text-gray-400 cursor-not-allowed opacity-60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input type="checkbox" disabled className="rounded h-4 w-4" />
                          <div>
                            <div className="font-semibold line-through">{d.fullname} ({d.phone})</div>
                            <div className="text-[10px] text-red-500 font-medium">Không đủ điều kiện: Bằng lái đang bị tạm giữ/hết hạn</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <label
                      key={d.id}
                      className={`flex items-center justify-between p-2.5 transition cursor-pointer ${
                        isSelected ? 'bg-emerald-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDriverIdsForPair((prev) => [...prev, d.id]);
                            } else {
                              setSelectedDriverIdsForPair((prev) => prev.filter((id) => id !== d.id));
                            }
                          }}
                          className="accent-[#00A859] rounded h-4 w-4"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-800 flex items-center gap-2">
                            <span>{d.fullname}</span>
                            <span className="text-[11px] tabular-nums text-gray-500">({d.phone})</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                            <span>Bằng {d.licenseType}</span>
                            {d.craneCert && (
                              <span className="text-emerald-700 bg-emerald-100 px-1 rounded text-[10px]">
                                Có CC cẩu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {otherVehicles.length > 0 ? (
                          <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            Ghép: {otherVehicles.map((v) => v.plate).join(', ')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Rảnh
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Dòng lý do khi có gỡ tài xế (UI-G11) */}
          {assignedDriverIds.some((id) => !selectedDriverIdsForPair.includes(id)) && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <label className={partnerLabelClass}>
                Lý do hủy ghép {assignedDriverIds.filter((id) => !selectedDriverIdsForPair.includes(id)).length} tài xế:
              </label>
              <input
                type="text"
                placeholder="VD: Điều chỉnh phân công phụ trách xe theo kế hoạch..."
                className={`${inputClass} mt-1`}
              />
            </div>
          )}

          {selectedDriverIdsForPair.length > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
              <div className="font-bold">Đã chọn ({selectedDriverIdsForPair.length} tài xế):</div>
              <div className="text-xs">
                {selectedDriverIdsForPair
                  .map((id) => PARTNER_STAFF.find((s) => s.id === id)?.fullname)
                  .filter(Boolean)
                  .join(', ')}
              </div>
            </div>
          )}
        </div>
      </PartnerModal>

      {/* DLG-G02: HỦY GHÉP TÀI XẾ */}
      <PartnerModal
        open={unpairModalOpen}
        title={`Hủy ghép tài xế — ${vehicle.plate}`}
        icon={<UserMinus size={20} className="text-red-500" />}
        onClose={() => setUnpairModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setUnpairModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={selectedDriverIdsToUnpair.length === 0 || (unpairReason === 'Khác' && unpairNote.trim().length < 5)}
              onClick={handleConfirmUnpair}
              className={partnerBtnDanger}
            >
              Xác nhận hủy ghép ({selectedDriverIdsToUnpair.length} tài xế)
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <p className="text-gray-700">
            Chọn các tài xế bạn muốn hủy ghép khỏi xe <strong>{vehicle.plate}</strong>:
          </p>

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {assignedDriverIds.map((id) => {
              const drv = PARTNER_STAFF.find((s) => s.id === id);
              if (!drv) return null;
              const isChecked = selectedDriverIdsToUnpair.includes(id);
              return (
                <label key={id} className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDriverIdsToUnpair((prev) => [...prev, id]);
                        } else {
                          setSelectedDriverIdsToUnpair((prev) => prev.filter((i) => i !== id));
                        }
                      }}
                      className="accent-red-500 rounded"
                    />
                    <span className="font-bold text-gray-800">{drv.fullname}</span>
                    <span className="text-gray-500 tabular-nums">({drv.phone})</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Bằng {drv.licenseType}</span>
                </label>
              );
            })}
          </div>

          <div>
            <label className={partnerLabelClass}>
              Lý do kết thúc ghép <span className="text-red-500">*</span>
            </label>
            <select
              value={unpairReason}
              onChange={(e) => setUnpairReason(e.target.value)}
              className={inputClass}
            >
              <option value="Chuyển xe khác / đổi ca trực">Chuyển xe khác / đổi ca trực</option>
              <option value="Tài xế nghỉ phép / ốm">Tài xế nghỉ phép / ốm</option>
              <option value="Điều chuyển trạm">Điều chuyển trạm</option>
              <option value="Nghỉ việc / chấm dứt hợp đồng">Nghỉ việc / chấm dứt hợp đồng</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div>
            <label className={partnerLabelClass}>
              Ghi chú {unpairReason === 'Khác' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={2}
              value={unpairNote}
              onChange={(e) => setUnpairNote(e.target.value)}
              placeholder="Nhập ghi chú thêm nếu cần..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </PartnerModal>

      {/* DLG-T02: CẬP NHẬT CÔNG CỤ XE (FDD DLG-T02) */}
      <PartnerModal
        open={toolModalOpen}
        title={`Cập nhật công cụ theo xe — ${vehicle.plate}`}
        icon={<Wrench size={20} />}
        xl
        onClose={() => setToolModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setToolModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveToolModal}
              className={partnerBtnBrand}
            >
              Lưu thay đổi
            </button>
          </>
        )}
      >
        <div className="space-y-4 text-xs">
          {toolModalError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0" />
              <span>{toolModalError}</span>
            </div>
          )}

          {/* Thêm nhanh từ danh mục Đang dùng chưa có trên xe (UI-T30) */}
          <div className="flex gap-2">
            <select
              value={selectedToolToAdd}
              onChange={(e) => {
                setSelectedToolToAdd(e.target.value);
                setToolModalError('');
              }}
              className={inputClass}
            >
              <option value="">-- Chọn công cụ từ danh mục để bổ sung --</option>
              {MASTER_TOOL_CATALOG
                .filter(
                  (c) =>
                    c.status === 'ACTIVE' &&
                    !tempTools.some((t) => t.name.toLowerCase() === c.name.toLowerCase())
                )
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.code} - {c.name} (Tiêu chuẩn: {c.standardQty} {c.unit})
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!selectedToolToAdd}
              onClick={handleAddToolRow}
              className="bg-[#00A859] text-white px-3.5 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition disabled:opacity-50 shrink-0"
            >
              + Bổ sung
            </button>
          </div>

          <p className="text-[11px] text-gray-500">
            Khai báo số lượng và tình trạng công cụ thực tế đang trang bị trên phương tiện. Bắt buộc nhập ghi chú khi công cụ ở tình trạng Hỏng hoặc Thiếu.
          </p>

          {/* Bảng danh sách công cụ (UI-T32) */}
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-gray-50 border-b text-gray-600 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Công cụ</th>
                  <th className="p-2 text-center w-16">Số lượng</th>
                  <th className="p-2 text-center w-24">SL chuẩn</th>
                  <th className="p-2 text-center w-28">Tình trạng</th>
                  <th className="p-2 text-left">Ghi chú (bắt buộc khi Hỏng/Thiếu)</th>
                  <th className="p-2 text-center w-10">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tempTools.map((t, idx) => {
                  const cond = toolConditionOf(t);
                  const isProblem = cond === 'BROKEN' || cond === 'MISSING';
                  const noteMissing = isProblem && (!t.note || t.note.trim().length < 5);

                  return (
                    <tr key={t.id} className={noteMissing ? 'bg-amber-50/40' : ''}>
                      <td className="p-2 font-medium text-gray-800 whitespace-nowrap">{t.name}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={toolQtyOf(t)}
                          onChange={(e) => {
                            const quantity = Math.max(0, Math.min(99, Number(e.target.value) || 0));
                            const std = standardQtyOf(t.name);
                            setTempTools((prev) =>
                              prev.map((item, i) => {
                                if (i !== idx) return item;
                                let condition: VehicleToolCondition = item.condition ?? 'GOOD';
                                if (condition !== 'BROKEN') {
                                  condition = quantity >= std ? 'GOOD' : 'MISSING';
                                }
                                return {
                                  ...item,
                                  quantity,
                                  condition,
                                  status: condition === 'GOOD' && quantity >= std ? 1 : 0,
                                };
                              })
                            );
                            setToolModalError('');
                          }}
                          className="w-14 rounded border border-gray-200 px-2 py-1 text-center text-xs font-bold"
                        />
                      </td>
                      <td className="p-2 text-center tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                        {standardQtyOf(t.name)} {t.unit ?? 'cái'}
                      </td>
                      <td className="p-2 text-center">
                        <select
                          value={cond}
                          onChange={(e) => {
                            const condition = e.target.value as 'GOOD' | 'BROKEN' | 'MISSING';
                            const std = standardQtyOf(t.name);
                            setTempTools((prev) =>
                              prev.map((item, i) => {
                                if (i !== idx) return item;
                                let quantity = toolQtyOf(item);
                                if (condition === 'GOOD' && quantity < std) {
                                  quantity = std;
                                }
                                if (condition === 'MISSING' && quantity >= std) {
                                  quantity = Math.max(0, std - 1);
                                }
                                return {
                                  ...item,
                                  condition,
                                  quantity,
                                  status: condition === 'GOOD' && quantity >= std ? 1 : 0,
                                };
                              })
                            );
                            setToolModalError('');
                          }}
                          className={`text-xs font-bold px-2 py-1 rounded border outline-none ${
                            toolReady(t)
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : cond === 'BROKEN'
                              ? 'text-red-700 bg-red-50 border-red-200'
                              : 'text-amber-700 bg-amber-50 border-amber-200'
                          }`}
                        >
                          <option value="GOOD">Tốt (Đủ tiêu chuẩn)</option>
                          <option value="BROKEN">Hỏng</option>
                          <option value="MISSING">Thiếu (Chưa đủ)</option>
                        </select>
                        {toolQtyOf(t) < standardQtyOf(t.name) && cond !== 'BROKEN' && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5 whitespace-nowrap">
                            Thiếu {standardQtyOf(t.name) - toolQtyOf(t)}
                          </div>
                        )}
                      </td>
                      {/* UI-T37: Cột Ghi chú */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={t.note || ''}
                          placeholder={isProblem ? 'Nhập lý do hỏng/thiếu (bắt buộc ≥5 ký tự)...' : 'Ghi chú thêm nếu có...'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempTools((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, note: val } : item))
                            );
                            setToolModalError('');
                          }}
                          className={`w-full rounded border px-2 py-1 text-xs outline-none ${
                            noteMissing
                              ? 'border-red-400 bg-red-50/50 focus:border-red-500'
                              : 'border-gray-200 focus:border-[#00A859]'
                          }`}
                        />
                        {noteMissing && (
                          <div className="text-[10px] text-red-500 mt-0.5">
                            Vui lòng nhập ghi chú (tối thiểu 5 ký tự)
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setTempTools((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                          title="Xóa công cụ này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PartnerModal>
    </>
  )}

      {/* DLG-03: THÊM / SỬA GIẤY TỜ */}
      <PartnerModal
        open={docModalOpen}
        title={editingDocId ? 'Sửa giấy tờ xe' : 'Đính kèm giấy tờ xe'}
        icon={<FileText size={20} />}
        onClose={() => setDocModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveDoc}
              className={partnerBtnBrand}
            >
              Lưu giấy tờ
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className={partnerLabelClass}>
              Tên giấy tờ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docForm.name}
              onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
              placeholder="VD: Giấy chứng nhận đăng kiểm"
              className={inputClass}
            />
          </div>

          <div>
            <label className={partnerLabelClass}>Loại giấy tờ</label>
            <select
              value={docForm.type}
              onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}
              className={inputClass}
            >
              <option value="Đăng kiểm">Đăng kiểm (bắt buộc)</option>
              <option value="BH TNDS">BH TNDS (bắt buộc)</option>
              <option value="GPLH">Giấy phép lưu hành (bắt buộc)</option>
              <option value="BH vật chất">BH vật chất (tùy chọn)</option>
            </select>
          </div>

          <div>
            <label className={partnerLabelClass}>Số giấy tờ</label>
            <input
              type="text"
              value={docForm.number}
              onChange={(e) => setDocForm({ ...docForm, number: e.target.value })}
              className={inputClass}
              placeholder="Số giấy tờ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>Ngày cấp</label>
              <input
                type="text"
                value={docForm.issuedAt}
                onChange={(e) => setDocForm({ ...docForm, issuedAt: e.target.value })}
                placeholder="DD/MM/YYYY"
                className={inputClass}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>
                Ngày hết hạn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={docForm.expiryAt}
                onChange={(e) => setDocForm({ ...docForm, expiryAt: e.target.value })}
                placeholder="DD/MM/YYYY"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>Tệp đính kèm (PDF, PNG, JPG)</label>
            <FileDrop
              accept=".pdf,image/*"
              file={docFile}
              hint="Chọn hoặc kéo thả tệp"
              onFile={setDocFile}
            />
            {!docFile && docForm.fileName && (
              <p className="mt-1 text-[11px] text-gray-500 font-medium">
                Tệp hiện tại: {docForm.fileName}
              </p>
            )}
          </div>
        </div>
      </PartnerModal>

      {/* Modal tải ảnh */}
      <PartnerModal
        open={photoOpen}
        title="Thêm ảnh xe"
        icon={<ImageIcon size={20} />}
        onClose={() => setPhotoOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setPhotoOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!photoFile}
              onClick={() => {
                if (!photoFile) return;
                const newP: VehiclePhoto = {
                  id: `p-${Date.now()}`,
                  label: photoLabel,
                  url: URL.createObjectURL(photoFile),
                };
                setPhotos((prev) => [...prev.filter((p) => p.label !== photoLabel), newP]);
                setPhotoOpen(false);
                setPhotoFile(null);
                triggerToast(`Đã thêm ảnh ${photoLabel}`);
              }}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Lưu ảnh
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className={partnerLabelClass}>Góc chụp / Nhãn ảnh</label>
            <select
              value={photoLabel}
              onChange={(e) => setPhotoLabel(e.target.value)}
              className={inputClass}
            >
              <option value="Góc trước">Góc trước</option>
              <option value="Góc sau">Góc sau</option>
              <option value="Bên trái">Bên trái</option>
              <option value="Bên phải">Bên phải</option>
              <option value="Nội thất">Nội thất</option>
              <option value="Ảnh khác">Ảnh khác</option>
            </select>
          </div>

          <div>
            <label className={partnerLabelClass}>Chọn tệp hình ảnh</label>
            <FileDrop accept="image/*" file={photoFile} hint="PNG, JPG" onFile={setPhotoFile} />
          </div>
        </div>
      </PartnerModal>

      {/* Preview ảnh phóng to */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreviewPhoto(null)}
        >
          <img
            src={previewPhoto}
            alt=""
            className="max-h-full max-w-full rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Preview tài liệu */}
      <PartnerModal
        open={!!previewDoc}
        title="Xem tài liệu"
        icon={<Eye size={20} />}
        onClose={() => setPreviewDoc(null)}
        footer={(
          <button
            type="button"
            onClick={() => setPreviewDoc(null)}
            className={partnerBtnBrand}
          >
            Đóng
          </button>
        )}
      >
        {previewDoc && (
          <div className="space-y-3 text-xs">
            <p className="font-bold text-gray-800">
              {previewDoc.name} · {previewDoc.fileName}
            </p>
            {previewDoc.fileUrl ? (
              <div className="rounded-lg border p-2 bg-gray-50 flex flex-col items-center justify-center min-h-60">
                <FileText size={48} className="text-[#00A859] mb-2" />
                <span className="font-semibold text-gray-700">{previewDoc.fileName}</span>
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-[#00A859] font-bold hover:underline"
                >
                  Tải xuống / Mở trong tab mới
                </a>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-gray-500">
                Chưa có tệp xem trước trực tuyến.
              </div>
            )}
          </div>
        )}
      </PartnerModal>

      <MapSelectionModal
        isOpen={parkMapOpen}
        onClose={() => setParkMapOpen(false)}
        onConfirm={(address, coords) => {
          setParkAddress(address);
          setParkCoords(coords);
          setParkMapOpen(false);
        }}
        initialAddress={parkAddress}
        initialCoords={parkCoords}
        title="Chọn vị trí đặt xe"
        pinLabel="Vị trí đặt xe tại đây"
      />
    </div>
  );
};

export default PartnerVehicleDetail;
