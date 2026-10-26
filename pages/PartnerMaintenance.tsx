import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Truck,
  Wrench,
  X,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import AppSelect from '../shared/AppSelect';
import {
  FileDrop,
  PartnerModal,
} from '../components/PartnerModal';
import {
  PARTNER_STAFF,
  STATION_OPTIONS,
  VEHICLES,
  VEHICLE_TYPE_LABEL,
  driverName,
  inScope,
  orgName,
  updateVehicle,
  type PartnerPersona,
  type VehicleRecord,
} from '../data/partnerRescueMockData';

// --- DATA TYPES ---

const partnerLabelClass = 'mb-1 block text-xs font-semibold leading-4 text-gray-700';
const inputClass = 'w-full h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-800 outline-none placeholder:font-medium placeholder:text-gray-400 focus:border-[#0E8F47]';
const partnerBtnNeutral = 'flex-1 inline-flex items-center justify-center h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 hover:bg-gray-50';
const partnerBtnBrand = 'flex-1 inline-flex items-center justify-center h-9 px-3 rounded-lg bg-[#0E8F47] text-xs font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50';
const modalSelectClass = '!h-9 !rounded-lg !border-gray-300 !bg-white !px-2.5 !text-xs !font-semibold';

const VEHICLE_SELECT_OPTIONS = VEHICLES.map((v) => ({
  value: v.id,
  label: `${v.plate} - ${v.brand} ${v.modelLine} (${orgName(v.stationId)})`,
}));

const PRIORITY_OPTIONS = [
  { value: 'EMERGENCY', label: 'Khẩn cấp (Dừng xe ngay)' },
  { value: 'HIGH', label: 'Cao (Khắc phục trong 24h)' },
  { value: 'NORMAL', label: 'Bình thường (Theo lịch)' },
];

const ISSUE_CATEGORY_OPTIONS = [
  { value: 'HYDRAULIC_CRANE', label: 'Cẩu & Ray sàn trượt thủy lực' },
  { value: 'BRAKE_TIRE', label: 'Lốp & Hệ thống phanh' },
  { value: 'ENGINE', label: 'Động cơ & Hộp số' },
  { value: 'ELECTRICAL', label: 'Hệ thống điện & Đèn cứu hộ' },
  { value: 'OTHER', label: 'Bộ phận khác' },
];

export type MaintenanceTabKey = 'schedule' | 'requests' | 'orders' | 'history';

export interface MaintenanceScheduleItem {
  id: string;
  vehicleId: string;
  plate: string;
  brandModel: string;
  vehicleType: string;
  stationId: string;
  driverName: string;
  currentOdo: number;
  lastPerformedDate: string;
  lastPerformedOdo: number;
  nextLevelName: string;
  nextDueOdo: number;
  nextDueDate: string;
  status: 'OVERDUE' | 'DUE_SOON' | 'NORMAL';
  standardCycleKm: number;
}

export interface RepairRequestItem {
  id: string;
  vehicleId: string;
  plate: string;
  brandModel: string;
  stationId: string;
  requesterName: string;
  requesterRole: string;
  requesterPhone: string;
  createdAt: string;
  priority: 'EMERGENCY' | 'HIGH' | 'NORMAL';
  issueCategory: 'ENGINE' | 'HYDRAULIC_CRANE' | 'BRAKE_TIRE' | 'ELECTRICAL' | 'OTHER';
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  assignedOrderId?: string;
  rejectReason?: string;
  attachedPhoto?: string;
}

export interface MaintenanceWorkOrderItem {
  id: string;
  vehicleId: string;
  plate: string;
  brandModel: string;
  stationId: string;
  type: 'PERIODIC' | 'REPAIR' | 'EMERGENCY';
  typeName: string;
  garageName: string;
  garagePhone: string;
  garageAddress: string;
  startDate: string;
  expectedEndDate: string;
  estimatedCost: number;
  downtimeHours: number;
  status: 'IN_PROGRESS' | 'WAITING_PARTS' | 'PENDING_INSPECTION' | 'COMPLETED';
  items: string[];
  technicianOrSupervisor: string;
  requestId?: string;
  note?: string;
}

export interface MaintenanceHistoryItem {
  id: string;
  code: string;
  vehicleId: string;
  plate: string;
  brandModel: string;
  stationId: string;
  type: 'PERIODIC' | 'REPAIR';
  typeName: string;
  performedAt: string;
  odoKm: number;
  garageName: string;
  cost: number;
  technicianOrDriver: string;
  items: string[];
  invoiceFile: string;
  status: 'COMPLETED';
  note?: string;
}

// --- INITIAL MOCK DATA ---

const INITIAL_SCHEDULES: MaintenanceScheduleItem[] = [
  {
    id: 'sch-v1',
    vehicleId: 'v1',
    plate: '29A-123.45',
    brandModel: 'Isuzu FVR 900',
    vehicleType: 'Sàn trượt có cẩu',
    stationId: 'tt-hm',
    driverName: 'Ngô Đức Anh',
    currentOdo: 14280,
    lastPerformedDate: '15/07/2026',
    lastPerformedOdo: 10120,
    nextLevelName: 'Bảo dưỡng Cấp 1 (15.000 km)',
    nextDueOdo: 15000,
    nextDueDate: '15/10/2026',
    status: 'DUE_SOON',
    standardCycleKm: 5000,
  },
  {
    id: 'sch-v2',
    vehicleId: 'v2',
    plate: '29A-678.90',
    brandModel: 'Hino 500 Series',
    vehicleType: 'Sàn trượt',
    stationId: 'tt-hm',
    driverName: 'Bùi Văn Tâm',
    currentOdo: 10050,
    lastPerformedDate: '10/06/2026',
    lastPerformedOdo: 5200,
    nextLevelName: 'Bảo dưỡng Cấp 2 (10.000 km)',
    nextDueOdo: 10000,
    nextDueDate: '01/10/2026',
    status: 'OVERDUE',
    standardCycleKm: 5000,
  },
  {
    id: 'sch-v3',
    vehicleId: 'v3',
    plate: '30E-999.11',
    brandModel: 'Dongfeng D9',
    vehicleType: 'Sàn trượt có cẩu',
    stationId: 'tt-cg',
    driverName: 'Trần Quốc Huy',
    currentOdo: 18400,
    lastPerformedDate: '12/04/2026',
    lastPerformedOdo: 15000,
    nextLevelName: 'Bảo dưỡng Cấp 3 (20.000 km)',
    nextDueOdo: 20000,
    nextDueDate: '25/11/2026',
    status: 'NORMAL',
    standardCycleKm: 5000,
  },
  {
    id: 'sch-v4',
    vehicleId: 'v4',
    plate: '29C-555.22',
    brandModel: 'Hino 300 Dutro',
    vehicleType: 'Sàn trượt',
    stationId: 'tt-tx',
    driverName: 'Lê Hoàng Nam',
    currentOdo: 4890,
    lastPerformedDate: '20/02/2026',
    lastPerformedOdo: 1000,
    nextLevelName: 'Bảo dưỡng Cấp 1 (5.000 km)',
    nextDueOdo: 5000,
    nextDueDate: '10/10/2026',
    status: 'DUE_SOON',
    standardCycleKm: 5000,
  },
  {
    id: 'sch-v5',
    vehicleId: 'v5',
    plate: '30H-888.66',
    brandModel: 'Isuzu Forward FVR',
    vehicleType: 'Sàn trượt có cẩu',
    stationId: 'tt-tx',
    driverName: 'Vũ Đức Thịnh',
    currentOdo: 22100,
    lastPerformedDate: '18/08/2026',
    lastPerformedOdo: 20000,
    nextLevelName: 'Bảo dưỡng Cấp 1 (25.000 km)',
    nextDueOdo: 25000,
    nextDueDate: '15/12/2026',
    status: 'NORMAL',
    standardCycleKm: 5000,
  },
];

const INITIAL_REQUESTS: RepairRequestItem[] = [
  {
    id: 'REQ-2026-0042',
    vehicleId: 'v1',
    plate: '29A-123.45',
    brandModel: 'Isuzu FVR 900',
    stationId: 'tt-hm',
    requesterName: 'Ngô Đức Anh',
    requesterRole: 'Tài xế lái chính',
    requesterPhone: '0912 345 678',
    createdAt: '03/10/2026 09:15',
    priority: 'HIGH',
    issueCategory: 'HYDRAULIC_CRANE',
    title: 'Xilanh nâng sàn trượt bị rò rỉ dầu thủy lực áp lực cao',
    description: 'Sau khi hoàn thành cuốc cứu hộ xe 4 chỗ tại Pháp Vân, phát hiện gioăng phớt xilanh thủy lực bên trái sàn trượt bị rỉ dầu nhớt, áp suất nâng bị giật nhẹ.',
    status: 'PENDING',
  },
  {
    id: 'REQ-2026-0040',
    vehicleId: 'v2',
    plate: '29A-678.90',
    brandModel: 'Hino 500 Series',
    stationId: 'tt-hm',
    requesterName: 'Bùi Văn Tâm',
    requesterRole: 'Tài xế lái chính',
    requesterPhone: '0988 777 222',
    createdAt: '02/10/2026 15:40',
    priority: 'EMERGENCY',
    issueCategory: 'BRAKE_TIRE',
    title: 'Lốp sau bên phụ bị chém rách hông lốp khi cứu hộ đường hẹp',
    description: 'Lốp sau kép bị đá nhọn cứa rách thành lốp, đã thay tạm lốp dự phòng nhưng cần thay mới lốp chính hãng gấp để đảm bảo tải trọng cẩu kéo.',
    status: 'APPROVED',
    assignedOrderId: 'WO-2026-0082',
  },
  {
    id: 'REQ-2026-0036',
    vehicleId: 'v3',
    plate: '30E-999.11',
    brandModel: 'Dongfeng D9',
    stationId: 'tt-cg',
    requesterName: 'Trần Quốc Huy',
    requesterRole: 'Tài xế lái chính',
    requesterPhone: '0904 112 334',
    createdAt: '28/09/2026 11:20',
    priority: 'NORMAL',
    issueCategory: 'ELECTRICAL',
    title: 'Đèn cảnh báo xoay trên nóc cabin xe chập chờn',
    description: 'Đèn ưu tiên cứu hộ khi bật công tắc lúc sáng lúc tắt do giắc cắm rơ le bị lỏng.',
    status: 'REJECTED',
    rejectReason: 'Kỹ thuật trạm đã kiểm tra và cắm chặt lại rơ le, không cần đưa vào xưởng.',
  },
];

const INITIAL_WORK_ORDERS: MaintenanceWorkOrderItem[] = [
  {
    id: 'WO-2026-0082',
    vehicleId: 'v2',
    plate: '29A-678.90',
    brandModel: 'Hino 500 Series',
    stationId: 'tt-hm',
    type: 'REPAIR',
    typeName: 'Sửa chữa & Thay thế lốp sau chịu tải Bridgestone 11.00R20',
    garageName: 'Xưởng dịch vụ VETC - Hoàng Mai',
    garagePhone: '024 3888 9999',
    garageAddress: 'Km 12 Đường Giải Phóng, P. Hoàng Liệt, Hoàng Mai, Hà Nội',
    startDate: '02/10/2026',
    expectedEndDate: '04/10/2026',
    estimatedCost: 8500000,
    downtimeHours: 26,
    status: 'IN_PROGRESS',
    items: [
      'Thay mới 01 quả lốp chịu tải Bridgestone 11.00R20',
      'Cân mâm bấm chì và cân chỉnh góc đặt bánh xe',
      'Kiểm tra và siết lại toàn bộ tắc-kê bánh xe kép',
    ],
    technicianOrSupervisor: 'Nguyễn Văn Tiến (Quản đốc xưởng)',
    requestId: 'REQ-2026-0040',
    note: 'Đang chờ hãng lốp giao hàng trong chiều nay.',
  },
  {
    id: 'WO-2026-0081',
    vehicleId: 'v4',
    plate: '29C-555.22',
    brandModel: 'Hino 300 Dutro',
    stationId: 'tt-tx',
    type: 'PERIODIC',
    typeName: 'Bảo dưỡng định kỳ Cấp 1 (5.000 km)',
    garageName: 'Hino Lexim Hà Nội',
    garagePhone: '024 3766 5544',
    garageAddress: 'Lô 18 KCN Hà Nội - Đài Tư, Long Biên, Hà Nội',
    startDate: '03/10/2026',
    expectedEndDate: '03/10/2026',
    estimatedCost: 1950000,
    downtimeHours: 5,
    status: 'PENDING_INSPECTION',
    items: [
      'Thay dầu động cơ Hino Genuine Oil 15W-40 (7 lít)',
      'Thay lọc nhớt chính hãng Hino',
      'Kiểm tra áp suất lốp và phanh 4 bánh',
      'Bơm mỡ trục các-đăng và ray trượt sàn',
    ],
    technicianOrSupervisor: 'Lê Hoàng Nam (Tài xế bàn giao)',
    note: 'Xưởng đã hoàn thành các hạng mục, đang chờ ký biên bản nghiệm thu.',
  },
];

const INITIAL_HISTORY: MaintenanceHistoryItem[] = [
  {
    id: 'his-01',
    code: 'BD-2026-0042',
    vehicleId: 'v1',
    plate: '29A-123.45',
    brandModel: 'Isuzu FVR 900',
    stationId: 'tt-hm',
    type: 'PERIODIC',
    typeName: 'Bảo dưỡng định kỳ Cấp 2 (10.000 km)',
    performedAt: '15/07/2026',
    odoKm: 10120,
    garageName: 'Xưởng dịch vụ VETC - Hoàng Mai',
    cost: 3450000,
    technicianOrDriver: 'Ngô Đức Anh (Tài xế bàn giao)',
    items: [
      'Thay dầu động cơ cao cấp 10W-40 (8 lít)',
      'Thay cốc lọc dầu nhớt chính hãng',
      'Kiểm tra áp suất dầu tời cẩu thủy lực 8 tấn',
      'Bơm mỡ các khớp quay ray trượt sàn chở xe',
      'Bảo dưỡng hệ thống phanh trước & sau',
    ],
    invoiceFile: 'phieu_kiem_tra_bd_10k_v1.pdf',
    status: 'COMPLETED',
    note: 'Xe vận hành êm, hệ thống cẩu và sàn trượt đạt tiêu chuẩn an toàn cứu hộ.',
  },
  {
    id: 'his-02',
    code: 'SC-2026-0019',
    vehicleId: 'v1',
    plate: '29A-123.45',
    brandModel: 'Isuzu FVR 900',
    stationId: 'tt-hm',
    type: 'REPAIR',
    typeName: 'Thay thế dây cáp cẩu & bảo dưỡng van chia thủy lực',
    performedAt: '28/05/2026',
    odoKm: 8350,
    garageName: 'Xưởng cơ khí thủy lực Tân Phát',
    cost: 5200000,
    technicianOrDriver: 'Ngô Đức Anh (Tài xế bàn giao)',
    items: [
      'Thay cáp thép tời cẩu lụa phi 12mm (25m)',
      'Vệ sinh và thay phớt van chia thủy lực sàn trượt',
      'Thử tải cẩu xe 5 tấn đạt yêu cầu an toàn',
    ],
    invoiceFile: 'hoa_don_thay_cap_cau.pdf',
    status: 'COMPLETED',
    note: 'Đã kiểm định lại tải trọng nâng trước khi đưa vào trực ca.',
  },
  {
    id: 'his-03',
    code: 'BD-2026-0033',
    vehicleId: 'v2',
    plate: '29A-678.90',
    brandModel: 'Hino 500 Series',
    stationId: 'tt-hm',
    type: 'PERIODIC',
    typeName: 'Bảo dưỡng Cấp 1 (5.000 km)',
    performedAt: '10/06/2026',
    odoKm: 5200,
    garageName: 'Hino Lexim Hà Nội',
    cost: 1800000,
    technicianOrDriver: 'Bùi Văn Tâm',
    items: ['Thay nhớt động cơ 15W-40', 'Kiểm tra hệ thống điện sàn trượt'],
    invoiceFile: 'hoa_don_bd_hino_5k.pdf',
    status: 'COMPLETED',
  },
  {
    id: 'his-04',
    code: 'BD-2026-0027',
    vehicleId: 'v3',
    plate: '30E-999.11',
    brandModel: 'Dongfeng D9',
    stationId: 'tt-cg',
    type: 'PERIODIC',
    typeName: 'Bảo dưỡng Cấp 2 (15.000 km)',
    performedAt: '12/04/2026',
    odoKm: 15000,
    garageName: 'Xưởng dịch vụ VETC - Cầu Giấy',
    cost: 3100000,
    technicianOrDriver: 'Trần Quốc Huy',
    items: ['Thay dầu nhớt động cơ', 'Thay cốc lọc dầu', 'Bảo dưỡng mỡ ray cẩu'],
    invoiceFile: 'bien_ban_bd_15k.pdf',
    status: 'COMPLETED',
  },
];

const PartnerMaintenance: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subTab } = useParams<{ subTab?: string }>();

  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);

  // Sync tab with URL param (/partner/maintenance/:subTab) or query param (?tab=...)
  const queryTab = useMemo(() => {
    if (subTab === 'requests' || subTab === 'orders' || subTab === 'history' || subTab === 'schedule') {
      return subTab as MaintenanceTabKey;
    }
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t === 'requests' || t === 'orders' || t === 'history') return t as MaintenanceTabKey;
    return 'schedule' as MaintenanceTabKey;
  }, [subTab, location.search]);

  const [currentTab, setCurrentTab] = useState<MaintenanceTabKey>(queryTab);

  useEffect(() => {
    setCurrentTab(queryTab);
  }, [queryTab]);

  const handleTabChange = (tab: MaintenanceTabKey) => {
    setCurrentTab(tab);
    setStatusFilter('ALL');
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate({ pathname: '/partner/maintenance', search: `?${params.toString()}` }, { replace: true });
  };

  // State data
  const [schedules, setSchedules] = useState<MaintenanceScheduleItem[]>(INITIAL_SCHEDULES);
  const [requests, setRequests] = useState<RepairRequestItem[]>(INITIAL_REQUESTS);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrderItem[]>(INITIAL_WORK_ORDERS);
  const [historyList, setHistoryList] = useState<MaintenanceHistoryItem[]>(INITIAL_HISTORY);

  // Global filters
  const queryPlate = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('plate') || '';
  }, [location.search]);

  const [searchTerm, setSearchTerm] = useState(queryPlate);

  useEffect(() => {
    if (queryPlate) setSearchTerm(queryPlate);
  }, [queryPlate]);

  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceScheduleItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    nextDueOdo: 15000,
    nextDueDate: '15/10/2026',
    nextLevelName: 'Bảo dưỡng Cấp 1 (15.000 km)',
    standardCycleKm: 5000,
  });

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    vehicleId: 'v1',
    priority: 'HIGH' as 'EMERGENCY' | 'HIGH' | 'NORMAL',
    issueCategory: 'HYDRAULIC_CRANE' as RepairRequestItem['issueCategory'],
    title: '',
    description: '',
  });

  const [workOrderModalOpen, setWorkOrderModalOpen] = useState(false);
  const [workOrderForm, setWorkOrderForm] = useState({
    vehicleId: 'v1',
    type: 'PERIODIC' as 'PERIODIC' | 'REPAIR' | 'EMERGENCY',
    typeName: '',
    garageName: 'Xưởng dịch vụ VETC - Hoàng Mai',
    garagePhone: '024 3888 9999',
    garageAddress: 'Km 12 Đường Giải Phóng, Hoàng Mai, Hà Nội',
    startDate: new Date().toLocaleDateString('vi-VN'),
    expectedEndDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('vi-VN'),
    estimatedCost: 3500000,
    itemsText: 'Thay dầu động cơ\nThay cốc lọc dầu\nBảo dưỡng mỡ ray trượt sàn',
    technicianOrSupervisor: 'Ngô Đức Anh',
    note: '',
  });

  const [completeOrderModalOpen, setCompleteOrderModalOpen] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<MaintenanceWorkOrderItem | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualCost: 3500000,
    finalOdo: 14280,
    technicianOrDriver: 'Ngô Đức Anh',
    note: 'Đã kiểm tra vận hành tốt, đủ điều kiện trả về trực sẵn sàng.',
  });
  const [completeInvoiceFile, setCompleteInvoiceFile] = useState<File | null>(null);

  const [previewHistory, setPreviewHistory] = useState<MaintenanceHistoryItem | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Scope filter helper
  const isItemInScope = (stationId: string) => inScope(persona, stationId);

  // --- ACTIONS ---

  // Lịch bảo dưỡng: mở modal sửa mốc ODO
  const handleOpenEditSchedule = (item: MaintenanceScheduleItem) => {
    setEditingSchedule(item);
    setScheduleForm({
      nextDueOdo: item.nextDueOdo,
      nextDueDate: item.nextDueDate,
      nextLevelName: item.nextLevelName,
      standardCycleKm: item.standardCycleKm,
    });
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!editingSchedule) return;
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === editingSchedule.id
          ? {
              ...s,
              nextDueOdo: Number(scheduleForm.nextDueOdo) || s.nextDueOdo,
              nextDueDate: scheduleForm.nextDueDate,
              nextLevelName: scheduleForm.nextLevelName,
              standardCycleKm: Number(scheduleForm.standardCycleKm) || 5000,
              status:
                s.currentOdo >= Number(scheduleForm.nextDueOdo)
                  ? 'OVERDUE'
                  : Number(scheduleForm.nextDueOdo) - s.currentOdo <= 800
                  ? 'DUE_SOON'
                  : 'NORMAL',
            }
          : s
      )
    );
    setScheduleModalOpen(false);
    triggerToast(`Đã cập nhật chu kỳ bảo dưỡng cho xe ${editingSchedule.plate}`);
  };

  // Từ lịch bảo dưỡng chuyển nhanh sang Lệnh bảo dưỡng
  const handleQuickCreateOrderFromSchedule = (s: MaintenanceScheduleItem) => {
    setWorkOrderForm({
      vehicleId: s.vehicleId,
      type: 'PERIODIC',
      typeName: s.nextLevelName,
      garageName: 'Xưởng dịch vụ VETC - Hoàng Mai',
      garagePhone: '024 3888 9999',
      garageAddress: 'Km 12 Đường Giải Phóng, Hoàng Mai, Hà Nội',
      startDate: new Date().toLocaleDateString('vi-VN'),
      expectedEndDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('vi-VN'),
      estimatedCost: 3500000,
      itemsText: `Thay dầu nhớt động cơ chính hãng\nThay lọc nhớt & lọc gió\nKiểm tra phanh & ray sàn trượt\nBơm mỡ tời cẩu`,
      technicianOrSupervisor: s.driverName || 'Tài xế lái chính',
      note: `Bảo dưỡng theo mốc ODO ${s.currentOdo} km.`,
    });
    setWorkOrderModalOpen(true);
  };

  // Yêu cầu sửa chữa: Tạo mới
  const handleCreateRequest = () => {
    if (!requestForm.title.trim()) {
      alert('Vui lòng nhập tiêu đề sự cố hư hỏng.');
      return;
    }
    const veh = VEHICLES.find((v) => v.id === requestForm.vehicleId) || VEHICLES[0];
    const newReq: RepairRequestItem = {
      id: `REQ-${new Date().getFullYear()}-${String(requests.length + 1).padStart(4, '0')}`,
      vehicleId: veh.id,
      plate: veh.plate,
      brandModel: `${veh.brand} ${veh.modelLine}`,
      stationId: veh.stationId,
      requesterName: driverName(veh.driverId) || persona.title,
      requesterRole: 'Tài xế phụ trách',
      requesterPhone: '0912 345 678',
      createdAt: new Date().toLocaleString('vi-VN'),
      priority: requestForm.priority,
      issueCategory: requestForm.issueCategory,
      title: requestForm.title.trim(),
      description: requestForm.description.trim() || 'Tài xế báo hỏng từ ứng dụng lái xe.',
      status: 'PENDING',
    };
    setRequests((prev) => [newReq, ...prev]);
    setRequestModalOpen(false);
    setRequestForm({
      vehicleId: 'v1',
      priority: 'HIGH',
      issueCategory: 'HYDRAULIC_CRANE',
      title: '',
      description: '',
    });
    triggerToast(`Đã tạo yêu cầu sửa chữa ${newReq.id}`);
  };

  // Yêu cầu sửa chữa: Duyệt & Chuyển thành Lệnh
  const handleApproveRequest = (req: RepairRequestItem) => {
    setWorkOrderForm({
      vehicleId: req.vehicleId,
      type: 'REPAIR',
      typeName: `Khắc phục sự cố: ${req.title}`,
      garageName: 'Xưởng dịch vụ VETC - Hoàng Mai',
      garagePhone: '024 3888 9999',
      garageAddress: 'Km 12 Đường Giải Phóng, Hoàng Mai, Hà Nội',
      startDate: new Date().toLocaleDateString('vi-VN'),
      expectedEndDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString('vi-VN'),
      estimatedCost: 4500000,
      itemsText: `${req.title}\nKiểm tra an toàn tổng thể hệ thống cẩu kéo`,
      technicianOrSupervisor: req.requesterName,
      note: `Tạo từ yêu cầu sự cố ${req.id}: ${req.description}`,
    });
    // Mark request approved
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'APPROVED', assignedOrderId: 'WO-TẠO-MỚI' } : r))
    );
    setWorkOrderModalOpen(true);
  };

  // Yêu cầu sửa chữa: Từ chối
  const handleRejectRequest = (reqId: string) => {
    const reason = prompt('Nhập lý do từ chối yêu cầu sửa chữa:');
    if (!reason) return;
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'REJECTED', rejectReason: reason } : r))
    );
    triggerToast('Đã từ chối yêu cầu sửa chữa.');
  };

  const itemLines = workOrderForm.itemsText.split('\n');
  const setItemLines = (lines: string[]) => {
    setWorkOrderForm((prev) => ({ ...prev, itemsText: (lines.length ? lines : ['']).join('\n') }));
  };

  // Lệnh: Lưu tạo mới
  const handleSaveWorkOrder = () => {
    if (!workOrderForm.typeName.trim()) {
      alert('Vui lòng nhập tên công việc / đợt bảo dưỡng.');
      return;
    }
    const veh = VEHICLES.find((v) => v.id === workOrderForm.vehicleId) || VEHICLES[0];
    const newWoId = `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(4, '0')}`;
    const items = workOrderForm.itemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newOrder: MaintenanceWorkOrderItem = {
      id: newWoId,
      vehicleId: veh.id,
      plate: veh.plate,
      brandModel: `${veh.brand} ${veh.modelLine}`,
      stationId: veh.stationId,
      type: workOrderForm.type,
      typeName: workOrderForm.typeName.trim(),
      garageName: workOrderForm.garageName,
      garagePhone: workOrderForm.garagePhone,
      garageAddress: workOrderForm.garageAddress,
      startDate: workOrderForm.startDate,
      expectedEndDate: workOrderForm.expectedEndDate,
      estimatedCost: Number(workOrderForm.estimatedCost) || 0,
      downtimeHours: 0,
      status: 'IN_PROGRESS',
      items,
      technicianOrSupervisor: workOrderForm.technicianOrSupervisor,
      note: workOrderForm.note,
    };

    // Chuyển trạng thái xe sang MAINTENANCE (Đang sửa chữa)
    updateVehicle(veh.id, {
      status: 'MAINTENANCE',
      runStatus: 'repair',
      statusReason: `Đang bảo dưỡng/sửa chữa tại xưởng theo lệnh ${newWoId}`,
    });

    setWorkOrders((prev) => [newOrder, ...prev]);
    setWorkOrderModalOpen(false);
    triggerToast(`Đã phát hành lệnh ${newWoId}, xe ${veh.plate} chuyển sang trạng thái ĐANG SỬA CHỮA`);
  };

  // Lệnh: Mở modal nghiệm thu hoàn tất
  const handleOpenCompleteOrder = (order: MaintenanceWorkOrderItem) => {
    setOrderToComplete(order);
    setCompleteForm({
      actualCost: order.estimatedCost,
      finalOdo: 14500,
      technicianOrDriver: order.technicianOrSupervisor,
      note: 'Đã nghiệm thu đạt chuẩn an toàn, xưởng đã bàn giao xe và chìa khóa.',
    });
    setCompleteInvoiceFile(null);
    setCompleteOrderModalOpen(true);
  };

  // Lệnh: Lưu nghiệm thu hoàn thành -> chuyển xe về READY + lưu Lịch sử
  const handleConfirmCompleteOrder = () => {
    if (!orderToComplete) return;

    // 1. Chuyển trạng thái xe về READY
    updateVehicle(orderToComplete.vehicleId, {
      status: 'READY',
      runStatus: 'active',
      statusReason: 'Đã hoàn thành bảo dưỡng nghiệm thu xưởng',
    });

    // 2. Tạo bản ghi Lịch sử bảo dưỡng
    const newHis: MaintenanceHistoryItem = {
      id: `his-${Date.now()}`,
      code: orderToComplete.id.replace('WO-', 'BD-'),
      vehicleId: orderToComplete.vehicleId,
      plate: orderToComplete.plate,
      brandModel: orderToComplete.brandModel,
      stationId: orderToComplete.stationId,
      type: orderToComplete.type === 'PERIODIC' ? 'PERIODIC' : 'REPAIR',
      typeName: orderToComplete.typeName,
      performedAt: new Date().toLocaleDateString('vi-VN'),
      odoKm: Number(completeForm.finalOdo) || 14500,
      garageName: orderToComplete.garageName,
      cost: Number(completeForm.actualCost) || orderToComplete.estimatedCost,
      technicianOrDriver: completeForm.technicianOrDriver,
      items: orderToComplete.items,
      invoiceFile: completeInvoiceFile ? completeInvoiceFile.name : 'bien_ban_nghiem_thu_gara.pdf',
      status: 'COMPLETED',
      note: completeForm.note,
    };

    setHistoryList((prev) => [newHis, ...prev]);

    // 3. Cập nhật trạng thái lệnh sang COMPLETED
    setWorkOrders((prev) =>
      prev.map((w) => (w.id === orderToComplete.id ? { ...w, status: 'COMPLETED' } : w))
    );

    // 4. Cập nhật mốc chu kỳ bảo dưỡng kế tiếp cho xe
    setSchedules((prev) =>
      prev.map((s) =>
        s.vehicleId === orderToComplete.vehicleId
          ? {
              ...s,
              lastPerformedDate: new Date().toLocaleDateString('vi-VN'),
              lastPerformedOdo: Number(completeForm.finalOdo) || s.currentOdo,
              nextDueOdo: (Number(completeForm.finalOdo) || s.currentOdo) + s.standardCycleKm,
              status: 'NORMAL',
            }
          : s
      )
    );

    setCompleteOrderModalOpen(false);
    triggerToast(`Đã nghiệm thu xong ${orderToComplete.id}. Xe ${orderToComplete.plate} đã chuyển về SẴN SÀNG`);
  };

  // Xuất Excel lịch sử
  const handleExportHistoryExcel = () => {
    const data = historyList.map((h, i) => ({
      STT: i + 1,
      'Mã phiếu': h.code,
      'Biển số': h.plate,
      'Dòng xe': h.brandModel,
      'Trạm': orgName(h.stationId),
      'Loại hình': h.type === 'PERIODIC' ? 'Bảo dưỡng định kỳ' : 'Sửa chữa sự cố',
      'Đợt bảo dưỡng / sửa chữa': h.typeName,
      'Ngày làm': h.performedAt,
      'ODO (km)': h.odoKm,
      'Xưởng / Gara': h.garageName,
      'Chi phí (VNĐ)': h.cost,
      'Người bàn giao': h.technicianOrDriver,
      'Hóa đơn đính kèm': h.invoiceFile,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LichSuBaoDuong');
    XLSX.writeFile(wb, `Lich_su_bao_duong_VETC_${new Date().toISOString().slice(0, 10)}.xlsx`);
    triggerToast('Đã xuất file Excel lịch sử bảo dưỡng');
  };

  const query = searchTerm.trim().toLowerCase();
  const stationMatch = (stationId: string) => selectedStation === 'ALL' || stationId === selectedStation;
  const statusMatch = (status: string) => statusFilter === 'ALL' || status === statusFilter;
  const textMatch = (...parts: string[]) => !query || parts.some((part) => part.toLowerCase().includes(query));
  const visibleSchedules = schedules.filter((s) => isItemInScope(s.stationId) && stationMatch(s.stationId) && statusMatch(s.status) && textMatch(s.plate, s.brandModel, s.driverName));
  const visibleRequests = requests.filter((r) => isItemInScope(r.stationId) && stationMatch(r.stationId) && statusMatch(r.status) && textMatch(r.id, r.plate, r.title, r.requesterName));
  const visibleOrders = workOrders.filter((w) => isItemInScope(w.stationId) && stationMatch(w.stationId) && statusMatch(w.status) && textMatch(w.id, w.plate, w.typeName, w.garageName));
  const visibleHistory = historyList.filter((h) => isItemInScope(h.stationId) && stationMatch(h.stationId) && textMatch(h.code, h.plate, h.typeName, h.garageName));
  const resultCount = currentTab === 'requests' ? visibleRequests.length : currentTab === 'orders' ? visibleOrders.length : currentTab === 'history' ? visibleHistory.length : visibleSchedules.length;
  const chipCount = (tab: MaintenanceTabKey) => {
    const rows = tab === 'requests' ? requests : tab === 'orders' ? workOrders : tab === 'history' ? historyList : schedules;
    return rows.filter((row) => isItemInScope(row.stationId) && stationMatch(row.stationId)).length;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Bảo dưỡng & Sửa chữa</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Phạm vi: {persona.label} · Lịch bảo dưỡng, yêu cầu sửa chữa, lệnh xưởng và lịch sử chi phí
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentTab === 'schedule' && (
            <button
              type="button"
              onClick={() => {
                const overdue = schedules.find((s) => s.status === 'OVERDUE' || s.status === 'DUE_SOON');
                if (overdue) handleQuickCreateOrderFromSchedule(overdue);
                else setWorkOrderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E8F47] px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
            >
              <Plus size={14} />
              Lập lệnh bảo dưỡng
            </button>
          )}

          {currentTab === 'requests' && (
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E8F47] px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
            >
              <Plus size={14} />
              Tạo yêu cầu sửa chữa
            </button>
          )}

          {currentTab === 'orders' && (
            <button
              type="button"
              onClick={() => setWorkOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E8F47] px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
            >
              <Plus size={14} />
              Tạo lệnh sửa chữa / xưởng
            </button>
          )}

          {currentTab === 'history' && (
            <button
              type="button"
              onClick={handleExportHistoryExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
            >
              <FileSpreadsheet size={15} />
              Xuất Excel
            </button>
          )}
        </div>
      </div>

      <PartnerScopeBar persona={persona} onChange={setPersona} />

      <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Biển số / nội dung
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Biển số, gara, triệu chứng"
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[12px] font-semibold normal-case tracking-normal text-gray-800 outline-none focus:border-[#0E8F47]"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Trạm
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full min-w-0 truncate rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[12px] font-semibold normal-case tracking-normal text-gray-800 outline-none focus:border-[#0E8F47]"
            >
              <option value="ALL">Tất cả trạm</option>
              {STATION_OPTIONS.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Tình trạng
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={currentTab === 'history'}
              className="w-full min-w-0 truncate rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[12px] font-semibold normal-case tracking-normal text-gray-800 outline-none focus:border-[#0E8F47] disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="ALL">Tất cả</option>
              {currentTab === 'schedule' && (
                <>
                  <option value="OVERDUE">Quá hạn bảo dưỡng</option>
                  <option value="DUE_SOON">Sắp đến hạn</option>
                  <option value="NORMAL">Bình thường</option>
                </>
              )}
              {currentTab === 'requests' && (
                <>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="REJECTED">Đã từ chối</option>
                </>
              )}
              {currentTab === 'orders' && (
                <>
                  <option value="IN_PROGRESS">Đang sửa chữa</option>
                  <option value="WAITING_PARTS">Chờ phụ tùng</option>
                  <option value="PENDING_INSPECTION">Chờ nghiệm thu</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                </>
              )}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {([
              ['schedule', 'Lịch bảo dưỡng'],
              ['requests', 'Yêu cầu sửa chữa'],
              ['orders', 'Lệnh sửa chữa'],
              ['history', 'Lịch sử'],
            ] as const).map(([key, label]) => {
              const active = currentTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabChange(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${active ? 'border-[#0E8F47] bg-emerald-50 text-[#0B6B37]' : 'border-gray-300 bg-white text-gray-600'}`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-[#0E8F47] text-white' : 'bg-gray-100 text-gray-600'}`}>{chipCount(key)}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedStation('ALL');
              setStatusFilter('ALL');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold"
          >
            <RotateCcw size={14} />
            Xóa bộ lọc
          </button>
        </div>
      </section>

      <div className="border rounded-lg shadow-sm bg-white w-full min-w-0 overflow-hidden">
        <div className="bg-[#00A859] text-white px-4 py-2 flex items-center justify-between font-bold text-sm uppercase tracking-wide">
          <span>Kết quả tìm kiếm ({resultCount})</span>
        </div>

        {/* Tab 1: LỊCH BẢO DƯỠNG (SCHEDULE) */}
        {currentTab === 'schedule' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 [&_th]:font-bold">
                <tr>
                  <th className="p-3">Phương tiện</th>
                  <th className="p-3">Trạm & Tài xế</th>
                  <th className="p-3 text-right">ODO hiện tại (MID)</th>
                  <th className="p-3">Cấp bảo dưỡng dự kiến</th>
                  <th className="p-3">Tiến độ ODO đến hạn</th>
                  <th className="p-3">Hạn ngày kế tiếp</th>
                  <th className="p-3 text-center">Tình trạng</th>
                  <th className="p-3 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleSchedules.map((s) => {
                    const diffKm = s.nextDueOdo - s.currentOdo;
                    const percent = Math.min(100, Math.round((s.currentOdo / s.nextDueOdo) * 100));

                    return (
                      <tr key={s.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/partner/vehicles/${s.vehicleId}`)}
                            className="font-bold text-[#00A859] hover:underline flex items-center gap-1"
                          >
                            <Truck size={13} />
                            {s.plate}
                          </button>
                          <div className="text-[11px] text-gray-500">{s.brandModel}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-800">{orgName(s.stationId)}</div>
                          <div className="text-[11px] text-gray-500">Lái xe: {s.driverName}</div>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold tabular-nums text-gray-900">
                            {s.currentOdo.toLocaleString('vi-VN')} km
                          </span>
                          <div className="text-[10px] text-emerald-600">Đồng bộ GPS</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-800">{s.nextLevelName}</div>
                          <div className="text-[10px] text-gray-400">Chu kỳ: {s.standardCycleKm.toLocaleString('vi-VN')} km</div>
                        </td>
                        <td className="p-3 w-52">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="tabular-nums text-gray-600">
                              Hạn: <strong>{s.nextDueOdo.toLocaleString('vi-VN')} km</strong>
                            </span>
                            <span
                              className={`font-bold ${
                                diffKm <= 0 ? 'text-red-600' : diffKm <= 800 ? 'text-amber-600' : 'text-emerald-600'
                              }`}
                            >
                              {diffKm <= 0 ? `Quá ${Math.abs(diffKm)} km` : `Còn ${diffKm} km`}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                diffKm <= 0
                                  ? 'bg-red-500'
                                  : diffKm <= 800
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-gray-800">{s.nextDueDate}</div>
                          <div className="text-[10px] text-gray-500">Lần trước: {s.lastPerformedDate}</div>
                        </td>
                        <td className="p-3 text-center">
                          {s.status === 'OVERDUE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              <AlertCircle size={11} /> Quá hạn
                            </span>
                          )}
                          {s.status === 'DUE_SOON' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle size={11} /> Sắp đến hạn
                            </span>
                          )}
                          {s.status === 'NORMAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={11} /> An toàn
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickCreateOrderFromSchedule(s)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded text-[11px] transition"
                              title="Tạo lệnh đưa xe vào xưởng ngay"
                            >
                              Lập lệnh
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(s)}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              title="Điều chỉnh chu kỳ ODO / Ngày hẹn"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: YÊU CẦU SỬA CHỮA (REQUESTS) */}
        {currentTab === 'requests' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 [&_th]:font-bold">
                <tr>
                  <th className="p-3">Mã yêu cầu</th>
                  <th className="p-3">Phương tiện</th>
                  <th className="p-3">Người báo hỏng</th>
                  <th className="p-3">Mức độ ưu tiên</th>
                  <th className="p-3">Nội dung triệu chứng</th>
                  <th className="p-3">Thời gian tạo</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-bold text-gray-800">{r.id}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/partner/vehicles/${r.vehicleId}`)}
                          className="font-bold text-[#00A859] hover:underline"
                        >
                          {r.plate}
                        </button>
                        <div className="text-[10px] text-gray-500">{r.brandModel}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{r.requesterName}</div>
                        <div className="text-[10px] text-gray-500">
                          {r.requesterRole} · {r.requesterPhone}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.priority === 'EMERGENCY' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 animate-pulse">
                            🚨 Khẩn cấp
                          </span>
                        )}
                        {r.priority === 'HIGH' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                            ⚠ Cao (Sửa &lt; 24h)
                          </span>
                        )}
                        {r.priority === 'NORMAL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                            Bình thường
                          </span>
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-semibold text-gray-900 line-clamp-2" title={r.title}>{r.title}</div>
                        {r.rejectReason && (
                          <div className="mt-1 line-clamp-1 text-[10px] text-red-600" title={r.rejectReason}>
                            Lý do từ chối: {r.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-500">{r.createdAt}</td>
                      <td className="p-3 text-center">
                        {r.status === 'PENDING' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Chờ duyệt
                          </span>
                        )}
                        {r.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Đã tạo lệnh xưởng
                          </span>
                        )}
                        {r.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                            Từ chối
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {r.status === 'PENDING' ? (
                          <div className="inline-flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(r)}
                              title="Duyệt và tạo lệnh xưởng"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-bold text-[#0E8F47] hover:bg-emerald-50"
                            >
                              <Check size={14} />
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(r.id)}
                              title="Từ chối yêu cầu"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50"
                            >
                              <X size={14} />
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: LỆNH BẢO DƯỠNG / SỬA CHỮA (WORK ORDERS) */}
        {currentTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 [&_th]:font-bold">
                <tr>
                  <th className="p-3">Mã lệnh xưởng</th>
                  <th className="p-3">Phương tiện</th>
                  <th className="p-3">Loại hình & Hạng mục xưởng</th>
                  <th className="p-3">Gara / Xưởng thực hiện</th>
                  <th className="p-3">Thời gian thực hiện</th>
                  <th className="p-3 text-right">Dự toán chi phí</th>
                  <th className="p-3 text-center">Trạng thái lệnh</th>
                  <th className="p-3 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleOrders.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-bold text-gray-800">
                        {w.id}
                        {w.downtimeHours > 0 && (
                          <div className="text-[10px] text-red-600 font-medium flex items-center gap-0.5 mt-0.5">
                            <Clock size={10} /> Dừng: {w.downtimeHours}h
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/partner/vehicles/${w.vehicleId}`)}
                          className="font-bold text-[#00A859] hover:underline"
                        >
                          {w.plate}
                        </button>
                        <div className="text-[10px] text-gray-500">{w.brandModel}</div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-gray-900">{w.typeName}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex flex-wrap gap-1">
                          {w.items.map((it, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded text-[10px]">
                              {it}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{w.garageName}</div>
                        <div className="text-[10px] text-gray-500">{w.garagePhone}</div>
                      </td>
                      <td className="p-3 text-[11px]">
                        <div>Vào: <strong>{w.startDate}</strong></div>
                        <div className="text-gray-500">Xong: {w.expectedEndDate}</div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold tabular-nums text-gray-900">
                          {w.estimatedCost.toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {w.status === 'IN_PROGRESS' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            <RefreshCw size={10} className="animate-spin" /> Đang sửa chữa
                          </span>
                        )}
                        {w.status === 'WAITING_PARTS' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Chờ phụ tùng
                          </span>
                        )}
                        {w.status === 'PENDING_INSPECTION' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            Chờ nghiệm thu
                          </span>
                        )}
                        {w.status === 'COMPLETED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Đã hoàn thành
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {w.status !== 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCompleteOrder(w)}
                            className="px-2.5 py-1 bg-[#00A859] hover:bg-green-700 text-white font-bold rounded text-[11px] transition shadow-xs"
                          >
                            Nghiệm thu xe
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold">Đã đóng lệnh</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: LỊCH SỬ BẢO DƯỠNG (HISTORY) */}
        {currentTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 [&_th]:font-bold">
                <tr>
                  <th className="p-3">Mã phiếu</th>
                  <th className="p-3">Phương tiện & Trạm</th>
                  <th className="p-3">Đợt bảo dưỡng / sửa chữa</th>
                  <th className="p-3">Ngày làm & ODO</th>
                  <th className="p-3">Xưởng & Người nghiệm thu</th>
                  <th className="p-3 text-right">Chi phí quyết toán</th>
                  <th className="p-3">Hóa đơn / Biên bản</th>
                  <th className="p-3 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-bold text-gray-800">{h.code}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/partner/vehicles/${h.vehicleId}`)}
                          className="font-bold text-[#00A859] hover:underline"
                        >
                          {h.plate}
                        </button>
                        <div className="text-[10px] text-gray-500">{orgName(h.stationId)}</div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-semibold text-gray-900">{h.typeName}</div>
                        <div className="text-[10px] text-gray-500 line-clamp-1">
                          Vật tư: {h.items.join(', ')}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-gray-800">{h.performedAt}</div>
                        <div className="text-[10px] text-gray-500">ODO: {h.odoKm.toLocaleString('vi-VN')} km</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{h.garageName}</div>
                        <div className="text-[10px] text-gray-500">Bàn giao: {h.technicianOrDriver}</div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold tabular-nums text-emerald-700">
                          {h.cost.toLocaleString('vi-VN')} đ
                        </span>
                      </td>
                      <td className="p-3">
                        {h.invoiceFile ? (
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <FileText size={14} className="text-[#00A859] shrink-0" />
                            <span className="truncate max-w-[120px] text-[11px]">{h.invoiceFile}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">Chưa đính kèm</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPreviewHistory(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded text-[11px] text-gray-700 transition"
                        >
                          <Eye size={12} />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ĐIỀU CHỈNH CHU KỲ BẢO DƯỠNG (SCHEDULE) */}
      <PartnerModal
        compact
        open={scheduleModalOpen}
        title={`Điều chỉnh chu kỳ bảo dưỡng xe ${editingSchedule?.plate}`}
        icon={<Calendar size={20} className="text-[#00A859]" />}
        onClose={() => setScheduleModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setScheduleModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveSchedule}
              className={partnerBtnBrand}
            >
              Lưu thay đổi
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-900 border border-emerald-100">
            <div>Phương tiện: <strong>{editingSchedule?.plate}</strong> ({editingSchedule?.brandModel})</div>
            <div>ODO hiện tại đo từ MID: <strong>{editingSchedule?.currentOdo.toLocaleString('vi-VN')} km</strong></div>
          </div>

          <div>
            <label className={partnerLabelClass}>Tên cấp bảo dưỡng dự kiến</label>
            <input
              type="text"
              value={scheduleForm.nextLevelName}
              onChange={(e) => setScheduleForm({ ...scheduleForm, nextLevelName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>Mốc ODO đến hạn (km)</label>
              <input
                type="number"
                value={scheduleForm.nextDueOdo}
                onChange={(e) => setScheduleForm({ ...scheduleForm, nextDueOdo: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>Hạn ngày kế tiếp</label>
              <input
                type="text"
                value={scheduleForm.nextDueDate}
                onChange={(e) => setScheduleForm({ ...scheduleForm, nextDueDate: e.target.value })}
                placeholder="DD/MM/YYYY"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>Chu kỳ tiêu chuẩn lặp lại (km)</label>
            <AppSelect
              value={String(scheduleForm.standardCycleKm)}
              onChange={(value) => setScheduleForm({ ...scheduleForm, standardCycleKm: Number(value) })}
              className={modalSelectClass}
              options={[
                { value: '5000', label: 'Mỗi 5.000 km' },
                { value: '10000', label: 'Mỗi 10.000 km' },
                { value: '20000', label: 'Mỗi 20.000 km' },
              ]}
            />
          </div>
        </div>
      </PartnerModal>

      {/* MODAL 2: TẠO YÊU CẦU SỬA CHỮA (REQUEST) */}
      <PartnerModal
        compact
        xl
        open={requestModalOpen}
        title="Tạo yêu cầu sửa chữa xe / Báo hỏng sự cố"
        icon={<AlertTriangle size={20} className="text-orange-500" />}
        onClose={() => setRequestModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCreateRequest}
              className={partnerBtnBrand}
            >
              Gửi yêu cầu
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className={partnerLabelClass}>
              Chọn phương tiện báo sự cố <span className="text-red-500">*</span>
            </label>
            <AppSelect
              searchable
              searchPlaceholder="Tìm biển số, dòng xe, trạm"
              value={requestForm.vehicleId}
              onChange={(value) => setRequestForm({ ...requestForm, vehicleId: value })}
              className={modalSelectClass}
              options={VEHICLE_SELECT_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>Mức độ ưu tiên</label>
              <AppSelect
                value={requestForm.priority}
                onChange={(value) => setRequestForm({ ...requestForm, priority: value as typeof requestForm.priority })}
                className={modalSelectClass}
                options={PRIORITY_OPTIONS}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>Nhóm bộ phận gặp sự cố</label>
              <AppSelect
                value={requestForm.issueCategory}
                onChange={(value) => setRequestForm({ ...requestForm, issueCategory: value as RepairRequestItem['issueCategory'] })}
                className={modalSelectClass}
                options={ISSUE_CATEGORY_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>
              Tên sự cố / Triệu chứng hư hỏng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={requestForm.title}
              onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
              placeholder="VD: Rò rỉ dầu xilanh nâng cẩu sàn trượt"
              className={inputClass}
            />
          </div>

          <div>
            <label className={partnerLabelClass}>Mô tả chi tiết triệu chứng & Hiện trường</label>
            <textarea
              rows={6}
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              placeholder="Mô tả cụ thể thời điểm phát hiện, tiếng kêu lạ, rỉ nhớt, tải trọng..."
              className={`${inputClass} !h-auto min-h-36 resize-y py-3 leading-5`}
            />
          </div>
        </div>
      </PartnerModal>

      {/* MODAL 3: TẠO LỆNH BẢO DƯỠNG / SỬA CHỮA (WORK ORDER) */}
      <PartnerModal
        open={workOrderModalOpen}
        compact
        xl
        title="Tạo lệnh bảo dưỡng / sửa chữa đưa xe vào xưởng"
        icon={<Wrench size={20} className="text-[#00A859]" />}
        onClose={() => setWorkOrderModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setWorkOrderModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveWorkOrder}
              className={partnerBtnBrand}
            >
              Phát hành lệnh xưởng
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>
                Phương tiện <span className="text-red-500">*</span>
              </label>
              <AppSelect
                searchable
                searchPlaceholder="Tìm biển số, dòng xe, trạm"
                value={workOrderForm.vehicleId}
                onChange={(value) => setWorkOrderForm({ ...workOrderForm, vehicleId: value })}
                className={modalSelectClass}
                options={VEHICLE_SELECT_OPTIONS}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>Loại hình lệnh</label>
              <AppSelect
                value={workOrderForm.type}
                onChange={(value) => setWorkOrderForm({ ...workOrderForm, type: value as typeof workOrderForm.type })}
                className={modalSelectClass}
                options={[
                  { value: 'PERIODIC', label: 'Bảo dưỡng định kỳ' },
                  { value: 'REPAIR', label: 'Sửa chữa sự cố phát sinh' },
                  { value: 'EMERGENCY', label: 'Khắc phục khẩn cấp' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>
              Tên đợt bảo dưỡng / sửa chữa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={workOrderForm.typeName}
              onChange={(e) => setWorkOrderForm({ ...workOrderForm, typeName: e.target.value })}
              placeholder="VD: Bảo dưỡng Cấp 2 + Thay gioăng phớt xilanh"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>Gara / Xưởng thực hiện</label>
              <input
                type="text"
                value={workOrderForm.garageName}
                onChange={(e) => setWorkOrderForm({ ...workOrderForm, garageName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>Số điện thoại Gara</label>
              <input
                type="text"
                value={workOrderForm.garagePhone}
                onChange={(e) => setWorkOrderForm({ ...workOrderForm, garagePhone: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={partnerLabelClass}>Ngày vào xưởng</label>
              <input
                type="text"
                value={workOrderForm.startDate}
                onChange={(e) => setWorkOrderForm({ ...workOrderForm, startDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>Ngày dự kiến bàn giao</label>
              <input
                type="text"
                value={workOrderForm.expectedEndDate}
                onChange={(e) => setWorkOrderForm({ ...workOrderForm, expectedEndDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>Dự toán chi phí (VNĐ)</label>
              <input
                type="number"
                value={workOrderForm.estimatedCost}
                onChange={(e) => setWorkOrderForm({ ...workOrderForm, estimatedCost: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className={`${partnerLabelClass} mb-0`}>Danh mục hạng mục sửa chữa / vật tư thay thế</label>
              <button
                type="button"
                onClick={() => setItemLines([...itemLines, ''])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E8F47] hover:underline"
              >
                <Plus size={13} />
                Thêm hạng mục
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {itemLines.map((line, index) => (
                <div key={index} className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-gray-400">{index + 1}</span>
                  <input
                    value={line}
                    onChange={(e) => {
                      const next = [...itemLines];
                      next[index] = e.target.value;
                      setItemLines(next);
                    }}
                    placeholder="Một hạng mục sửa chữa"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setItemLines(itemLines.filter((_, i) => i !== index))}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Xóa hạng mục ${index + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>Tài xế / Người bàn giao xe</label>
            <input
              type="text"
              value={workOrderForm.technicianOrSupervisor}
              onChange={(e) => setWorkOrderForm({ ...workOrderForm, technicianOrSupervisor: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong>Lưu ý:</strong> Khi phát hành lệnh này, hệ thống sẽ tự động chuyển trạng thái xe sang{' '}
            <span className="font-bold text-red-600">MAINTENANCE (Đang sửa chữa)</span> để ngừng nhận cuốc cứu hộ.
          </div>
        </div>
      </PartnerModal>

      {/* MODAL 4: NGHIỆM THU HOÀN THÀNH LỆNH BẢO DƯỠNG (INSPECTION & RETURN TO READY) */}
      <PartnerModal
        open={completeOrderModalOpen}
        compact
        xl
        title={`Nghiệm thu bàn giao xe ${orderToComplete?.plate}`}
        icon={<CheckCircle2 size={20} className="text-[#00A859]" />}
        onClose={() => setCompleteOrderModalOpen(false)}
        footer={(
          <>
            <button
              type="button"
              onClick={() => setCompleteOrderModalOpen(false)}
              className={partnerBtnNeutral}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmCompleteOrder}
              className={partnerBtnBrand}
            >
              Xác nhận
            </button>
          </>
        )}
      >
        <div className="space-y-3.5 text-xs">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-900 border border-emerald-100 space-y-1">
            <div>Lệnh sửa chữa: <strong>{orderToComplete?.id}</strong></div>
            <div>Nội dung: <strong>{orderToComplete?.typeName}</strong></div>
            <div>Xưởng thực hiện: <strong>{orderToComplete?.garageName}</strong></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={partnerLabelClass}>
                Chi phí (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={completeForm.actualCost}
                onChange={(e) => setCompleteForm({ ...completeForm, actualCost: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={partnerLabelClass}>
                ODO xuất xưởng (km) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={completeForm.finalOdo}
                onChange={(e) => setCompleteForm({ ...completeForm, finalOdo: Number(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={partnerLabelClass}>Người ký biên bản</label>
            <input
              type="text"
              value={completeForm.technicianOrDriver}
              onChange={(e) => setCompleteForm({ ...completeForm, technicianOrDriver: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={partnerLabelClass}>Tệp đính kèm</label>
            <FileDrop
              accept=".pdf,image/*"
              file={completeInvoiceFile}
              hint="Hóa đơn VAT, Phiếu xuất xưởng (PDF, Ảnh)"
              onFile={setCompleteInvoiceFile}
            />
          </div>

          <div>
            <label className={partnerLabelClass}>Ghi chú</label>
            <textarea
              rows={4}
              value={completeForm.note}
              onChange={(e) => setCompleteForm({ ...completeForm, note: e.target.value })}
              className={`${inputClass} !h-auto min-h-28 resize-y py-3 leading-6`}
            />
          </div>
        </div>
      </PartnerModal>

      {/* MODAL 5: XEM CHI TIẾT LỊCH SỬ BẢO DƯỠNG (DETAIL & INVOICE) */}
      <PartnerModal
        compact
        open={!!previewHistory}
        title={`Chi tiết phiếu bảo dưỡng — ${previewHistory?.code}`}
        icon={<Wrench size={20} className="text-[#00A859]" />}
        onClose={() => setPreviewHistory(null)}
        footer={(
          <button
            type="button"
            onClick={() => setPreviewHistory(null)}
            className={partnerBtnBrand}
          >
            Đóng
          </button>
        )}
      >
        {previewHistory && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                  {previewHistory.code}
                </span>
                <span className="text-emerald-700 font-bold text-xs">Đã hoàn thành</span>
              </div>
              <div className="font-bold text-xs text-gray-900 mt-1">{previewHistory.typeName}</div>
              <div className="text-gray-600 text-[11px]">
                Phương tiện: <strong>{previewHistory.plate}</strong> ({previewHistory.brandModel}) · Trạm:{' '}
                <strong>{orgName(previewHistory.stationId)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-gray-50/60">
                <div className="text-[11px] text-gray-500">Gara thực hiện</div>
                <div className="font-bold text-gray-800">{previewHistory.garageName}</div>
                <div className="text-[11px] text-gray-600">Bàn giao: {previewHistory.technicianOrDriver}</div>
              </div>
              <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/40">
                <div className="text-[11px] text-gray-500">Chi phí nghiệm thu có VAT</div>
                <div className="text-sm font-bold text-emerald-700">
                  {previewHistory.cost.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-[10px] text-gray-500">ODO lúc làm: {previewHistory.odoKm.toLocaleString('vi-VN')} km</div>
              </div>
            </div>

            <div>
              <div className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5">
                <CheckSquare size={14} className="text-[#00A859]" />
                Hạng mục & Phụ tùng thay thế ({previewHistory.items.length})
              </div>
              <div className="rounded-lg border divide-y bg-white">
                {previewHistory.items.map((it, idx) => (
                  <div key={idx} className="p-2 flex items-center gap-2 text-gray-700">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            </div>

            {previewHistory.note && (
              <div className="p-2.5 rounded-lg border bg-gray-50 text-[11px]">
                <strong>Ghi chú:</strong> {previewHistory.note}
              </div>
            )}

            <div>
              <div className="font-bold text-gray-800 mb-1">Hóa đơn & Biên bản nghiệm thu</div>
              <div className="p-3 rounded-lg border bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={24} className="text-[#00A859]" />
                  <div>
                    <div className="font-semibold text-gray-800">{previewHistory.invoiceFile}</div>
                    <div className="text-[10px] text-gray-500">Đã lưu trữ hồ sơ kế toán</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerToast(`Đang tải tệp ${previewHistory.invoiceFile}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-100 font-bold text-gray-700"
                >
                  <Download size={12} />
                  Tải về
                </button>
              </div>
            </div>
          </div>
        )}
      </PartnerModal>
    </div>
  );
};

export default PartnerMaintenance;
