import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  FileSpreadsheet,
  Info,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Unlock,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  User,
  UserPlus,
  ShieldAlert,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Edit,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import { FileDrop, PartnerModal, partnerBtnBrand, partnerBtnNeutral, partnerInputClass as inputClass, partnerLabelClass } from '../components/PartnerModal';
import {
  ORG_NODES,
  PARTNER_STAFF,
  ROLE_LABEL,
  STAFF_ROLE_LABEL,
  STAFF_ROLE_OF,
  type StaffRole,
  staffRoleLabel,
  STAFF_WORK_STATUS_LABEL,
  STATION_OPTIONS,
  VEHICLES,
  assignDriverToVehicle,
  vehiclesOfDriver,
  STAFF_TRANSFER_HISTORY,
  registerStaffTransfer,
  registerStaffLog,
  nextStaffCode,
  orgName,
  registerStaff,
  staffAccountLabel,
  staffDocsOf,
  staffUsername,
  staffWorkStatusOf,
  updateStaff,
  getStationsForOrg,
  type PartnerPersona,
  type PartnerRole,
  type PartnerStaffRecord,
  type StaffWorkStatus,
} from '../data/partnerRescueMockData';

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

const fieldClass = 'w-full flex-1 border rounded px-3 py-1.5 text-xs outline-none focus:border-[#00A859] bg-white text-gray-700 shadow-sm';

const IMPORT_HEADERS = [
  'Họ tên',
  'Mã NV',
  'CCCD',
  'SĐT',
  'Email',
  'Địa chỉ',
  'Vai trò',
  'Đơn vị',
  'Trạm',
  'Báo giá',
  'Cứu hộ',
] as const;

type ImportPreviewRow = {
  fullname: string;
  code: string;
  cccd: string;
  phone: string;
  email: string;
  address: string;
  role: PartnerRole;
  orgNodeId: string;
  stationId: string | null;
  canQuote: boolean;
  canRescue: boolean;
  accountCreateFailed: boolean;
  error?: string;
};

const ROLE_BY_LABEL: Record<string, PartnerRole> = Object.fromEntries(
  (Object.entries(ROLE_LABEL) as [PartnerRole, string][]).map(([k, v]) => [v.toLowerCase(), k])
);

const cell = (row: Record<string, unknown>, ...keys: string[]) => {
  const map = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const key of keys) {
    const v = map[key.toLowerCase()];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const isBlankImportRow = (row: Record<string, unknown>) =>
  Object.values(row).every((v) => String(v ?? '').trim() === '');

const parseRole = (raw: string): PartnerRole | null => {
  const v = raw.trim().toLowerCase();
  if (!v) return 'NVCH';
  if (ROLE_BY_LABEL[v]) return ROLE_BY_LABEL[v];
  const key = v.toUpperCase();
  if (key in ROLE_LABEL) return key as PartnerRole;
  return null;
};

const parseOrg = (raw: string): string | null => {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return ORG_NODES.find((n) => n.id === raw.trim() || n.name.toLowerCase() === v || n.name.toLowerCase().includes(v))?.id ?? null;
};

const parseStation = (raw: string): string | null => {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  return STATION_OPTIONS.find((s) => s.id === raw.trim() || s.name.toLowerCase() === v || s.name.toLowerCase().includes(v))?.id ?? null;
};

const parseImportRows = (rows: Record<string, unknown>[], existingCodes: Set<string>): ImportPreviewRow[] =>
  rows.filter((row) => !isBlankImportRow(row)).map((row) => {
    const fullname = cell(row, 'Họ tên', 'Ho ten', 'fullname');
    const code = cell(row, 'Mã NV', 'Ma NV', 'code');
    const phone = cell(row, 'SĐT', 'SDT', 'Điện thoại', 'phone');
    const role = parseRole(cell(row, 'Vai trò', 'Vai tro', 'role'));
    const orgNodeId = parseOrg(cell(row, 'Đơn vị', 'Don vi'));
    const stationId = parseStation(cell(row, 'Trạm', 'Tram', 'Trạm cứu hộ'));
    let error = '';
    if (!fullname) error = 'Thiếu họ tên';
    else if (code && existingCodes.has(code.toLowerCase())) error = 'Mã NV đã tồn tại';
    else if (!role) error = 'Vai trò không hợp lệ';
    else if (!orgNodeId) error = 'Không khớp đơn vị';
    return {
      fullname,
      code,
      cccd: cell(row, 'CCCD') || '—',
      phone,
      email: cell(row, 'Email'),
      address: cell(row, 'Địa chỉ', 'Dia chi') || '—',
      role: role ?? 'NVCH',
      orgNodeId: orgNodeId ?? '',
      stationId,
      canQuote: false,
      canRescue: role === 'NVCH',
      accountCreateFailed: !phone,
      error,
    };
  });

const downloadStaffTemplate = () => {
  const sample = [
    {
      'Họ tên': 'Nguyễn Văn Mẫu',
      'Mã NV': 'CP-0999',
      'CCCD': '001080099999',
      'SĐT': '0909123456',
      'Email': 'mau.nv@vetc.com.vn',
      'Địa chỉ': 'Hoàng Mai, Hà Nội',
      'Vai trò': 'Nhân viên cứu hộ',
      'Đơn vị': 'Trạm Hoàng Mai',
      'Trạm': 'Trạm Hoàng Mai',
      'Báo giá': 'Không',
      'Cứu hộ': 'Có',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: [...IMPORT_HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachNV');
  XLSX.writeFile(wb, 'mau_import_nhan_vien.xlsx');
};

const accountBadgeClass = (s: PartnerStaffRecord) => {
  if (!s.hasAccount) return 'bg-gray-50 text-gray-500 border-gray-200';
  if (s.accountLocked) return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-green-50 text-green-700 border-green-200';
};

// Phân tích trạng thái bằng lái
type LicenseExpiryStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'UNREGISTERED';

const checkLicenseStatus = (s: PartnerStaffRecord): { status: LicenseExpiryStatus; label: string; tone: 'green' | 'amber' | 'red' | 'gray'; daysLeft?: number } => {
  if (s.role !== 'NVCH') {
    return { status: 'UNREGISTERED', label: 'Không yêu cầu', tone: 'gray' };
  }
  if (!s.licenseType || s.licenseType === '—') {
    return { status: 'UNREGISTERED', label: 'Chưa khai báo', tone: 'amber' };
  }
  if (!s.licenseExpiry || s.licenseExpiry === '—') {
    return { status: 'UNREGISTERED', label: 'Chưa có hạn', tone: 'amber' };
  }

  // Parse DD/MM/YYYY
  const parts = s.licenseExpiry.split('/');
  if (parts.length === 3) {
    const expDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    const now = new Date(2026, 9, 3); // Giả lập mốc hiện tại 03/10/2026
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { status: 'EXPIRED', label: `Quá hạn ${Math.abs(diffDays)} ngày`, tone: 'red', daysLeft: diffDays };
    }
    if (diffDays <= 30) {
      return { status: 'EXPIRING', label: `Còn ${diffDays} ngày`, tone: 'amber', daysLeft: diffDays };
    }
    return { status: 'VALID', label: `Còn hạn (${s.licenseExpiry})`, tone: 'green', daysLeft: diffDays };
  }
  return { status: 'VALID', label: s.licenseExpiry, tone: 'green' };
};

const PartnerStaff: React.FC = () => {
  const navigate = useNavigate();
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const [staffList, setStaffList] = useState<PartnerStaffRecord[]>([...PARTNER_STAFF]);

  useEffect(() => {
    setStaffList([...PARTNER_STAFF]);
  }, []);

  // Bộ lọc tìm kiếm SCR-01
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED' | 'UNASSIGNED' | 'FAILED'>('ALL');
  // FDD UI-03, BR-06: Chọn nhiều trạng thái, mặc định chọn Hoạt động + Không hoạt động
  const [workStatuses, setWorkStatuses] = useState<StaffWorkStatus[]>(['active', 'paused']);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<'ALL' | 'EXPIRING_30' | 'EXPIRED' | 'UNREGISTERED'>('ALL');

  // Phân trang UI-09
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState('');

  // DLG-01: Khóa tài khoản có lý do bắt buộc
  const [lockOf, setLockOf] = useState<PartnerStaffRecord | null>(null);
  const [lockReasonCode, setLockReasonCode] = useState<'VI_PHAM' | 'NGHI_VIEC' | 'BAO_MAT' | 'OTHER'>('VI_PHAM');
  const [lockReasonText, setLockReasonText] = useState('');

  // DLG-03: Điều chuyển nhân viên
  const [transferOf, setTransferOf] = useState<PartnerStaffRecord | null>(null);
  const [transferToStation, setTransferToStation] = useState('');
  const [transferEffectiveDate, setTransferEffectiveDate] = useState('2026-11-01');
  const [transferReason, setTransferReason] = useState('Bổ sung nhân sự theo ca');
  const [transferNote, setTransferNote] = useState('');

  // Modals khác
  const [retryOf, setRetryOf] = useState<PartnerStaffRecord | null>(null);
  const [resetOf, setResetOf] = useState<PartnerStaffRecord | null>(null);
  const [notice, setNotice] = useState('');

  // Tự tắt toast sau 4 giây
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  // DLG-04: Đổi trạng thái nhân sự (thay vì cập nhật, tương tự phương tiện DLG-11)
  const [statusOf, setStatusOf] = useState<PartnerStaffRecord | null>(null);
  const [targetWorkStatus, setTargetWorkStatus] = useState<StaffWorkStatus>('active');
  const [statusEffectiveDate, setStatusEffectiveDate] = useState(new Date().toLocaleDateString('vi-VN'));
  const [statusReason, setStatusReason] = useState('');

  const handleOpenStatusModal = (s: PartnerStaffRecord) => {
    setStatusOf(s);
    setTargetWorkStatus(staffWorkStatusOf(s));
    setStatusEffectiveDate(new Date().toLocaleDateString('vi-VN'));
    setStatusReason('');
  };

  const handleConfirmStatusChange = () => {
    if (!statusOf) return;
    const oldStatusLabel = STAFF_WORK_STATUS_LABEL[staffWorkStatusOf(statusOf)];
    const newStatusLabel = STAFF_WORK_STATUS_LABEL[targetWorkStatus];
    updateStaff(statusOf.id, { workStatus: targetWorkStatus });
    registerStaffLog({
      id: `lg-${Date.now()}`,
      staffId: statusOf.id,
      kind: 'profile',
      at: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
      summary: `Đổi trạng thái: ${oldStatusLabel} → ${newStatusLabel} · Ngày áp dụng: ${statusEffectiveDate} · Lý do: ${statusReason.trim()}`,
      byName: persona.title,
    });
    setStaffList([...PARTNER_STAFF]);
    setNotice(`Đã đổi trạng thái nhân sự ${statusOf.fullname} sang "${newStatusLabel}"`);
    setStatusOf(null);
  };

  // FDD FL-M2-01 A4.1: "Quản lý" = Admin / Đối tác (đa trạm). Trưởng trạm (GDTT) chỉ Xem + Thêm tài xế.
  const canManage = persona.role === 'BDH' || persona.role === 'GDM' || persona.role === 'GDCN' || persona.role === 'QLVUNG';
  const canCreate = canManage || persona.role === 'GDTT';
  /** Import Excel ẩn ở T10 (#53) */
  const SHOW_IMPORT = false;

  // Thống kê bằng lái sắp hết hạn hoặc quá hạn
  const licenseWarnings = useMemo(() => {
    return staffList.filter((s) => {
      if (s.role !== 'NVCH') return false;
      const chk = checkLicenseStatus(s);
      return chk.status === 'EXPIRING' || chk.status === 'EXPIRED';
    });
  }, [staffList]);

  const rows = useMemo(() => {
    let list = staffList.filter((s) => {
      if (persona.stationIds.length === 0) return true;
      if (s.stationId) return persona.stationIds.includes(s.stationId);
      if (persona.role === 'GDCN' || persona.role === 'QLVUNG') {
        return s.orgNodeId === 'cn-hn' || s.orgNodeId === 'vung-hn';
      }
      if (persona.role === 'GDM') {
        return ['mien-bac', 'cn-hn', 'cn-hp', 'vung-hn', 'vung-hp'].includes(s.orgNodeId);
      }
      return false;
    });

    if (persona.role === 'NVCH') list = list.filter((s) => s.id === 's6');

    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((x) => x.fullname.toLowerCase().includes(s));
    }
    if (code.trim()) {
      const s = code.toLowerCase();
      list = list.filter((x) => x.code.toLowerCase().includes(s));
    }
    if (username.trim()) {
      const s = username.toLowerCase();
      list = list.filter((x) => staffUsername(x).toLowerCase().includes(s));
    }
    if (phone.trim()) {
      const s = phone.toLowerCase().replace(/\s/g, '');
      list = list.filter((x) => x.phone.toLowerCase().replace(/\s/g, '').includes(s));
    }
    if (email.trim()) {
      const s = email.toLowerCase().trim();
      list = list.filter((x) => (x.email || '').toLowerCase().includes(s));
    }
    if (roleFilter) list = list.filter((x) => STAFF_ROLE_OF[x.role] === roleFilter);
    if (partnerFilter) {
      list = list.filter((x) => x.orgNodeId === partnerFilter || (x.stationId && getStationsForOrg(partnerFilter).some((st) => st.id === x.stationId)));
    }
    if (orgFilter) list = list.filter((x) => x.orgNodeId === orgFilter);
    if (stationFilter) list = list.filter((x) => x.stationId === stationFilter);
    
    // UI-03, BR-06: Lọc theo danh sách trạng thái nhân sự được chọn
    if (workStatuses.length > 0) {
      list = list.filter((x) => workStatuses.includes(staffWorkStatusOf(x)));
    }

    if (accountStatusFilter !== 'ALL') {
      if (accountStatusFilter === 'ACTIVE') list = list.filter((x) => x.hasAccount && !x.accountLocked);
      if (accountStatusFilter === 'LOCKED') list = list.filter((x) => x.accountLocked);
      if (accountStatusFilter === 'UNASSIGNED') list = list.filter((x) => !x.hasAccount);
    }

    if (licenseFilter !== 'ALL') {
      list = list.filter((x) => {
        const chk = checkLicenseStatus(x);
        if (licenseFilter === 'EXPIRING_30') return chk.status === 'EXPIRING';
        if (licenseFilter === 'EXPIRED') return chk.status === 'EXPIRED';
        if (licenseFilter === 'UNREGISTERED') return chk.status === 'UNREGISTERED';
        return true;
      });
    }

    return list;
  }, [persona, staffList, q, code, username, phone, email, roleFilter, partnerFilter, orgFilter, stationFilter, accountStatusFilter, workStatuses, licenseFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const patchStaff = (id: string, patch: Partial<PartnerStaffRecord>) => {
    updateStaff(id, patch);
    setStaffList((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportRows([]);
    setImportError('');
  };

  const onImportFile = async (file: File | null) => {
    setImportFile(file);
    setImportRows([]);
    setImportError('');
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        setImportError('File không có sheet dữ liệu.');
        return;
      }
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }).filter((row) => !isBlankImportRow(row));
      if (json.length === 0) {
        setImportError('Không có dòng dữ liệu. Dùng file mẫu để xem cột bắt buộc.');
        return;
      }
      const existing = new Set(staffList.map((s) => s.code.toLowerCase()));
      const parsed = parseImportRows(json, existing);
      const seen = new Set<string>();
      parsed.forEach((r) => {
        const key = r.code.toLowerCase();
        if (r.code && seen.has(key) && !r.error) r.error = 'Trùng mã NV trong file';
        if (r.code) seen.add(key);
      });
      setImportRows(parsed);
    } catch {
      setImportError('Không đọc được file. Chỉ hỗ trợ .xlsx, .xls, .csv.');
    }
  };

  const confirmImport = () => {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    const created: PartnerStaffRecord[] = valid.map((r, i) => {
      const org = ORG_NODES.find((n) => n.id === r.orgNodeId);
      const stationId = r.stationId || (org?.isStation ? r.orgNodeId : null);
      const seq = Number(nextStaffCode().replace(/\D/g, '')) + i;
      return {
        id: `s-imp-${Date.now()}-${i}`,
        code: r.code || `CP-${String(seq).padStart(4, '0')}`,
        fullname: r.fullname,
        phone: r.phone || '—',
        cccd: r.cccd,
        address: r.address,
        role: r.role,
        orgNodeId: r.orgNodeId,
        stationId,
        licenseType: '—',
        licenseIssued: '—',
        licenseExpiry: '—',
        craneCert: false,
        hasAccount: !r.accountCreateFailed,
        canQuote: r.canQuote,
        canRescue: r.canRescue,
        email: r.email,
        accountCreateFailed: r.accountCreateFailed,
        workStatus: 'active',
        contractType: 'Toàn thời gian',
      };
    });
    created.slice().reverse().forEach(registerStaff);
    setStaffList((prev) => [...created, ...prev]);
    closeImport();
    const failed = created.filter((s) => s.accountCreateFailed).length;
    setNotice(
      failed > 0
        ? `Đã nạp ${created.length} nhân viên. ${failed} người lỗi tạo tài khoản SSO — dùng Retry trên danh sách.`
        : `Đã nạp ${created.length} nhân viên.`
    );
  };

  // Xác nhận Khóa / Mở khóa tài khoản (DLG-01)
  const handleConfirmLock = () => {
    if (!lockOf) return;
    const nextLocked = !lockOf.accountLocked;
    const patch: Partial<PartnerStaffRecord> = {
      accountLocked: nextLocked,
      lockedAt: nextLocked ? '03/10/2026 14:00' : undefined,
      lockedReason: nextLocked ? `${lockReasonCode}: ${lockReasonText || 'Theo quy chế an ninh'}` : undefined,
    };
    patchStaff(lockOf.id, patch);
    setNotice(
      nextLocked
        ? `Đã khóa tài khoản của ${lockOf.fullname}. Lý do: ${patch.lockedReason}`
        : `Đã mở khóa tài khoản cho ${lockOf.fullname}.`
    );
    setLockOf(null);
    setLockReasonText('');
  };

  // Xác nhận Điều chuyển nhân viên (DLG-03)
  const handleConfirmTransfer = () => {
    if (!transferOf || !transferToStation) return;
    const fromStation = transferOf.stationId ?? 'Chưa gán trạm';
    
    // AC-21, BR-G06: Xe đang gán tự động bị hủy ghép khi điều chuyển nhân sự
    assignDriverToVehicle(transferOf.id, null);

    registerStaffTransfer({
      id: `trans-${Date.now()}`,
      staffId: transferOf.id,
      fromStationId: fromStation,
      toStationId: transferToStation,
      transferredAt: `${transferEffectiveDate} (Kế hoạch)`,
      byName: persona.title,
      reason: `${transferReason}. ${transferNote}`.trim(),
    });
    patchStaff(transferOf.id, { stationId: transferToStation });
    setNotice(`Đã tạo lệnh điều chuyển nhân sự ${transferOf.fullname} sang ${orgName(transferToStation)} hiệu lực từ ${transferEffectiveDate}. Toàn bộ xe đang gán (nếu có) đã tự động hủy ghép.`);
    setTransferOf(null);
    setTransferToStation('');
    setTransferNote('');
  };

  const handleExportExcel = () => {
    const data = rows.map((s, i) => {
      const chk = checkLicenseStatus(s);
      return {
        STT: i + 1,
        'Mã NV': s.code,
        'Họ tên': s.fullname,
        'Username': s.hasAccount ? staffUsername(s) : '—',
        'CCCD': s.cccd ? `${s.cccd.slice(0, 3)}******${s.cccd.slice(-3)}` : '—',
        'SĐT': s.phone,
        'Email': s.email || '—',
        'Vai trò': staffRoleLabel(s.role),
        'Đơn vị': orgName(s.stationId || s.orgNodeId),
        'Hợp đồng': s.contractType || '—',
        'Tài khoản EIM': s.hasAccount ? (s.accountLocked ? 'Bị khóa' : 'Hoạt động') : 'Chưa có',
        'Trạng thái NS': staffWorkStatusOf(s) === 'active' ? 'Hoạt động' : staffWorkStatusOf(s) === 'paused' ? 'Không hoạt động' : 'Ngừng vĩnh viễn',
        'Bằng lái': chk.label,
        'Trực': s.dutyStatus === 'on_duty' || s.dutyStatus === 'on_order' ? 'Online' : 'Offline',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach_nhan_vien');
    XLSX.writeFile(wb, `Danh_sach_nhan_vien_${Date.now()}.xlsx`);
  };

  const handleResetFilters = () => {
    setQ('');
    setCode('');
    setUsername('');
    setPhone('');
    setEmail('');
    setRoleFilter('');
    setPartnerFilter('');
    setOrgFilter('');
    setStationFilter('');
    setAccountStatusFilter('ALL');
    setWorkStatuses(['active', 'paused']);
    setFromDate('');
    setToDate('');
    setLicenseFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 w-full min-w-0 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Quản lý nhân viên (FL-M2-01)</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Hồ sơ nhân sự, tài khoản, kỹ năng & giấy tờ cứu hộ
          </p>
        </div>
      </div>

      <PartnerScopeBar persona={persona} onChange={setPersona} />
      {/* Banner nhắc hạn giấy tờ theo UI-07 */}
      {licenseWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-900">
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Nhắc hạn giấy tờ (UI-07):</span> Có{' '}
              <strong className="text-red-700 underline">{licenseWarnings.length} nhân viên</strong> có giấy tờ sắp hết hạn trong 30 ngày hoặc đã quá hạn!
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLicenseFilter('EXPIRING_30');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold transition-all"
            >
              Lọc sắp hết hạn (30 ngày)
            </button>
            <button
              onClick={() => {
                setLicenseFilter('EXPIRED');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 font-bold transition-all"
            >
              Lọc quá hạn
            </button>
            {licenseFilter !== 'ALL' && (
              <button
                onClick={() => {
                  setLicenseFilter('ALL');
                  setCurrentPage(1);
                }}
                className="text-gray-500 hover:text-gray-800 underline ml-1"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tra cứu Form SCR-01 (3 rows x 3 cols chuẩn VETC RSA) */}
      <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
        <SectionHeader title="Tra cứu" icon={<Search size={16} />} />
        <div className="p-4 sm:p-5">
          {/* Hàng 1: Họ tên, Mã NV, Username */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Họ tên NV</label>
              <input
                type="text"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Nhập tên nhân viên..."
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Mã NV</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="CP-0001..."
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="huantv..."
                className={fieldClass}
              />
            </div>
          </div>

          {/* Hàng 2: SĐT, Đối tác (UI-04), Đơn vị / Trạm */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">SĐT</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="0906 666 666..."
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Đối tác</label>
              <select
                value={partnerFilter}
                onChange={(e) => {
                  setPartnerFilter(e.target.value);
                  setOrgFilter('');
                  setStationFilter('');
                  setCurrentPage(1);
                }}
                className={fieldClass}
              >
                <option value="">Tất cả đối tác</option>
                {ORG_NODES.filter((n) => !n.isStation).map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Trạm cứu hộ</label>
              <select
                value={stationFilter}
                onChange={(e) => {
                  setStationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={fieldClass}
              >
                <option value="">Tất cả trạm</option>
                {(partnerFilter ? getStationsForOrg(partnerFilter) : (orgFilter ? getStationsForOrg(orgFilter) : STATION_OPTIONS)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hàng 3: Email, Vai trò, Tài khoản EIM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="example@carpla.vn..."
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Vai trò</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as StaffRole | '');
                  setCurrentPage(1);
                }}
                className={fieldClass}
              >
                <option value="">Tất cả vai trò</option>
                {(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).map((r) => (
                  <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">Tài khoản EIM</label>
              <select
                value={accountStatusFilter}
                onChange={(e) => {
                  setAccountStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className={fieldClass}
              >
                <option value="ALL">Tất cả trạng thái TK EIM</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Bị khóa</option>
                <option value="UNASSIGNED">Không có tài khoản</option>
              </select>
            </div>
          </div>

          {/* Hàng 4: Trạng thái NS (UI-03, BR-06: multi-select) & Khoảng ngày (UI-04) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-3 md:col-span-2">
              <label className="w-28 shrink-0 text-xs font-semibold text-gray-600">
                Trạng thái NS <span className="text-[10px] text-gray-400 font-normal">(chọn nhiều)</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: 'active' as const, label: 'Hoạt động', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
                  { key: 'paused' as const, label: 'Không hoạt động', color: 'border-amber-300 text-amber-800 bg-amber-50' },
                  { key: 'left' as const, label: 'Ngừng vĩnh viễn', color: 'border-gray-300 text-gray-700 bg-gray-100' },
                ].map(({ key, label, color }) => {
                  const selected = workStatuses.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setWorkStatuses((prev) => {
                          const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
                          return next;
                        });
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${
                        selected ? `${color} shadow-sm ring-1 ring-offset-1 ring-emerald-500` : 'border-gray-200 text-gray-400 bg-gray-50/60 opacity-60'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${selected ? (key === 'active' ? 'bg-emerald-600' : key === 'paused' ? 'bg-amber-600' : 'bg-gray-500') : 'bg-gray-300'}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-xs font-semibold text-gray-600">Từ – Đến</label>
              <div className="flex items-center gap-1 w-full">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`${fieldClass} text-[11px] px-1.5`}
                  title="Từ ngày"
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`${fieldClass} text-[11px] px-1.5`}
                  title="Đến ngày"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => navigate('/partner/staff/new')}
                  className="flex items-center gap-1.5 bg-[#00A859] text-white px-3.5 py-2 rounded font-bold text-xs hover:bg-green-700 transition shadow-sm"
                >
                  <Plus size={15} />
                  <span>+ Thêm nhân viên</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-3.5 py-2 rounded font-bold text-xs hover:bg-gray-50 transition shadow-sm"
              >
                <FileSpreadsheet size={15} className="text-[#00A859]" />
                <span>Xuất Excel</span>
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="text-xs text-gray-500 font-medium mr-1">Tìm thấy <strong className="text-gray-800">{rows.length}</strong> nhân viên</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-2 rounded text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={() => {}}
                className="flex items-center gap-1.5 bg-[#00A859] text-white px-4 py-2 rounded font-bold text-xs hover:bg-green-700 transition shadow-sm"
              >
                <Search size={14} />
                <span>Tìm kiếm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table UI-15: 12 cột chuẩn FDD-FL-M2-01 */}
      <div className="border rounded-lg shadow-sm bg-white w-full min-w-0 overflow-hidden">
        <SectionHeader title="Kết quả tìm kiếm" />
        <div className="w-full overflow-x-auto overscroll-x-contain custom-scrollbar">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-700 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-2.5 py-2.5 text-center w-8 border-r">STT</th>
                <th className="px-2.5 py-2.5 text-center w-28 border-r">Thao tác</th>
                <th className="px-3 py-2.5 text-left border-r">Nhân viên</th>
                <th className="px-2.5 py-2.5 text-left border-r">Username</th>
                <th className="px-2.5 py-2.5 text-left border-r">Vai trò</th>
                <th className="px-3 py-2.5 text-left border-r">Đơn vị / Trạm</th>
                <th className="px-2.5 py-2.5 text-left border-r">SĐT</th>
                <th className="px-2.5 py-2.5 text-left border-r">Email</th>
                <th className="px-2.5 py-2.5 text-center border-r">Hợp đồng</th>
                <th className="px-2.5 py-2.5 text-center border-r">Tài khoản EIM</th>
                <th className="px-2.5 py-2.5 text-center">Trạng thái NS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRows.map((s, index) => {
                const ws = staffWorkStatusOf(s);
                const isOnline = s.dutyStatus === 'on_duty' || s.dutyStatus === 'on_order';
                const stt = (currentPage - 1) * pageSize + index + 1;

                return (
                  <tr key={s.id} className="hover:bg-gray-50/80 align-top transition-colors">
                    {/* STT */}
                    <td className="px-2.5 py-2.5 text-center border-r text-gray-500 font-medium">{stt}</td>

                    {/* Thao tác */}
                    <td className="px-2.5 py-2.5 border-r">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/partner/staff/${s.id}`)}
                          className="text-orange-500 hover:bg-orange-50 p-1 rounded transition-colors"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Info size={14} />
                        </button>
                        {canManage && ws !== 'left' && (
                          <button
                            type="button"
                            onClick={() => handleOpenStatusModal(s)}
                            className="text-amber-600 hover:bg-amber-50 p-1 rounded transition-colors"
                            title="Đổi trạng thái nhân sự (DLG-04)"
                          >
                            <Clock size={14} />
                          </button>
                        )}
                        {canManage && s.hasAccount && !s.accountLocked && ws !== 'left' && (
                          <button
                            type="button"
                            onClick={() => setResetOf(s)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="Reset mật khẩu"
                          >
                            <KeyRound size={14} />
                          </button>
                        )}
                        {canManage && s.hasAccount && !s.accountLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              setLockOf(s);
                              setLockReasonCode('VI_PHAM');
                              setLockReasonText('');
                            }}
                            className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                            title="Khóa tài khoản (DLG-01)"
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        {canManage && s.hasAccount && s.accountLocked && ws !== 'left' && (
                          <button
                            type="button"
                            onClick={() => {
                              setLockOf(s);
                              setLockReasonCode('OTHER');
                              setLockReasonText('Mở khóa phục hồi công tác');
                            }}
                            className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                            title="Mở khóa tài khoản"
                          >
                            <Unlock size={14} />
                          </button>
                        )}
                        {canManage && !s.hasAccount && ws === 'active' && (
                          <button
                            type="button"
                            onClick={() => setRetryOf(s)}
                            className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                            title="Cấp tài khoản mới"
                          >
                            <UserPlus size={14} />
                          </button>
                        )}
                        {canManage && ws === 'active' && !!s.stationId && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferOf(s);
                              setTransferToStation('');
                              setTransferNote('');
                            }}
                            className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"
                            title="Điều chuyển trạm (DLG-03)"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Nhân viên - UI-08.2: Tên bấm được để vào chi tiết */}
                    <td className="px-3 py-2.5 border-r">
                      <button
                        type="button"
                        onClick={() => navigate(`/partner/staff/${s.id}`)}
                        className="font-bold text-gray-900 hover:text-[#00A859] hover:underline text-left block transition"
                        title="Bấm để xem chi tiết hồ sơ nhân sự"
                      >
                        {s.fullname}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">Mã: {s.code}</div>
                    </td>

                    {/* Username */}
                    <td className="px-2.5 py-2.5 border-r">
                      {s.hasAccount ? (
                        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100/90 px-2 py-0.5 rounded border border-gray-200 inline-block">
                          {staffUsername(s)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">— Chưa có TK</span>
                      )}
                    </td>

                    {/* Vai trò */}
                    <td className="px-2.5 py-2.5 border-r">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                        {staffRoleLabel(s.role)}
                      </span>
                    </td>

                    {/* Đơn vị / Trạm */}
                    <td className="px-3 py-2.5 border-r font-medium text-gray-700">
                      {s.stationId ? orgName(s.stationId) : orgName(s.orgNodeId)}
                    </td>

                    {/* SĐT */}
                    <td className="px-2.5 py-2.5 border-r font-mono text-gray-800">{s.phone}</td>

                    {/* Email */}
                    <td className="px-2.5 py-2.5 border-r text-gray-700">
                      <span className="text-[11px] text-gray-700 truncate max-w-[160px] inline-block font-sans" title={s.email || '—'}>
                        {s.email || '—'}
                      </span>
                    </td>

                    {/* Hợp đồng */}
                    <td className="px-2.5 py-2.5 border-r text-center">
                      <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {s.contractType || '—'}
                      </span>
                    </td>

                    {/* Tài khoản EIM/SSO */}
                    <td className="px-2.5 py-2.5 border-r text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${accountBadgeClass(s)}`}>
                        {staffAccountLabel(s)}
                      </span>
                    </td>

                    {/* Trạng thái NS */}
                    <td className="px-2.5 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={!canManage || ws === 'left'}
                        onClick={() => canManage && ws !== 'left' && handleOpenStatusModal(s)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap transition ${
                          canManage && ws !== 'left' ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                        } ${
                          ws === 'active'
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : ws === 'paused'
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-gray-500 bg-gray-100 border-gray-200'
                        }`}
                        title={canManage && ws !== 'left' ? 'Bấm để đổi trạng thái nhân sự (DLG-04)' : 'Chỉ xem'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ws === 'active' ? 'bg-emerald-500' : ws === 'paused' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                        {ws === 'active' ? 'Hoạt động' : ws === 'paused' ? 'Không hoạt động' : 'Ngừng vĩnh viễn'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-gray-400">
                    <User size={32} className="mx-auto mb-2 opacity-30 text-gray-500" />
                    Không có nhân viên phù hợp với bộ lọc tìm kiếm
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang chuẩn UI-09 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 bg-white font-medium outline-none focus:border-[#00A859]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>dòng/trang</span>
            <span className="text-gray-400">|</span>
            <span>
              {rows.length > 0 ? (
                <>
                  <strong>{(currentPage - 1) * pageSize + 1}</strong> – <strong>{Math.min(currentPage * pageSize, rows.length)}</strong> trên tổng <strong>{rows.length}</strong> nhân viên
                </>
              ) : (
                '0 nhân viên'
              )}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-600 transition"
              title="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) return <span key={p} className="px-1 text-gray-400">...</span>;
                return null;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`min-w-[28px] h-7 px-2 rounded text-xs font-bold transition ${
                    currentPage === p
                      ? 'bg-[#00A859] text-white'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-600 transition"
              title="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── DLG-04: ĐỔI TRẠNG THÁI NHÂN SỰ (TƯƠNG TỰ PHƯƠNG TIỆN DLG-11) ─── */}
      <PartnerModal
        open={!!statusOf}
        title={`Đổi trạng thái nhân sự — ${statusOf?.fullname ?? ''} (${statusOf?.code ?? ''})`}
        icon={<Clock size={20} />}
        onClose={() => setStatusOf(null)}
        footer={(
          <>
            <button type="button" onClick={() => setStatusOf(null)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              disabled={statusReason.trim().length < 5 || targetWorkStatus === (statusOf ? staffWorkStatusOf(statusOf) : '')}
              onClick={handleConfirmStatusChange}
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
              {statusOf ? STAFF_WORK_STATUS_LABEL[staffWorkStatusOf(statusOf)] : '—'}
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
            <label className={partnerLabelClass}>Thời điểm áp dụng <span className="text-[#da2c39]">*</span></label>
            <input
              value={statusEffectiveDate}
              onChange={(e) => setStatusEffectiveDate(e.target.value)}
              className={inputClass}
              placeholder="dd/mm/yyyy"
            />
          </div>

          <div>
            <label className={partnerLabelClass}>Lý do thay đổi trạng thái <span className="text-[#da2c39]">*</span></label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className={`${inputClass} min-h-[70px]`}
              placeholder="Nhập lý do đổi trạng thái (tối thiểu 5 ký tự)..."
            />
          </div>
        </div>
      </PartnerModal>

      {/* ─── DLG-01: KHÓA / MỞ KHÓA TÀI KHOẢN (LÝ DO BẮT BUỘC) ─── */}
      <PartnerModal
        open={!!lockOf}
        title={lockOf?.accountLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản nhân viên (DLG-01)'}
        icon={lockOf?.accountLocked ? <Unlock size={20} /> : <Lock size={20} />}
        onClose={() => setLockOf(null)}
        footer={(
          <>
            <button type="button" onClick={() => setLockOf(null)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              onClick={handleConfirmLock}
              className={partnerBtnBrand}
            >
              Xác nhận
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-700 leading-relaxed">
            {lockOf?.accountLocked
              ? `Mở khóa SSO cho nhân sự ${lockOf?.fullname} (${lockOf ? staffUsername(lockOf) : ''})? Tài xế có thể đăng nhập app trở lại.`
              : `Khóa tài khoản của ${lockOf?.fullname}? Tài xế sẽ bị thu hồi phiên làm việc, chuyển Offline ngay lập tức và không thể đăng nhập app.`}
          </p>

          {!lockOf?.accountLocked && (
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

      {/* ─── DLG-03: ĐIỀU CHUYỂN NHÂN VIÊN SANG TRẠM KHÁC ─── */}
      <PartnerModal
        open={!!transferOf}
        title="Điều chuyển nhân viên trạm (DLG-03)"
        icon={<ArrowRightLeft size={20} />}
        onClose={() => setTransferOf(null)}
        footer={(
          <>
            <button type="button" onClick={() => setTransferOf(null)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              disabled={!transferToStation}
              onClick={handleConfirmTransfer}
              className={partnerBtnBrand}
            >
              Xác nhận điều chuyển
            </button>
          </>
        )}
      >
        <div className="space-y-3 text-xs">
          <div className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 text-sm">{transferOf?.fullname}</div>
              <div className="text-gray-500">{transferOf?.code} · {transferOf ? staffRoleLabel(transferOf.role) : ''}</div>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Trạm hiện tại:</span>
              <div className="font-bold text-[#00A859]">{transferOf?.stationId ? orgName(transferOf.stationId) : 'Chưa gán'}</div>
            </div>
          </div>

          {/* Cảnh báo xe đang gán (FL-M2-05 BR-G06, AC-21) */}
          {transferOf && vehiclesOfDriver(transferOf.id).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>Cảnh báo hủy ghép phương tiện (FL-M2-05 BR-G06)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Nhân viên đang được ghép với <strong>{vehiclesOfDriver(transferOf.id).length} phương tiện</strong> ({vehiclesOfDriver(transferOf.id).map((v) => v.plate).join(', ')}). Khi xác nhận điều chuyển trạm, toàn bộ các phương tiện này sẽ <strong>tự động bị hủy ghép</strong>!
              </p>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Điều chuyển đến trạm cứu hộ mới <span className="text-red-500">*</span>
            </label>
            <select
              value={transferToStation}
              onChange={(e) => setTransferToStation(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green bg-white font-medium"
            >
              <option value="">-- Chọn trạm tiếp nhận --</option>
              {STATION_OPTIONS.filter((s) => s.id !== transferOf?.stationId).map((s) => (
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
                className="w-full border rounded-lg p-2 text-xs outline-none focus:border-vetc-green bg-white"
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

      {/* Reset Mật khẩu */}
      <PartnerModal
        open={!!resetOf}
        title="Reset mật khẩu"
        icon={<KeyRound size={20} />}
        onClose={() => setResetOf(null)}
        footer={(
          <>
            <button type="button" onClick={() => setResetOf(null)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              onClick={() => {
                if (!resetOf) return;
                setNotice(`Đã gửi mật khẩu mới tới ${resetOf.phone}.`);
                setResetOf(null);
              }}
              className={partnerBtnBrand}
            >
              Gửi mật khẩu mới
            </button>
          </>
        )}
      >
        <p className="text-[12px] font-semibold text-gray-700">
          Reset mật khẩu SSO của <strong>{resetOf?.fullname}</strong> và gửi thông tin đăng nhập mới qua SĐT <strong>{resetOf?.phone}</strong>.
        </p>
      </PartnerModal>

      {/* Retry SSO */}
      <PartnerModal
        open={!!retryOf}
        title="Cấp tài khoản"
        icon={<KeyRound size={20} />}
        onClose={() => setRetryOf(null)}
        footer={(
          <>
            <button type="button" onClick={() => setRetryOf(null)} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              onClick={() => {
                if (!retryOf) return;
                patchStaff(retryOf.id, { hasAccount: true, accountCreateFailed: false, accountLocked: false });
                setRetryOf(null);
                setNotice(`Đã cấp tài khoản cho ${retryOf.fullname}. Thông tin đăng nhập đã gửi qua SĐT.`);
              }}
              className={partnerBtnBrand}
            >
              Cấp tài khoản
            </button>
          </>
        )}
      >
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Nhân viên chưa có tài khoản. Hệ thống tạo tài khoản và gửi mật khẩu qua SĐT; tạo lỗi thì không thay đổi hồ sơ.
        </p>
        <p className="text-[12px] font-semibold text-gray-700">
          {retryOf?.fullname} · {retryOf ? staffUsername(retryOf) : ''} · {retryOf?.phone}
        </p>
      </PartnerModal>

      {/* Import Excel */}
      <PartnerModal
        open={importOpen}
        title="Import Excel nhân viên"
        icon={<FileSpreadsheet size={20} />}
        wide
        xl
        onClose={closeImport}
        footer={(
          <>
            <button type="button" onClick={closeImport} className={partnerBtnNeutral}>Hủy</button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={importRows.filter((r) => !r.error).length === 0}
              className={partnerBtnBrand}
            >
              Nạp {importRows.filter((r) => !r.error).length} nhân viên
            </button>
          </>
        )}
      >
        <p className="mb-3 text-[11px] text-gray-500">
          Tải file mẫu, điền danh sách rồi upload. Mã NV trống thì hệ thống tự cấp. Dòng thiếu SĐT vẫn nạp hồ sơ nhưng <strong>tạo tài khoản SSO sẽ lỗi</strong> — dùng Retry trên danh sách.
        </p>
        <button
          type="button"
          onClick={downloadStaffTemplate}
          className="mb-4 inline-flex items-center gap-1.5 rounded border border-vetc-green px-3 py-1.5 text-[11px] font-bold text-vetc-green hover:bg-green-50"
        >
          <Download size={14} /> Tải file mẫu
        </button>
        <FileDrop accept=".xlsx,.xls,.csv" file={importFile} hint="xlsx, xls, csv" onFile={(f) => { void onImportFile(f); }} />
        {importError && <p className="mt-3 text-[12px] font-semibold text-red-600">{importError}</p>}
        {importRows.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-2 py-1.5 whitespace-nowrap">Họ tên</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">SĐT</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Vai trò</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Đơn vị</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Tài khoản</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r, i) => (
                  <tr key={`${r.fullname}-${i}`} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 font-bold whitespace-nowrap">{r.fullname || '—'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.phone || '—'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{ROLE_LABEL[r.role]}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.orgNodeId ? orgName(r.orgNodeId) : '—'}</td>
                    <td className={`px-2 py-1.5 font-bold whitespace-nowrap ${r.accountCreateFailed ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {r.error ? '—' : r.accountCreateFailed ? 'Lỗi tạo TK' : 'Sẽ cấp TK'}
                    </td>
                    <td className={`px-2 py-1.5 font-bold whitespace-nowrap ${r.error ? 'text-red-600' : 'text-emerald-600'}`}>
                      {r.error ?? 'Hợp lệ'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PartnerModal>

      {/* Toast thông báo hệ thống (FDD-FL-M2-01 Mục 14) */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-gray-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={18} className="text-[#00A859] shrink-0" />
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

export default PartnerStaff;
