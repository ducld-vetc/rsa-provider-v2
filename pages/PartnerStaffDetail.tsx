import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Check,
  ClipboardList,
  Eye,
  FileText,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Truck,
  Unlock,
  UserRound,
  Clock,
  X,
} from 'lucide-react';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import { FileDrop, PartnerModal, partnerBtnBrand, partnerBtnNeutral, partnerInputClass as inputClass, partnerLabelClass } from '../components/PartnerModal';
import {
  ORG_NODES,
  PARTNER_STAFF,
  LICENSE_CLASSES,
  ROLE_LABEL,
  STAFF_ROLE_LABEL,
  STAFF_ROLE_OF,
  STAFF_ROLE_TO_PARTNER,
  type StaffRole,
  hasFieldBlocks,
  staffRoleLabel,
  SKILL_LEVEL_LABEL,
  STAFF_DOC_TYPES,
  STAFF_DUTY_STATUS_LABEL,
  STAFF_LOG_KIND_LABEL,
  STAFF_TRANSFER_HISTORY,
  STAFF_WORK_STATUS_LABEL,
  STATION_OPTIONS,
  STATIONS,
  getStationsForOrg,
  generateStaffUsername,
  VEHICLE_TYPE_LABEL,
  VEHICLES,
  assignDriverToVehicle,
  dueBadge,
  inScope,
  maskCccd,
  nextStaffCode,
  orgName,
  registerStaff,
  registerStaffLog,
  registerStaffTransfer,
  saveStaffDocs,
  staffAccountLabel,
  staffDocsOf,
  staffDutyStatusOf,
  staffLogsOf,
  staffTypeOf,
  staffUsername,
  staffWorkStatusOf,
  updateStaff,
  vehiclesOfDriver,
  type PartnerPersona,
  type PartnerRole,
  type PartnerStaffRecord,
  type StaffDocument,
  type SkillLevel,
  type StaffDutyStatus,
  type StaffSkill,
  type StaffTransferHistory,
  type StaffUserLog,
  type StaffWorkStatus,
} from '../data/partnerRescueMockData';

const emptyDoc = { name: '', type: 'Bằng lái', number: '', docClass: 'C', issuedAt: '', expiryAt: '', fileName: '', fileUrl: '' };

/** Dịch vụ trạm đăng ký (mock) — nguồn kỹ năng (FL-M2-01 BR-13) */
const STATION_SERVICES = ['Kéo xe', 'Cứu hộ lốp', 'Kích bình ắc quy', 'Mở khóa xe', 'Tiếp nhiên liệu', 'Sửa chữa tại chỗ'];

/** Kỹ năng mẫu khi chưa khai báo */
const defaultSkillsOf = (s: Pick<PartnerStaffRecord, 'role' | 'skills'>): StaffSkill[] =>
  s.skills ?? (s.role === 'NVCH' ? [{ service: 'Kéo xe', level: 2 }, { service: 'Cứu hộ lốp', level: 1 }] : []);

/** Loại xe có cẩu cần chứng chỉ vận hành cẩu (FL-M2-01 BR-19) */
const CRANE_VEHICLE_TYPES = ['san_truot_cau'];

const parseViDate = (raw: string) => {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
};

const daysUntil = (expiryAt: string) => {
  const d = parseViDate(expiryAt);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};

const syncLicenseFields = (docs: StaffDocument[]): Pick<PartnerStaffRecord, 'licenseType' | 'licenseIssued' | 'licenseExpiry' | 'craneCert'> => {
  const license = docs.find((d) => d.type === 'Bằng lái');
  return {
    licenseType: license?.name || '—',
    licenseIssued: license?.issuedAt || '—',
    licenseExpiry: license?.expiryAt || '—',
    craneCert: docs.some((d) => d.type === 'Chứng chỉ vận hành cẩu'),
  };
};

const Section: React.FC<{ title: string; number: number; icon?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  number,
  icon,
  children,
}) => (
  <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
    <div className="flex items-center justify-between rounded-t-lg bg-vetc-green px-4 py-2 text-sm font-bold text-white">
      <div className="flex items-center space-x-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">{number}</span>
        <span>{title}</span>
      </div>
      {icon && <div className="opacity-80">{icon}</div>}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="mb-1 flex items-center text-[11px] font-bold uppercase text-gray-600">
    {children}
    {required && <span className="ml-0.5 text-red-500">*</span>}
  </label>
);

const fieldControlClass = (locked: boolean) =>
  `w-full border rounded px-3 py-1.5 text-xs outline-none focus:border-vetc-green transition-all ${
    locked ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-100' : 'bg-white'
  }`;

const workStatusBadgeClass = (status: StaffWorkStatus) => {
  if (status === 'paused') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (status === 'left') return 'bg-gray-100 text-gray-600 border-gray-200';
  return 'bg-green-50 text-green-700 border-green-200';
};

const dutyBadgeClass = (status: StaffDutyStatus) => {
  if (status === 'on_order') return 'bg-blue-50 text-blue-800';
  if (status === 'on_duty') return 'bg-emerald-50 text-emerald-800';
  return 'bg-gray-100 text-gray-500';
};

const logKindClass = (kind: StaffUserLog['kind']) => {
  if (kind === 'rescue') return 'bg-blue-50 text-blue-700';
  if (kind === 'transfer') return 'bg-violet-50 text-violet-700';
  if (kind === 'vehicle') return 'bg-emerald-50 text-emerald-700';
  if (kind === 'lock') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const usernameOf = (s: PartnerStaffRecord | string) => staffUsername(s);

const emailOf = (s: Pick<PartnerStaffRecord, 'code' | 'email'> & Partial<PartnerStaffRecord>) =>
  s.email || (s.username ? `${s.username}@carpla.vn` : `${staffUsername(s as any)}@carpla.vn`);

const defaultCreateDocs = (): StaffDocument[] => [
  {
    id: `sd-${Date.now()}`,
    name: 'Bằng lái hạng C',
    type: 'Bằng lái',
    number: '010100000000',
    docClass: 'C',
    issuedAt: '01/01/2024',
    expiryAt: '01/01/2034',
    fileName: 'bang-lai.pdf',
  },
];

const PartnerStaffDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreate = id === 'new' || location.pathname === '/partner/staff/new' || location.pathname.endsWith('/staff/new');
  const [searchParams] = useSearchParams();
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const openEditRef = React.useRef<(() => void) | null>(null);
  const [record, setRecord] = useState(() => (isCreate ? undefined : PARTNER_STAFF.find((s) => s.id === id)));
  const [editing, setEditing] = useState(isCreate || searchParams.get('edit') === '1');
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateAt, setDeactivateAt] = useState(new Date().toLocaleDateString('vi-VN'));
  const [logFilter, setLogFilter] = useState<StaffUserLog['kind'] | 'ALL'>('ALL');
  const [docs, setDocs] = useState<StaffDocument[]>(() => (isCreate ? defaultCreateDocs() : staffDocsOf(id ?? '')));
  const [docsSnapshot, setDocsSnapshot] = useState<StaffDocument[]>(docs);
  const [docOpen, setDocOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<StaffDocument | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferEffectiveDate, setTransferEffectiveDate] = useState('2026-11-01');
  const [transferReason, setTransferReason] = useState('Bổ sung nhân sự theo ca');
  const [transferNote, setTransferNote] = useState('');

  // DLG-01: Khóa tài khoản
  const [lockReasonCode, setLockReasonCode] = useState<'VI_PHAM' | 'NGHI_VIEC' | 'BAO_MAT' | 'OTHER'>('VI_PHAM');
  const [lockReasonText, setLockReasonText] = useState('');

  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [vehicleRev, setVehicleRev] = useState(0);
  const [history, setHistory] = useState<StaffTransferHistory[]>(() =>
    isCreate ? [] : STAFF_TRANSFER_HISTORY.filter((t) => t.staffId === id)
  );
  const [logs, setLogs] = useState<StaffUserLog[]>(() => (isCreate ? [] : staffLogsOf(id ?? '')));

  // DLG-04: Đổi trạng thái nhân sự (tương tự phương tiện)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetWorkStatus, setTargetWorkStatus] = useState<StaffWorkStatus>('active');
  const [statusEffectiveDate, setStatusEffectiveDate] = useState(new Date().toLocaleDateString('vi-VN'));
  const [statusReason, setStatusReason] = useState('');

  const [editForm, setEditForm] = useState({
    username: '',
    fullname: '',
    phone: '',
    cccd: '',
    email: '',
    address: '',
    role: 'NVCH' as PartnerRole,
    orgNodeId: 'tt-hm',
    stationId: 'tt-hm',
    hasAccount: true,
    accountLocked: false,
    canQuote: false,
    canRescue: true,
    workStatus: 'active' as StaffWorkStatus,
    dutyStatus: 'offline' as StaffDutyStatus,
    contractType: 'Toàn thời gian',
    joinedAt: new Date().toLocaleDateString('vi-VN'),
    mfaEnabled: false,
    vehicleId: '',
    staffType: 'driver' as 'driver' | 'office',
    stationManagerRight: false,
    skills: defaultSkillsOf({ role: 'NVCH', skills: undefined }),
  });

  useEffect(() => {
    if (isCreate) {
      setRecord(undefined);
      setEditing(true);
      setEditForm({
        username: '',
        fullname: '',
        phone: '',
        cccd: '',
        email: '',
        address: '',
        role: 'NVCH',
        orgNodeId: 'tt-hm',
        stationId: 'tt-hm',
        hasAccount: true,
        accountLocked: false,
        canQuote: false,
        canRescue: true,
        workStatus: 'active',
        dutyStatus: 'offline',
        contractType: 'Toàn thời gian',
        joinedAt: new Date().toLocaleDateString('vi-VN'),
        mfaEnabled: false,
        vehicleId: '',
        staffType: 'driver',
        stationManagerRight: false,
        skills: defaultSkillsOf({ role: 'NVCH', skills: undefined }),
      });
      const initDocs = defaultCreateDocs();
      setDocs(initDocs);
      setDocsSnapshot(initDocs);
      setHistory([]);
      setLogs([]);
      setFormErrors([]);
    } else {
      const found = PARTNER_STAFF.find((s) => s.id === id);
      setRecord(found);
      const isEditParam = searchParams.get('edit') === '1';
      setEditing(isEditParam);
      if (found) {
        setEditForm({
          username: found.username || staffUsername(found),
          fullname: found.fullname,
          phone: found.phone,
          cccd: found.cccd,
          email: emailOf(found),
          address: found.address,
          role: found.role,
          orgNodeId: found.orgNodeId,
          stationId: found.stationId ?? '',
          hasAccount: found.hasAccount,
          accountLocked: found.accountLocked ?? false,
          canQuote: found.canQuote,
          canRescue: found.canRescue,
          workStatus: staffWorkStatusOf(found),
          dutyStatus: staffDutyStatusOf(found) ?? 'offline',
          contractType: found.contractType || 'Toàn thời gian',
          joinedAt: found.joinedAt || '',
          mfaEnabled: found.mfaEnabled ?? false,
          vehicleId: '',
          staffType: staffTypeOf(found),
          stationManagerRight: found.stationManagerRight ?? false,
          skills: defaultSkillsOf(found),
        });
        const d = staffDocsOf(found.id);
        setDocs(d);
        setDocsSnapshot(d);
        setHistory(STAFF_TRANSFER_HISTORY.filter((t) => t.staffId === found.id));
        setLogs(staffLogsOf(found.id));
      }
    }
  }, [id, isCreate, location.pathname, searchParams]);

  // FDD FL-M2-01 A4.1: Quản lý = Admin / Đối tác. Trưởng trạm (GDTT) chỉ xem + thêm tài xế.
  const canEdit = persona.role === 'BDH' || persona.role === 'GDM' || persona.role === 'GDCN' || persona.role === 'QLVUNG';
  const createdByStationHead = isCreate && persona.role === 'GDTT';

  if (!isCreate && !record) {
    return (
      <div>
        <p className="text-sm text-gray-500">Không tìm thấy nhân viên.</p>
        <button type="button" onClick={() => navigate('/partner/staff')} className="mt-3 text-[12px] font-bold text-[#00A859]">
          ← Về danh sách
        </button>
      </div>
    );
  }

  const staff: PartnerStaffRecord = record ?? {
    id: 'new',
    code: nextStaffCode(),
    username: record?.username || editForm.username || generateStaffUsername(editForm.fullname, PARTNER_STAFF.map((x) => x.username || staffUsername(x))),
    fullname: editForm.fullname,
    phone: editForm.phone,
    cccd: editForm.cccd,
    address: editForm.address,
    role: editForm.role,
    orgNodeId: editForm.orgNodeId,
    stationId: editForm.stationId || null,
    ...syncLicenseFields(docs),
    hasAccount: editForm.hasAccount,
    email: editForm.email,
    accountLocked: editForm.accountLocked,
    canQuote: editForm.canQuote,
    canRescue: editForm.canRescue,
    workStatus: editForm.workStatus,
    dutyStatus: editForm.dutyStatus,
    contractType: editForm.contractType,
    joinedAt: editForm.joinedAt,
    mfaEnabled: editForm.mfaEnabled,
    staffType: editForm.staffType,
    stationManagerRight: editForm.stationManagerRight,
    skills: editForm.skills,
  };

  const locked = !editing;
  const shown = editing ? editForm : {
    username: staff.username || staffUsername(staff),
    fullname: staff.fullname,
    phone: staff.phone,
    cccd: staff.cccd,
    email: emailOf(staff),
    address: staff.address,
    role: staff.role,
    orgNodeId: staff.orgNodeId,
    stationId: staff.stationId ?? '',
    hasAccount: staff.hasAccount,
    accountLocked: staff.accountLocked ?? false,
    canQuote: staff.canQuote,
    canRescue: staff.canRescue,
    workStatus: staffWorkStatusOf(staff),
    dutyStatus: staffDutyStatusOf(staff) ?? 'offline',
    contractType: staff.contractType || 'Toàn thời gian',
    joinedAt: staff.joinedAt || '—',
    mfaEnabled: staff.mfaEnabled ?? false,
    vehicleId: '',
    staffType: staffTypeOf(staff),
    stationManagerRight: staff.stationManagerRight ?? false,
    skills: defaultSkillsOf(staff),
  };
  const code = isCreate ? nextStaffCode() : staff.code;
  const workStatus = staffWorkStatusOf(staff);
  const dutyStatus = staffDutyStatusOf(staff);
  const assignedVehicles = !isCreate && vehicleRev >= 0 ? vehiclesOfDriver(staff.id) : [];
  const isDriver = shown.role === 'NVCH';
  // BR-21: khối ③ Kỹ năng & giấy tờ, ④ Xe đang gán chỉ cho Quản lý trạm và Tài xế
  const showFieldBlocks = hasFieldBlocks(shown.role);
  const expiringDocs = docs
    .map((d) => ({ doc: d, days: daysUntil(d.expiryAt) }))
    .filter((x) => x.days != null && x.days <= 30);
  // BR-19: xe có cẩu mà không có chứng chỉ vận hành cẩu còn hạn
  const hasValidCraneCert = docs.some((d) => d.type === 'Chứng chỉ vận hành cẩu' && (daysUntil(d.expiryAt) ?? 0) >= 0);
  const craneMissingVehicles = assignedVehicles.filter((v) => CRANE_VEHICLE_TYPES.includes(v.type) && !hasValidCraneCert);
  const craneWarn = craneMissingVehicles.length > 0;
  // A4.1, A4.2: ẩn / hiện hành động theo quyền + trạng thái
  const canUpdate = canEdit && workStatus !== 'left';
  const canResetPassword = canEdit && staff.hasAccount && !staff.accountLocked && workStatus !== 'left';
  const canLock = canEdit && staff.hasAccount && !staff.accountLocked;
  const canUnlock = canEdit && staff.hasAccount && !!staff.accountLocked && workStatus !== 'left';
  const canGrantAccount = canEdit && !staff.hasAccount && workStatus === 'active';
  const canTransfer = canEdit && workStatus === 'active' && !!staff.stationId;
  const showFullCccd = canEdit || isCreate;
  const shownLogs = logFilter === 'ALL' ? logs : logs.filter((l) => l.kind === logFilter);

  const openStatusModal = () => {
    setTargetWorkStatus(workStatus);
    setStatusEffectiveDate(new Date().toLocaleDateString('vi-VN'));
    setStatusReason('');
    setStatusModalOpen(true);
  };

  const confirmStatusChange = () => {
    if (!record) return;
    const oldStatusLabel = STAFF_WORK_STATUS_LABEL[workStatus];
    const newStatusLabel = STAFF_WORK_STATUS_LABEL[targetWorkStatus];
    const nowStr = `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    updateStaff(record.id, { workStatus: targetWorkStatus });
    const log: StaffUserLog = {
      id: `lg-${Date.now()}`,
      staffId: record.id,
      kind: 'profile',
      at: nowStr,
      summary: `Đổi trạng thái: ${oldStatusLabel} → ${newStatusLabel} · Ngày áp dụng: ${statusEffectiveDate} · Lý do: ${statusReason.trim()}`,
    };
    registerStaffLog(log);
    setRecord({ ...record, workStatus: targetWorkStatus });
    setEditForm((prev) => ({ ...prev, workStatus: targetWorkStatus }));
    setLogs((prev) => [log, ...prev]);
    setStatusModalOpen(false);
    setNotice(`Đã đổi trạng thái nhân sự ${record.fullname} sang "${newStatusLabel}"`);
  };

  const openEdit = () => {
    if (!record) return;
    setEditForm({
      username: record.username || staffUsername(record),
      fullname: record.fullname,
      phone: record.phone,
      cccd: record.cccd,
      email: emailOf(record),
      address: record.address,
      role: record.role,
      orgNodeId: record.orgNodeId,
      stationId: record.stationId ?? '',
      hasAccount: record.hasAccount,
      accountLocked: record.accountLocked ?? false,
      canQuote: record.canQuote,
      canRescue: record.canRescue,
      workStatus: staffWorkStatusOf(record),
      dutyStatus: staffDutyStatusOf(record) ?? 'offline',
      contractType: record.contractType || 'Toàn thời gian',
      joinedAt: record.joinedAt || '',
      mfaEnabled: record.mfaEnabled ?? false,
      vehicleId: '',
      staffType: staffTypeOf(record),
      stationManagerRight: record.stationManagerRight ?? false,
      skills: defaultSkillsOf(record),
    });
    setDocsSnapshot(docs);
    setEditing(true);
  };
  openEditRef.current = openEdit;

  const cancelEdit = () => {
    if (isCreate) navigate('/partner/staff');
    else {
      setDocs(docsSnapshot);
      setEditing(false);
    }
  };

  const openAddDoc = () => {
    setEditingDocId(null);
    setDocForm(emptyDoc);
    setDocFile(null);
    setDocOpen(true);
  };

  const openEditDoc = (d: StaffDocument) => {
    setEditingDocId(d.id);
    setDocForm({
      name: d.name,
      type: d.type,
      number: d.number ?? '',
      docClass: d.docClass ?? 'C',
      issuedAt: d.issuedAt,
      expiryAt: d.expiryAt,
      fileName: d.fileName,
      fileUrl: d.fileUrl ?? '',
    });
    setDocFile(null);
    setDocOpen(true);
  };

  const confirmDoc = () => {
    if (!docForm.number.trim() || !docForm.expiryAt.trim()) return;
    const isLicense = docForm.type === 'Bằng lái';
    const fileName = docFile?.name || docForm.fileName || 'tai-lieu.pdf';
    const fileUrl = docFile ? URL.createObjectURL(docFile) : docForm.fileUrl;
    const payload: StaffDocument = {
      id: editingDocId ?? `sd-${Date.now()}`,
      name: isLicense ? `Bằng lái hạng ${docForm.docClass}` : docForm.type,
      type: docForm.type,
      number: docForm.number.trim(),
      docClass: isLicense ? docForm.docClass : undefined,
      issuedAt: docForm.issuedAt || '—',
      expiryAt: docForm.expiryAt || '—',
      fileName,
      fileUrl,
    };
    // Mỗi loại giấy tờ một bản hiệu lực: thêm mới cùng loại thì thay bản cũ
    setDocs((prev) => (editingDocId ? prev.map((d) => (d.id === editingDocId ? payload : d)) : [...prev.filter((d) => d.type !== payload.type), payload]));
    setDocOpen(false);
    setDocFile(null);
    setEditingDocId(null);
  };

  const confirmEdit = (deactivateConfirmed = false) => {
    // VAL-01..11 (FDD FL-M2-01)
    const errs: string[] = [];
    const name = editForm.fullname.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 100) errs.push('Họ tên từ 2 đến 100 ký tự');
    const phoneNorm = editForm.phone.replace(/[\s.\-()]/g, '').replace(/^\+84/, '0');
    if (!/^0\d{9}$/.test(phoneNorm)) errs.push('Số điện thoại phải gồm 10 số, bắt đầu bằng 0');
    const cccd = editForm.cccd.trim();
    if (cccd && cccd !== '—' && !/^\d{12}$/.test(cccd)) errs.push('CCCD phải gồm 12 chữ số');
    if (!editForm.contractType.trim()) errs.push('Vui lòng chọn loại hợp đồng');
    if (editForm.role === 'NVCH') {
      if (!docs.some((d) => d.type === 'Bằng lái')) errs.push('Tài xế phải khai báo bằng lái');
      if (editForm.skills.length === 0) errs.push('Tài xế phải có ít nhất một dịch vụ');
    }
    setFormErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // A4: đổi Trạng thái HĐ sang Không hoạt động / Ngừng vĩnh viễn → hộp thoại Vô hiệu hóa
    if (!isCreate && !deactivateConfirmed && editForm.workStatus !== 'active' && editForm.workStatus !== staffWorkStatusOf(staff)) {
      setDeactivateOpen(true);
      return;
    }
    const org = ORG_NODES.find((n) => n.id === editForm.orgNodeId);
    const stationId = org?.isStation ? editForm.orgNodeId : (editForm.stationId || null);
    const existingUsernames = PARTNER_STAFF.filter((x) => x.id !== (record?.id ?? '')).map((x) => x.username || staffUsername(x));
    const finalUsername = editForm.username || generateStaffUsername(editForm.fullname, existingUsernames);
    const patch: Partial<PartnerStaffRecord> = {
      username: finalUsername,
      fullname: editForm.fullname.trim(),
      phone: editForm.phone.trim() || '—',
      cccd: editForm.cccd.trim() || '—',
      email: editForm.email.trim() || (finalUsername ? `${finalUsername}@carpla.vn` : emailOf({ code, email: '' })),
      address: editForm.address.trim() || '—',
      role: editForm.role,
      orgNodeId: editForm.orgNodeId,
      stationId,
      ...syncLicenseFields(docs),
      canQuote: editForm.canQuote,
      canRescue: editForm.canRescue,
      workStatus: editForm.workStatus,
      dutyStatus: editForm.dutyStatus,
      contractType: editForm.contractType.trim() || 'Toàn thời gian',
      joinedAt: editForm.joinedAt.trim() || undefined,
      staffType: editForm.staffType,
      stationManagerRight: editForm.stationManagerRight,
      skills: hasFieldBlocks(editForm.role) ? editForm.skills : [],
      ...(deactivateConfirmed ? { reason: deactivateReason } : {}),
    };
    if (isCreate) {
      const newId = `s-${Date.now()}`;
      const next: PartnerStaffRecord = {
        id: newId,
        code,
        username: finalUsername,
        fullname: patch.fullname!,
        phone: patch.phone!,
        cccd: patch.cccd!,
        address: patch.address!,
        role: patch.role!,
        orgNodeId: patch.orgNodeId!,
        stationId: patch.stationId ?? null,
        licenseType: patch.licenseType!,
        licenseIssued: patch.licenseIssued!,
        licenseExpiry: patch.licenseExpiry!,
        craneCert: patch.craneCert!,
        hasAccount: editForm.hasAccount,
        email: patch.email,
        accountLocked: false,
        canQuote: patch.canQuote!,
        canRescue: patch.canRescue!,
        workStatus: patch.workStatus ?? 'active',
        dutyStatus: patch.dutyStatus ?? 'offline',
        contractType: patch.contractType,
        joinedAt: patch.joinedAt,
        staffType: patch.staffType,
        stationManagerRight: patch.stationManagerRight,
        skills: patch.skills,
      };
      registerStaff(next);
      saveStaffDocs(newId, docs);
      const log: StaffUserLog = {
        id: `lg-${Date.now()}`,
        staffId: newId,
        kind: 'profile',
        at: new Date().toLocaleString('vi-VN'),
        summary: `Tạo mới hồ sơ nhân sự (${staffRoleLabel(next.role)})`,
      };
      registerStaffLog(log);
      navigate(`/partner/staff/${newId}`);
      return;
    }
    updateStaff(staff.id, patch);
    saveStaffDocs(staff.id, docs);
    setRecord({ ...staff, ...patch });
    const log: StaffUserLog = {
      id: `lg-${Date.now()}`,
      staffId: staff.id,
      kind: 'profile',
      at: new Date().toLocaleString('vi-VN'),
      summary: deactivateConfirmed
        ? `Vô hiệu hóa: ${STAFF_WORK_STATUS_LABEL[editForm.workStatus]} từ ${deactivateAt} · Lý do: ${deactivateReason}`
        : 'Cập nhật hồ sơ',
    };
    registerStaffLog(log);
    setLogs((prev) => [log, ...prev]);
    setDeactivateOpen(false);
    setDeactivateReason('');
    setEditing(false);
  };

  const closeTransfer = () => {
    setTransferOpen(false);
    setTransferTo('');
    setTransferReason('Bổ sung nhân sự theo ca');
    setTransferNote('');
  };

  const confirmTransfer = () => {
    if (!transferTo || !staff.stationId) return;
    const at = `${transferEffectiveDate} (Kế hoạch)`;
    const entry: StaffTransferHistory = {
      id: `st-${Date.now()}`,
      staffId: staff.id,
      fromStationId: staff.stationId,
      toStationId: transferTo,
      transferredAt: at,
      byName: persona.title,
      reason: `${transferReason}. ${transferNote}`.trim(),
    };
    registerStaffTransfer(entry);
    const log: StaffUserLog = {
      id: `lg-${Date.now()}`,
      staffId: staff.id,
      kind: 'transfer',
      at: new Date().toLocaleString('vi-VN'),
      summary: `${orgName(staff.stationId)} → ${orgName(transferTo)} · Duyệt: ${persona.title} · Ngày HL: ${transferEffectiveDate}`,
      byName: persona.title,
    };
    registerStaffLog(log);
    // BR-G06, AC-21: Xe đang gán tự động gỡ
    assignDriverToVehicle(staff.id, null);
    const patch = { stationId: transferTo, orgNodeId: transferTo, dutyStatus: 'offline' as StaffDutyStatus };
    updateStaff(staff.id, patch);
    setRecord({ ...staff, ...patch });
    setHistory((prev) => [entry, ...prev]);
    setLogs((prev) => [log, ...prev]);
    setVehicleRev((n) => n + 1);
    closeTransfer();
    setNotice('Đã điều chuyển nhân viên. Toàn bộ xe đang gán đã tự động bị hủy ghép.');
  };

  const confirmLockToggle = () => {
    const nextLocked = !staff.accountLocked;
    const patch: Partial<PartnerStaffRecord> = nextLocked
      ? {
          accountLocked: true,
          lockedAt: new Date().toLocaleString('vi-VN'),
          lockedReason: `${lockReasonCode}: ${lockReasonText || 'Theo quy chế an ninh'}`,
        }
      : { accountLocked: false, lockedAt: undefined, lockedReason: undefined, unlockedAt: new Date().toLocaleString('vi-VN') };
    updateStaff(staff.id, patch);
    registerStaffLog({
      id: `lg-${Date.now()}`,
      staffId: staff.id,
      kind: 'lock',
      at: new Date().toLocaleString('vi-VN'),
      summary: nextLocked ? `Khóa tài khoản: ${patch.lockedReason}` : 'Mở khóa tài khoản',
      byName: persona.title,
    });
    setRecord({ ...staff, ...patch });
    setLockOpen(false);
    setLockReasonText('');
    setNotice(nextLocked ? `Đã khóa tài khoản ${staff.fullname}.` : `Đã mở khóa tài khoản ${staff.fullname}.`);
  };

  return (
    <div className="space-y-4">
      <PartnerScopeBar persona={persona} onChange={setPersona} />
      {editing && formErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <p className="font-bold mb-1">Chưa lưu được, vui lòng kiểm tra:</p>
          <ul className="list-disc pl-5 space-y-0.5">{formErrors.map((er) => <li key={er}>{er}</li>)}</ul>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/partner/staff')}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-gray-500 hover:text-[#00A859] transition"
          >
            <ArrowLeft size={14} /> Danh sách nhân viên
          </button>
          {!isCreate ? (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-bold text-gray-800">
                {editing ? `Cập nhật: ${staff.fullname}` : `Chi tiết: ${staff.fullname} (${code})`}
              </span>
            </>
          ) : (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-bold text-gray-800">Thêm mới nhân viên</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Trạng thái HĐ & Sẵn sàng ca (Sẵn sàng ca chỉ xem — tính từ ca + Online) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm text-xs">
              <span className="text-gray-600 text-[11px] font-bold">Trạng thái HĐ:</span>
              {editing && !isCreate && workStatus !== 'left' ? (
                <select
                  value={shown.workStatus}
                  onChange={(e) => setEditForm({ ...editForm, workStatus: e.target.value as StaffWorkStatus })}
                  className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-800 focus:border-[#00A859] focus:outline-none"
                  title="Chọn khác Hoạt động sẽ mở hộp thoại Vô hiệu hóa khi Lưu"
                >
                  {(Object.keys(STAFF_WORK_STATUS_LABEL) as StaffWorkStatus[]).map((k) => (
                    <option key={k} value={k}>{STAFF_WORK_STATUS_LABEL[k]}</option>
                  ))}
                </select>
              ) : !editing && !isCreate ? (
                <button
                  type="button"
                  disabled={!canEdit || workStatus === 'left'}
                  onClick={() => canEdit && workStatus !== 'left' && openStatusModal()}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black transition ${
                    canEdit && workStatus !== 'left' ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                  } ${workStatusBadgeClass(workStatus)}`}
                  title={canEdit && workStatus !== 'left' ? 'Bấm để đổi trạng thái nhân sự (DLG-04)' : undefined}
                >
                  {STAFF_WORK_STATUS_LABEL[workStatus]}
                </button>
              ) : (
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${workStatusBadgeClass(isCreate ? 'active' : workStatus)}`}>
                  {STAFF_WORK_STATUS_LABEL[isCreate ? 'active' : workStatus]}
                </span>
              )}
            </div>

            {isDriver && !isCreate && (
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm text-xs" title="Chỉ xem — tính từ ca đang diễn ra và trạng thái Online">
                <span className="text-gray-500 text-[11px] font-bold">Sẵn sàng ca:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${dutyBadgeClass(dutyStatus ?? 'offline')}`}>
                  {STAFF_DUTY_STATUS_LABEL[dutyStatus ?? 'offline']}
                </span>
              </div>
            )}
          </div>

          {/* Khối Button: điều chuyển, đổi trạng thái, cập nhật, v.v. */}
          {(isCreate || editing) ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500 hover:bg-gray-50 shadow-sm"
              >
                <X size={14} /> Hủy
              </button>
              <button
                type="button"
                onClick={() => confirmEdit()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00A859] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-green-700 shadow-sm"
              >
                <Check size={14} /> Lưu
              </button>
            </div>
          ) : (
            canEdit && (
              <div className="flex items-center gap-2">
                {canResetPassword && (
                  <button
                    type="button"
                    onClick={() => setResetOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-600 hover:bg-gray-50 shadow-sm"
                  >
                    <KeyRound size={14} /> Reset mật khẩu
                  </button>
                )}
                {(canLock || canUnlock) && (
                  <button
                    type="button"
                    onClick={() => setLockOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-600 hover:bg-gray-50 shadow-sm"
                  >
                    {staff.accountLocked ? <Unlock size={14} /> : <Lock size={14} />}
                    {staff.accountLocked ? 'Mở khóa' : 'Khóa TK'}
                  </button>
                )}
                {canGrantAccount && (
                  <button
                    type="button"
                    onClick={() => setRetryOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-amber-700 hover:bg-amber-100 shadow-sm"
                  >
                    <KeyRound size={14} /> Cấp tài khoản
                  </button>
                )}
                {canTransfer && (
                  <button
                    type="button"
                    onClick={() => setTransferOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#00A859] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-green-700 shadow-sm"
                  >
                    <ArrowRightLeft size={14} /> Điều chuyển
                  </button>
                )}
                {canEdit && workStatus !== 'left' && (
                  <button
                    type="button"
                    onClick={openStatusModal}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-amber-800 hover:bg-amber-100 shadow-sm"
                    title="Đổi trạng thái nhân sự (DLG-04) — tương tự phương tiện"
                  >
                    <Clock size={14} /> Đổi trạng thái
                  </button>
                )}
                {canUpdate && (
                  <button
                    type="button"
                    onClick={openEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#00A859] bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#00A859] hover:bg-emerald-50 shadow-sm"
                  >
                    <Pencil size={14} /> Cập nhật
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {(workStatus !== 'active' || craneWarn || expiringDocs.length > 0 || (isDriver && !docs.some((d) => d.type === 'Bằng lái'))) && !isCreate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800">
            <AlertTriangle size={13} /> Cảnh báo nhân sự
          </div>
          <ul className="space-y-0.5 text-[12px] font-semibold text-amber-800">
            {workStatus !== 'active' && (
              <li>Trạng thái: {STAFF_WORK_STATUS_LABEL[workStatus]} — không nên điều phối cuốc mới.</li>
            )}
            {craneMissingVehicles.map((v) => (
              <li key={v.id}>Thiếu chứng chỉ vận hành cẩu cho xe {v.plate}.</li>
            ))}
            {isDriver && !docs.some((d) => d.type === 'Bằng lái') && <li>Tài xế chưa khai báo bằng lái.</li>}
            {expiringDocs.map(({ doc, days }) => (
              <li key={doc.id}>
                {doc.type} “{doc.name}” {days != null && days < 0 ? `quá hạn ${Math.abs(days)} ngày` : `còn ${days} ngày`}.
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Thông tin nhân viên" number={1} icon={<UserRound size={16} />}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4 items-start">
          <div>
            <Label>Mã NV</Label>
            <input value={isCreate ? 'Tự sinh sau khi lưu' : code} readOnly className={fieldControlClass(true)} />
          </div>
          <div>
            <Label required>Họ tên</Label>
            <input
              value={shown.fullname}
              readOnly={locked}
              placeholder="VD: Trần Văn Huấn"
              onChange={(e) => {
                const val = e.target.value;
                if (isCreate) {
                  const existingUsernames = PARTNER_STAFF.map((x) => x.username || staffUsername(x));
                  const autoUser = generateStaffUsername(val, existingUsernames);
                  const isOldEmailAuto = !editForm.email || editForm.email.endsWith('@carpla.vn');
                  setEditForm({
                    ...editForm,
                    fullname: val,
                    username: autoUser,
                    email: isOldEmailAuto ? (autoUser ? `${autoUser}@carpla.vn` : '') : editForm.email,
                  });
                } else {
                  setEditForm({ ...editForm, fullname: val });
                }
              }}
              className={fieldControlClass(locked)}
            />
          </div>
          <div>
            <Label>CCCD</Label>
            <input
              value={editing || showFullCccd ? shown.cccd : maskCccd(shown.cccd)}
              maxLength={12}
              placeholder="12 chữ số"
              readOnly={locked}
              onChange={(e) => setEditForm({ ...editForm, cccd: e.target.value })}
              className={fieldControlClass(locked)}
            />
          </div>
          <div>
            <Label>SĐT</Label>
            <input
              value={shown.phone}
              readOnly={locked}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className={fieldControlClass(locked)}
            />
          </div>
          <div>
            <Label>Email</Label>
            <input
              value={shown.email}
              readOnly={locked}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className={fieldControlClass(locked)}
            />
          </div>
          <div>
            <Label>Địa chỉ</Label>
            <input
              value={shown.address}
              readOnly={locked}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className={fieldControlClass(locked)}
            />
          </div>
          <div>
            <Label>Loại hợp đồng</Label>
            {editing ? (
              <select
                value={shown.contractType}
                onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value })}
                className={fieldControlClass(false)}
              >
                <option>Toàn thời gian</option>
                <option>Bán thời gian</option>
                <option>Cộng tác viên</option>
              </select>
            ) : (
              <input value={shown.contractType} readOnly className={fieldControlClass(true)} />
            )}
          </div>
          <div>
            <Label>Ngày vào</Label>
            <input
              value={shown.joinedAt}
              readOnly={locked}
              onChange={(e) => setEditForm({ ...editForm, joinedAt: e.target.value })}
              className={fieldControlClass(locked)}
              placeholder="dd/mm/yyyy"
            />
          </div>
          <div>
            <div>
              <Label>Vai trò</Label>
              <select
                value={createdByStationHead ? 'NVCH' : STAFF_ROLE_TO_PARTNER[STAFF_ROLE_OF[shown.role]]}
                disabled={locked || createdByStationHead || !isCreate}
                title={!isCreate ? 'Vai trò không sửa ở Cập nhật' : undefined}
                onChange={(e) => {
                  const role = e.target.value as PartnerRole;
                  const isDriver = role === 'NVCH';
                  const isStationManager = role === 'GDTT';
                  setEditForm({
                    ...editForm,
                    role,
                    staffType: isDriver ? 'driver' : 'office',
                    dutyStatus: isDriver ? editForm.dutyStatus : 'offline',
                    canRescue: isDriver ? true : false,
                    canQuote: isStationManager ? true : false,
                  });
                }}
                className={fieldControlClass(locked || !isCreate)}
              >
                {(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map((r) => (
                  <option key={r} value={STAFF_ROLE_TO_PARTNER[r]}>{STAFF_ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>

            {hasFieldBlocks(shown.role) && (
              <div className="mt-3">
                <Label>Báo giá & Cứu hộ</Label>
                <div className="flex h-[34px] items-center gap-4 flex-wrap rounded border border-gray-100 bg-gray-50/70 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Báo giá:</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={shown.canQuote}
                      disabled={locked}
                      onClick={() => !locked && setEditForm({ ...editForm, canQuote: !editForm.canQuote })}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${shown.canQuote ? 'bg-[#00A859]' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                          shown.canQuote ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${shown.canQuote ? 'text-[#00A859]' : 'text-gray-400'}`}>
                      {shown.canQuote ? 'Bật' : 'Tắt'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">Cứu hộ:</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={shown.canRescue}
                      disabled={locked}
                      onClick={() => !locked && setEditForm({ ...editForm, canRescue: !editForm.canRescue })}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${shown.canRescue ? 'bg-[#00A859]' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                          shown.canRescue ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${shown.canRescue ? 'text-[#00A859]' : 'text-gray-400'}`}>
                      {shown.canRescue ? 'Bật' : 'Tắt'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label required={isCreate}>Đơn vị</Label>
            <select
              value={shown.orgNodeId}
              disabled={locked || !isCreate}
              title={!isCreate ? 'Đổi trạm / đơn vị bằng chức năng Điều chuyển' : undefined}
              onChange={(e) => {
                const orgNodeId = e.target.value;
                const org = ORG_NODES.find((n) => n.id === orgNodeId);
                const availableStations = getStationsForOrg(orgNodeId);
                const nextStationId = org?.isStation
                  ? orgNodeId
                  : (availableStations.some((s) => s.id === editForm.stationId)
                      ? editForm.stationId
                      : (availableStations[0]?.id || ''));
                setEditForm({ ...editForm, orgNodeId, stationId: nextStationId });
              }}
              className={fieldControlClass(locked || !isCreate)}
            >
              {ORG_NODES.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label required={isCreate}>Trạm cứu hộ</Label>
            {isCreate ? (
              <select
                value={editForm.stationId}
                onChange={(e) => setEditForm({ ...editForm, stationId: e.target.value })}
                className={fieldControlClass(false)}
              >
                <option value="">-- Chọn trạm cứu hộ --</option>
                {getStationsForOrg(editForm.orgNodeId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : editing ? (
              <select
                value={shown.stationId}
                disabled={true}
                title="Đổi trạm cứu hộ bằng chức năng Điều chuyển"
                className={fieldControlClass(true)}
              >
                <option value="">{shown.stationId ? orgName(shown.stationId) : '— (không gắn trạm)'}</option>
                {getStationsForOrg(shown.orgNodeId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                value={shown.stationId ? orgName(shown.stationId) : '— (không gắn trạm)'}
                readOnly
                className={fieldControlClass(true)}
              />
            )}
          </div>
        </div>
      </Section>

      <Section title="Tài khoản EIM" number={2} icon={<KeyRound size={16} />}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
          {isCreate ? (
            <>
              <div className="lg:col-span-4 flex items-center gap-2 text-[12px] font-semibold text-gray-700 pb-1">
                <input
                  type="checkbox"
                  id="createHasAccountCheckbox"
                  checked={editForm.hasAccount}
                  onChange={(e) => setEditForm({ ...editForm, hasAccount: e.target.checked })}
                  className="accent-[#00A859] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="createHasAccountCheckbox" className="cursor-pointer">
                  Cấp tài khoản EIM cùng lúc (tạo tài khoản đăng nhập hệ thống cho nhân viên)
                </label>
              </div>
              <div>
                <Label>Username</Label>
                <input
                  value={
                    editForm.hasAccount
                      ? (editForm.username || generateStaffUsername(editForm.fullname, PARTNER_STAFF.map((x) => x.username || staffUsername(x))) || '—')
                      : '—'
                  }
                  readOnly
                  placeholder="Tự sinh theo Họ tên"
                  className={fieldControlClass(true)}
                />
                {editForm.hasAccount && (
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Tự sinh theo dạng tên họ (VD: huantv, huantv1)
                  </span>
                )}
              </div>
              <div>
                <Label>Trạng thái</Label>
                <input
                  value={editForm.hasAccount ? 'Hoạt động (sẵn sàng)' : 'Không cấp tài khoản'}
                  readOnly
                  className={fieldControlClass(true)}
                />
              </div>
              <div>
                <Label>Xác thực 2 lớp</Label>
                <div className="flex h-[34px] items-center gap-1.5 text-[12px] font-semibold text-gray-700">
                  <Shield size={13} className={editForm.hasAccount ? 'text-gray-400' : 'text-gray-300'} />
                  {editForm.hasAccount ? 'Chưa kích hoạt' : '—'}
                </div>
              </div>
              <div>
                <Label>Mật khẩu ban đầu</Label>
                <input
                  value={editForm.hasAccount ? 'Gửi qua SĐT / SMS' : '—'}
                  readOnly
                  className={fieldControlClass(true)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Username</Label>
                <input value={staff.hasAccount ? (staff.username || staffUsername(staff)) : '—'} readOnly className={fieldControlClass(true)} />
              </div>
              <div>
                <Label>Trạng thái</Label>
                <input value={staffAccountLabel(staff)} readOnly className={fieldControlClass(true)} />
              </div>
              <div>
                <Label>Xác thực 2 lớp</Label>
                <div className="flex h-[34px] items-center gap-1.5 text-[12px] font-semibold text-gray-700">
                  <Shield size={13} className={staff.mfaEnabled ? 'text-emerald-600' : 'text-gray-400'} />
                  {staff.hasAccount ? (staff.mfaEnabled ? 'Đã bật' : 'Chưa bật') : '—'}
                </div>
              </div>
              <div>
                <Label>Đăng nhập gần nhất</Label>
                <input value={staff.lastLoginAt || '—'} readOnly className={fieldControlClass(true)} />
              </div>
              <div className="lg:col-span-2">
                <Label>Thiết bị</Label>
                <input value={staff.lastLoginDevice || '—'} readOnly className={fieldControlClass(true)} />
              </div>
              {staff.accountLocked && (
                <>
                  <div>
                    <Label>Khóa lúc</Label>
                    <input value={staff.lockedAt || '—'} readOnly className={fieldControlClass(true)} />
                  </div>
                  <div>
                    <Label>Lý do khóa</Label>
                    <input value={staff.lockedReason || '—'} readOnly className={fieldControlClass(true)} />
                  </div>
                </>
              )}
              {!staff.accountLocked && staff.unlockedAt && (
                <div>
                  <Label>Mở khóa lúc</Label>
                  <input value={staff.unlockedAt} readOnly className={fieldControlClass(true)} />
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {showFieldBlocks && (
      <Section title="Kỹ năng & giấy tờ" number={3} icon={<FileText size={16} />}>
        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">Dịch vụ làm được</p>
        <div className="mb-4 overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2">Dịch vụ</th>
                <th className="px-3 py-2">Cấp độ</th>
                {editing && <th className="px-3 py-2 w-16">Xóa</th>}
              </tr>
            </thead>
            <tbody>
              {shown.skills.map((sk, i) => (
                <tr key={`${sk.service}-${i}`} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-800">
                    {editing ? (
                      <select
                        value={sk.service}
                        onChange={(e) => setEditForm({ ...editForm, skills: editForm.skills.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)) })}
                        className={fieldControlClass(false)}
                      >
                        {STATION_SERVICES.filter((sv) => sv === sk.service || !editForm.skills.some((x) => x.service === sv)).map((sv) => (
                          <option key={sv}>{sv}</option>
                        ))}
                      </select>
                    ) : sk.service}
                  </td>
                  <td className="px-3 py-2">
                    {editing ? (
                      <select
                        value={sk.level}
                        onChange={(e) => setEditForm({ ...editForm, skills: editForm.skills.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) as SkillLevel } : x)) })}
                        className={fieldControlClass(false)}
                      >
                        {([1, 2, 3] as SkillLevel[]).map((lv) => (
                          <option key={lv} value={lv}>{SKILL_LEVEL_LABEL[lv]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">{SKILL_LEVEL_LABEL[sk.level]}</span>
                    )}
                  </td>
                  {editing && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, skills: editForm.skills.filter((_, j) => j !== i) })}
                        className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Xóa kỹ năng"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {shown.skills.length === 0 && (
                <tr>
                  <td colSpan={editing ? 3 : 2} className="px-3 py-6 text-center text-gray-400">Chưa khai báo kỹ năng (tài xế phải có ít nhất 1 dịch vụ)</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editing && editForm.skills.length < STATION_SERVICES.length && (
          <button
            type="button"
            onClick={() => {
              const next = STATION_SERVICES.find((sv) => !editForm.skills.some((x) => x.service === sv));
              if (next) setEditForm({ ...editForm, skills: [...editForm.skills, { service: next, level: 1 }] });
            }}
            className="mb-4 inline-flex items-center gap-1 rounded-lg border-2 border-dashed border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:border-[#00A859] hover:text-[#00A859]"
          >
            <Plus size={12} /> Thêm dịch vụ
          </button>
        )}
        <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-gray-500">Giấy tờ (bằng lái, chứng chỉ vận hành cẩu)</p>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2">Loại giấy tờ</th>
                <th className="px-3 py-2">Số</th>
                <th className="px-3 py-2">Hạng</th>
                <th className="px-3 py-2">Ngày cấp</th>
                <th className="px-3 py-2">Hết hạn</th>
                <th className="px-3 py-2">Cảnh báo</th>
                <th className="px-3 py-2">File</th>
                {editing && <th className="px-3 py-2 w-24">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const days = daysUntil(d.expiryAt);
                const b = days == null ? null : dueBadge(days, 30);
                const cls =
                  b?.tone === 'red' ? 'bg-red-50 text-red-700' : b?.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600';
                return (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-gray-800">{d.name}</div>
                      <div className="text-[10px] text-gray-400">{d.type}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{d.number || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold">{d.docClass || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold">{d.issuedAt}</td>
                    <td className="px-3 py-2.5 font-semibold">{d.expiryAt}</td>
                    <td className="px-3 py-2.5">
                      {b ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${cls}`}>
                          {b.tone !== 'green' && <AlertTriangle size={10} className="mr-1" />}
                          {b.text}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(d)}
                        className="inline-flex items-center gap-1 font-semibold text-[#00A859] hover:underline"
                      >
                        <FileText size={13} /> {d.fileName}
                      </button>
                    </td>
                    {editing && (
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setPreviewDoc(d)} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Xem">
                            <Eye size={14} />
                          </button>
                          <button type="button" onClick={() => openEditDoc(d)} className="rounded p-1 text-gray-500 hover:bg-gray-100" title="Sửa">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={editing ? 8 : 7} className="px-3 py-8 text-center text-gray-400">Chưa có giấy tờ đính kèm</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editing && (
          <button type="button" onClick={openAddDoc} className="mt-3 rounded-lg border-2 border-dashed border-gray-200 px-3 py-2 text-[11px] font-bold text-gray-500 hover:border-[#00A859] hover:text-[#00A859]">
            + Đính kèm giấy tờ
          </button>
        )}
      </Section>
      )}

      {showFieldBlocks && !isCreate && (
      <Section title="Xe đang gán" number={4} icon={<Truck size={16} />}>
        {assignedVehicles.length > 0 ? (
          <div className="space-y-2">
            {assignedVehicles.map((v) => (
              <div key={v.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div>
                  <p className="text-[13px] font-black text-[#091b37]">{v.plate}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {VEHICLE_TYPE_LABEL[v.type]} · {v.brand} {v.modelLine} · {orgName(v.stationId)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-gray-700">
                    <span className="text-gray-500 font-normal">Giao từ: </span>
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {v.driverAssignedAt?.[staff.id] || '01/06/2026'}
                    </span>
                  </p>
                  {craneMissingVehicles.some((x) => x.id === v.id) && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">Thiếu chứng chỉ vận hành cẩu cho xe này.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/partner/vehicles/${v.id}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#00A859] bg-white px-3 py-1.5 text-[11px] font-bold text-[#00A859] hover:bg-emerald-50"
                >
                  Chi tiết xe
                </button>
              </div>
            ))}
            <p className="text-[10px] text-gray-400">Một tài xế có thể được giao nhiều xe. Gán / hủy ghép thực hiện ở Chi tiết xe.</p>
          </div>
        ) : (
          <p className="text-[12px] text-gray-400">Chưa giao xe. Gán tài xế ở màn Chi tiết xe.</p>
        )}
      </Section>
      )}

      {!isCreate && (
        <Section title="Nhật ký hoạt động" number={5} icon={<ClipboardList size={16} />}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(['ALL', ...(Object.keys(STAFF_LOG_KIND_LABEL) as StaffUserLog['kind'][])] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setLogFilter(k)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${logFilter === k ? 'border-[#00A859] bg-[#00A859] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {k === 'ALL' ? 'Tất cả' : STAFF_LOG_KIND_LABEL[k]}
              </button>
            ))}
          </div>
          {shownLogs.length === 0 ? (
            <p className="text-[12px] text-gray-400">Chưa có nhật ký.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Thời gian</th>
                    <th className="px-3 py-2">Loại</th>
                    <th className="px-3 py-2">Người thực hiện</th>
                    <th className="px-3 py-2">Nội dung thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {shownLogs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-mono text-[11px]">{log.at}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${logKindClass(log.kind)}`}>
                          {STAFF_LOG_KIND_LABEL[log.kind]}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {log.byName || 'Hệ thống'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <div className="font-semibold">{log.summary}</div>
                        {(log.before || log.after) && (
                          <div className="mt-1 text-[11px] text-gray-500 bg-gray-50 rounded p-1.5 border border-gray-100">
                            {log.before && <div><span className="text-gray-400">Trước: </span><span className="line-through text-red-600">{log.before}</span></div>}
                            {log.after && <div><span className="text-gray-400">Sau: </span><span className="text-emerald-700 font-semibold">{log.after}</span></div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      <PartnerModal
        open={docOpen}
        title={editingDocId ? 'Sửa giấy tờ' : 'Đính kèm giấy tờ'}
        icon={<FileText size={20} />}
        onClose={() => setDocOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setDocOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button type="button" onClick={confirmDoc} className={partnerBtnBrand}>Lưu giấy tờ</button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className={partnerLabelClass}>Loại <span className="text-[#da2c39]">*</span></label>
            <select value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })} className={inputClass}>
              {STAFF_DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>Số <span className="text-[#da2c39]">*</span></label>
              <input value={docForm.number} onChange={(e) => setDocForm({ ...docForm, number: e.target.value })} className={inputClass} placeholder={docForm.type === 'Bằng lái' ? 'Số bằng lái' : 'Số chứng chỉ'} />
            </div>
            {docForm.type === 'Bằng lái' && (
              <div>
                <label className={partnerLabelClass}>Hạng <span className="text-[#da2c39]">*</span></label>
                <select value={docForm.docClass} onChange={(e) => setDocForm({ ...docForm, docClass: e.target.value })} className={inputClass}>
                  {LICENSE_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>Ngày cấp</label>
              <input value={docForm.issuedAt} onChange={(e) => setDocForm({ ...docForm, issuedAt: e.target.value })} className={inputClass} placeholder="dd/mm/yyyy" />
            </div>
            <div>
              <label className={partnerLabelClass}>Hết hạn <span className="text-[#da2c39]">*</span></label>
              <input value={docForm.expiryAt} onChange={(e) => setDocForm({ ...docForm, expiryAt: e.target.value })} className={inputClass} placeholder="dd/mm/yyyy" />
            </div>
          </div>
          <div>
            <label className={partnerLabelClass}>File đính kèm</label>
            <FileDrop accept="image/*,.pdf,application/pdf" file={docFile} hint="PDF, JPG, PNG" onFile={setDocFile} />
            {!docFile && docForm.fileName && (
              <p className="mt-1 text-[11px] text-gray-500">File hiện tại: {docForm.fileName}</p>
            )}
          </div>
        </div>
      </PartnerModal>

      <PartnerModal
        open={!!previewDoc}
        title="Xem giấy tờ"
        icon={<Eye size={20} />}
        onClose={() => setPreviewDoc(null)}
        footer={(
          <button type="button" onClick={() => setPreviewDoc(null)} className={partnerBtnBrand}>Đóng</button>
        )}
      >
        {previewDoc && (
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-gray-800">{previewDoc.name} · {previewDoc.fileName}</p>
            {previewDoc.fileUrl && (previewDoc.fileUrl.match(/\.(png|jpe?g|gif|webp)/i) || previewDoc.fileUrl.includes('picsum.photos')) ? (
              <img src={previewDoc.fileUrl} alt="" className="max-h-80 w-full rounded-lg object-contain" />
            ) : previewDoc.fileUrl ? (
              <iframe title="preview" src={previewDoc.fileUrl} className="h-80 w-full rounded-lg border" />
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-[12px] text-gray-500">
                Chưa có file xem trước. Mở Sửa và upload file để xem.
              </div>
            )}
          </div>
        )}
      </PartnerModal>

      <PartnerModal
        open={resetOpen}
        title="Reset mật khẩu"
        icon={<KeyRound size={20} />}
        onClose={() => setResetOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setResetOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              onClick={() => {
                setResetOpen(false);
                setNotice(`Đã gửi mật khẩu mới tới ${staff.phone}.`);
              }}
              className={partnerBtnBrand}
            >
              Gửi mật khẩu mới
            </button>
          </>
        )}
      >
        <p className="text-[12px] font-semibold text-gray-700">
          Hệ thống sẽ reset mật khẩu SSO của <strong>{staff.fullname}</strong> ({usernameOf(code)}) và gửi thông tin đăng nhập mới qua SĐT <strong>{staff.phone}</strong>.
        </p>
      </PartnerModal>

      <PartnerModal
        open={retryOpen}
        title="Cấp tài khoản"
        icon={<KeyRound size={20} />}
        onClose={() => setRetryOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setRetryOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              onClick={() => {
                const patch = { hasAccount: true, accountLocked: false };
                updateStaff(staff.id, patch);
                setRecord({ ...staff, ...patch });
                setRetryOpen(false);
                setNotice('Đã cấp tài khoản. Thông tin đăng nhập đã gửi qua SĐT.');
              }}
              className={partnerBtnBrand}
            >
              Cấp tài khoản
            </button>
          </>
        )}
      >
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Nhân viên chưa có tài khoản. Hệ thống tạo tài khoản và gửi mật khẩu qua SĐT.
        </p>
        <p className="text-[12px] font-semibold text-gray-700">
          {staff.fullname} · {usernameOf(staff)} · {staff.phone}
        </p>
      </PartnerModal>

      <PartnerModal
        open={transferOpen}
        title="Điều chuyển nhân viên"
        icon={<ArrowRightLeft size={20} />}
        onClose={closeTransfer}
        footer={(
          <>
            <button type="button" onClick={closeTransfer} className={partnerBtnNeutral}>Hủy</button>
            <button type="button" onClick={confirmTransfer} disabled={!transferTo} className={partnerBtnBrand}>
              Xác nhận điều chuyển
            </button>
          </>
        )}
      >
        <div className="space-y-3 text-xs">
          <div className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm">{staff.fullname}</div>
              <div className="text-gray-500">{code} · {staffRoleLabel(staff.role)}</div>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Trạm hiện tại:</span>
              <div className="font-bold text-[#00A859]">{staff.stationId ? orgName(staff.stationId) : 'Chưa gán'}</div>
            </div>
          </div>

          {/* Cảnh báo xe đang gán (FL-M2-05 BR-G06, AC-21) */}
          {assignedVehicles.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Cảnh báo hủy ghép phương tiện (FL-M2-05 BR-G06)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Nhân viên đang được ghép với <strong>{assignedVehicles.length} phương tiện</strong> ({assignedVehicles.map((v) => v.plate).join(', ')}). Khi xác nhận điều chuyển trạm, toàn bộ các phương tiện này sẽ <strong>tự động bị hủy ghép</strong>!
              </p>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Điều chuyển đến trạm cứu hộ mới <span className="text-red-500">*</span>
            </label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green bg-white font-medium"
            >
              <option value="">-- Chọn trạm tiếp nhận --</option>
              {STATION_OPTIONS.filter((s) => s.id !== staff.stationId && inScope(persona, s.id)).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Ngày có hiệu lực</label>
              <input
                type="date"
                value={transferEffectiveDate}
                onChange={(e) => setTransferEffectiveDate(e.target.value)}
                className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green bg-white font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Lý do điều chuyển</label>
              <select
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green bg-white font-medium"
              >
                <option value="Bổ sung nhân sự theo ca">Bổ sung nhân sự theo ca</option>
                <option value="Tăng cường mùa cao điểm">Tăng cường mùa cao điểm</option>
                <option value="Điều chuyển định kỳ">Điều chuyển định kỳ</option>
                <option value="Nguyện vọng cá nhân">Nguyện vọng cá nhân</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Ghi chú điều chuyển (action_audit)</label>
            <textarea
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              rows={2}
              placeholder="Nhập số quyết định hoặc ghi chú giao ban..."
              className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green"
            />
          </div>
        </div>
      </PartnerModal>

      <PartnerModal
        open={lockOpen}
        title={staff.accountLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản nhân viên (DLG-01)'}
        icon={staff.accountLocked ? <Unlock size={20} /> : <Lock size={20} />}
        onClose={() => setLockOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setLockOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button type="button" onClick={confirmLockToggle} className={partnerBtnBrand}>Xác nhận</button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-gray-700">
            {staff.accountLocked
              ? `Mở khóa SSO cho ${staff.fullname} (${usernameOf(staff)})? Tài xế có thể đăng nhập app trở lại.`
              : `Khóa tài khoản ${staff.fullname}? Người dùng sẽ bị thu hồi phiên làm việc và không đăng nhập được đến khi mở khóa.`}
          </p>

          {!staff.accountLocked && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-800">
                Lý do khóa tài khoản <span className="text-red-500">*</span>
              </label>
              <select
                value={lockReasonCode}
                onChange={(e) => setLockReasonCode(e.target.value as any)}
                className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green bg-white font-medium"
              >
                <option value="VI_PHAM">Vi phạm quy chế vận hành & an toàn cứu hộ</option>
                <option value="NGHI_VIEC">Nghỉ việc / Tạm hoãn hợp đồng lao động</option>
                <option value="BAO_MAT">Yêu cầu bảo mật / Nghi ngờ lộ lọt thông tin</option>
                <option value="OTHER">Lý do khác...</option>
              </select>

              <textarea
                value={lockReasonText}
                onChange={(e) => setLockReasonText(e.target.value)}
                rows={2}
                placeholder="Ghi chú chi tiết lý do khóa tài khoản (lưu action_audit)..."
                className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green"
              />
            </div>
          )}
        </div>
      </PartnerModal>

      {/* ─── DLG-04: ĐỔI TRẠNG THÁI NHÂN SỰ ─── */}
      <PartnerModal
        open={statusModalOpen}
        title={`Đổi trạng thái nhân sự — ${staff.fullname} (${code})`}
        icon={<Clock size={20} />}
        onClose={() => setStatusModalOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setStatusModalOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              disabled={statusReason.trim().length < 5 || targetWorkStatus === workStatus}
              onClick={confirmStatusChange}
              className={`${partnerBtnBrand} disabled:opacity-50`}
            >
              Xác nhận đổi
            </button>
          </>
        )}
      >
        <div className="space-y-4 text-xs">
          <div>
            <span className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Trạng thái hiện tại:</span>
            <span className="font-bold text-gray-800 text-sm">
              {STAFF_WORK_STATUS_LABEL[workStatus]}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-bold text-gray-700 uppercase mb-2">
              Chọn trạng thái mới <span className="text-red-500">*</span>:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition ${
                  targetWorkStatus === 'active'
                    ? 'border-[#00A859] bg-green-50 text-[#00A859] font-bold shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="staffTargetStatus"
                  value="active"
                  checked={targetWorkStatus === 'active'}
                  onChange={() => setTargetWorkStatus('active')}
                  className="sr-only"
                />
                <span className="text-xs">Hoạt động</span>
                <span className="text-[10px] font-normal text-gray-500 text-center mt-1">Sẵn sàng nhận ca / cuốc</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition ${
                  targetWorkStatus === 'paused'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="staffTargetStatus"
                  value="paused"
                  checked={targetWorkStatus === 'paused'}
                  onChange={() => setTargetWorkStatus('paused')}
                  className="sr-only"
                />
                <span className="text-xs">Không hoạt động</span>
                <span className="text-[10px] font-normal text-gray-500 text-center mt-1">Tạm dừng công việc</span>
              </label>

              <label
                className={`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition ${
                  targetWorkStatus === 'left'
                    ? 'border-red-500 bg-red-50 text-red-700 font-bold shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="staffTargetStatus"
                  value="left"
                  checked={targetWorkStatus === 'left'}
                  onChange={() => setTargetWorkStatus('left')}
                  className="sr-only"
                />
                <span className="text-xs">Ngừng vĩnh viễn</span>
                <span className="text-[10px] font-normal text-gray-500 text-center mt-1">Nghỉ việc hoàn toàn</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
              Thời điểm áp dụng <span className="text-red-500">*</span>
            </label>
            <input
              value={statusEffectiveDate}
              onChange={(e) => setStatusEffectiveDate(e.target.value)}
              className={fieldControlClass(false)}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
              Lý do thay đổi trạng thái <span className="text-red-500">*</span>
            </label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className={`${fieldControlClass(false)} min-h-[70px]`}
              placeholder="Nhập lý do đổi trạng thái (tối thiểu 5 ký tự)..."
            />
          </div>
        </div>
      </PartnerModal>

      <PartnerModal
        open={deactivateOpen}
        title="Vô hiệu hóa nhân viên"
        icon={<AlertTriangle size={20} />}
        onClose={() => setDeactivateOpen(false)}
        footer={(
          <>
            <button type="button" onClick={() => setDeactivateOpen(false)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              disabled={deactivateReason.trim().length < 5}
              onClick={() => confirmEdit(true)}
              className={partnerBtnBrand}
            >
              Xác nhận
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-[12px] text-gray-600">
            Chuyển <strong>{staff.fullname}</strong> sang <strong>{STAFF_WORK_STATUS_LABEL[editForm.workStatus]}</strong>.
            {editForm.workStatus === 'left' && ' Ngừng vĩnh viễn không mở lại được.'} Các ca đã xếp từ thời điểm này chuyển chờ xếp lại.
          </p>
          <div>
            <label className={partnerLabelClass}>Thời điểm áp dụng <span className="text-[#da2c39]">*</span></label>
            <input value={deactivateAt} onChange={(e) => setDeactivateAt(e.target.value)} className={inputClass} placeholder="dd/mm/yyyy" />
          </div>
          <div>
            <label className={partnerLabelClass}>Lý do <span className="text-[#da2c39]">*</span></label>
            <textarea value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} className={`${inputClass} min-h-[72px]`} placeholder="Tối thiểu 5 ký tự" />
          </div>
        </div>
      </PartnerModal>

      {/* Toast thông báo hệ thống (FDD-FL-M2-01 Mục 14) */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <Check size={18} className="text-[#00A859] shrink-0" />
          <span className="max-w-md">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="ml-2 text-gray-400 hover:text-gray-600 p-0.5 rounded transition"
            title="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PartnerStaffDetail;
